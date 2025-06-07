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

    const dx = playerBody.position.x - botBody.position.x;
    const dy = playerBody.position.y - botBody.position.y;

    if (dx > 5) input.moveRight = true;
    else if (dx < -5) input.moveLeft = true;

    if (botBody.renderData.isOnGround) {
        if (dy < -40 && Math.abs(dx) < 150 && Math.abs(dx) > 50) {
            if (Math.abs(botBody.velocity.y) < jumpVelocityThreshold) {
                input.jumpPressed = true;
            }
        }
    }

    if ((input.moveLeft || input.moveRight) && Math.abs(botBody.velocity.x) < 0.2) {
        if (Math.abs(botBody.position.x - ai.lastPosX) < 1) {
            if (now - ai.stuckTime > 500 && botBody.renderData.isOnGround) {
                input.jumpPressed = true;
                ai.stuckTime = now;
            }
        } else {
            ai.stuckTime = now;
        }
    } else {
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
