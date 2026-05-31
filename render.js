function roundedRectPath(ctx, x, y, width, height, radius) {
    if (width < 2 * radius) radius = width / 2;
    if (height < 2 * radius) radius = height / 2;
    ctx.beginPath();
    ctx.moveTo(x + radius, y);
    ctx.arcTo(x + width, y, x + width, y + height, radius);
    ctx.arcTo(x + width, y + height, x, y + height, radius);
    ctx.arcTo(x, y + height, x, y, radius);
    ctx.arcTo(x, y, x + width, y, radius);
    ctx.closePath();
}

export function drawRoundRect(ctx, x, y, width, height, radius) {
    roundedRectPath(ctx, x, y, width, height, radius);
    ctx.fill();
}

function drawRoundRectStroke(ctx, x, y, width, height, radius) {
    roundedRectPath(ctx, x, y, width, height, radius);
    ctx.stroke();
}

function hasLoadedImage(image) {
    return Boolean(image && image.complete && image.naturalWidth > 0 && image.naturalHeight > 0);
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

function drawTexturedCosmosPlatform(ctx, textureImage, width, height, radius, colors) {
    const x = -width / 2;
    const y = -height / 2;

    ctx.save();
    roundedRectPath(ctx, x, y, width, height, radius);
    ctx.clip();

    const sourceWidth = textureImage.naturalWidth;
    const sourceHeight = textureImage.naturalHeight;
    const scale = Math.min(0.6, Math.max((height / sourceHeight) * 2.7, height / sourceHeight, 0.34));
    const drawWidth = sourceWidth * scale;
    const drawHeight = sourceHeight * scale;
    const drawY = y + (height - drawHeight) / 2;

    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';
    if (drawWidth >= width) {
        ctx.drawImage(textureImage, x + (width - drawWidth) / 2, drawY, drawWidth, drawHeight);
    } else {
        for (let drawX = x; drawX < x + width; drawX += drawWidth) {
            ctx.drawImage(textureImage, drawX, drawY, drawWidth, drawHeight);
        }
    }

    const surfaceShade = ctx.createLinearGradient(0, y, 0, y + height);
    surfaceShade.addColorStop(0, 'rgba(255, 230, 164, 0.20)');
    surfaceShade.addColorStop(0.32, 'rgba(255, 230, 164, 0.05)');
    surfaceShade.addColorStop(1, 'rgba(0, 0, 0, 0.30)');
    ctx.fillStyle = surfaceShade;
    ctx.fillRect(x, y, width, height);
    ctx.restore();

    ctx.strokeStyle = colors.platformStroke;
    ctx.lineWidth = 2;
    drawRoundRectStroke(ctx, x, y, width, height, radius);

    ctx.strokeStyle = colors.platformHighlight;
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(x + 10, y + 4);
    ctx.lineTo(x + width - 10, y + 4);
    ctx.stroke();
}

export function drawPlatforms(ctx, platformBodies, colors, platformTextureImage = null) {
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

        if (colors.platformStyle === 'cosmos') {
            if (hasLoadedImage(platformTextureImage)) {
                drawTexturedCosmosPlatform(ctx, platformTextureImage, width, height, 5, colors);
                ctx.restore();
                return;
            }

            ctx.shadowColor = 'transparent';
            ctx.fillStyle = colors.platformBase;
            drawRoundRect(ctx, -width / 2, -height / 2, width, height, 4);

            ctx.fillStyle = colors.platformTop;
            ctx.fillRect(-width / 2, -height / 2, width, edgeHeight);

            ctx.fillStyle = colors.platformHighlight;
            ctx.fillRect(-width / 2 + 8, -height / 2 + 3, Math.max(0, width - 16), 2);

            ctx.strokeStyle = colors.platformSideShade;
            ctx.lineWidth = 1;
            for (let y = -height / 2 + 12; y < height / 2 - 4; y += 6) {
                ctx.beginPath();
                ctx.moveTo(-width / 2 + 10, y);
                ctx.lineTo(width / 2 - 10, y);
                ctx.stroke();
            }

            ctx.strokeStyle = colors.platformStroke;
            ctx.lineWidth = 2;
            drawRoundRectStroke(ctx, -width / 2, -height / 2, width, height, 4);

            ctx.restore();
            return;
        }

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

function createRenderCanvas(width, height) {
    if (typeof OffscreenCanvas !== 'undefined') {
        return new OffscreenCanvas(width, height);
    }

    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    return canvas;
}

function createScaledRenderCache(sourceCanvas, scale, alpha = false) {
    const scaledCanvas = createRenderCanvas(
        Math.max(1, Math.round(sourceCanvas.width * scale)),
        Math.max(1, Math.round(sourceCanvas.height * scale))
    );
    const scaledCtx = scaledCanvas.getContext('2d', { alpha });

    scaledCtx.imageSmoothingEnabled = true;
    scaledCtx.imageSmoothingQuality = 'high';
    scaledCtx.drawImage(sourceCanvas, 0, 0, scaledCanvas.width, scaledCanvas.height);

    return { canvas: scaledCanvas, scale };
}

export function createWorldRenderCache({ worldWidth, worldHeight, bottomPadding, colors, platformBodies, decorations, getPlatformCoords, includeBackground = true, platformTextureImage = null }) {
    const cacheCanvas = createRenderCanvas(worldWidth, worldHeight + bottomPadding);
    const cacheCtx = cacheCanvas.getContext('2d', { alpha: !includeBackground });

    if (includeBackground) {
        const skyGradient = cacheCtx.createLinearGradient(0, 0, 0, worldHeight);

        skyGradient.addColorStop(0, colors.backgroundStart);
        skyGradient.addColorStop(1, colors.backgroundEnd);
        cacheCtx.fillStyle = skyGradient;
        cacheCtx.fillRect(0, 0, worldWidth, worldHeight + bottomPadding);

        drawParallaxBackground(
            cacheCtx,
            { focusX: 0, focusY: 0 },
            worldWidth,
            worldHeight,
            colors,
            0
        );
    } else {
        cacheCtx.clearRect(0, 0, worldWidth, worldHeight + bottomPadding);
    }

    drawDecorations(cacheCtx, decorations, platformBodies, getPlatformCoords, colors);
    drawPlatforms(cacheCtx, platformBodies, colors, platformTextureImage);

    return {
        levels: [
            { canvas: cacheCanvas, scale: 1 },
            createScaledRenderCache(cacheCanvas, 0.55, !includeBackground),
            createScaledRenderCache(cacheCanvas, 0.32, !includeBackground)
        ]
    };
}

function chooseRenderCacheLevel(renderCache, zoom) {
    if (!renderCache.levels) {
        return { canvas: renderCache, scale: 1 };
    }

    if (zoom < 0.38) return renderCache.levels[2];
    if (zoom < 0.58) return renderCache.levels[1];
    return renderCache.levels[0];
}

export function drawCachedWorld(ctx, renderCache, camera, canvasWidth, canvasHeight, margin = 120) {
    const { canvas: cacheCanvas, scale } = chooseRenderCacheLevel(renderCache, camera.zoom);
    const viewWidth = canvasWidth / camera.zoom;
    const viewHeight = canvasHeight / camera.zoom;
    const sourceWidth = cacheCanvas.width / scale;
    const sourceHeight = cacheCanvas.height / scale;
    const sx = Math.max(0, Math.floor(camera.focusX - viewWidth / 2 - margin));
    const sy = Math.max(0, Math.floor(camera.focusY - viewHeight / 2 - margin));
    const sw = Math.min(sourceWidth - sx, Math.ceil(viewWidth + margin * 2));
    const sh = Math.min(sourceHeight - sy, Math.ceil(viewHeight + margin * 2));

    if (sw <= 0 || sh <= 0) return;

    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'medium';
    ctx.drawImage(
        cacheCanvas,
        sx * scale,
        sy * scale,
        sw * scale,
        sh * scale,
        sx,
        sy,
        sw,
        sh
    );
}

function seededUnit(index, salt) {
    const value = Math.sin(index * 127.1 + salt * 311.7) * 43758.5453;
    return value - Math.floor(value);
}

const cosmosStars = Array.from({ length: 130 }, (_, index) => ({
    x: seededUnit(index, 1) * 3600 - 200,
    y: seededUnit(index, 2) * 2650 - 120,
    size: 1 + Math.floor(seededUnit(index, 3) * 3),
    kind: seededUnit(index, 4) > 0.88 ? 'cross' : 'dot',
    color: seededUnit(index, 5) > 0.72 ? '#f1dca5' : '#f4f4ef',
    depth: 0.12 + seededUnit(index, 6) * 0.08
}));

const cosmosPlanets = [
    { type: 'stripe', x: 520, y: 360, radius: 74, depth: 0.22, base: '#f5e5b2', stroke: '#f0c56e', line: '#8e4d27' },
    { type: 'ring', x: 2110, y: 640, radius: 54, depth: 0.28, base: '#e55b3f', stroke: '#f0c56e', line: '#f3d99b' },
    { type: 'rock', x: 1050, y: 850, radius: 46, depth: 0.25, base: '#191919', stroke: '#d8c28b', line: '#f0dfb1' },
    { type: 'cloud', x: 2860, y: 930, radius: 72, depth: 0.18, base: '#3b3b3a', stroke: '#77736a', line: '#9d9276' },
    { type: 'moon', x: 1780, y: 1030, radius: 30, depth: 0.2, base: '#f5d990', stroke: '#fff1bd', line: '#f5d990' },
    { type: 'moon', x: 2650, y: 260, radius: 18, depth: 0.14, base: '#d5b98a', stroke: '#f3e1b3', line: '#d5b98a' }
];

function parallaxPoint(camera, canvasWidth, canvasHeight, worldX, worldY, depth) {
    return {
        x: canvasWidth / 2 + (worldX - camera.focusX) * camera.zoom * depth,
        y: canvasHeight / 2 + (worldY - camera.focusY) * camera.zoom * depth
    };
}

function drawCrossStar(ctx, x, y, size, color) {
    ctx.strokeStyle = color;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(x - size * 3, y);
    ctx.lineTo(x + size * 3, y);
    ctx.moveTo(x, y - size * 3);
    ctx.lineTo(x, y + size * 3);
    ctx.moveTo(x - size * 1.7, y - size * 1.7);
    ctx.lineTo(x + size * 1.7, y + size * 1.7);
    ctx.moveTo(x - size * 1.7, y + size * 1.7);
    ctx.lineTo(x + size * 1.7, y - size * 1.7);
    ctx.stroke();
}

function drawStripePlanet(ctx, planet, x, y, radius) {
    ctx.fillStyle = planet.base;
    ctx.beginPath();
    ctx.arc(x, y, radius, 0, Math.PI * 2);
    ctx.fill();
    ctx.save();
    ctx.beginPath();
    ctx.arc(x, y, radius, 0, Math.PI * 2);
    ctx.clip();
    ctx.strokeStyle = planet.line;
    ctx.lineWidth = Math.max(2, radius * 0.04);
    for (let offset = -radius * 0.72; offset <= radius * 0.75; offset += radius * 0.25) {
        ctx.beginPath();
        ctx.moveTo(x - radius * 1.05, y + offset);
        ctx.bezierCurveTo(
            x - radius * 0.35,
            y + offset - radius * 0.22,
            x + radius * 0.35,
            y + offset + radius * 0.22,
            x + radius * 1.05,
            y + offset
        );
        ctx.stroke();
    }
    ctx.restore();
    ctx.strokeStyle = planet.stroke;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(x, y, radius, 0, Math.PI * 2);
    ctx.stroke();
}

function drawRingPlanet(ctx, planet, x, y, radius) {
    ctx.strokeStyle = planet.line;
    ctx.lineWidth = Math.max(4, radius * 0.1);
    ctx.beginPath();
    ctx.ellipse(x, y + radius * 0.04, radius * 1.75, radius * 0.45, 0.18, 0, Math.PI * 2);
    ctx.stroke();

    ctx.fillStyle = planet.base;
    ctx.beginPath();
    ctx.arc(x, y, radius, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = planet.stroke;
    ctx.lineWidth = 2;
    ctx.stroke();

    ctx.strokeStyle = '#15110d';
    ctx.lineWidth = Math.max(2, radius * 0.05);
    ctx.beginPath();
    ctx.ellipse(x, y + radius * 0.04, radius * 1.75, radius * 0.45, 0.18, Math.PI * 0.04, Math.PI * 0.95);
    ctx.stroke();
}

function drawCloudPlanet(ctx, planet, x, y, radius) {
    ctx.fillStyle = planet.base;
    ctx.beginPath();
    for (let index = 0; index < 14; index += 1) {
        const angle = (index / 14) * Math.PI * 2;
        const wave = 0.88 + Math.sin(index * 1.9) * 0.11;
        const px = x + Math.cos(angle) * radius * wave;
        const py = y + Math.sin(angle) * radius * (0.72 + Math.cos(index * 1.4) * 0.08);
        if (index === 0) ctx.moveTo(px, py);
        else ctx.lineTo(px, py);
    }
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = planet.stroke;
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.strokeStyle = planet.line;
    ctx.lineWidth = 1.4;
    for (let offset = -radius * 0.35; offset <= radius * 0.35; offset += radius * 0.22) {
        ctx.beginPath();
        ctx.moveTo(x - radius * 0.55, y + offset);
        ctx.bezierCurveTo(x - radius * 0.1, y + offset - 7, x + radius * 0.3, y + offset + 8, x + radius * 0.58, y + offset);
        ctx.stroke();
    }
}

function drawRockPlanet(ctx, planet, x, y, radius) {
    ctx.fillStyle = planet.base;
    ctx.beginPath();
    ctx.arc(x, y, radius, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = planet.stroke;
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.strokeStyle = planet.line;
    ctx.lineWidth = 1.5;
    for (let index = 0; index < 8; index += 1) {
        const start = (index / 8) * Math.PI * 2;
        ctx.beginPath();
        ctx.moveTo(x + Math.cos(start) * radius * 0.2, y + Math.sin(start) * radius * 0.2);
        ctx.lineTo(x + Math.cos(start + 0.7) * radius * 0.78, y + Math.sin(start + 0.7) * radius * 0.78);
        ctx.stroke();
    }
}

function drawPlanet(ctx, camera, canvasWidth, canvasHeight, planet) {
    const point = parallaxPoint(camera, canvasWidth, canvasHeight, planet.x, planet.y, planet.depth);
    const radius = planet.radius * Math.max(0.52, Math.min(1.1, camera.zoom * 1.3));

    if (
        point.x < -radius * 3 ||
        point.x > canvasWidth + radius * 3 ||
        point.y < -radius * 3 ||
        point.y > canvasHeight + radius * 3
    ) {
        return;
    }

    if (planet.type === 'stripe') drawStripePlanet(ctx, planet, point.x, point.y, radius);
    else if (planet.type === 'ring') drawRingPlanet(ctx, planet, point.x, point.y, radius);
    else if (planet.type === 'cloud') drawCloudPlanet(ctx, planet, point.x, point.y, radius);
    else if (planet.type === 'rock') drawRockPlanet(ctx, planet, point.x, point.y, radius);
    else {
        ctx.fillStyle = planet.base;
        ctx.beginPath();
        ctx.arc(point.x, point.y, radius, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = planet.stroke;
        ctx.lineWidth = 2;
        ctx.stroke();
    }
}

function drawCosmosWaveBand(ctx, camera, canvasWidth, canvasHeight, worldWidth, baseY, depth, fill, stroke, phase, amplitude, closeToBottom) {
    ctx.fillStyle = fill;
    ctx.beginPath();
    for (let worldX = -400; worldX <= worldWidth + 400; worldX += 120) {
        const waveY = baseY +
            Math.sin(worldX * 0.005 + phase) * amplitude +
            Math.sin(worldX * 0.011 + phase * 0.7) * amplitude * 0.28;
        const point = parallaxPoint(camera, canvasWidth, canvasHeight, worldX, waveY, depth);
        if (worldX === -400) ctx.moveTo(point.x, point.y);
        else ctx.lineTo(point.x, point.y);
    }
    ctx.lineTo(canvasWidth + 220, closeToBottom);
    ctx.lineTo(-220, closeToBottom);
    ctx.closePath();
    ctx.fill();

    ctx.strokeStyle = stroke;
    ctx.lineWidth = 2;
    for (let line = 0; line < 7; line += 1) {
        ctx.beginPath();
        for (let worldX = -400; worldX <= worldWidth + 400; worldX += 100) {
            const waveY = baseY + line * 42 +
                Math.sin(worldX * 0.005 + phase + line * 0.38) * amplitude +
                Math.sin(worldX * 0.011 + phase * 0.7) * amplitude * 0.22;
            const point = parallaxPoint(camera, canvasWidth, canvasHeight, worldX, waveY, depth);
            if (worldX === -400) ctx.moveTo(point.x, point.y);
            else ctx.lineTo(point.x, point.y);
        }
        ctx.stroke();
    }
}

function drawParallaxImageBackground(ctx, camera, canvasWidth, canvasHeight, worldWidth, worldHeight, image) {
    const coverScale = Math.max(canvasWidth / image.naturalWidth, canvasHeight / image.naturalHeight);
    const zoomReference = 0.35;
    const zoomScale = Math.max(0.9, Math.min(1.2, 1 + (camera.zoom - zoomReference) * 0.42));
    const scale = coverScale * 1.62 * zoomScale;
    const drawWidth = image.naturalWidth * scale;
    const drawHeight = image.naturalHeight * scale;
    const maxPanX = Math.max(0, drawWidth - canvasWidth);
    const maxPanY = Math.max(0, drawHeight - canvasHeight);
    const cameraOffsetX = (camera.focusX - worldWidth / 2) / Math.max(1, worldWidth / 2);
    const cameraOffsetY = (camera.focusY - worldHeight / 2) / Math.max(1, worldHeight / 2);
    const x = (canvasWidth - drawWidth) / 2 - cameraOffsetX * maxPanX * 0.46;
    const y = (canvasHeight - drawHeight) / 2 - cameraOffsetY * maxPanY * 0.32;

    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';
    ctx.drawImage(image, x, y, drawWidth, drawHeight);
}

export function drawCosmosBackground(ctx, camera, canvasWidth, canvasHeight, worldWidth, worldHeight, image = null) {
    ctx.save();
    if (hasLoadedImage(image)) {
        drawParallaxImageBackground(ctx, camera, canvasWidth, canvasHeight, worldWidth, worldHeight, image);
        ctx.restore();
        return;
    }

    ctx.fillStyle = '#0d0d0c';
    ctx.fillRect(0, 0, canvasWidth, canvasHeight);

    cosmosStars.forEach(star => {
        const point = parallaxPoint(camera, canvasWidth, canvasHeight, star.x, star.y, star.depth);
        if (point.x < -20 || point.x > canvasWidth + 20 || point.y < -20 || point.y > canvasHeight + 20) return;

        if (star.kind === 'cross') {
            drawCrossStar(ctx, point.x, point.y, star.size, star.color);
        } else {
            ctx.fillStyle = star.color;
            ctx.beginPath();
            ctx.arc(point.x, point.y, star.size * 0.75, 0, Math.PI * 2);
            ctx.fill();
        }
    });

    cosmosPlanets.forEach(planet => drawPlanet(ctx, camera, canvasWidth, canvasHeight, planet));

    drawCosmosWaveBand(ctx, camera, canvasWidth, canvasHeight, worldWidth, worldHeight - 760, 0.46, '#171716', '#3c3a35', 0.2, 92, canvasHeight + 260);
    drawCosmosWaveBand(ctx, camera, canvasWidth, canvasHeight, worldWidth, worldHeight - 560, 0.58, '#0f0f0e', '#b99a5f', 1.4, 72, canvasHeight + 260);
    drawCosmosWaveBand(ctx, camera, canvasWidth, canvasHeight, worldWidth, worldHeight - 370, 0.72, '#1d1d1b', '#ead38e', 2.1, 58, canvasHeight + 300);

    ctx.restore();
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
        ctx.save();
        ctx.globalAlpha = opacity;
        ctx.fillStyle = '#fff2a6';
        ctx.fillRect(0, 0, canvasWidth, canvasHeight);
        ctx.restore();
        setOpacity(Math.max(0, opacity - 0.06));
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
