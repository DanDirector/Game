export function applyMovement(playerBody, input, Body, config, dt) {
    const { moveSpeed, jumpStrength, accelerationFactor, decelerationFactor, jumpVelocityThreshold } = config;
    const data = playerBody.renderData;
    let targetVx = 0;
    data.isMovingHorizontally = false;

    if (input.moveLeft) {
        targetVx = -moveSpeed;
        data.facingDirection = 'left';
        data.isMovingHorizontally = true;
    }
    if (input.moveRight) {
        targetVx = moveSpeed;
        data.facingDirection = 'right';
        data.isMovingHorizontally = true;
    }

    const currentVx = playerBody.velocity.x;
    let newVx;
    if (targetVx !== 0) {
        newVx = currentVx + (targetVx - currentVx) * accelerationFactor;
    } else {
        newVx = currentVx + (targetVx - currentVx) * decelerationFactor;
    }
    Body.setVelocity(playerBody, { x: newVx, y: playerBody.velocity.y });

    if (input.jumpPressed) {
        if (data.isOnGround && !data.hasJumpedThisPress && Math.abs(playerBody.velocity.y) < jumpVelocityThreshold) {
            Body.setVelocity(playerBody, { x: playerBody.velocity.x, y: -jumpStrength });
            data.isOnGround = false;
            data.hasJumpedThisPress = true;
        }
    } else {
        data.hasJumpedThisPress = false;
    }
}
