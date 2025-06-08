export const heroSprite = new Image();
heroSprite.src = './assets/hero.png';

// Sprite sheet info: 8 frames laid out horizontally
const SPRITE_COLS = 8;
const SPRITE_ROWS = 1;
const spriteInfo = { width: 0, height: 0, frameWidth: 0, frameHeight: 0 };
heroSprite.onload = () => {
    spriteInfo.width = heroSprite.width;
    spriteInfo.height = heroSprite.height;
    spriteInfo.frameWidth = Math.floor(spriteInfo.width / SPRITE_COLS);
    spriteInfo.frameHeight = Math.floor(spriteInfo.height / SPRITE_ROWS);
};

export function drawRoundRect(ctx, x, y, width, height, radius) {
    if (width < 2 * radius) radius = width / 2;
    if (height < 2 * radius) radius = height / 2;
    ctx.beginPath();
    ctx.moveTo(x + radius, y);
    ctx.arcTo(x + width, y, x + width, y + height, radius);
    ctx.arcTo(x + width, y + height, x, y + height, radius);
    ctx.arcTo(x, y + height, x, y, radius);
    ctx.arcTo(x, y, x + width, y, radius);
    ctx.closePath();
    ctx.fill();
}

export function drawParallaxBackground(ctx, camera, worldWidth, worldHeight, colors, parallaxFactor) {
    const camOffsetX = camera.focusX * parallaxFactor;
    const camOffsetY = camera.focusY * parallaxFactor * 0.5;
    ctx.save();
    ctx.translate(-camOffsetX, -camOffsetY);
    const hillBaseY = worldHeight;
    ctx.fillStyle = colors.hillColorFar;
    ctx.beginPath();
    ctx.moveTo(-worldWidth, hillBaseY);
    for (let x = -worldWidth; x < worldWidth * 2; x += 150) {
        const y = hillBaseY - (worldHeight * 0.1) - Math.sin(x * 0.0015 / 2 + 1) * (worldHeight * 0.05);
        ctx.lineTo(x, y);
    }
    ctx.lineTo(worldWidth * 2, hillBaseY);
    ctx.closePath();
    ctx.fill();

    ctx.fillStyle = colors.hillColorNear;
    ctx.beginPath();
    ctx.moveTo(-worldWidth, hillBaseY);
    for (let x = -worldWidth; x < worldWidth * 2; x += 100) {
        const y = hillBaseY - (worldHeight * 0.05) - Math.cos(x * 0.002 / 2) * (worldHeight * 0.03);
        ctx.lineTo(x, y);
    }
    ctx.lineTo(worldWidth * 2, hillBaseY);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
}

export function drawPlatforms(ctx, platformBodies, colors) {
    const edgeHeight = 5;
    platformBodies.forEach(platformBody => {
        if (!platformBody.renderData.visible) return;
        const pos = platformBody.position;
        const angle = platformBody.angle;
        const width = platformBody.renderData.width;
        const height = platformBody.renderData.height;
        ctx.save();
        ctx.translate(pos.x, pos.y);
        ctx.rotate(angle);
        ctx.fillStyle = platformBody.renderData.colorBase || colors.platformBase;
        ctx.fillRect(-width / 2, -height / 2, width, height);
        ctx.fillStyle = platformBody.renderData.colorTop || colors.platformEdge;
        ctx.fillRect(-width / 2, -height / 2, width, edgeHeight);
        ctx.restore();
    });
}

