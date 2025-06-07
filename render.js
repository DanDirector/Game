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
    const { playerHeight, playerWidth, playerCornerRadius, legAnimationSpeed, tagCooldownTime } = constants;
    const pos = playerBody.position;
    const data = playerBody.renderData;
    const headHeight = playerHeight * 0.4;
    const eyeRadius = playerWidth * 0.09;
    const pupilRadius = eyeRadius * 0.6;
    const eyeOffsetY = playerHeight * 0.18;
    const headbandHeight = playerHeight * 0.18;
    const legWidth = playerWidth * 0.2;
    const legHeight = playerHeight * 0.25;
    const legBaseY = playerHeight / 2 - legHeight;
    const eyeOffsetXBase = playerWidth * 0.2;
    let pupilOffsetX = 0;
    if (data.facingDirection === 'left') {
        pupilOffsetX = -eyeRadius * 0.4;
    } else if (data.facingDirection === 'right') {
        pupilOffsetX = eyeRadius * 0.4;
    }
    const legCycleDuration = legAnimationSpeed * 2;
    let legOffsetY1 = 0;
    let legOffsetY2 = 0;
    if (data.isMovingHorizontally && data.isOnGround) {
        data.legAnimationTimer = (data.legAnimationTimer + deltaTime) % legCycleDuration;
        const phase = (data.legAnimationTimer / legCycleDuration) * Math.PI * 2;
        legOffsetY1 = Math.sin(phase) * legHeight * 0.3;
        legOffsetY2 = Math.sin(phase + Math.PI) * legHeight * 0.3;
    } else {
        data.legAnimationTimer = 0;
    }
    ctx.save();
    ctx.translate(pos.x, pos.y);
    const legDrawY = legBaseY;
    const legX1 = -playerWidth * 0.2;
    const legX2 = playerWidth * 0.2;
    ctx.fillStyle = colors.playerBody;
    drawRoundRect(ctx, legX1 - legWidth / 2, legDrawY + legOffsetY1, legWidth, legHeight, legWidth / 3);
    drawRoundRect(ctx, legX2 - legWidth / 2, legDrawY + legOffsetY2, legWidth, legHeight, legWidth / 3);
    const bodyDrawX = -playerWidth / 2;
    const bodyDrawY = -playerHeight / 2;
    ctx.fillStyle = colors.playerBody;
    drawRoundRect(ctx, bodyDrawX, bodyDrawY, playerWidth, playerHeight, playerCornerRadius);
    ctx.fillStyle = data.headbandColor;
    ctx.fillRect(bodyDrawX, bodyDrawY + headHeight * 0.15, playerWidth, headbandHeight);
    const eyeCenterY = bodyDrawY + eyeOffsetY;
    const eyeCenterX1 = eyeOffsetXBase * (data.facingDirection === 'left' ? 1.1 : 0.9);
    const eyeCenterX2 = -eyeOffsetXBase * (data.facingDirection === 'right' ? 1.1 : 0.9);
    const eyeDrawX1 = data.facingDirection === 'left' ? eyeCenterX2 : eyeCenterX1;
    const eyeDrawX2 = data.facingDirection === 'left' ? eyeCenterX1 : eyeCenterX2;
    ctx.fillStyle = colors.eyeWhite;
    ctx.beginPath();
    ctx.arc(eyeDrawX1, eyeCenterY, eyeRadius, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(eyeDrawX2, eyeCenterY, eyeRadius, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = colors.eyePupil;
    ctx.beginPath();
    ctx.arc(eyeDrawX1 + pupilOffsetX, eyeCenterY, pupilRadius, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(eyeDrawX2 + pupilOffsetX, eyeCenterY, pupilRadius, 0, Math.PI * 2);
    ctx.fill();
    if (data.isTagger) {
        const indicatorY = bodyDrawY - 12;
        const indicatorSize = 8;
        ctx.fillStyle = data.tagTimer > 0 ? 'rgba(241, 196, 15, 0.5)' : colors.indicator;
        ctx.beginPath();
        ctx.moveTo(0, indicatorY - indicatorSize * 0.8);
        ctx.lineTo(-indicatorSize, indicatorY + indicatorSize * 0.6);
        ctx.lineTo(indicatorSize, indicatorY + indicatorSize * 0.6);
        ctx.closePath();
        ctx.fill();
        if (data.tagTimer > 0) {
            const progressBarY = bodyDrawY - 20;
            const progressBarHeight = 4;
            const progress = 1 - data.tagTimer / tagCooldownTime;
            ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
            ctx.fillRect(bodyDrawX, progressBarY, playerWidth, progressBarHeight);
            ctx.fillStyle = colors.indicator;
            ctx.fillRect(bodyDrawX, progressBarY, playerWidth * progress, progressBarHeight);
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
