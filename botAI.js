import { Body } from './physics.js';

export function updateBotAI(botBody, playerBody, config) {
    const { moveSpeed, jumpStrength, accelerationFactor, jumpVelocityThreshold } = config;

    if (!botBody.renderData.aiState) {
        botBody.renderData.aiState = {
            stuckTime: Date.now(),
            lastPosX: botBody.position.x
        };
    }

    const ai = botBody.renderData.aiState;
    const now = Date.now();

    const dx = playerBody.position.x - botBody.position.x;
    const direction = dx === 0 ? 0 : dx > 0 ? 1 : -1;
    let targetVx = direction * moveSpeed * 1.4;
    if (!botBody.renderData.isTagger) {
        targetVx *= -1;
    }

    const currentVx = botBody.velocity.x;
    const newVx = currentVx + (targetVx - currentVx) * accelerationFactor * 2;
    Body.setVelocity(botBody, { x: newVx, y: botBody.velocity.y });
    if (newVx < -0.1) {
        botBody.renderData.facingDirection = 'left';
    } else if (newVx > 0.1) {
        botBody.renderData.facingDirection = 'right';
    }

    if (botBody.renderData.isOnGround) {
        const dx = playerBody.position.x - botBody.position.x;
        const dy = playerBody.position.y - botBody.position.y;
        if (dy < -20 && Math.abs(dx) < 150) {
            if (Math.random() > 0.1 && Math.abs(botBody.velocity.y) < jumpVelocityThreshold) {
                Body.setVelocity(botBody, { x: botBody.velocity.x, y: -jumpStrength });
                botBody.renderData.isOnGround = false;
            }
        }
    }

    if (!botBody.renderData.isTagger && botBody.renderData.isOnGround) {
        if (Math.random() < 0.05 && Math.abs(botBody.velocity.y) < jumpVelocityThreshold) {
            Body.setVelocity(botBody, { x: botBody.velocity.x, y: -jumpStrength * 0.7 });
            botBody.renderData.isOnGround = false;
        }
    }

    if (Math.abs(botBody.velocity.x) < 0.2 && Math.abs(targetVx) > 0.5) {
        if (Math.abs(botBody.position.x - ai.lastPosX) < 1) {
            if (now - ai.stuckTime > 500 && botBody.renderData.isOnGround) {
                Body.setVelocity(botBody, { x: botBody.velocity.x, y: -jumpStrength * 0.5 });
                ai.stuckTime = now;
            }
        } else {
            ai.stuckTime = now;
        }
    } else {
        ai.stuckTime = now;
    }

    ai.lastPosX = botBody.position.x;
}
