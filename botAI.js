import { Body } from './physics.js';
import { applyMovement } from './movementController.js';
import { worldToGrid, gridToWorld, CELL_SIZE, findPath } from './pathfindingGrid.js';

export function updateBotAI(botBody, playerBody, config, dt, { matrix }) {
    const { moveSpeed, jumpStrength, accelerationFactor, decelerationFactor, jumpVelocityThreshold } = config;

    if (!botBody.renderData.aiState) {
        botBody.renderData.aiState = {
            lastPosX: botBody.position.x,
            stuckTime: Date.now(),
            path: [],
            pathIndex: 0,
            targetCell: null,
            pathTimer: 0
        };
    }

    const ai = botBody.renderData.aiState;
    const now = Date.now();
    ai.pathTimer -= dt;

    const start = worldToGrid(botBody.position.x, botBody.position.y);
    const end = worldToGrid(playerBody.position.x, playerBody.position.y);
    const targetChanged = !ai.targetCell || ai.targetCell.gx !== end.gx || ai.targetCell.gy !== end.gy;

    if (ai.pathTimer <= 0 || targetChanged || ai.pathIndex >= ai.path.length) {
        const newPath = findPath(start, end, matrix);
        ai.path = newPath;
        ai.pathIndex = 0;
        ai.targetCell = end;
        ai.pathTimer = 500; // recalc every 500ms
    }

    const input = { moveLeft: false, moveRight: false, jumpPressed: false };

    if (ai.path.length > 1 && ai.pathIndex < ai.path.length) {
        const [gx, gy] = ai.path[Math.min(ai.pathIndex + 1, ai.path.length - 1)];
        const nextPoint = gridToWorld(gx, gy);
        const dx = nextPoint.x - botBody.position.x;
        const dy = nextPoint.y - botBody.position.y;

        if (Math.abs(dx) > 2) {
            if (dx < 0) input.moveLeft = true;
            else input.moveRight = true;
        }

        if (dy < -CELL_SIZE * 0.2 && botBody.renderData.isOnGround && Math.abs(botBody.velocity.y) < jumpVelocityThreshold) {
            input.jumpPressed = true;
        }

        const dist = Math.hypot(dx, dy);
        if (dist < CELL_SIZE * 0.3) {
            ai.pathIndex++;
        }
    }

    const isStuck = (Math.abs(botBody.position.x - ai.lastPosX) < 1) && (now - ai.stuckTime > 500);
    if (isStuck && botBody.renderData.isOnGround && Math.abs(botBody.velocity.y) < jumpVelocityThreshold) {
        input.jumpPressed = true;
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
