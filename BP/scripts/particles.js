import { system, MolangVariableMap } from "@minecraft/server";
import { addVector, getDirection, getDistance } from "./utils";

export const  emitGunFireTrail = (source, targetLocation) => {
    if (!source.isValid || !targetLocation) return;
    const dimension = source.dimension;
    const sourceViewDirection = source.getViewDirection();
    const sourceLocation = addVector(source.getHeadLocation(), {x: sourceViewDirection.x * 0.3, y: sourceViewDirection.y * 0.3, z: sourceViewDirection.z * 0.3});
    const localTargetLocation = getDirection(sourceLocation, targetLocation); 
    const distance = getDistance(sourceLocation, targetLocation);

    const molang = new MolangVariableMap();
    molang.setVector3("end", localTargetLocation);
    molang.setVector3("color_start", {x: 255, y: 0, z: 174});
    molang.setVector3("color_end", {x: 30, y: 0, z: 255});
    molang.setFloat("amount", Math.ceil((distance + 0.01) / 0.05));

    dimension.spawnParticle("dap:railgun_beam_particle", sourceLocation, molang);

    molang.setVector3("color_start", {x: 144, y: 0, z: 255});
    molang.setFloat("amount", Math.ceil((distance + 0.01) / 0.55));

    system.runTimeout(() => {
        dimension.spawnParticle("dap:railgun_tube_particle", sourceLocation, molang);
    }, 10)
}

export const emitGunLocationTrails = (player, targetLocations) => {
    if (!player.isValid || !targetLocations) return;
    const playerLocation = {x: player.location.x, y: player.location.y + 0.25, z: player.location.z};
    const molang = new MolangVariableMap();
    molang.setVector3("start", {x: 0, y: 0, z: 0});
    molang.setFloat("arc_height", 2.5);
    targetLocations.forEach(location => {
        const localTargetLocation = getDirection(playerLocation, location);
        molang.setVector3("end", localTargetLocation);
        player.spawnParticle("dap:guide_trail_particle", playerLocation, molang);
    });
}