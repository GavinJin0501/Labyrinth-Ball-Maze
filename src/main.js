import * as THREE from 'https://cdn.jsdelivr.net/npm/three@/build/three.module.js';
import { generateWallData } from './maze.js';
import { tiltSpeed, tilt, tiltDirection, setTiltSpeed } from './control.js'
import { detectSphereBoxCollision } from './collision_detection.js';

/**
 * Helper Functions
 */

/**
 * Get the starting position of the ball
 * 
 * @returns int[3] (x, y, z) coordinate
 */
function getBallStartingPosition() {
    return [
        -((mazeCols / 2 - 0.5) * cellSize),
        boardMesh.position.y + boardSize.thickness / 2 + ballRadius,
        -((mazeRows / 2 - 0.5) * cellSize)
    ];
}

/**
 * Get the ending position of the ball
 * 
 * @returns 
 */
function getBallEndingPosition() {
    return [
        ((mazeCols / 2 - 0.5) * cellSize), 
        boardMesh.position.y + boardSize.thickness / 2 + ballRadius,
        ((mazeRows / 2 - 0.5) * cellSize)
    ];
}

/**
 * Check the postion of the ball at the end of each rendering
 */
function checkIfBallReachEnd() {
    // Reset the ball and maze if it goes out of bound
    if (ball.position.y < -200) {
        console.log("Ball has fallen");
        // Reset the position and speed ofthe ball
        resetBall();
        
        // Reset the board's tilt
        resetMaze();
        return;
    }

    const threshold = cellSize / 3; // Tolerance for detecting if the ball is close to the end
    const endingPoint = getBallEndingPosition();
    const distanceToEnd = Math.sqrt(
        (ball.position.x - endingPoint[0]) ** 2 + 
        (ball.position.z - endingPoint[2]) ** 2
    );
    if (distanceToEnd < threshold) {
        console.log("You've reached the end of the maze!");
        alert("🎉 Congratulations! You reached the end of the maze! 🎉");
        newMazeButton.click();
    }
}

/**
 * Roll the ball
 */
function rollBall(deltaTime) {
    const rotationAxisX = new THREE.Vector3(1, 0, 0); // Rotate around X-axis for movement along Z
    const rotationAxisZ = new THREE.Vector3(0, 0, 1); // Rotate around Z-axis for movement along X

    const angularVelocityX = ball.velocity.z / ballRadius; // Relate linear velocity to angular velocity
    const angularVelocityZ = -ball.velocity.x / ballRadius; // Relate linear velocity to angular velocity

    ball.angularVelocity.x = angularVelocityX;
    ball.angularVelocity.z = angularVelocityZ;

    ballMesh.rotateOnWorldAxis(rotationAxisX, angularVelocityX * deltaTime); 
    ballMesh.rotateOnWorldAxis(rotationAxisZ, angularVelocityZ * deltaTime); 
}

/**
 * Render the scene
 */
