function getPlatformCoords(label) {
    const platform = platformBodies.find(p => p.label === label);
    return platform ? { x: platform.position.x, y: platform.position.y - platform.renderData.height / 2 } : null;
}

function drawRoundRect(ctx, x, y, width, height, radius) {
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

function drawParallaxBackground() {
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

function drawPlatforms() {
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
        ctx.fillStyle = platformBody.renderData.colorBase;
        ctx.fillRect(-width / 2, -height / 2, width, height);
        ctx.fillStyle = platformBody.renderData.colorTop;
        ctx.fillRect(-width / 2, -height / 2, width, edgeHeight);
        ctx.restore();
    });
}

const decorations = [
    { type: 'palm', platformLabel: 'platform-start-left', offsetX: -150 },
    { type: 'palm', platformLabel: 'platform-start-right', offsetX: 150 },
    { type: 'palm', platformLabel: 'platform-low-far-left', offsetX: 0 },
    { type: 'palm', platformLabel: 'platform-low-far-right', offsetX: 0 },
    { type: 'palm', platformLabel: 'platform-low-center', offsetX: -250 },
    { type: 'palm', platformLabel: 'platform-low-center', offsetX: 250 },
    { type: 'palm', platformLabel: 'platform-mid-center-left', offsetX: -100 },
    { type: 'palm', platformLabel: 'platform-mid-center-right', offsetX: 100 },
    { type: 'palm', platformLabel: 'platform-upper-mid-center', offsetX: -200 },
    { type: 'palm', platformLabel: 'platform-upper-mid-center', offsetX: 200 },
    { type: 'palm', platformLabel: 'platform-ground', offsetX: -worldWidth/2 + 250 },
    { type: 'palm', platformLabel: 'platform-ground', offsetX: worldWidth/2 - 250 }
];

function drawDecorations() {
    decorations.forEach(deco => {
        const platformCoords = getPlatformCoords(deco.platformLabel);
        if (platformCoords) {
            const x = platformCoords.x + deco.offsetX;
            const y = platformCoords.y;
            if (deco.type === 'palm') {
                drawPalm(ctx, x, y, 1.2);
            }
        }
    });
}

function drawPalm(targetCtx, baseX, baseY, scale = 1) {
    const trunkWidth = 12 * scale;
    const trunkHeight = 70 * scale;
    const numLeaves = 7;
    const leafLength = 45 * scale;
    const leafWidth = 18 * scale;
    const topY = baseY - trunkHeight;
    targetCtx.fillStyle = colors.palmTrunk;
    targetCtx.fillRect(baseX - trunkWidth / 2, baseY - trunkHeight, trunkWidth, trunkHeight);
    targetCtx.fillStyle = colors.palmLeaves;
    for (let i = 0; i < numLeaves; i++) {
        targetCtx.save();
        targetCtx.translate(baseX, topY);
        const angle = (i / (numLeaves - 1)) * Math.PI * 1.4 - Math.PI * 0.7;
        targetCtx.rotate(angle);
        targetCtx.beginPath();
        targetCtx.ellipse(0, leafLength / 2, leafWidth / 2, leafLength / 2, 0, 0, Math.PI * 2);
        targetCtx.fill();
        targetCtx.restore();
    }
}

function drawPlayer(playerBody, deltaTime) {
    const pos = playerBody.position;
    const data = playerBody.renderData;
    const headHeight = playerHeight * 0.4;
    const eyeRadius = playerWidth * 0.07;
    const legSpeed = legAnimationSpeed * deltaTime / 1000;
    data.legAnimationTimer += legSpeed;
    if (data.legAnimationTimer > 1) data.legAnimationTimer -= 1;
    const progress = data.legAnimationTimer;
    const bodyDrawX = pos.x - playerWidth / 2;
    const bodyDrawY = pos.y - playerHeight / 2;
    ctx.save();
    ctx.translate(bodyDrawX, bodyDrawY);
    ctx.fillStyle = colors.playerBody;
    drawRoundRect(ctx, 0, 0, playerWidth, playerHeight, playerCornerRadius);
    ctx.fillStyle = data.headbandColor;
    ctx.fillRect(0, 0, playerWidth, 8);
    const eyeY = headHeight * 0.4;
    const eyeXOffset = playerWidth * 0.15 * (data.facingDirection === 'right' ? 1 : -1);
    ctx.fillStyle = colors.eyeWhite;
    ctx.beginPath();
    ctx.arc(playerWidth / 2 + eyeXOffset, eyeY, eyeRadius, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = colors.eyePupil;
    ctx.beginPath();
    ctx.arc(playerWidth / 2 + eyeXOffset, eyeY, eyeRadius / 2, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
    const progressBarHeight = 4;
    const progressBarY = playerHeight + 6;
    ctx.save();
    ctx.translate(bodyDrawX, bodyDrawY);
    ctx.fillStyle = '#ccc';
    ctx.fillRect(0, progressBarY, playerWidth, progressBarHeight);
    ctx.fillStyle = colors.indicator;
    ctx.fillRect(0, progressBarY, playerWidth * progress, progressBarHeight);
    ctx.restore();
}

function drawFlash() {
    if (flashOpacity > 0) {
        ctx.fillStyle = `rgba(255, 255, 0, ${flashOpacity.toFixed(2)})`;
        ctx.fillRect(0, 0, canvasWidth, canvasHeight);
        flashOpacity -= 0.05;
        if (flashOpacity < 0) flashOpacity = 0;
    }
}

function updateCamera() {
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
