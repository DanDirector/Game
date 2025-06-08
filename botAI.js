import { Body } from './physics.js';
import { applyMovement } from './movementController.js';

let navigationGraph = [];
let navConfig = { jumpHeight: 150, jumpReach: 260 };

export function initBotNavigation(platformBodies, config) {
    navConfig = { ...navConfig, ...config };
    navigationGraph = platformBodies
        .filter(p => p.label.startsWith('platform-') && p.label !== 'platform-ceiling')
        .map((p, index) => ({
            index,
            x: p.position.x - p.renderData.width / 2,
            y: p.position.y - p.renderData.height / 2,
            width: p.renderData.width,
            height: p.renderData.height,
            neighbors: []
        }));
    linkPlatforms(navigationGraph, navConfig);
}

function linkPlatforms(graph, config) {
    graph.forEach(platform => {
        graph.forEach(other => {
            if (platform === other) return;
            const dx = Math.abs((platform.x + platform.width / 2) - (other.x + other.width / 2));
            const dy = other.y - platform.y;
            if (dx <= config.jumpReach && dy > -config.jumpHeight && dy < config.jumpHeight) {
                platform.neighbors.push(other.index);
            }
        });
    });
}

function findCurrentPlatform(body) {
    const bottomY = body.bounds.max.y;
    return navigationGraph.find(p =>
        body.position.x >= p.x &&
        body.position.x <= p.x + p.width &&
        Math.abs(bottomY - p.y) <= 10
    );
}

function heuristic(a, b) {
    return Math.hypot(a.x - b.x, a.y - b.y);
}

function findPath(graph, startIdx, goalIdx) {
    const frontier = [{ idx: startIdx, cost: 0 }];
    const cameFrom = {};
    const costSoFar = {};
    cameFrom[startIdx] = null;
    costSoFar[startIdx] = 0;

    while (frontier.length) {
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
        if (current === null || current === undefined) return [];
    }
    return path;
}

export function updateBotAI(botBody, playerBody, config, dt) {
    const { moveSpeed, jumpStrength, accelerationFactor, decelerationFactor, jumpVelocityThreshold } = config;

    if (!botBody.renderData.aiState) {
        botBody.renderData.aiState = {
            lastPos: { x: botBody.position.x, y: botBody.position.y },
            stuckTimer: 0
        };
    }

    const ai = botBody.renderData.aiState;
    const input = { moveLeft: false, moveRight: false, jumpPressed: false };

    const botPlatform = findCurrentPlatform(botBody);
    const playerPlatform = findCurrentPlatform(playerBody);

    if (botPlatform && playerPlatform) {
        if (botPlatform.index === playerPlatform.index) {
            input.moveLeft = botBody.position.x > playerBody.position.x;
            input.moveRight = botBody.position.x < playerBody.position.x;
        } else {
            const path = findPath(navigationGraph, botPlatform.index, playerPlatform.index);
            if (path.length) {
                const nextPlatform = navigationGraph[path[0]];
                const targetX = nextPlatform.x + nextPlatform.width / 2;
                input.moveLeft = botBody.position.x > targetX + 2;
                input.moveRight = botBody.position.x < targetX - 2;
                if (botBody.position.y > nextPlatform.y && botBody.renderData.isOnGround &&
                    Math.abs(botBody.velocity.y) < jumpVelocityThreshold) {
                    input.jumpPressed = true;
                }
            }
        }
    }

    const movedDist = Math.hypot(botBody.position.x - ai.lastPos.x, botBody.position.y - ai.lastPos.y);
    if (movedDist < 1) {
        ai.stuckTimer += dt;
    } else {
        ai.stuckTimer = 0;
        ai.lastPos = { x: botBody.position.x, y: botBody.position.y };
    }
    if (ai.stuckTimer > 500 && botBody.renderData.isOnGround && Math.abs(botBody.velocity.y) < jumpVelocityThreshold) {
        input.jumpPressed = true;
        ai.stuckTimer = 0;
    }

    applyMovement(
        botBody,
        input,
        Body,
        { moveSpeed, jumpStrength, accelerationFactor, decelerationFactor, jumpVelocityThreshold },
        dt
    );
}
