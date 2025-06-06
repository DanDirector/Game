const keysPressed = {};
document.addEventListener('keydown', (event) => { keysPressed[event.code] = true; });
document.addEventListener('keyup', (event) => { keysPressed[event.code] = false; });

function handleInput() {
    playerBodies.forEach(playerBody => {
        const data = playerBody.renderData;
        const currentVelocity = playerBody.velocity;
        let targetVx = 0; // Целевая горизонтальная скорость

        data.isMovingHorizontally = false; // Сбрасываем флаг движения

        // Определяем целевую скорость
        if (keysPressed[data.controls.left]) {
            targetVx = -moveSpeed; data.facingDirection = 'left'; data.isMovingHorizontally = true;
        }
        if (keysPressed[data.controls.right]) {
            targetVx = moveSpeed; data.facingDirection = 'right'; data.isMovingHorizontally = true;
        }

        // Плавно интерполируем текущую скорость к целевой
        let newVx;
        if (targetVx !== 0) { // Если есть нажатие (ускорение)
            newVx = currentVelocity.x + (targetVx - currentVelocity.x) * accelerationFactor;
        } else { // Если нет нажатия (замедление/торможение)
            newVx = currentVelocity.x + (targetVx - currentVelocity.x) * decelerationFactor;
        }

        // Применяем новую горизонтальную скорость
        // Вертикальную скорость берем текущую, ее меняет только прыжок и гравитация
        Body.setVelocity(playerBody, { x: newVx, y: currentVelocity.y });

        // Прыжок (логика с hasJumpedThisPress и velocity check остается)
        if (keysPressed[data.controls.up]) {
            if (data.isOnGround && !data.hasJumpedThisPress && Math.abs(currentVelocity.y) < jumpVelocityThreshold) {
                // Устанавливаем новую скорость, не изменяя горизонтальную (которую мы только что плавно изменили)
                Body.setVelocity(playerBody, { x: playerBody.velocity.x, y: -jumpStrength });
                data.isOnGround = false;
                data.hasJumpedThisPress = true;
            }
        } else {
            data.hasJumpedThisPress = false;
        }
    });
}