export function drawPalm(ctx, baseX, baseY, scale, colors) {
    const trunkWidth = 12 * scale;
    const trunkHeight = 70 * scale;
    const numLeaves = 7;
    const leafLength = 45 * scale;
    const leafWidth = 18 * scale;
    const topY = baseY - trunkHeight;
    ctx.fillStyle = colors.palmTrunk;
    ctx.fillRect(baseX - trunkWidth / 2, baseY - trunkHeight, trunkWidth, trunkHeight);
    ctx.fillStyle = colors.palmLeaves;
    for (let i = 0; i < numLeaves; i++) {
        ctx.save();
        ctx.translate(baseX, topY);
        const angle = (i / (numLeaves - 1)) * Math.PI * 1.4 - Math.PI * 0.7;
        ctx.rotate(angle);
        ctx.beginPath();
        ctx.ellipse(0, leafLength / 2, leafWidth / 2, leafLength / 2, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
    }
}

export function drawDecorations(ctx, decorations, platformBodies, getPlatformCoords, colors) {
    decorations.forEach(deco => {
        const platformCoords = getPlatformCoords(platformBodies, deco.platformLabel);
        if (platformCoords) {
            const x = platformCoords.x + deco.offsetX;
            const y = platformCoords.y;
            if (deco.type === 'palm') {
                drawPalm(ctx, x, y, 1.2, colors);
            }
        }
    });
}

export function drawPlayer(ctx, playerBody, deltaTime, colors, constants) {
    const { playerHeight, playerWidth, legAnimationSpeed, tagCooldownTime } = constants;
    const pos = playerBody.position;
    const data = playerBody.renderData;

    ctx.save();
    ctx.translate(pos.x, pos.y);

    if (data.isMovingHorizontally && data.isOnGround) {
        data.legAnimationTimer += deltaTime;
        if (data.legAnimationTimer >= legAnimationSpeed) {
            data.legAnimationTimer = 0;
            data.legAnimationFrame = (data.legAnimationFrame + 1) % SPRITE_COLS;
        }
    } else {
        data.legAnimationFrame = 0;
        data.legAnimationTimer = 0;
    }

    let drawX = -playerWidth / 3;
    if (data.facingDirection === 'left') {
        ctx.scale(-1, 1);
        drawX = playerWidth / 2;
    }
    const frame = data.legAnimationFrame;
    const sx = (frame % SPRITE_COLS) * Math.floor(spriteInfo.frameWidth);
    const sy = Math.floor(frame / SPRITE_COLS) * spriteInfo.frameHeight;
    ctx.drawImage(
        heroSprite,
        sx,
        sy,
        spriteInfo.frameWidth,
        spriteInfo.frameHeight,
        drawX,
        -playerHeight / 2,
        playerWidth,
        playerHeight
    );

    if (data.isTagger) {
        const indicatorY = -playerHeight / 2 - 12;
        const indicatorSize = 8;
        ctx.fillStyle = data.tagTimer > 0 ? 'rgba(241, 196, 15, 0.5)' : colors.indicator;
        ctx.beginPath();
        ctx.moveTo(0, indicatorY - indicatorSize * 0.8);
        ctx.lineTo(-indicatorSize, indicatorY + indicatorSize * 0.6);
        ctx.lineTo(indicatorSize, indicatorY + indicatorSize * 0.6);
        ctx.closePath();
        ctx.fill();
        if (data.tagTimer > 0) {
            const progressBarY = -playerHeight / 2 - 20;
            const progressBarHeight = 4;
            const progress = 1 - data.tagTimer / tagCooldownTime;
            ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
            ctx.fillRect(-playerWidth / 2, progressBarY, playerWidth, progressBarHeight);
            ctx.fillStyle = colors.indicator;
            ctx.fillRect(-playerWidth / 2, progressBarY, playerWidth * progress, progressBarHeight);
        }
    }
    ctx.restore();
}

export function drawFlash(ctx, canvasWidth, canvasHeight, getOpacity, setOpacity) {
    const opacity = getOpacity();
    if (opacity > 0) {
        ctx.fillStyle = `rgba(255, 255, 0, ${opacity.toFixed(2)})`;
        ctx.fillRect(0, 0, canvasWidth, canvasHeight);
        setOpacity(opacity - 0.05);
    }
}

export function updateCamera(camera, canvasWidth, canvasHeight, worldWidth, worldHeight, zoomPadding, minZoom, maxZoom, zoomLerpFactor, cameraLerpFactor, playerBodies) {
    const p1Pos = playerBodies[0].position;
    const p2Pos = playerBodies[1].position;
    const focusTargetX = (p1Pos.x + p2Pos.x) / 2;
    const focusTargetY = (p1Pos.y + p2Pos.y) / 2;
    const distX = Math.abs(p1Pos.x - p2Pos.x);
    const distY = Math.abs(p1Pos.y - p2Pos.y);
    const requiredWidth = distX + zoomPadding * 2;
    const requiredHeight = distY + zoomPadding * 2;
    const zoomTargetX = canvasWidth / Math.max(1, requiredWidth);
    const zoomTargetY = canvasHeight / Math.max(1, requiredHeight);
    let targetZoom = Math.min(zoomTargetX, zoomTargetY);
    camera.targetZoom = Math.max(minZoom, Math.min(maxZoom, targetZoom));
    camera.zoom += (camera.targetZoom - camera.zoom) * zoomLerpFactor;
    camera.targetFocusX = focusTargetX;
    camera.targetFocusY = focusTargetY;
    camera.focusX += (camera.targetFocusX - camera.focusX) * cameraLerpFactor;
    camera.focusY += (camera.targetFocusY - camera.focusY) * cameraLerpFactor;
    const viewWidth = canvasWidth / camera.zoom;
    const viewHeight = canvasHeight / camera.zoom;
    camera.focusX = Math.max(viewWidth / 2, Math.min(worldWidth - viewWidth / 2, camera.focusX));
    camera.focusY = Math.max(viewHeight / 2, Math.min(worldHeight - viewHeight / 2, camera.focusY));
}
