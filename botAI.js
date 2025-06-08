import { Body } from './physics.js';
import { applyMovement } from './movementController.js';

let navGraph = null;

function buildNavGraph(platformBodies, jumpReach, jumpHeight) {
    const nodes = platformBodies
        .filter(b => b.label.startsWith('platform-'))
        .map((b, index) => ({
            index,
            body: b,
            x: b.position.x,
            width: b.renderData.width,
            top: b.position.y - b.renderData.height / 2,
            neighbors: []
        }));

    nodes.forEach(a => {
        nodes.forEach(b => {
            if (a === b) return;
            const horiz = Math.abs(b.x - a.x) - (a.width / 2 + b.width / 2);
            if (horiz > jumpReach) return;
            const dy = a.top - b.top;
            if (dy >= 0 && dy <= jumpHeight) {
                a.neighbors.push(b.index); // jump up
            } else if (dy < 0) {
                a.neighbors.push(b.index); // fall down or same level
            }
        });
    });
    return nodes;
}

function findPlatformIndex(pos, graph) {
    if (!graph) return null;
    let best = null;
    let bestDy = Infinity;
    const x = pos.x;
    const y = pos.y;
    graph.forEach((node, idx) => {
        const half = node.width / 2;
        if (x >= node.x - half - 20 && x <= node.x + half + 20) {
            const dy = y - node.top;
            if (dy >= -40 && dy < bestDy) {
                best = idx;
                bestDy = dy;
            }
        }
    });
    return best;
}

function bfs(graph, startIdx, goalIdx) {
    const queue = [[startIdx]];
    const visited = new Set([startIdx]);
    while (queue.length) {
        const path = queue.shift();
        const last = path[path.length - 1];
        if (last === goalIdx) return path;
        graph[last].neighbors.forEach(n => {
            if (!visited.has(n)) {
                visited.add(n);
                queue.push([...path, n]);
            }
        });
    }
    return null;
}

export function updateBotAI(botBody, playerBody, platformBodies, config, dt) {
    const { moveSpeed, jumpStrength, accelerationFactor, decelerationFactor, jumpVelocityThreshold, jumpReach = 300, jumpHeight = 220 } = config;

    if (!navGraph) {
        navGraph = buildNavGraph(platformBodies, jumpReach, jumpHeight);
    }

    if (!botBody.renderData.aiState) {
        botBody.renderData.aiState = {
            lastPosX: botBody.position.x,
            stuckTime: Date.now()
        };
    }

    const ai = botBody.renderData.aiState;
    const now = Date.now();

    const input = { moveLeft: false, moveRight: false, jumpPressed: false };

    const botPlatform = findPlatformIndex(botBody.position, navGraph);
    const playerPlatform = findPlatformIndex(playerBody.position, navGraph);

    let targetX = playerBody.position.x;
    let targetTop = playerBody.position.y;
    if (botPlatform !== null && playerPlatform !== null && botPlatform !== playerPlatform) {
        const path = bfs(navGraph, botPlatform, playerPlatform);
        if (path && path.length > 1) {
            const nextNode = navGraph[path[1]];
            targetX = nextNode.x;
            targetTop = nextNode.top;
        }
    }

    if (Math.abs(targetX - botBody.position.x) > 2) {
        if (targetX < botBody.position.x) input.moveLeft = true;
        else input.moveRight = true;
    }

    const currentTop = botPlatform !== null ? navGraph[botPlatform].top : botBody.position.y;
    const wantJump = targetTop < currentTop - 5;

    const isStuck = Math.abs(botBody.position.x - ai.lastPosX) < 1 && now - ai.stuckTime > 500;

    if ((wantJump || isStuck) && botBody.renderData.isOnGround && Math.abs(botBody.velocity.y) < jumpVelocityThreshold) {
        input.jumpPressed = true;
        ai.stuckTime = now;
    }

    if (Math.abs(botBody.position.x - ai.lastPosX) >= 1) {
        ai.stuckTime = now;
    }

    ai.lastPosX = botBody.position.x;

    applyMovement(
        botBody,
        input,
        Body,
        { moveSpeed, jumpStrength, accelerationFactor, decelerationFactor, jumpVelocityThreshold },
        dt
    );
}
