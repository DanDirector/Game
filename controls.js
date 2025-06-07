export const keysPressed = {};

export function initControls() {
    document.addEventListener('keydown', event => {
        keysPressed[event.code] = true;
    });
    document.addEventListener('keyup', event => {
        keysPressed[event.code] = false;
    });
}

import { applyMovement } from './movementController.js';

export function handleInput({ playerBodies, Body, moveSpeed, jumpStrength, accelerationFactor, decelerationFactor, jumpVelocityThreshold, dt }) {
    playerBodies.forEach(playerBody => {
        const data = playerBody.renderData;
        const input = {
            moveLeft: !!keysPressed[data.controls.left],
            moveRight: !!keysPressed[data.controls.right],
            jumpPressed: !!keysPressed[data.controls.up]
        };

        applyMovement(
            playerBody,
            input,
            Body,
            { moveSpeed, jumpStrength, accelerationFactor, decelerationFactor, jumpVelocityThreshold },
            dt
        );
    });
}
