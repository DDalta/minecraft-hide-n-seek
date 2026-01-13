import { system, world } from "@minecraft/server";
import { WORLDSPAWN, TEAMS, LEVELS } from "./constants";
import { initRoles, resetAllPlayers, setItem } from "./PlayerManager";
import { TimeManager } from "./TimeManager";
import { playSoundPlayers, setActionBarPlayers, setTitlePlayers, updateSubtitlePlayers } from "./alerts";
import { emitGunLocationTrails } from "./particles";

export class GameManager {
    constructor() {
        this.gameActive = false;
        this.hiders = [];
        this.seekers = [];
        this.spectators = [];
        this.levelData
        this.timeManager = new TimeManager();
        this.dimension = world.getDimension("overworld");

        this.railGunsDropped = 0;
    }

    startGame() {
        if (this.gameActive) {
            console.warn("Game currently in progress!");
            return;
        }
        this.gameActive = true;
        this.levelData = this.changeLevel();
        
        const players = world.getAllPlayers();

        const playerRoles = initRoles([...players]);
        this.hiders = playerRoles.hiders;
        this.seekers = playerRoles.seekers;

        this.seekers.forEach(player => {
            player.teleport({x: -257.50, y: 13, z: -120.50});
            player.playSound("note.pling", {location: player.location, volume: 500.0});
        });
        this.hiders.forEach(player => {
            player.teleport(this.levelData.spawnLocation);
            player.playSound("note.pling", {location: player.location, volume: 500.0});
        });

        // give 20 seconds for hiders to hide
        this.timeManager.runTimeout(() => {

            setTitlePlayers(this.seekers, "§6GET READY!§r", "10");
            setTitlePlayers(this.hiders, "§6RELEASING §r§d§lSEEKERS§r§6!§r", "10");
            
            // countdown before seekers are released
            let countdown = 10;
            const countDownTimer = this.timeManager.runInterval(() => {
                countdown--;
                updateSubtitlePlayers(players, countdown.toString());
                if (countdown == 0) {
                    this.timeManager.clear(countDownTimer);
                    this.seekers.forEach(player => {
                        player.teleport(this.levelData.spawnLocation);
                    });
                    playSoundPlayers([...this.hiders, ...this.seekers], "note.pling", {volume: 500.0, pitch: 2.0});
                    this.handleGameLoop();
                    return;
                }
                if (countdown <= 5) playSoundPlayers([...this.hiders, ...this.seekers], "note.hat", {volume: 0.5});
            }, 20);

        }, 200);
    }

    endGame() {
        if (!this.gameActive) return;
        console.warn("ending game in 10...");
        playSoundPlayers([...this.hiders, ...this.seekers, ...this.spectators], "note.harp", {volume: 100.0, pitch: 2.0});
        system.runTimeout(() => {
            resetAllPlayers();
            this.timeManager.clearAll();
            this.dimension.runCommand("kill @e[type=dap:display_item]")
            this.hiders = []
            this.seekers = []
            this.spectators = []
            this.railGunsDropped = 0;
            this.gameActive = false;
        }, 200);
    }
    
    handleGameLoop() {
        // 30 seconds before spawning crossbow (TEMP)
        this.timeManager.runTimeout(() => {
            this.railGunSpawnInterval();
            this.notifyRailGunLocationInterval();
        }, 450);

        // rocket power scaling timers
        // if the game has surpassed 75 seconds, give seekers medium power rockets
        // if the game has surpassed 175 seconds, give the seekers large power rockets
        // 210 seconds, give seeker player locater
        this.handleRocketPowerScale(
            [
                {
                    "id": "dap:rocket_ammo_medium",
                    "slot": 9,
                    "ticks": 1500
                },
                {
                    "id": "dap:rocket_ammo_large",
                    "slot": 9,
                    "ticks": 2000
                },
                {
                    "id": "dap:player_locator",
                    "name": "§5§lPLAYER LOCATOR §r§c(right click)§r",
                    "slot": 8,
                    "ticks": 700
                }
            ]
        );
    }

