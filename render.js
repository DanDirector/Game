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

function drawRoundRectStroke(ctx, x, y, width, height, radius) {
    if (width < 2 * radius) radius = width / 2;
    if (height < 2 * radius) radius = height / 2;
    ctx.beginPath();
    ctx.moveTo(x + radius, y);
    ctx.arcTo(x + width, y, x + width, y + height, radius);
    ctx.arcTo(x + width, y + height, x, y + height, radius);
    ctx.arcTo(x, y + height, x, y, radius);
    ctx.arcTo(x, y, x + width, y, radius);
    ctx.closePath();
    ctx.stroke();
}

function drawCloud(ctx, x, y, scale, color) {
    ctx.save();
    ctx.translate(x, y);
    ctx.scale(scale, scale);
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.ellipse(-45, 12, 38, 20, 0, 0, Math.PI * 2);
    ctx.ellipse(-10, 0, 50, 28, 0, 0, Math.PI * 2);
    ctx.ellipse(36, 10, 44, 22, 0, 0, Math.PI * 2);
    ctx.ellipse(5, 18, 72, 18, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
}

function drawHillLayer(ctx, worldWidth, baseY, height, step, color, phase) {
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.moveTo(-worldWidth, baseY);
    for (let x = -worldWidth; x <= worldWidth * 2; x += step) {
        const y = baseY - height - Math.sin(x * 0.002 + phase) * height * 0.24;
        ctx.lineTo(x, y);
    }
    ctx.lineTo(worldWidth * 2, baseY);
    ctx.closePath();
    ctx.fill();
}

export function drawParallaxBackground(ctx, camera, worldWidth, worldHeight, colors, parallaxFactor) {
    const camOffsetX = camera.focusX * parallaxFactor;
    const camOffsetY = camera.focusY * parallaxFactor * 0.5;

    const hazeGradient = ctx.createLinearGradient(0, worldHeight * 0.25, 0, worldHeight);
    hazeGradient.addColorStop(0, colors.hazeTop);
    hazeGradient.addColorStop(1, colors.hazeBottom);
    ctx.fillStyle = hazeGradient;
    ctx.fillRect(0, 0, worldWidth, worldHeight + 220);

    ctx.save();
    ctx.translate(-camOffsetX * 0.25, -camOffsetY * 0.14);
    drawCloud(ctx, worldWidth * 0.2, worldHeight * 0.18, 2.2, colors.cloud);
    drawCloud(ctx, worldWidth * 0.67, worldHeight * 0.12, 1.7, colors.cloudSoft);
    drawCloud(ctx, worldWidth * 1.08, worldHeight * 0.22, 2.4, colors.cloudSoft);
    ctx.restore();

    ctx.save();
    ctx.translate(-camOffsetX * 0.55, -camOffsetY * 0.24);
    const hillBaseY = worldHeight;
    drawHillLayer(ctx, worldWidth, hillBaseY - worldHeight * 0.14, worldHeight * 0.16, 180, colors.hillColorFar, 0.6);
    drawHillLayer(ctx, worldWidth, hillBaseY - worldHeight * 0.03, worldHeight * 0.12, 120, colors.hillColorNear, 1.8);
    drawHillLayer(ctx, worldWidth, hillBaseY + worldHeight * 0.04, worldHeight * 0.07, 90, colors.hillColorFront, 2.6);
    ctx.restore();
}

export function drawPlatforms(ctx, platformBodies, colors) {
    const edgeHeight = 9;
    platformBodies.forEach(platformBody => {
        if (!platformBody.renderData.visible) return;
        const pos = platformBody.position;
        const angle = platformBody.angle;
        const width = platformBody.renderData.width;
        const height = platformBody.renderData.height;
        const radius = Math.min(10, height / 2);

        ctx.save();
        ctx.translate(pos.x, pos.y);
        ctx.rotate(angle);

        ctx.shadowColor = colors.platformShadow;
        ctx.shadowBlur = 18;
        ctx.shadowOffsetY = 16;
        const baseGradient = ctx.createLinearGradient(0, -height / 2, 0, height / 2);
        baseGradient.addColorStop(0, platformBody.renderData.colorTop || colors.platformTop);
        baseGradient.addColorStop(0.18, platformBody.renderData.colorBase || colors.platformBase);
        baseGradient.addColorStop(1, colors.platformUnderside);
        ctx.fillStyle = baseGradient;
        drawRoundRect(ctx, -width / 2, -height / 2, width, height, radius);

        ctx.shadowColor = 'transparent';
        ctx.fillStyle = colors.platformLip;
        drawRoundRect(ctx, -width / 2, -height / 2, width, edgeHeight, Math.min(radius, edgeHeight / 2));

        ctx.fillStyle = colors.platformHighlight;
        ctx.fillRect(-width / 2 + 10, -height / 2 + 3, Math.max(0, width - 20), 2);

        ctx.fillStyle = colors.platformSideShade;
        drawRoundRect(ctx, -width / 2, height / 2 - 7, width, 7, 3);

        ctx.strokeStyle = colors.platformStroke;
        ctx.lineWidth = 2;
        drawRoundRectStroke(ctx, -width / 2, -height / 2, width, height, radius);
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

    ctx.save();
    ctx.fillStyle = colors.decorShadow;
    ctx.beginPath();
    ctx.ellipse(baseX, baseY + 3 * scale, 26 * scale, 7 * scale, 0, 0, Math.PI * 2);
    ctx.fill();

    const trunkGradient = ctx.createLinearGradient(baseX - trunkWidth / 2, baseY, baseX + trunkWidth / 2, baseY);
    trunkGradient.addColorStop(0, colors.palmTrunkDark);
    trunkGradient.addColorStop(0.45, colors.palmTrunk);
    trunkGradient.addColorStop(1, colors.palmTrunkLight);
    ctx.fillStyle = trunkGradient;
    drawRoundRect(ctx, baseX - trunkWidth / 2, baseY - trunkHeight, trunkWidth, trunkHeight, trunkWidth / 2);

    ctx.strokeStyle = colors.palmTrunkStripe;
    ctx.lineWidth = 2 * scale;
    for (let y = baseY - trunkHeight + 12 * scale; y < baseY - 8 * scale; y += 15 * scale) {
        ctx.beginPath();
        ctx.moveTo(baseX - trunkWidth * 0.38, y);
        ctx.lineTo(baseX + trunkWidth * 0.38, y + 5 * scale);
        ctx.stroke();
    }

    ctx.shadowColor = 'rgba(26, 68, 45, 0.2)';
    ctx.shadowBlur = 8 * scale;
    ctx.fillStyle = colors.palmLeavesDark;
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

    ctx.shadowColor = 'transparent';
    ctx.fillStyle = colors.palmLeaves;
    for (let i = 1; i < numLeaves - 1; i++) {
        ctx.save();
        ctx.translate(baseX, topY - 2 * scale);
        const angle = (i / (numLeaves - 1)) * Math.PI * 1.2 - Math.PI * 0.6;
        ctx.rotate(angle);
        ctx.beginPath();
        ctx.ellipse(0, leafLength * 0.38, leafWidth * 0.28, leafLength * 0.38, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
    }

    ctx.fillStyle = colors.palmCoconut;
    for (let i = 0; i < 3; i += 1) {
        ctx.beginPath();
        ctx.arc(baseX + (i - 1) * 6 * scale, topY + 4 * scale, 4 * scale, 0, Math.PI * 2);
        ctx.fill();
    }
    ctx.restore();
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

    ctx.fillStyle = colors.playerShadow;
    ctx.beginPath();
    ctx.ellipse(0, playerHeight / 2 + 3, playerWidth * 0.54, 5, 0, 0, Math.PI * 2);
    ctx.fill();

    const legGradient = ctx.createLinearGradient(0, legDrawY, 0, legDrawY + legHeight);
    legGradient.addColorStop(0, colors.playerBodyLight);
    legGradient.addColorStop(1, colors.playerBodyDark);
    ctx.fillStyle = legGradient;
    drawRoundRect(ctx, legX1 - legWidth / 2, legDrawY + legOffsetY1, legWidth, legHeight, legWidth / 3);
    drawRoundRect(ctx, legX2 - legWidth / 2, legDrawY + legOffsetY2, legWidth, legHeight, legWidth / 3);

    const bodyDrawX = -playerWidth / 2;
    const bodyDrawY = -playerHeight / 2;
    const bodyGradient = ctx.createLinearGradient(bodyDrawX, bodyDrawY, bodyDrawX + playerWidth, bodyDrawY + playerHeight);
    bodyGradient.addColorStop(0, colors.playerBodyLight);
    bodyGradient.addColorStop(0.45, colors.playerBody);
    bodyGradient.addColorStop(1, colors.playerBodyDark);
    ctx.fillStyle = bodyGradient;
    drawRoundRect(ctx, bodyDrawX, bodyDrawY, playerWidth, playerHeight, playerCornerRadius);
    ctx.strokeStyle = colors.playerStroke;
    ctx.lineWidth = 1.5;
    drawRoundRectStroke(ctx, bodyDrawX, bodyDrawY, playerWidth, playerHeight, playerCornerRadius);

    const headbandGradient = ctx.createLinearGradient(bodyDrawX, 0, bodyDrawX + playerWidth, 0);
    headbandGradient.addColorStop(0, data.headbandColor);
    headbandGradient.addColorStop(0.55, colors.headbandHighlight);
    headbandGradient.addColorStop(1, data.headbandColor);
    ctx.fillStyle = headbandGradient;
    drawRoundRect(ctx, bodyDrawX, bodyDrawY + headHeight * 0.15, playerWidth, headbandHeight, 2);

    ctx.fillStyle = colors.playerBodyHighlight;
    drawRoundRect(ctx, bodyDrawX + 4, bodyDrawY + 6, 6, playerHeight - 14, 3);

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
        ctx.shadowColor = colors.indicatorGlow;
        ctx.shadowBlur = 10;
        ctx.fillStyle = data.tagTimer > 0 ? 'rgba(241, 196, 15, 0.5)' : colors.indicator;
        ctx.beginPath();
        ctx.moveTo(0, indicatorY - indicatorSize * 0.8);
        ctx.lineTo(-indicatorSize, indicatorY + indicatorSize * 0.6);
        ctx.lineTo(indicatorSize, indicatorY + indicatorSize * 0.6);
        ctx.closePath();
        ctx.fill();
        ctx.shadowColor = 'transparent';
        if (data.tagTimer > 0) {
            const progressBarY = bodyDrawY - 20;
            const progressBarHeight = 4;
            const progress = 1 - data.tagTimer / tagCooldownTime;
            ctx.fillStyle = colors.cooldownTrack;
            drawRoundRect(ctx, bodyDrawX, progressBarY, playerWidth, progressBarHeight, progressBarHeight / 2);
            ctx.fillStyle = colors.indicator;
            drawRoundRect(ctx, bodyDrawX, progressBarY, playerWidth * progress, progressBarHeight, progressBarHeight / 2);
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

export function updateCamera(camera, canvasWidth, canvasHeight, worldWidth, worldHeight, zoomPadding, minZoom, maxZoom, zoomLerpFactor, cameraLerpFactor, playerBodies, bottomPadding = 0) {
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
    camera.focusY = Math.max(viewHeight / 2, Math.min(worldHeight + bottomPadding - viewHeight / 2, camera.focusY));
}
