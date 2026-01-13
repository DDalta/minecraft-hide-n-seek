import { system, world, ItemStack, ItemLockMode, EquipmentSlot, System } from "@minecraft/server";

import { WORLDSPAWN, TEAMS } from "./constants.js";
import { debugMenu, levelRegenerationForm, soundMenu, spectatorMenu } from "./forms.js";
import { 
    ItemGrantInvisibilityComponent, 
    ItemDashComponent, 
    ItemPlaySoundComponent,
    WeaponRailGunComponent,
    PlayerLocatorComponent,
    WeaponRailGunFire
} from "./components.js";
import { setTitlePlayers } from "./alerts.js";
import { GameManager } from "./GameManager.js";
import { changeRoles, resetAllPlayers } from "./PlayerManager.js";
import { getDirection } from "./utils.js";

let game;
const chargingPlayers = new Map()
const colorCodes = ["9", "a", "b", "c", "d", "e", "v", "u"];

world.afterEvents.worldLoad.subscribe(() => {
    console.warn("world loaded");
    game = new GameManager();
});

system.beforeEvents.startup.subscribe(({ itemComponentRegistry }) => {
    itemComponentRegistry.registerCustomComponent("dap:grant_invis_component", ItemGrantInvisibilityComponent);
    itemComponentRegistry.registerCustomComponent("dap:dash_component", ItemDashComponent);
    itemComponentRegistry.registerCustomComponent("dap:sound_player_component", ItemPlaySoundComponent);
    // itemComponentRegistry.registerCustomComponent("dap:weapon_railgun_component", WeaponRailGunComponent);
    itemComponentRegistry.registerCustomComponent("dap:player_locator_component", PlayerLocatorComponent);
});

world.afterEvents.itemUse.subscribe(evd => {
	if (evd.itemStack.typeId == 'dap:debug_stick' && evd.source.name == "TheEpicGamer235") {
        debugMenu(evd.source).then(response => {
            if (response.canceled) return;
            switch (response.selection) {
                case 0:
                    evd.source.teleport(WORLDSPAWN);
                    break;
                case 1:
                    const sourceLocation = evd.source.location;
                    const viewDirection = evd.source.getViewDirection();
                    const teleportLocation = {
                        x: sourceLocation.x + (viewDirection.x * 5),
                        y: sourceLocation.y + (viewDirection.y * 5),
                        z: sourceLocation.z + (viewDirection.z * 5)
                    }
                    evd.source.teleport(teleportLocation);
                    break;
                case 2:
                    world.getDimension("overworld").runCommand(`scriptevent dap:startGame`);
                    break;
                case 3:
                    return levelRegenerationForm(evd.source).then(response => {
                        if (response.canceled) return;
                        game.changeLevel(response.selection);
                    });
                    break;
                case 4:
                    changeRoles(evd.source, TEAMS.SEEKER);
                    break;
                case 5:
                    changeRoles(evd.source, TEAMS.HIDER);
                    break;
                case 6:
                    changeRoles(evd.source, TEAMS.SPECTATOR);
                    break;
                case 7:
                    evd.source.setGameMode("Creative");
                    evd.source.runCommand(`ability @s mayfly true`);
                    evd.source.resetProperty("dap:team_id");
                    evd.source.triggerEvent("dap:become_default");
                    break;
                case 8:
                    resetAllPlayers();
                    break;
                }
        });
    } else if (evd.itemStack.typeId == 'minecraft:compass') {
        if (evd.source.hasTag(TEAMS.SPECTATOR)) {
            spectatorMenu(evd.source);
        }
    }
});

system.afterEvents.scriptEventReceive.subscribe((event) => {
    const {
        id, // returns string (dap:test)
        initiator, // returns Entity (or undefined if an NPC did not fire the command)
        message, // returns string (Hello World)
        sourceBlock, // returns Block (or undefined if a block did not fire the command)
        sourceEntity, // returns Entity (or undefined if an entity did not fire the command)
        sourceType, // returns MessageSourceType (can be 'Block', 'Entity', 'NPCDialogue', or 'Server')
    } = event;

    switch (id) {
        case "dap:startGame":
            game.startGame();
            break;
        case "dap:endGame":
            game.endGame();
            break;
        case "dap:onDeath":
            if (chargingPlayers.has(sourceEntity.id)) chargingPlayers.remove(sourceEntity.id);
            if (sourceEntity.hasTag(TEAMS.SEEKER)) {
                if (game.removeSeeker(sourceEntity)) {
                    setTitlePlayers(world.getAllPlayers(), " §l§sHIDERS §r§6WIN!§r ");
                    game.endGame();
                } else {
                    setTitlePlayers([sourceEntity], " §l§cYOU DIED!§r ");
                }
            } else if (sourceEntity.hasTag(TEAMS.HIDER)) {
                if (game.removeHider(sourceEntity)) {
                    setTitlePlayers(world.getAllPlayers(), " §l§dSEEKERS §r§6WIN!§r ");
                    game.endGame();
                } else {
                    setTitlePlayers([sourceEntity], " §l§cYOU DIED!§r ");
                }
            }
            break;
        case "dap:railGunFired":
            game.decrementRailGunCount();
            break;
        case "dap:itemDisplay":
            game.dropRailGun(sourceEntity.location);
            break;
        default:
            world.sendMessage("invalid command!");
            break;
    }
});

