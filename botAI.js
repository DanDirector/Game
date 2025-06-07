import { Body } from './physics.js';

export function updateBotAI(botBody, playerBody, config) {
    const { moveSpeed, jumpStrength, accelerationFactor, jumpVelocityThreshold } = config;

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

    let targetVx = 0;
    if (now < ai.pauseUntil || now < ai.hesitateUntil) {
        targetVx = 0;
    } else {
        const dx = playerBody.position.x - botBody.position.x;
        const direction = dx === 0 ? 0 : dx > 0 ? 1 : -1;
        targetVx = direction * moveSpeed * ai.speedMultiplier;
        if (!botBody.renderData.isTagger) {
            targetVx *= -1;
        }
    }

    const currentVx = botBody.velocity.x;
    const newVx = currentVx + (targetVx - currentVx) * accelerationFactor;
    Body.setVelocity(botBody, { x: newVx, y: botBody.velocity.y });

    if (botBody.renderData.isOnGround && now >= ai.pauseUntil && now >= ai.hesitateUntil) {
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
