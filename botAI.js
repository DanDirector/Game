import { Body } from './physics.js';
import { applyMovement } from './movementController.js';
import { findCurrentPlatform, findPath } from './navigationGraph.js';

export function updateBotAI(botBody, playerBody, config, dt, { graph }) {
    const { moveSpeed, jumpStrength, accelerationFactor, decelerationFactor, jumpVelocityThreshold } = config;

    if (!botBody.renderData.aiState) {
        botBody.renderData.aiState = {
            lastPosition: { x: botBody.position.x, y: botBody.position.y },
            stuckTimer: 0
        };
    }

    const ai = botBody.renderData.aiState;

    const botPlatform = findCurrentPlatform(botBody, graph);
    const playerPlatform = findCurrentPlatform(playerBody, graph);

    const input = { moveLeft: false, moveRight: false, jumpPressed: false };

    if (botPlatform && playerPlatform) {
        if (botPlatform.index === playerPlatform.index) {
            if (botBody.position.x > playerBody.position.x + 2) input.moveLeft = true;
            if (botBody.position.x < playerBody.position.x - 2) input.moveRight = true;
        } else {
            const path = findPath(graph, botPlatform.index, playerPlatform.index);
            if (path.length > 0) {
                const nextPlatform = graph[path[0]];
                const targetX = nextPlatform.x;
                if (botBody.position.x > targetX + 2) input.moveLeft = true;
                if (botBody.position.x < targetX - 2) input.moveRight = true;
                if (botBody.position.y > nextPlatform.y && botBody.renderData.isOnGround && Math.abs(botBody.velocity.y) < jumpVelocityThreshold) {
                    input.jumpPressed = true;
                }
            }
        }
    }

    if (Math.hypot(botBody.position.x - ai.lastPosition.x, botBody.position.y - ai.lastPosition.y) < 1) {
        ai.stuckTimer += dt;
    } else {
        ai.stuckTimer = 0;
        ai.lastPosition = { x: botBody.position.x, y: botBody.position.y };
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
