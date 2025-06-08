export function buildPlatformGraph(platformBodies, maxHorizontal = 250, maxVertical = 220) {
    const platforms = platformBodies.filter(p => p.label.startsWith('platform-'));
    const graph = {};
    platforms.forEach(a => {
        graph[a.label] = [];
        platforms.forEach(b => {
            if (a === b) return;
            const dx = Math.abs(b.position.x - a.position.x);
            const dy = a.position.y - b.position.y;
            const horizontalReach = maxHorizontal + a.renderData.width / 2 + b.renderData.width / 2;
            if (dx <= horizontalReach) {
                if (dy <= maxVertical) {
                    graph[a.label].push(b.label);
                } else if (dy < -maxVertical) {
                    // allow drops to lower platforms within horizontal reach
                    graph[a.label].push(b.label);
                }
            }
        });
    });
    return graph;
}

export function getNearestPlatform(body, platformBodies) {
    let best = null;
    let bestDy = Infinity;
    platformBodies.forEach(p => {
        if (!p.label.startsWith('platform-')) return;
        const halfWidth = p.renderData.width / 2;
        const dx = Math.abs(body.position.x - p.position.x);
        if (dx <= halfWidth + 20) {
            const topY = p.position.y - p.renderData.height / 2;
            const dy = topY - body.position.y;
            if (dy >= -10 && dy < bestDy) {
                bestDy = dy;
                best = p;
            }
        }
    });
    return best;
}

export function findPath(graph, startLabel, goalLabel) {
    if (!startLabel || !goalLabel) return null;
    const queue = [startLabel];
    const visited = new Set([startLabel]);
    const prev = {};
    while (queue.length) {
        const current = queue.shift();
        if (current === goalLabel) break;
        const neighbors = graph[current] || [];
        neighbors.forEach(n => {
            if (!visited.has(n)) {
                visited.add(n);
                prev[n] = current;
                queue.push(n);
            }
        });
    }
    if (!visited.has(goalLabel)) return null;
    const path = [];
    let cur = goalLabel;
    while (cur) {
        path.unshift(cur);
        cur = prev[cur];
    }
    return path;
}
