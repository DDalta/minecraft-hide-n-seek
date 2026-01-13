export const addVector = (vec1, vec2) => {
    return {x: vec1.x + vec2.x, y: vec1.y + vec2.y, z: vec1.z + vec2.z};
}

export const getNormDirection = (location1, location2) => {
    const directionVector = {
        x: location2.x - location1.x,
        y: location2.y - location1.y,
        z: location2.y - location1.z
    };
    const magnitude = Math.sqrt(
        (directionVector.x * directionVector.x) + 
        (directionVector.y * directionVector.y) +
        (directionVector.z * directionVector.z)
    );

    if (magnitude > 0) {
        return {
            x: directionVector.x / magnitude,
            y: directionVector.y / magnitude,
            z: directionVector.z / magnitude
        };
    }
    return {x: 0, y: 0, z: 0};
}

export const getDirection = (location1, location2) => {
    const direction = {
        x: location2.x - location1.x,
        y: location2.y - location1.y,
        z: location2.z - location1.z
    };
    return direction;
}

export const getDistance = (location1, location2) => {
    const direction = {
        x: Math.pow(location2.x - location1.x, 2),
        y: Math.pow(location2.y - location1.y, 2),
        z: Math.pow(location2.z - location1.z, 2)
    };
    const distance = Math.sqrt(direction.x + direction.y + direction.z);
    return distance;
}

export const dotProduct = (vec1, vec2) => {
    return (vec1.x * vec2.x) + (vec1.y * vec2.y) + (vec1.z  * vec2.z);
}

export const lerp = (location1, location2, t) => {
    const posX = (1 - t) * location1.x + t * location2.x;
    const posY = (1 - t) * location1.y + t * location2.y;
    const posZ = (1 - t) * location1.z + t * location2.z;

    return {x: posX, y: posY, z: posZ};
}