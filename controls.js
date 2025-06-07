export const keysPressed = {};

window.addEventListener('keydown', event => {
  keysPressed[event.code] = true;
});

window.addEventListener('keyup', event => {
  keysPressed[event.code] = false;
});

export function handleInput() {
  const playerBodies = window.playerBodies;
  const Body = window.Body;
  const moveSpeed = window.moveSpeed;
  const accelerationFactor = window.accelerationFactor;
  const decelerationFactor = window.decelerationFactor;
  const jumpStrength = window.jumpStrength;
  const jumpVelocityThreshold = window.jumpVelocityThreshold;

  playerBodies.forEach(playerBody => {
    const data = playerBody.renderData;
    const currentVelocity = playerBody.velocity;
    let targetVx = 0;
    data.isMovingHorizontally = false;

    if (keysPressed[data.controls.left]) {
      targetVx = -moveSpeed;
      data.facingDirection = 'left';
      data.isMovingHorizontally = true;
    }
    if (keysPressed[data.controls.right]) {
      targetVx = moveSpeed;
      data.facingDirection = 'right';
      data.isMovingHorizontally = true;
    }

    let newVx;
    if (targetVx !== 0) {
      newVx = currentVelocity.x + (targetVx - currentVelocity.x) * accelerationFactor;
    } else {
      newVx = currentVelocity.x + (targetVx - currentVelocity.x) * decelerationFactor;
    }

    Body.setVelocity(playerBody, { x: newVx, y: currentVelocity.y });

    if (keysPressed[data.controls.up]) {
      if (data.isOnGround && !data.hasJumpedThisPress && Math.abs(currentVelocity.y) < jumpVelocityThreshold) {
        Body.setVelocity(playerBody, { x: playerBody.velocity.x, y: -jumpStrength });
        data.isOnGround = false;
        data.hasJumpedThisPress = true;
      }
    } else {
      data.hasJumpedThisPress = false;
    }
  });
}
