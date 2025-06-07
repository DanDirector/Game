import { Body } from './physics.js';
import { applyMovement } from './movementController.js';

export function updateBotAI(botBody, playerBody, config, dt) {
    const { moveSpeed, jumpStrength, accelerationFactor, decelerationFactor, jumpVelocityThreshold } = config;

    if (!botBody.renderData.aiState) {
        botBody.renderData.aiState = {
            stuckTime: Date.now(),
            lastPosX: botBody.position.x
        };
    }

    const ai = botBody.renderData.aiState;
    const now = Date.now();

    const input = { moveLeft: false, moveRight: false, jumpPressed: false };

    // Horizontal pursuit
    const dx = playerBody.position.x - botBody.position.x;
    if (Math.abs(dx) > 2) {
        if (dx < 0) input.moveLeft = true;
        else input.moveRight = true;
    }

    // Basic platform awareness
    const dy = playerBody.position.y - botBody.position.y;
    const horizontalDistance = Math.abs(dx);
    const verticalDistance = Math.abs(dy);

    const shouldJumpToReach = dy < -20 && horizontalDistance < 200;
    const isStuck = (Math.abs(botBody.position.x - ai.lastPosX) < 1) && (now - ai.stuckTime > 500);

    if ((shouldJumpToReach || isStuck) && botBody.renderData.isOnGround && Math.abs(botBody.velocity.y) < jumpVelocityThreshold) {
        input.jumpPressed = true;
        ai.stuckTime = now;
    }

    // Update stuck state
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
