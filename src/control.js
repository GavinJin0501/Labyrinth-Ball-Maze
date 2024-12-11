// Keyboard control for tilting the board
let tiltSpeed = 0.005; // Speed of tilt adjustment
let tilt = { x: 0, z: 0 }; // Current tilt angles
const tiltDirection = { x: 0, z: 0 }; // Direction of tilt

window.addEventListener('keydown', (event) => {
    switch (event.key) {
        case 'w': tiltDirection.x = -1; break; // Tilt forward
        case 's': tiltDirection.x = 1; break; // Tilt backward
        case 'a': tiltDirection.z = 1; break; // Tilt left
        case 'd': tiltDirection.z = -1; break; // Tilt right
    }
});

window.addEventListener('keyup', (event) => {
    switch (event.key) {
        case 'w':
        case 's': tiltDirection.x = 0; break; // Stop forward/backward tilt
        case 'a':
        case 'd': tiltDirection.z = 0; break; // Stop left/right tilt
    }
});

function setTiltSpeed(newSpeed) {
    tiltSpeed = newSpeed
}

export { tiltSpeed, tilt, tiltDirection, setTiltSpeed }