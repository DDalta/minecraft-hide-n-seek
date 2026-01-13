import { world,EnchantmentType, ItemStack, ItemLockMode } from "@minecraft/server";
import { TEAMS, LOADOUTS, WORLDSPAWN } from "./constants";

export const initRoles = (players) => {
    const randomIndex = Math.floor(Math.random() * players.length);
    const seekers = players.splice(randomIndex, 1);
    const hiders = [...players];

    seekers.forEach(player => {
        changeRoles(player, TEAMS.SEEKER);
    })
    hiders.forEach(player => {
        changeRoles(player, TEAMS.HIDER);
    })

    return {hiders: hiders, seekers: seekers};
}

export const changeRoles = (player, team) => {
    if (!player.isValid) {
        console.warn("player is not valid");
        return;
    }
    clearTags(player);
    player.getComponent("minecraft:inventory").container.clearAll();
    player.runCommand(`effect @s clear`);
    player.runCommand(`ability @s mayfly false`);
    player.setGameMode("Adventure");
    player.resetProperty("dap:team_id");
    
    const playerHealthComponent = player.getComponent("minecraft:health");
    playerHealthComponent?.resetToMaxValue();

    switch (team) {
        case TEAMS.HIDER:
            setHider(player);
            break;
        case TEAMS.SEEKER:
            setSeeker(player);
            break;
        case TEAMS.SPECTATOR:
            setSpectator(player);
            break;
        case TEAMS.DEFAULT:
            setDefault(player);
            break;
    }
}

export const clearTags = (player) => {
    player.getTags().forEach(tag => { 
        player.removeTag(tag);
    });
}

export const setSeeker = (player) => {
    player.addTag(TEAMS.SEEKER);
    player.triggerEvent("dap:become_seeker");
    player.addEffect("resistance", 20000000, { amplifier: 255, showParticles: false });
    player.setProperty("dap:team_id", 1);
    player.addEffect("minecraft:speed", 20000000, { amplifier: 2, showParticles: false });
    giveSeekerItems(player);
    player.onScreenDisplay.setTitle(" §6Waiting for §r§l§sHiders§r§l§r ", {
        stayDuration: 120,
        fadeInDuration: 2,
        fadeOutDuration: 4,
        subtitle: "§6Teleporting in §r§l§c20§r §6seconds...§r"
    });
}

export const setHider = (player) => {
    player.addTag(TEAMS.HIDER);
    player.triggerEvent("dap:become_hider");
    player.addEffect("minecraft:speed", 20000000, { amplifier: 2, showParticles: false });
    player.setProperty("dap:team_id", 2);
    giveHiderItems(player);
    player.onScreenDisplay.setTitle("§6 Go Hide! §r", {
        stayDuration: 100,
        fadeInDuration: 2,
        fadeOutDuration: 4,
        subtitle: "§6You have §r§l§c20§r §6seconds...§r"
    });
}

export const setSpectator = (player) => {
    player.addTag(TEAMS.SPECTATOR);
    player.triggerEvent("dap:become_default");
    player.addEffect("invisibility", 20000000, { amplifier: 1, showParticles: false });
    player.addEffect("weakness", 20000000, { amplifier: 255, showParticles: false });
    player.addEffect("resistance", 20000000, { amplifier: 255, showParticles: false });
    player.runCommand(`ability @s mayfly true`);
    giveSpectatorItems(player);
    player.onScreenDisplay.setActionBar("YOU CAN §r§l§aSPECTATE§r!§r");
}

export const setDefault = (player) => {
    player.triggerEvent("dap:become_default");
}

export const resetAllPlayers = () => {
    world.getAllPlayers().forEach(player => {
        changeRoles(player, TEAMS.DEFAULT);
        player.teleport(WORLDSPAWN);
    });
}

export const setItem = (player, item_id, slot, nameTag = "", amount=1, enchantments=[]) => {
    const itemStack = new ItemStack(item_id, amount);
    itemStack.lockMode = ItemLockMode.slot;
    if (nameTag) itemStack.nameTag = nameTag;
    if (enchantments) {
        const enchantmentComponent = itemStack.getComponent("minecraft:enchantable");
        enchantments.forEach(enchantment => {
            const enchantType = new EnchantmentType(enchantment.type);
            enchantmentComponent.addEnchantment({type: enchantType, level: enchantment.level});
        });
    }
    player.getComponent("minecraft:inventory").container.setItem(slot, itemStack);
}

const giveHiderItems = (player) => {
    LOADOUTS.hiders.forEach((item, index) => {
        setItem(player, item.id, item.slot, item?.name, item.amount, item?.enchantments);
    });
}

const giveSeekerItems = (player) => {
    LOADOUTS.seekers.forEach((item, index) => {
        setItem(player, item.id, item.slot, item?.name, item.amount, item?.enchantments);
    });
}

const giveSpectatorItems = (player) => {
    LOADOUTS.spectators.forEach((item, index) => {
        setItem(player, item.id, item.slot, item?.name, item.amount, item?.enchantments);
    });
}
