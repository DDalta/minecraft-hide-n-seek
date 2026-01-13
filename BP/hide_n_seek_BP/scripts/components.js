import { EquipmentSlot } from "@minecraft/server";

import { soundMenu } from "./forms.js";
import { TEAMS } from "./constants.js";
import { getDistance } from "./utils.js";
import { emitGunFireTrail } from "./particles.js";

export const ItemGrantInvisibilityComponent = {
    onUse(event) {
        event.source.addEffect("minecraft:invisibility", 500, { amplifier: 1, showParticles: false});
        event.source.spawnParticle("dap:invis_smoke_particle", event.source.location);
        event.itemStack.getComponent("minecraft:cooldown").startCooldown(event.source);
        return true;
    }
}

export const ItemTeleportComponent = {
    onUse(event) {
        const { source, itemStack } = event;
        const dimension = source.dimension;
        const viewDirection = source.getViewDirection();
        const raycast = dimension.getBlockFromRay(source.getHeadLocation(), viewDirection, { includePassableBlocks: false, maxDistance: 10 })
        let teleportLocation;
        if (raycast) {
            const block = raycast.block.center()
            teleportLocation = {x: block.x + (-viewDirection.x), y: source.location.y, z: block.z + (-viewDirection.z)}
        } else {
            teleportLocation = {
                x: source.location.x + (viewDirection.x * 10), 
                y: source.location.y, 
                z: source.location.z + (viewDirection.z * 10)
            };
        }
        source.teleport(teleportLocation)
        itemStack.getComponent("minecraft:cooldown").startCooldown(source);
    }
}

export const ItemPlaySoundComponent = {
    onUse(event) {
        const { source, itemStack } = event;
        itemStack.getComponent("minecraft:cooldown").startCooldown(source);
        soundMenu(source);
    }
}

export const ItemDashComponent = {
    onUse(event) {
        const { source, itemStack } = event;
        const viewDirection = source.getViewDirection();
        source.applyImpulse({x: viewDirection.x * 3.0, y: viewDirection.y * 3.0, z: viewDirection.z * 3.0})
        event.source.dimension.spawnParticle("dap:dash_smoke_particle", event.source.location);
        itemStack.getComponent("minecraft:cooldown").startCooldown(source);
    }
}

export const WeaponRailGunComponent = {
    onCompleteUse(event) {
        const {source, itemStack} = event;
        const mainHand = source.getComponent("minecraft:equippable")?.getEquipmentSlot(EquipmentSlot.Mainhand);
        const entityRayCast = source.getEntitiesFromViewDirection({ maxDistance: 75, tags: [TEAMS.SEEKER], type: "minecraft:player"});
        const blockRayCast = source.getBlockFromViewDirection({ maxDistance: 75, includePassableBlocks: false });
        
        const sourceViewDirection = source.getViewDirection();
        const sourceHeadLocation = source.getHeadLocation();
        
        let targetLocation;

        // break item if not in creative mode
        if (source.getGameMode() !== "Creative") {
            source.playSound('random.break', { pitch: 1, location: source.location, volume: 0.8 });
            mainHand.setItem(undefined);
        }

        source.dimension.playSound('random.explode', source.location, { pitch: 0.85, volume: 20.0 });
        source.dimension.playSound('ominous_bottle.end_use', source.location, { pitch: 1, volume: 1.0 });
        source.dimension.playSound('beacon.activate', source.location, { pitch: 0.85, volume: 10.0 });

        // if the target was hit
        if (entityRayCast.length > 0) {
            const targetEntity = entityRayCast[0].entity;
            const distance = getDistance(sourceHeadLocation, targetEntity.location);
            targetLocation = {
                x: sourceHeadLocation.x + (sourceViewDirection.x * distance),
                y: sourceHeadLocation.y + (sourceViewDirection.y * distance),
                z: sourceHeadLocation.z + (sourceViewDirection.z * distance)
            }
            targetEntity.dimension.spawnEntity("minecraft:lightning_bolt", targetEntity.location);
            targetEntity.kill();
        } else {
            if (blockRayCast) {
                const distance = getDistance(sourceHeadLocation, blockRayCast.block.location);
                targetLocation = {    
                    x: sourceHeadLocation.x + (sourceViewDirection.x * distance),
                    y: sourceHeadLocation.y + (sourceViewDirection.y * distance),
                    z: sourceHeadLocation.z + (sourceViewDirection.z * distance)
                };
            } else {
                targetLocation = {
                    x: sourceHeadLocation.x + (sourceViewDirection.x * 75),
                    y: sourceHeadLocation.y + (sourceViewDirection.y * 75),
                    z: sourceHeadLocation.z + (sourceViewDirection.z * 75)
                };
                
            }
        }
        emitGunFireTrail(source, targetLocation);
        source.dimension.runCommand("scriptevent dap:railGunFired");
    }
}

