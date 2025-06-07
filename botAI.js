import { Body } from './physics.js';
import { applyMovement } from './movementController.js';

export function updateBotAI(botBody, playerBody, config, dt) {
    const { moveSpeed, jumpStrength, accelerationFactor, decelerationFactor, jumpVelocityThreshold } = config;

    if (!botBody.renderData.aiState) {
        botBody.renderData.aiState = {
            lastTagState: botBody.renderData.isTagger,
            pauseUntil: 0,
            lastSpeedUpdate: Date.now(),
            speedMultiplier: 1,
            hesitateUntil: 0,
            stuckTime: Date.now(),
            lastPosX: botBody.position.x
        };
    }

    const ai = botBody.renderData.aiState;
    const now = Date.now();

    if (botBody.renderData.isTagger !== ai.lastTagState) {
        ai.pauseUntil = now + 300;
        ai.lastTagState = botBody.renderData.isTagger;
    }

    if (now - ai.lastSpeedUpdate > 1000) {
        ai.speedMultiplier = 0.9 + Math.random() * 0.2;
        ai.lastSpeedUpdate = now;
    }

    if (now >= ai.hesitateUntil && Math.random() < 0.12) {
        ai.hesitateUntil = now + 200 + Math.random() * 200;
    }

    const input = { moveLeft: false, moveRight: false, jumpPressed: false };

    if (now >= ai.pauseUntil && now >= ai.hesitateUntil) {
        const dx = playerBody.position.x - botBody.position.x;
        const direction = dx === 0 ? 0 : dx > 0 ? 1 : -1;
        let chase = direction;
        if (!botBody.renderData.isTagger) chase *= -1;
        if (chase < 0) input.moveLeft = true;
        if (chase > 0) input.moveRight = true;
    }

    if (botBody.renderData.isOnGround && now >= ai.pauseUntil && now >= ai.hesitateUntil) {
        const dx = playerBody.position.x - botBody.position.x;
        const dy = playerBody.position.y - botBody.position.y;
        if (dy < -20 && Math.abs(dx) < 150) {
            if (Math.random() > 0.1 && Math.abs(botBody.velocity.y) < jumpVelocityThreshold) {
                input.jumpPressed = true;
            }
        }
    }

    if (!botBody.renderData.isTagger && botBody.renderData.isOnGround) {
        if (Math.random() < 0.05 && Math.abs(botBody.velocity.y) < jumpVelocityThreshold) {
            input.jumpPressed = true;
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
