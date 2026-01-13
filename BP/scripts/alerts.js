export const setActionBarPlayers = (players, text) => {
    players.forEach(player => {
        player.onScreenDisplay.setActionBar(text);
    });
}

export const setTitlePlayers = (players, text, subtext="", duration = 220) => {
    players.forEach(player => {
        const config  = {
            stayDuration: duration,
            fadeInDuration: 2,
            fadeOutDuration: 4,
        }
        if (subtext) {
            config.subtitle = subtext;
        }
        player.onScreenDisplay.setTitle(text, config);
    });
}

export const updateSubtitlePlayers = (players, subtext) => {
    players.forEach(player => {
        player.onScreenDisplay.updateSubtitle(subtext);
    }); 
}

export const playSoundPlayers = (players, sound, soundOptions = null) => {
    players.forEach(player => {
        player.playSound(sound, soundOptions);
    });
}