export const PlayerLocatorComponent = {
    onUse(event) {
        const {source, itemStack} = event;
        itemStack.getComponent("minecraft:cooldown").startCooldown(source);
        
        const dimension = source.dimension;
        const closestHider = dimension.getEntities({ location: source.location, closest: 1, tags: [TEAMS.HIDER] })[0];
        
        if(!closestHider) {
            source.onScreenDisplay.setActionBar("no hiders found!");
            return;
        }

        // get direction vector
        const dx = source.location.x - closestHider.location.x;
        const dz = source.location.z - closestHider.location.z;
        const distance = Math.round(Math.sqrt((dx * dx) + (dz * dz)))

        // calculate angle in degrees
        let angle = Math.atan2(dz, dx) * (180 / Math.PI);
        // subtract the yaw & normalize angle to 0-360 range
        angle = (angle - source.getRotation().y + 360) % 360;
        
        const index = Math.round(angle / 45) % 8;
        let arrowIcon;
        switch(index) {
            case 0:
                arrowIcon = "";
                break;
            case 1:
                arrowIcon = "";
                break;
            case 2:
                arrowIcon = "";
                break;
            case 3:
                arrowIcon = "";
                break;
            case 4:
                arrowIcon = "";
                break;
            case 5:
                arrowIcon = "";
                break;
            case 6:
                arrowIcon = "";
                break;
            case 7:
                arrowIcon = "";
                break;
            default:
                console.warn("Error calculating cardinal direction");
                return;
        }

        source.onScreenDisplay.setActionBar(`${closestHider.name} : ${arrowIcon} ${distance} blocks`);
    }
}

export const WeaponRailGunFire = (source) => {
    const mainHand = source.getComponent("minecraft:equippable")?.getEquipmentSlot(EquipmentSlot.Mainhand);
    const entityRayCast = source.getEntitiesFromViewDirection({ maxDistance: 75, tags: [TEAMS.SEEKER], type: "minecraft:player"});
    const blockRayCast = source.getBlockFromViewDirection({ maxDistance: 75, includePassableBlocks: false });
    
    const sourceViewDirection = source.getViewDirection();
    const sourceHeadLocation = source.getHeadLocation();
    
    let targetLocation;

    // break item if not in creative mode
    if (source.getGameMode() !== "Creative") {
        source.playSound('random.break', { pitch: 1, location: source.location, volume: 0.8 });
        mainHand.setItem(undefined);
    }

    source.dimension.playSound('random.explode', source.location, { pitch: 0.85, volume: 20.0 });
    source.dimension.playSound('ominous_bottle.end_use', source.location, { pitch: 1, volume: 1.0 });
    source.dimension.playSound('beacon.activate', source.location, { pitch: 0.85, volume: 10.0 });

    // if the target was hit
    if (entityRayCast.length > 0) {
        const targetEntity = entityRayCast[0].entity;
        const distance = getDistance(sourceHeadLocation, targetEntity.location);
        targetLocation = {
            x: sourceHeadLocation.x + (sourceViewDirection.x * distance),
            y: sourceHeadLocation.y + (sourceViewDirection.y * distance),
            z: sourceHeadLocation.z + (sourceViewDirection.z * distance)
        }
        targetEntity.dimension.spawnEntity("minecraft:lightning_bolt", targetEntity.location);
        targetEntity.kill();
    } else {
        if (blockRayCast) {
            const distance = getDistance(sourceHeadLocation, blockRayCast.block.location);
            targetLocation = {    
                x: sourceHeadLocation.x + (sourceViewDirection.x * distance),
                y: sourceHeadLocation.y + (sourceViewDirection.y * distance),
                z: sourceHeadLocation.z + (sourceViewDirection.z * distance)
            };
        } else {
            targetLocation = {
                x: sourceHeadLocation.x + (sourceViewDirection.x * 75),
                y: sourceHeadLocation.y + (sourceViewDirection.y * 75),
                z: sourceHeadLocation.z + (sourceViewDirection.z * 75)
            };
            
        }
    }
    emitGunFireTrail(source, targetLocation);
    source.dimension.runCommand("scriptevent dap:railGunFired");
}