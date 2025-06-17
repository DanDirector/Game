import { Body } from './physics.js';
import { applyMovement } from './movementController.js';

const AI_STATES = {
    IDLE: 'idle',
    CHASING: 'chasing',
    STUCK: 'stuck',
};

function createNavigationGraph(platforms, config) {
    return platforms.map((platform, index) => ({
        index,
        x: platform.x,
        y: platform.y,
        width: platform.width,
        height: platform.height,
        neighbors: platforms
            .filter(other => other !== platform)
            .reduce((acc, other, otherIdx) => {
                const horizontalDist = Math.abs(
                    (platform.x + platform.width / 2) - (other.x + other.width / 2)
                );
                const verticalDist = other.y - platform.y;
                if (
                    horizontalDist <= config.jumpReach &&
                    verticalDist > -config.jumpHeight &&
                    verticalDist < config.jumpHeight
                ) {
                    acc.push(otherIdx);
                }
                return acc;
            }, []),
    }));
}

function findCurrentPlatform(body, graph) {
    return graph.find(
        p =>
            body.position.x >= p.x &&
            body.position.x <= p.x + p.width &&
            body.position.y <= p.y &&
            body.position.y >= p.y - p.height
    );
}

function heuristic(a, b) {
    return Math.hypot(a.x - b.x, a.y - b.y);
}

function findPath(graph, startIdx, goalIdx) {
    const frontier = [{ idx: startIdx, cost: 0 }];
    const cameFrom = { [startIdx]: null };
    const costSoFar = { [startIdx]: 0 };

    while (frontier.length > 0) {
        frontier.sort((a, b) => a.cost - b.cost);
        const current = frontier.shift().idx;

        if (current === goalIdx) break;

        graph[current].neighbors.forEach(nextIdx => {
            const newCost = costSoFar[current] + heuristic(graph[current], graph[nextIdx]);
            if (!(nextIdx in costSoFar) || newCost < costSoFar[nextIdx]) {
                costSoFar[nextIdx] = newCost;
                frontier.push({
                    idx: nextIdx,
                    cost: newCost + heuristic(graph[nextIdx], graph[goalIdx])
                });
                cameFrom[nextIdx] = current;
            }
        });
    }

    let current = goalIdx;
    const path = [];
    while (current !== startIdx && current !== null) {
        path.unshift(current);
        current = cameFrom[current];
    }
    return current === startIdx ? path : [];
}

function checkStuck(botBody, aiState, config, dt) {
    const dist = Math.hypot(
        botBody.position.x - aiState.lastPos.x,
        botBody.position.y - aiState.lastPos.y
    );
    if (dist < config.stuckDistanceThreshold) {
        // dt provided from the game loop is already in milliseconds
        // so we simply accumulate it without additional scaling
        aiState.stuckTimer += dt;
    } else {
        aiState.stuckTimer = 0;
        aiState.lastPos = { x: botBody.position.x, y: botBody.position.y };
    }
    return aiState.stuckTimer > config.stuckTimeThreshold;
}

export function updateBotAI(botBody, playerBody, platforms, config, dt, collisionSystem = null) {
    const {
        moveSpeed = 100,
        jumpStrength = 300,
        accelerationFactor = 0.1,
        decelerationFactor = 0.2,
        jumpVelocityThreshold = 0.1,
        jumpReach = 200,
        jumpHeight = 100,
        chaseDistanceThreshold = 2,
        stuckDistanceThreshold = 1,
        stuckTimeThreshold = 500,
        minJumpInterval = 500,
    } = config;

    if (!botBody.aiState) {
        botBody.aiState = {
            state: AI_STATES.IDLE,
            lastPos: { x: botBody.position.x, y: botBody.position.y },
            stuckTimer: 0,
            lastJumpTime: 0,
            navigationGraph: createNavigationGraph(platforms, config),
        };
    }

    const ai = botBody.aiState;
    const now = Date.now();
    const input = { moveLeft: false, moveRight: false, jumpPressed: false, down: false };

    if (checkStuck(botBody, ai, { stuckDistanceThreshold, stuckTimeThreshold }, dt)) {
        ai.state = AI_STATES.STUCK;
    } else if (ai.state === AI_STATES.STUCK) {
        ai.state = AI_STATES.IDLE;
    }

    const botPlatform = findCurrentPlatform(botBody, ai.navigationGraph);
    const playerPlatform = findCurrentPlatform(playerBody, ai.navigationGraph);

    if (ai.state === AI_STATES.STUCK) {
        if (botBody.renderData.isOnGround && now - ai.lastJumpTime > minJumpInterval) {
            input.jumpPressed = true;
            ai.lastJumpTime = now;
        }
    } else if (!botPlatform || !playerPlatform) {
        ai.state = AI_STATES.IDLE;
    } else if (botPlatform.index === playerPlatform.index) {
        ai.state = AI_STATES.CHASING;
        const dx = playerBody.position.x - botBody.position.x;
        if (Math.abs(dx) > chaseDistanceThreshold) {
            if (collisionSystem) {
                const direction = dx < 0 ? -1 : 1;
                const nextPos = {
                    x: botBody.position.x + direction * moveSpeed * dt,
                    y: botBody.position.y
                };
                if (!collisionSystem.checkCollision(botBody, nextPos)) {
                    input.moveLeft = dx < 0;
                    input.moveRight = dx > 0;
                } else if (
                    botBody.renderData.isOnGround &&
                    now - ai.lastJumpTime > minJumpInterval
                ) {
                    input.jumpPressed = true;
                    ai.lastJumpTime = now;
                }
            } else {
                input.moveLeft = dx < 0;
                input.moveRight = dx > 0;
            }
        }
    } else {
        ai.state = AI_STATES.CHASING;
        const path = findPath(ai.navigationGraph, botPlatform.index, playerPlatform.index);
        if (path.length > 0) {
            const nextPlatform = ai.navigationGraph[path[0]];
            const targetX = nextPlatform.x + nextPlatform.width / 2;
            const dx = targetX - botBody.position.x;

            if (collisionSystem) {
                const direction = dx < 0 ? -1 : 1;
                const nextPos = {
                    x: botBody.position.x + direction * moveSpeed * dt,
                    y: botBody.position.y
                };
                if (!collisionSystem.checkCollision(botBody, nextPos)) {
                    input.moveLeft = dx < 0;
                    input.moveRight = dx > 0;
                }
            } else {
                input.moveLeft = dx < 0;
                input.moveRight = dx > 0;
            }

            if (
                botBody.position.y > nextPlatform.y &&
                botBody.renderData.isOnGround &&
                now - ai.lastJumpTime > minJumpInterval
            ) {
                input.jumpPressed = true;
                ai.lastJumpTime = now;
            }
            if (botBody.position.y < nextPlatform.y) {
                input.down = true;
            }
        }
    }

    applyMovement(
        botBody,
        input,
        Body,
        {
            moveSpeed,
            jumpStrength,
            accelerationFactor,
            decelerationFactor,
            jumpVelocityThreshold
        },
        dt
    );
}
