import { ActionFormData } from '@minecraft/server-ui';
import { LEVELS, HIDERSOUNDS, TEAMS } from './constants.js';

export const debugMenu = (player) => {
    const form = new ActionFormData()
    .title("Debug Menu")
    .body("Choose an option:")
    .button("§l§aTeleport to Spawn")
    .button("§l§aTeleport Forward")
    .button("§l§bStart Game")
    .button("§l§sRegenerate Level")
    .button("§l§gBecome Seeker")
    .button("§l§gBecome Hider")
    .button("§l§gBecome Spectator")
    .button("§l§bCreative Mode")
    .button("§l§cReset");
    return form.show(player);
}

export const levelRegenerationForm = (player) => {
    const form = new ActionFormData()
    .title("Regenerate Level")
    .body("Choose a level to regenerate:");
    LEVELS.forEach((level, index) => {
        form.button(`§l§e${level.name}`);
    });
    return form.show(player);
}

export const soundMenu = async (player) => {
    const form = new ActionFormData()
    .title("Player Sound")
    .body("Choose a sound to play:");
    HIDERSOUNDS.forEach((sound, index) => {
        form.button(`§l${sound.color}${sound.name}`)
    });
    const response = await form.show(player);
    if (response.canceled) return;
    const btn = response.selection;
    player.dimension.playSound(HIDERSOUNDS[btn].id,
        player.location,
        { volume: HIDERSOUNDS[btn].volume, pitch: Math.random() * (HIDERSOUNDS[btn].max_pitch - HIDERSOUNDS[btn].min_pitch) + HIDERSOUNDS[btn].min_pitch });
}

export const spectatorMenu = async (player) => {
    const remainingPlayers = player.dimension.getPlayers({ excludeTags: [TEAMS.SPECTATOR, TEAMS.DEFAULT] })

    const form = new ActionFormData()
    .title("Teleport Menu")
    .body("Choose who to teleport to:");
    remainingPlayers.forEach(p => {
        form.button(`§l§c${p.name}§r`);
    });
    const response = await form.show(player);
    if (response.canceled) return;
    const btn = response.selection;
    player.teleport(remainingPlayers[btn].location);
}