world.afterEvents.playerSpawn.subscribe(event => {
    const { initialSpawn, player } = event;
    if (game.gameActive) {
        // FIX
        const playerContainer = player.getComponent("minecraft:inventory").container;
        while (true) {
            const railGunItem = new ItemStack("dap:railgun", 1);
            railGunItem.lockMode = ItemLockMode.inventory;
            const slotIndex = playerContainer.find(railGunItem);
            if (!slotIndex) break;
            playerContainer.setItem(slotIndex, undefined);
            game.decrementRailGunCount();
        }
        changeRoles(player, TEAMS.SPECTATOR);
        game.addSpectator(player);
        return;
    }
    changeRoles(player, TEAMS.DEFAULT);
    player.teleport(WORLDSPAWN);
});

// very scrappy
world.afterEvents.playerLeave.subscribe(event => {
    const { playerId, playerName } = event;
    if (game.gameActive) {
        let index = game.hiders.findIndex(i => i.id == playerId);
        if (index > -1) {
            game.hiders.splice(index, 1);
            return;
        }
        index = game.seekers.findIndex(i => i.id == playerId);
        if (index > -1) {
            game.seekers.splice(index, 1);
            return;
        }
    }
});

world.afterEvents.playerInteractWithEntity.subscribe(event => {
    if (event.target.typeId !== "dap:display_item") return;
    if (!event.target.hasTag("dropped_bow")) return;
    if (!event.player.hasTag(TEAMS.HIDER)) return;
    const railGunItem = new ItemStack("dap:railgun", 1);
    railGunItem.lockMode = ItemLockMode.inventory;
    railGunItem.nameTag = "§l§cONE SHOT RAILGUN§r";
    event.player.getComponent("minecraft:inventory").container.addItem(railGunItem);
    event.player.spawnParticle("dap:invis_smoke_particle", event.target.location);

    event.target.remove();
});

world.beforeEvents.playerInteractWithBlock.subscribe(event => {
    if (!event.player.hasTag(TEAMS.SPECTATOR) && !event.block.matches("minecraft:decorated_pot")) return;
    event.cancel = true;
});

// handle railgun charging feedback
world.afterEvents.itemStartUse.subscribe(event => {
    const { source, itemStack } = event;
    if (itemStack.typeId !== "dap:railgun") return;
    if(chargingPlayers.has(source.id)) return;
    const dur = 35.0
    chargingPlayers.set(source.id, {startTick: system.currentTick, duration: dur});
    // console.warn("railgun charging");
});

world.afterEvents.itemStopUse.subscribe(event => {
    const { source, itemStack } = event;
    if (itemStack.typeId !== "dap:railgun") return;
    if (chargingPlayers.has(source.id)) {
        const chargingPlayer = chargingPlayers.get(source.id)
        const elapsedTicks = system.currentTick - chargingPlayer.startTick
        const selectedSlot = source.getComponent("minecraft:inventory").container.getItem(source.selectedSlotIndex)
        if (selectedSlot && selectedSlot.typeId == "dap:railgun" && elapsedTicks >= chargingPlayer.duration ) {
            WeaponRailGunFire(source);
            source.onScreenDisplay.setActionBar("§c[" + "|".repeat(50) + "]");
        }
        chargingPlayers.delete(source.id);
    }
});

system.runInterval(() => {
    for (const [playerId, data] of chargingPlayers) {
        const player = world.getEntity(playerId);
        if (!player) {
            chargingPlayers.delete(playerId);
            continue;
        }

        const elapsedTicks = system.currentTick - data.startTick;
        const progress = Math.min(elapsedTicks / data.duration, 1.0);

        const barSize = 50;
        const barProgress = Math.round(progress * barSize);
        const colorValue = progress >= 1.0 ? colorCodes[system.currentTick % colorCodes.length] : "c"
        const barDisplay = "[§" + colorValue + "|".repeat(barProgress) + "§r§7" + "|".repeat(barSize - barProgress) + "§r]";
        player.onScreenDisplay.setActionBar(barDisplay);

        const soundRate = progress < 1.0 ? 3 : 2;
        if (system.currentTick % soundRate == 0) player.playSound("note.snare", { volume: 0.7, pitch: 0.6 + progress });
    }
}, 1);

// hider's seeker location interface
system.runInterval(() => {
    if (!game.gameActive) return;
    game.getActiveHiders().forEach(player => {
        if (!player.isValid || chargingPlayers.has(player.id)) return;

        const closestSeeker = game.dimension.getEntities({ location: player.location, closest: 1, tags: [TEAMS.SEEKER] })[0];
        if(!closestSeeker) return;

        // get direction vector
        const direction = getDirection(player.location, closestSeeker.location);
        const distance = Math.round(Math.sqrt((direction.x * direction.x) + (direction.z * direction.z)));

        // calculate angle in degrees
        let angle = Math.atan2(direction.z, direction.x) * (180 / Math.PI);
        // subtract the yaw & normalize angle to 0-360 range
        angle = (angle - player.getRotation().y + 360) % 360;

        const index = Math.round(angle / 45) % 8;
        let arrowIcon;
        switch(index) {
            case 0:
                arrowIcon = "";
                break;
            case 1:
                arrowIcon = "";
                break;
            case 2:
                arrowIcon = "";
                break;
            case 3:
                arrowIcon = "";
                break;
            case 4:
                arrowIcon = "";
                break;
            case 5:
                arrowIcon = "";
                break;
            case 6:
                arrowIcon = "";
                break;
            case 7:
                arrowIcon = "";
                break;
            default:
                console.warn("Error calculating cardinal direction");
                return;
        }

        let heightDirection = "";
        if (Math.round(closestSeeker.location.y) > Math.round(player.location.y)) {
            heightDirection = "(above)";
        } else if (Math.round(closestSeeker.location.y) < Math.round(player.location.y)) {
            heightDirection = "(below)";
        }

        player.onScreenDisplay.setActionBar(`${closestSeeker.name} : ${arrowIcon} ${distance} blocks ${heightDirection}`);
    });
}, 1);