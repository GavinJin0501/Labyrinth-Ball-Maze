import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.170.0/build/three.module.js';

const DIR_ARRAY = {
    top: [-1, 0, "bottom"],
    right: [0, 1, "left"],
    bottom: [1, 0, "top"],
    left: [0, -1, "right"],
};

/**
 * Maze generation using dfs
 * 
 * @param {*} rows 
 * @param {*} cols 
 * @returns a matrix with size rows * cols, where each element represents a cell
 */
function generateMaze(rows, cols, hasBoundary = ture) {
    // Initialize the matrix
    const maze = [];
    for (let i = 0; i < rows; i++) {
        const row = [];
        for (let j = 0; j < cols; j++) {
            row.push({
                visited: false,
                walls: { top: true, right: true, bottom: true, left: true },
            });
        }
        maze.push(row);
    }

    function dfs(currRow, currCol) {
        maze[currRow][currCol].visited = true;
        const dirs = ["top", "right", "bottom", "left"].sort(() => Math.random() - 0.5);
        for (const dir of dirs) {
            const [dRow, dCol, oppositeWall] = DIR_ARRAY[dir];
            const nextRow = currRow + dRow;
            const nextCol = currCol + dCol;

            if (
                nextRow >= 0 &&
                nextRow < rows &&
                nextCol >= 0 &&
                nextCol < cols &&
                !maze[nextRow][nextCol].visited
            ) {
                maze[currRow][currCol].walls[dir] = false;
                maze[nextRow][nextCol].walls[oppositeWall] = false;
                dfs(nextRow, nextCol);
            }
        }
    }

    dfs(0, 0); // Start maze generation at (0, 0)
    // Remove the boundary
    if (!hasBoundary) {
        // Remove the left and right boundary
        for (let row = 0; row < rows; row++) {
            maze[row][0].walls.left = false; 
            maze[row][cols - 1].walls.right = false;
        }
        // Remove the top and bottom boundary
        for (let col = 0; col < cols; col++) {
            maze[0][col].walls.top = false; 
            maze[rows - 1][col].walls.bottom = false;
        }
    }
    return maze;
}

/**
 * Create wall meshes based on the maze structure
 * 
 * @param {*} maze 
 * @param {*} scene 
 * @param {*} cellSize 
 * @returns 
 */
function createMazeWalls(maze, scene, cellSize) {
    const walls = []; // Store wall meshes  
    const wallLocalPositions = []; // Store local positions of walls relative to the board
    const wallGeometries = []; // Store geometry of each wall

    // Definition for each wall 
    const WALL_DEFINITIONS = {
        top: { geometry: new THREE.BoxGeometry(cellSize, 3, 0.5), offset: [0, 1.5, -cellSize / 2], dimensions: { width: cellSize, height: 3, depth: 0.5 } },
        right: { geometry: new THREE.BoxGeometry(0.5, 3, cellSize), offset: [cellSize / 2, 1.5, 0], dimensions: { width: 0.5, height: 3, depth: cellSize } },
        bottom: { geometry: new THREE.BoxGeometry(cellSize, 3, 0.5), offset: [0, 1.5, cellSize / 2], dimensions: { width: cellSize, height: 3, depth: 0.5 } },
        left: { geometry: new THREE.BoxGeometry(0.5, 3, cellSize), offset: [-cellSize / 2, 1.5, 0], dimensions: { width: 0.5, height: 3, depth: cellSize } },
    };
    const textureLoader = new THREE.TextureLoader();
    const wallTexture = textureLoader.load('../textures/wall.jpg');
    wallTexture.colorSpace = THREE.SRGBColorSpace;
    wallTexture.wrapS = THREE.RepeatWrapping;
    wallTexture.wrapTw = THREE.RepeatWrapping;
    // Repeat texture according to number of cells
    wallTexture.repeat.set(0.75, 0.65);

    for (let row = 0; row < maze.length; row++) {
        for (let col = 0; col < maze[row].length; col++) {
            const cell = maze[row][col];
            // Shift by +0.5 to center
            const x = (col - maze[0].length / 2 + 0.5) * cellSize; 
            const z = (row - maze.length / 2 + 0.5) * cellSize;
            
            // Build wall for each cell in 4 directions
            for (const direction of ['top', 'bottom', 'left', 'right']) {
                if (cell.walls[direction]) {
                    const { geometry, offset, dimensions } = WALL_DEFINITIONS[direction];
                    const [dx, dy, dz] = offset;

                    const wallMesh = new THREE.Mesh(
                        geometry.clone(), // Clone to avoid shared references
                        new THREE.MeshStandardMaterial({ 
                            map: wallTexture,
                            roughness: 0.8,
                            metalness: 0.0,
                        })
                    );
                    
                    wallMesh.position.set(x + dx, dy, z + dz);
                    scene.add(wallMesh);

                    walls.push(wallMesh);
                    wallGeometries.push(dimensions);
                    wallLocalPositions.push(new THREE.Vector3(x + dx, dy, z + dz));
                }
            }
        }
    }

    return {walls, wallLocalPositions, wallGeometries}
}

function generateWallData(rows, cols, cellSize, scene, hasBoundary = true) {
    const maze = generateMaze(rows, cols, hasBoundary);
    return createMazeWalls(maze, scene, cellSize);
}

export { generateWallData }