function animate() {
    requestAnimationFrame(animate);

    // Get the elapsed time value
    const currentTime = performance.now();
    const deltaTime = (currentTime - lastTime) / 1000; // in second
    lastTime = currentTime;

    // Update the tilt angle of the board (constrain it to -15 ~ 15 degrees)
    tilt.x += tiltDirection.x * tiltSpeed;
    tilt.z += tiltDirection.z * tiltSpeed;
    const maxTiltAngle = Math.PI / 12;
    tilt.x = Math.max(Math.min(tilt.x, maxTiltAngle), -maxTiltAngle);
    tilt.z = Math.max(Math.min(tilt.z, maxTiltAngle), -maxTiltAngle);

    // Update the rotation of the board and walls
    boardMesh.rotation.x = tilt.x;
    boardMesh.rotation.z = tilt.z;

    // Update the position of the walls
    for (let i = 0; i < walls.length; i++) {
        const localPos = wallLocalPositions[i];
        const worldPos = localPos.clone().applyEuler(boardMesh.rotation);
        walls[i].position.copy(boardMesh.position.clone().add(worldPos));
        walls[i].rotation.copy(boardMesh.rotation);
    }

    // Calculate the gravity
    const gravity = new THREE.Vector3(0, -50.82, 0);
    // Calculate the acceleration based on tilt angle
    const tiltAcceleration = new THREE.Vector3(
        -Math.sin(tilt.z) * 50.82,
        0,
        Math.sin(tilt.x) * 50.82
    );
    // Update the acceleration of the ball
    ball.acceleration.copy(gravity);
    ball.acceleration.add(tiltAcceleration);

    // Update the speed and location of the ball
    ball.velocity.add(ball.acceleration.clone().multiplyScalar(deltaTime));
    ball.position.add(ball.velocity.clone().multiplyScalar(deltaTime));

    // Check if the ball is within the bounday of the board
    const localBallPos = ball.position.clone().applyMatrix4(new THREE.Matrix4().invert(boardMesh.matrixWorld));
    const halfWidth = boardSize.width / 2;
    const halfDepth = boardSize.depth / 2;
    const isBallOnBoard = localBallPos.x > -halfWidth && localBallPos.x < halfWidth &&
                          localBallPos.z > -halfDepth && localBallPos.z < halfDepth;
    if (isBallOnBoard) {
        const boardNormal = new THREE.Vector3(0, 1, 0).applyEuler(boardMesh.rotation);
        const ballCenter = boardMesh.position.clone();
        const ballToPlane = ball.position.clone().sub(ballCenter);
        const distanceToPlane = ballToPlane.dot(boardNormal);

        // Update the location of the ball to touch the surface of the board
        ball.position.add(boardNormal.clone().multiplyScalar(-distanceToPlane + ballRadius));

        // Calculate the speed after collision
        const velocityNormal = boardNormal.clone().multiplyScalar(ball.velocity.dot(boardNormal));
        const velocityTangent = ball.velocity.clone().sub(velocityNormal);

        // Update the speed
        ball.velocity.copy(velocityTangent);
        ball.velocity.add(velocityNormal.multiplyScalar(-restitution)); // Bounce in reverse direction
    }

    // Detect collision between the ball and each wall
    for (let i = 0; i < walls.length; i++) {
        const collisionResult = detectSphereBoxCollision(ball, walls[i], wallGeometries[i], ballRadius);

        if (collisionResult.collided) {
            // Get world matrix of the wall
            const wallMatrix = new THREE.Matrix4();
            walls[i].updateMatrixWorld();
            wallMatrix.copy(walls[i].matrixWorld);

            // Get the world normal of the collision
            const normalWorld = collisionResult.collisionNormalLocal.applyMatrix3(new THREE.Matrix3().getNormalMatrix(wallMatrix)).normalize();

            // Ensure ball does not pierce into the wall
            ball.position.add(normalWorld.clone().multiplyScalar(collisionResult.penetrationDepth));

            // Calculate the speed after collide
            const velocityNormal = normalWorld.clone().multiplyScalar(ball.velocity.dot(normalWorld));
            const velocityTangent = ball.velocity.clone().sub(velocityNormal);

            // Update the speed
            ball.velocity.copy(velocityTangent);
            ball.velocity.add(velocityNormal.multiplyScalar(-restitution));
        }
    }

    // Use friction to constrain the speed
    ball.velocity.x *= friction;
    ball.velocity.z *= friction;
    rollBall(deltaTime);

    // Update Three.js Mesh of the ball (to make it move)
    ballMesh.position.copy(ball.position);

    // Check if the ball reaches the destination
    checkIfBallReachEnd();

    // Render the scene
    renderer.render(scene, camera);
}

/**
 * Set the game buttons
 */
function setGameButtons() {
    // Event listeners for each button
    resetMazeButton.addEventListener('click', () => {
        resetBall();
        resetMaze();
    });

    newMazeButton.addEventListener('click', () => {
        resetBall();

        // Remove old wall meshes
        for (const wall of walls) {
            scene.remove(wall);
        }
        
        // Generate new maze
        ({walls, wallLocalPositions, wallGeometries} = generateWallData(mazeRows, mazeCols, cellSize, scene, hasBoundary));

        // Reset the tilt of the maze
        resetMaze();
    });
}

/**
 * Reset the position, velocit, and acceleration of the ball
 */
function resetBall() {
    ball.position.set(...getBallStartingPosition());
    ball.velocity.set(0, 0, 0);
    ball.acceleration.set(0, 0, 0);
}

/**
 * Reset the tilt of the maze
 */
function resetMaze() {
    tilt.x = 0;
    tilt.z = 0;
    boardMesh.rotation.x = tilt.x;
    boardMesh.rotation.z = tilt.z;
}

/**
 * Set the sliding bars to tweak certain parameters
 */
function setSlidingBars() {
    // Get the HTML elements for gravity and friction sliders
    const restitutionSlider = document.getElementById('restitutionSlider');
    const restitutionValue = document.getElementById('restitutionValue');
    restitutionSlider.addEventListener('input', (event) => {
        restitution = parseFloat(event.target.value);
        restitutionValue.textContent = restitution.toFixed(2);
    });

    const frictionSlider = document.getElementById('frictionSlider');
    const frictionValue = document.getElementById('frictionValue');
    frictionSlider.addEventListener('input', (event) => {
        friction = parseFloat(event.target.value);
        frictionValue.textContent = friction.toFixed(2);
    });

    const tiltSpeedSlider = document.getElementById('tiltSpeedSlider');
    const tiltSpeedValue = document.getElementById('tiltSpeedValue');
    tiltSpeedSlider.addEventListener('input', (event) => {
        setTiltSpeed(parseFloat(event.target.value));
        tiltSpeedValue.textContent = tiltSpeed.toFixed(3);
    });

    const hasBoundaryToggle = document.getElementById('hasBoundary');
    hasBoundaryToggle.addEventListener('change', () => {
        const newHasBoundary = !hasBoundaryToggle.checked;
        hasBoundary = newHasBoundary;
        newMazeButton.click();
    });
}

