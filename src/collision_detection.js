import * as THREE from '../node_modules/three/build/three.module.js';

/**
 * Collision Detection
 * 
 * @param {*} sphere 
 * @param {*} box 
 * @param {*} boxSize 
 * @param {*} ballRadius 
 * @returns 
 */
function detectSphereBoxCollision(sphere, box, boxSize, ballRadius) {
    // Get the world matrix of the box
    const matrix = new THREE.Matrix4();
    box.updateMatrixWorld();
    matrix.copy(box.matrixWorld);

    // Calculate the inverse matrix
    const inverseMatrix = new THREE.Matrix4();
    inverseMatrix.copy(matrix).invert();

    // Convert the ball origin to local space of the box
    const localSpherePos = sphere.position.clone().applyMatrix4(inverseMatrix);

    // Calculate the boundary of the box
    const min = new THREE.Vector3(-boxSize.width / 2, -boxSize.height / 2, -boxSize.depth / 2);
    const max = new THREE.Vector3(boxSize.width / 2, boxSize.height / 2, boxSize.depth / 2);

    // Calculate the distance between ball origin and the box surface
    const closestPoint = localSpherePos.clone().clamp(min, max);

    // Calculate the distance and the normal to the box
    const difference = localSpherePos.clone().sub(closestPoint);
    const distance = difference.length();

    if (distance < ballRadius) {
        const penetrationDepth = ballRadius - distance;
        const collisionNormalLocal = difference.normalize();
        return {
            collided: true,
            penetrationDepth: penetrationDepth,
            collisionNormalLocal: collisionNormalLocal,
        };
    } else {
        return {
            collided: false,
        };
    }
}

export { detectSphereBoxCollision }