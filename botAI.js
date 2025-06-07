import { Body } from './physics.js';
import { applyMovement } from './movementController.js';

function findPlatformForBody(body, platforms) {
    const bottomY = body.bounds.max.y;
    const halfBodyW = (body.bounds.max.x - body.bounds.min.x) / 2;
    for (const p of platforms) {
        if (!p.label.startsWith('platform')) continue;
        const topY = p.position.y - p.renderData.height / 2;
        const halfW = p.renderData.width / 2;
        if (Math.abs(bottomY - topY) <= 6) {
            if (body.position.x + halfBodyW > p.position.x - halfW &&
                body.position.x - halfBodyW < p.position.x + halfW) {
                return p;
            }
        }
    }
    return null;
}

function findReachablePlatformAbove(body, platforms, maxJump = 220, targetX = null) {
    const bottomY = body.bounds.max.y;
    let closest = null;
    let bestDy = Infinity;
    for (const p of platforms) {
        if (!p.label.startsWith('platform')) continue;
        const topY = p.position.y - p.renderData.height / 2;
        if (topY <= bottomY) continue; // only consider platforms above body
        const refX = targetX !== null ? targetX : body.position.x;
        const dx = Math.abs(refX - p.position.x);
        const halfW = p.renderData.width / 2;
        if (dx <= halfW + 30) {
            const dy = topY - bottomY;
            if (dy <= maxJump && dy < bestDy) {
                bestDy = dy;
                closest = p;
            }
        }
    }
    return closest;
}

function shouldJumpTowardsPlatform(body, from, to) {
    if (!from || !to) return false;
    const direction = Math.sign(to.position.x - from.position.x) || 1;
    const edgeX = from.position.x + direction * from.renderData.width / 2;
    const dx = Math.abs(body.position.x - edgeX);
    const gap = Math.abs(to.position.x - from.position.x) -
        (from.renderData.width + to.renderData.width) / 2;
    const verticalDiff = from.position.y - to.position.y;
    return dx < 20 && (verticalDiff > 10 || gap > 20);
}

function buildPlatformGraph(platforms) {
    const graph = {};
    const valid = platforms.filter(p => p.label.startsWith('platform'));
    for (const a of valid) {
        graph[a.label] = [];
        for (const b of valid) {
            if (a === b) continue;
            const dx = Math.abs(b.position.x - a.position.x);
            const dy = b.position.y - a.position.y;
            const maxJump = 220;
            const maxGap = 260;
            if (Math.abs(dy) <= maxJump && dx - (a.renderData.width + b.renderData.width)/2 <= maxGap) {
                graph[a.label].push(b.label);
            }
        }
    }
    return graph;
}

function findPath(graph, start, target) {
    if (!graph[start] || !graph[target]) return null;
    const queue = [[start]];
    const visited = new Set([start]);
    while (queue.length > 0) {
        const path = queue.shift();
        const node = path[path.length - 1];
        if (node === target) return path;
        for (const n of graph[node]) {
            if (!visited.has(n)) {
                visited.add(n);
                queue.push([...path, n]);
            }
        }
    }
    return null;
}

export function updateBotAI(botBody, playerBody, config, dt, platformBodies) {
    const { moveSpeed, jumpStrength, accelerationFactor, decelerationFactor, jumpVelocityThreshold } = config;

    if (!botBody.renderData.aiState) {
        botBody.renderData.aiState = {
            lastPosX: botBody.position.x,
            stuckTime: Date.now(),
            platformGraph: buildPlatformGraph(platformBodies)
        };
    }

    const ai = botBody.renderData.aiState;
    if (!ai.platformGraph) {
        ai.platformGraph = buildPlatformGraph(platformBodies);
    }
    const now = Date.now();

    const input = { moveLeft: false, moveRight: false, jumpPressed: false };

    const botPlatform = findPlatformForBody(botBody, platformBodies);
    const playerPlatform = findPlatformForBody(playerBody, platformBodies);

    let targetX = playerBody.position.x;
    let wantJump = false;
    let targetPlatform = null;

    if (!botPlatform && playerPlatform) {
        const above = findReachablePlatformAbove(botBody, platformBodies, 220, playerBody.position.x);
        if (above) {
            targetPlatform = above;
            targetX = above.position.x;
            wantJump = true;
        }
    } else if (botPlatform && playerPlatform && botPlatform.label !== playerPlatform.label) {
        const path = findPath(ai.platformGraph, botPlatform.label, playerPlatform.label);
        if (path && path.length > 1) {
            const nextLabel = path[1];
            const nextPlat = platformBodies.find(p => p.label === nextLabel);
            if (nextPlat) {
                targetPlatform = nextPlat;
                targetX = nextPlat.position.x;
                wantJump = shouldJumpTowardsPlatform(botBody, botPlatform, nextPlat);
            }
        }
    }

    const dx = targetX - botBody.position.x;
    if (Math.abs(dx) > 2) {
        if (dx < 0) input.moveLeft = true;
        else input.moveRight = true;
    }

    const horizontalDistance = Math.abs(dx);
    let closeEnough;
    if (targetPlatform) {
        const margin = targetPlatform.renderData.width / 2 + 40;
        closeEnough = horizontalDistance < margin || wantJump;
    } else {
        closeEnough = horizontalDistance < 120;
    }
    const shouldJump = wantJump && closeEnough;

    const isStuck = (Math.abs(botBody.position.x - ai.lastPosX) < 1) && (now - ai.stuckTime > 700);

    if ((shouldJump || isStuck) && botBody.renderData.isOnGround && Math.abs(botBody.velocity.y) < jumpVelocityThreshold) {
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
