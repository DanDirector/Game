import { Body } from './physics.js';
import { applyMovement } from './movementController.js';
import { findPath } from './pathfinding.js';
import { navigationGraph } from './navigationGraph.js';

export function updateBotAI(botBody, playerBody, config, dt, platformBodies) {
  const { moveSpeed, jumpStrength, accelerationFactor, decelerationFactor, jumpVelocityThreshold } = config;

  if (!botBody.renderData.aiState) {
    botBody.renderData.aiState = {
      path: [],
      targetLabel: null,
      currentTarget: null,
      lastPlatform: null,
      stuckTime: Date.now(),
      lastPosX: botBody.position.x
    };
  }

  const ai = botBody.renderData.aiState;
  const now = Date.now();

  const currentPlatform = platformBodies.find(p => {
    const x = botBody.position.x;
    const y = botBody.position.y + 5;
    return (
      p.renderData?.visible &&
      x > p.position.x - p.renderData.width / 2 &&
      x < p.position.x + p.renderData.width / 2 &&
      y > p.position.y - p.renderData.height / 2 &&
      y < p.position.y + p.renderData.height / 2 + 5
    );
  });

  const playerPlatform = platformBodies.find(p => {
    const x = playerBody.position.x;
    const y = playerBody.position.y + 5;
    return (
      p.renderData?.visible &&
      x > p.position.x - p.renderData.width / 2 &&
      x < p.position.x + p.renderData.width / 2 &&
      y > p.position.y - p.renderData.height / 2 &&
      y < p.position.y + p.renderData.height / 2 + 5
    );
  });

  if (
    currentPlatform &&
    playerPlatform &&
    (ai.lastPlatform !== currentPlatform.label || ai.targetLabel !== playerPlatform.label)
  ) {
    ai.path = findPath(currentPlatform.label, playerPlatform.label, navigationGraph);
    ai.targetLabel = playerPlatform.label;
    ai.currentTarget = ai.path.length > 0
      ? platformBodies.find(p => p.label === ai.path[0])
      : playerBody;
    ai.lastPlatform = currentPlatform.label;
  }

  const input = { moveLeft: false, moveRight: false, jumpPressed: false };

  const target = ai.currentTarget;
  if (target) {
    const dx = target.position.x - botBody.position.x;
    if (Math.abs(dx) > 5) {
      if (dx < 0) input.moveLeft = true;
      else input.moveRight = true;
    }

    const dy = target.position.y - botBody.position.y;
    if (
      dy < -40 &&
      Math.abs(dx) < 200 &&
      botBody.renderData.isOnGround &&
      Math.abs(botBody.velocity.y) < jumpVelocityThreshold
    ) {
      input.jumpPressed = true;
    }
  }

  if (
    ai.currentTarget &&
    Math.abs(ai.currentTarget.position.x - botBody.position.x) < 20 &&
    Math.abs(ai.currentTarget.position.y - botBody.position.y) < 40
  ) {
    ai.path.shift();
    ai.currentTarget = ai.path.length > 0
      ? platformBodies.find(p => p.label === ai.path[0])
      : playerBody;
  }

  if ((input.moveLeft || input.moveRight) && Math.abs(botBody.velocity.x) < 0.2) {
    if (Math.abs(botBody.position.x - ai.lastPosX) < 1) {
      if (now - ai.stuckTime > 700 && botBody.renderData.isOnGround) {
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