    railGunSpawnInterval() {
        this.timeManager.runInterval(() => {
            if (!this.gameActive) return;
            if (this.railGunsDropped >= this.hiders.length) return;
            this.dropRailGun(this.levelData.railGunLocations[Math.floor(Math.random() * this.levelData.railGunLocations.length)]);
            //setActionBarPlayers([...this.hiders, ...this.seekers], "§6A §r§l§cWEAPON §r§6HAS DROPPED FOR §r§l§sHIDERS§r");
            world.sendMessage("§6A §r§l§cWEAPON §r§6HAS DROPPED FOR §r§l§sHIDERS§r");
            playSoundPlayers([...this.hiders, ...this.seekers, ...this.spectators], "note.pling", {volume: 0.5, pitch: 0.5});
        }, 200);
    }

    notifyRailGunLocationInterval() {
        this.timeManager.runInterval(() => {
            const entities = this.dimension.getEntities({ tags: ["dropped_bow"] });
            if (!entities.length) return;
            this.hiders.forEach(player => {
                emitGunLocationTrails(player, entities.map(entity => entity.location));
            })
        }, 110);
    }

    handleRocketPowerScale(items) {
        if (items.length <= 0) return;
        const item = items[0];
        this.timeManager.runTimeout(() => {
            this.seekers.forEach(player => {
                setItem(player, item.id, item.slot, item.name);
            });
            //setActionBarPlayers([...this.hiders, ...this.seekers], "§d§lSEEKERS §r§6HAVE BEEN GIVEN AN §r§a§lUPGRADE!§r");
            world.sendMessage("§d§lSEEKERS §r§6HAVE BEEN GIVEN AN §r§a§lUPGRADE!§r");
            playSoundPlayers([...this.hiders, ...this.seekers, ...this.spectators], "note.pling", {volume: 0.5, pitch: 0.5});
            this.handleRocketPowerScale(items.slice(1));
        }, item.ticks);
    }

    addSpectator(player) {
        this.spectators.push(player);
    }

    getActivePlayers() {
        return this.spectators;
    }

    getActiveHiders() {
        return this.hiders;
    }

    getActiveSeekers() {
        return this.seekers;
    }

    // return true if the removed player is the last on the team
    removeHider(player) {
        const targetIndex = this.hiders.findIndex(i => i.id == player.id);
        this.hiders.splice(targetIndex, 1);
        return this.hiders <= 0 ? true : false
    }

    // return true if the removed player is the last on the team
    removeSeeker(player) {
        const targetIndex = this.seekers.findIndex(i => i.id == player.id);
        this.seekers.splice(targetIndex, 1);
        return this.seekers <= 0 ? true : false
    }

    changeLevel(level = -1) {
        const structureManager = world.structureManager;

        let levelNum = level < 0 ? Math.floor(Math.random() * LEVELS.length) : level;

        this.dimension.runCommand(`kill @e[type=!player]`);
        structureManager.place(LEVELS[levelNum].name, this.dimension, { x: -288, y: -63, z: -146 }, {waterlogged: false});
        this.dimension.runCommand(`kill @e[type=Item]`);

        return {
            spawnLocation: LEVELS[levelNum].player_spawn,
            railGunLocations: LEVELS[levelNum].railgun_locations
        }
    }

    dropRailGun(location) {
        const itemDisplayEntity = this.dimension.spawnEntity("dap:display_item", location);
        itemDisplayEntity.nameTag = "§aHIDERS PICKUP!§r";
        itemDisplayEntity.addTag("dropped_bow");
        itemDisplayEntity.runCommand("replaceItem entity @s slot.weapon.mainhand 0 dap:railgun");
        this.railGunsDropped += 1;
    }

    decrementRailGunCount() {
        if (!this.gameActive) return;
        this.railGunsDropped--;
        // console.warn("railgun removed");
    }

}