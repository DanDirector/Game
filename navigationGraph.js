export function buildNavigationGraph(platforms, config) {
    const nodes = platforms
        .filter(p => p.label && p.label.startsWith('platform'))
        .map((p, index) => ({
            index,
            x: p.x,
            y: p.y,
            width: p.width,
            height: p.height,
            neighbors: [],
            label: p.label
        }));
    linkPlatforms(nodes, config);
    return nodes;
}

export function linkPlatforms(graph, { jumpReach, jumpHeight }) {
    graph.forEach(platform => {
        graph.forEach(other => {
            if (platform === other) return;
            const horizontalDist = Math.abs(platform.x - other.x);
            const verticalDist = other.y - platform.y;
            if (horizontalDist <= jumpReach &&
                verticalDist > -jumpHeight &&
                verticalDist < jumpHeight) {
                platform.neighbors.push(other.index);
            }
        });
    });
}

export function findCurrentPlatform(body, graph) {
    return graph.find(p =>
        body.position.x >= p.x - p.width / 2 &&
        body.position.x <= p.x + p.width / 2 &&
        body.position.y >= p.y - p.height / 2 &&
        body.position.y <= p.y + p.height / 2
    );
}

function heuristic(a, b) {
    return Math.hypot(a.x - b.x, a.y - b.y);
}

export function findPath(graph, startIdx, goalIdx) {
    const frontier = [{ idx: startIdx, cost: 0 }];
    const cameFrom = {};
    const costSoFar = {};
    cameFrom[startIdx] = null;
    costSoFar[startIdx] = 0;

    while (frontier.length > 0) {
        frontier.sort((a, b) => a.cost - b.cost);
        const current = frontier.shift().idx;
        if (current === goalIdx) break;

        graph[current].neighbors.forEach(nextIdx => {
            const newCost = costSoFar[current] + heuristic(graph[current], graph[nextIdx]);
            if (!(nextIdx in costSoFar) || newCost < costSoFar[nextIdx]) {
                costSoFar[nextIdx] = newCost;
                frontier.push({ idx: nextIdx, cost: newCost + heuristic(graph[nextIdx], graph[goalIdx]) });
                cameFrom[nextIdx] = current;
            }
        });
    }

    let current = goalIdx;
    const path = [];
    while (current !== startIdx) {
        path.unshift(current);
        current = cameFrom[current];
        if (current === undefined) return [];
    }
    return path;
}
