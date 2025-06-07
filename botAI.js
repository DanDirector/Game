import { Body } from './physics.js';
import { applyMovement } from './movementController.js';

function getNearestPlatformBelow(bot, platforms) {
    const toleranceX = 50;
    const toleranceY = 10;

    return platforms.find(p => {
        const pTop = p.position.y - p.renderData.height / 2;
        return (
            Math.abs(bot.position.x - p.position.x) < p.renderData.width / 2 + toleranceX &&
            Math.abs(bot.position.y - pTop) < 300 &&
            bot.position.y < pTop + toleranceY
        );
    });
}

function getBestPlatformToJumpTo(bot, target, platforms) {
    return platforms.find(p => {
        const dx = target.position.x - p.position.x;
        const dy = target.position.y - p.position.y;
        const verticalGap = p.position.y - bot.position.y;

        return (
            verticalGap < -50 && Math.abs(dx) < 400 && Math.abs(dy) < 300
        );
    });
}

export function updateBotAI(botBody, playerBody, config, dt, platformBodies) {
    const {
        moveSpeed,
        jumpStrength,
        accelerationFactor,
        decelerationFactor,
        jumpVelocityThreshold
    } = config;

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

    const input = { moveLeft: false, moveRight: false, jumpPressed: false };

    const dx = playerBody.position.x - botBody.position.x;
    const dy = playerBody.position.y - botBody.position.y;
    const dir = dx > 0 ? 1 : -1;

    // Логика перемещения по платформам
    let chaseTarget = playerBody;

    // Если цель высоко, ищем ближайшую платформу для прыжка
    if (dy < -100) {
        const jumpPlatform = getBestPlatformToJumpTo(botBody, playerBody, platformBodies);
        if (jumpPlatform) {
            chaseTarget = { position: jumpPlatform.position };
        }
    }

    // Движение влево / вправо
    if (Math.abs(chaseTarget.position.x - botBody.position.x) > 5) {
        if (chaseTarget.position.x < botBody.position.x) input.moveLeft = true;
        else input.moveRight = true;
    }

    // Прыжок при необходимости
    const shouldJump = (
        botBody.renderData.isOnGround &&
        dy < -50 &&
        Math.abs(dx) < 300 &&
        Math.abs(botBody.velocity.y) < jumpVelocityThreshold
    );

    if (shouldJump) {
        input.jumpPressed = true;
    }

    // Если застрял — тоже прыгай
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