/**
 * Main program logic
 */
function main() {
    setGameButtons();
    setSlidingBars();
    animate();
}


/**
 * Main Program
 */
const INNER_WIDTH = window.innerWidth; // Get the width of the browser window
const INNER_HEIGHT = window.innerHeight; // Get the height of the browser window
const textureLoader = new THREE.TextureLoader();

// Get the buttons from the DOM
const resetMazeButton = document.getElementById('resetMazeButton');
const newMazeButton = document.getElementById('newMazeButton');

// Initialize Three.js scene
const scene = new THREE.Scene();
scene.background = new THREE.Color(0xE1DAB8); // Set sky blue background color

// Set up the camera
const camera = new THREE.PerspectiveCamera(75, INNER_WIDTH / INNER_HEIGHT, 0.1, 1000); 
camera.position.set(0, 45, 35); // Position the camera above and in front of the origin
camera.lookAt(0, 0, 0); // Ensure the camera looks at the center of the scene

// Set up the renderer
const renderer = new THREE.WebGLRenderer({ antialias: true }); // Enable antialiasing for smoother edges
renderer.setSize(INNER_WIDTH, INNER_HEIGHT); // Match the renderer size to the browser window
renderer.outputColorSpace = THREE.SRGBColorSpace;
document.body.appendChild(renderer.domElement); // Append the rendering canvas to the document body

// Set up the lights
const ambientLight = new THREE.AmbientLight(0xffffff, 0.6); // Provide general illumination
scene.add(ambientLight);

const directionalLight = new THREE.DirectionalLight(0xffffff, 3.5); // Simulate sunlight with directional light
directionalLight.position.set(10, 20, 10); // Position the light in the scene
scene.add(directionalLight);

// Create the board mesh
const boardSize = { width: 50, depth: 50, thickness: 1 }; // Dimensions of the board
const boardGeometry = new THREE.BoxGeometry(boardSize.width, boardSize.thickness, boardSize.depth); // Board shape
const boardTexture = textureLoader.load('../textures/board.jpg');
boardTexture.colorSpace = THREE.SRGBColorSpace;
const boardMaterial = new THREE.MeshStandardMaterial({ 
    map: boardTexture,
    roughness: 0.1,
    metalness: 0.0,
}); // Wood-like material
const boardMesh = new THREE.Mesh(boardGeometry, boardMaterial); // Mesh combines geometry and material
boardMesh.position.set(0, 0, 0); // Center the board
scene.add(boardMesh);

// Generate the maze and create its walls
const mazeRows = 10; 
const mazeCols = 10;
const cellSize = boardSize.width / mazeCols; // Size of each maze cell
let hasBoundary = !document.getElementById("hasBoundary").checked;
let {walls, wallLocalPositions, wallGeometries} = generateWallData(mazeRows, mazeCols, cellSize, scene, hasBoundary);

// Create the ball mesh
const ballRadius = 1;
const ballGeometry = new THREE.SphereGeometry(ballRadius, 512, 512);
const ballTexture = textureLoader.load("../textures/ball.png");
ballTexture.colorSpace = THREE.SRGBColorSpace;
ballTexture.wrapS = THREE.RepeatWrapping;
ballTexture.wrapTw = THREE.RepeatWrapping;
// Repeat texture according to number of cells
ballTexture.repeat.set(0.2, 0.7);
const ballMaterial = new THREE.MeshStandardMaterial({
    map: ballTexture,
    roughness: 0.5,
}); // Red material
const ballMesh = new THREE.Mesh(ballGeometry, ballMaterial);
scene.add(ballMesh);

// Create a ball object to set its physical properties
const ball = {
    position: new THREE.Vector3(...getBallStartingPosition()), // Starting position above the board
    velocity: new THREE.Vector3(0, 0, 0), // Initial velocity
    acceleration: new THREE.Vector3(0, 0, 0), // Initial acceleration
    // mass: 1, // Mass of the ball,
    angularVelocity: new THREE.Vector3(0, 0, 0), // Angular velocity
};

// Necesary variables for animate
let friction = 0.99;
let restitution = 0.6; // Control the bounce effect, jump higher when approaching 1
let lastTime = performance.now();

// Program run
main();