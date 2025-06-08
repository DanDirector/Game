import { Body } from './physics.js';
import { applyMovement } from './movementController.js';
import { getNearestPlatform, findPath } from './platformGraph.js';

export function updateBotAI(botBody, playerBody, platformGraph, platformBodies, config, dt) {
    const { moveSpeed, jumpStrength, accelerationFactor, decelerationFactor, jumpVelocityThreshold } = config;

    if (!botBody.renderData.aiState) {
        botBody.renderData.aiState = {
            lastPlatform: null,
            targetPlatform: null,
            path: [],
            index: 0,
            lastPosX: botBody.position.x,
            stuckTime: Date.now()
        };
    }

    const ai = botBody.renderData.aiState;
    const now = Date.now();

    const botPlatform = getNearestPlatform(botBody, platformBodies);
    const playerPlatform = getNearestPlatform(playerBody, platformBodies);

    if (!ai.path.length || ai.targetPlatform !== playerPlatform?.label || ai.lastPlatform !== botPlatform?.label) {
        if (botPlatform && playerPlatform) {
            const newPath = findPath(platformGraph, botPlatform.label, playerPlatform.label);
            ai.path = newPath || [];
            ai.index = 1;
            ai.targetPlatform = playerPlatform.label;
        }
    }

    ai.lastPlatform = botPlatform ? botPlatform.label : null;

    const input = { moveLeft: false, moveRight: false, jumpPressed: false };

    let targetX = playerBody.position.x;
    let nextPlatform = null;

    if (ai.index < ai.path.length) {
        const nextLabel = ai.path[ai.index];
        nextPlatform = platformBodies.find(p => p.label === nextLabel);
        if (nextPlatform) targetX = nextPlatform.position.x;
    }

    const dx = targetX - botBody.position.x;
    if (Math.abs(dx) > 2) {
        if (dx < 0) input.moveLeft = true;
        else input.moveRight = true;
    }

    if (nextPlatform && botPlatform) {
        const verticalDiff = botPlatform.position.y - nextPlatform.position.y;
        const horizontalDistance = Math.abs(dx);
        if (verticalDiff > 20 && horizontalDistance < 220 && botBody.renderData.isOnGround && Math.abs(botBody.velocity.y) < jumpVelocityThreshold) {
            const botHeight = botBody.bounds.max.y - botBody.bounds.min.y;
            const headY = botBody.position.y - botHeight / 2;
            const nextBottom = nextPlatform.position.y + nextPlatform.renderData.height / 2;
            if (nextBottom - headY > 10) {
                input.jumpPressed = true;
            }
        }

        if (botPlatform.label === nextPlatform.label) {
            ai.index += 1;
        }
    } else {
        const dy = playerBody.position.y - botBody.position.y;
        const horizontalDistance = Math.abs(dx);
        const shouldJump = dy < -20 && horizontalDistance < 200;
        if (shouldJump && botBody.renderData.isOnGround && Math.abs(botBody.velocity.y) < jumpVelocityThreshold) {
            input.jumpPressed = true;
        }
    }

    const isStuck = Math.abs(botBody.position.x - ai.lastPosX) < 1 && (now - ai.stuckTime > 500);
    if (isStuck) {
        ai.path = [];
        ai.index = 0;
        if (botBody.renderData.isOnGround && Math.abs(botBody.velocity.y) < jumpVelocityThreshold) {
            input.jumpPressed = true;
        }
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
