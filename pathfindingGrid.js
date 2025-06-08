export const CELL_SIZE = 50;

export function buildMatrix(platformData, worldWidth, worldHeight) {
    const rows = Math.ceil(worldHeight / CELL_SIZE);
    const cols = Math.ceil(worldWidth / CELL_SIZE);
    const matrix = Array.from({ length: rows }, () => Array(cols).fill(1));

    platformData.forEach(p => {
        const isWalkable = p.label.startsWith('platform') && p.label !== 'platform-ceiling';
        if (!isWalkable) return;
        const left = p.x - p.width / 2;
        const right = p.x + p.width / 2;
        const top = p.y - p.height / 2;
        const bottom = p.y + p.height / 2;
        const startCol = Math.floor(left / CELL_SIZE);
        const endCol = Math.floor((right - 1) / CELL_SIZE);
        const startRow = Math.floor(top / CELL_SIZE);
        const endRow = Math.floor((bottom - 1) / CELL_SIZE);
        for (let r = startRow; r <= endRow; r++) {
            for (let c = startCol; c <= endCol; c++) {
                if (r >= 0 && r < rows && c >= 0 && c < cols) {
                    matrix[r][c] = 0;
                }
            }
        }
    });

    return matrix;
}

export function worldToGrid(x, y) {
    return { gx: Math.floor(x / CELL_SIZE), gy: Math.floor(y / CELL_SIZE) };
}

export function gridToWorld(gx, gy) {
    return { x: gx * CELL_SIZE + CELL_SIZE / 2, y: gy * CELL_SIZE + CELL_SIZE / 2 };
}
export function findPath(start, end, matrix) {
    const rows = matrix.length;
    const cols = matrix[0].length;
    const visited = Array.from({ length: rows }, () => Array(cols).fill(false));
    const queue = [{ x: start.gx, y: start.gy, path: [[start.gx, start.gy]] }];
    visited[start.gy][start.gx] = true;
    const dirs = [
        [1, 0],
        [-1, 0],
        [0, 1],
        [0, -1]
    ];
    while (queue.length > 0) {
        const node = queue.shift();
        if (node.x === end.gx && node.y === end.gy) {
            return node.path;
        }
        for (const [dx, dy] of dirs) {
            const nx = node.x + dx;
            const ny = node.y + dy;
            if (nx >= 0 && nx < cols && ny >= 0 && ny < rows && !visited[ny][nx] && matrix[ny][nx] === 0) {
                visited[ny][nx] = true;
                queue.push({ x: nx, y: ny, path: [...node.path, [nx, ny]] });
            }
        }
    }
    return [];
}
