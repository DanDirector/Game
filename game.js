    document.addEventListener('DOMContentLoaded', () => {

        const canvas = document.getElementById('gameCanvas');
        const ctx = canvas.getContext('2d');

        // --- Matter.js Модули ---
        const Engine = Matter.Engine; const World = Matter.World; const Bodies = Matter.Bodies;
        const Body = Matter.Body; const Events = Matter.Events; const Query = Matter.Query;

        // --- Размеры ---
        const canvasWidth = canvas.width; const canvasHeight = canvas.height;
        const worldWidth = 3200; const worldHeight = 2400;

        // --- Настройки игры ---
        const moveSpeed = 5.5; const jumpStrength = 15; const playerWidth = 35;
        const playerHeight = 45; const playerCornerRadius = 8; const tagCooldownTime = 1500;
        const cameraLerpFactor = 0.08; const zoomLerpFactor = 0.05; const minZoom = 0.25;
        const maxZoom = 0.8; const zoomPadding = 200; const parallaxFactor = 0.3;
        const legAnimationSpeed = 80;
        const groundCheckThreshold = 0.6;
        const jumpVelocityThreshold = 0.5; // Оставляем для фикса углов
        // *** НОВЫЕ КОНСТАНТЫ: Ускорение и Замедление ***
        const accelerationFactor = 0.1; // Коэффициент ускорения (0.0 до 1.0)
        const decelerationFactor = 0.15; // Коэффициент замедления (0.0 до 1.0)

        // --- Цвета ---
        const colors = { /* ... без изменений ... */
             backgroundStart: '#e0e6eb', backgroundEnd: '#b0b8c1', hillColorFar: 'rgba(130, 140, 150, 0.3)', hillColorNear: 'rgba(120, 130, 140, 0.4)', platformBase: '#f5d7a4', platformEdge: '#e4a76a', playerBody: '#2c3e50', player1Headband: '#3498db', player2Headband: '#e74c3c', eyeWhite: '#ffffff', eyePupil: '#000000', indicator: '#f1c40f', borderColor: '#f5c876', palmTrunk: '#a0795b', palmLeaves: '#27ae60', flash: 'rgba(255, 255, 0, 0.3)'
        };
        const pageBackgroundColor = '#2a2a2a';

        // --- Состояние игры ---
        let flashOpacity = 0;

        // --- Камера ---
        const p1StartX = worldWidth / 4; const p2StartX = 3 * worldWidth / 4;
        const initialFocusX = worldWidth / 2; const initialFocusY = worldHeight - 400;
        const camera = { /* ... без изменений ... */
             zoom: 0.35, targetZoom: 0.35, focusX: initialFocusX, focusY: initialFocusY, targetFocusX: initialFocusX, targetFocusY: initialFocusY
        };

        // --- Инициализация Matter.js ---
        const engine = Engine.create(); const world = engine.world;
        engine.world.gravity.y = 1.4;

        // --- Создание игроков ---
        const playerBodies = [];
        const playerRenderData = [ /* ... без изменений ... */
             { id: 0, headbandColor: colors.player1Headband, controls: { up: 'KeyW', left: 'KeyA', right: 'KeyD' }, isTagger: true, tagTimer: 0, facingDirection: 'right', isMovingHorizontally: false, legAnimationTimer: 0, legAnimationFrame: 0, isOnGround: false, hasJumpedThisPress: false },
            { id: 1, headbandColor: colors.player2Headband, controls: { up: 'ArrowUp', left: 'ArrowLeft', right: 'ArrowRight' }, isTagger: false, tagTimer: 0, facingDirection: 'left', isMovingHorizontally: false, legAnimationTimer: 0, legAnimationFrame: 0, isOnGround: false, hasJumpedThisPress: false }
         ];
        playerRenderData.forEach((data, index) => {
            const startX = index === 0 ? p1StartX : p2StartX;
            const startY = worldHeight - 150;
            const playerBody = Bodies.rectangle(startX, startY, playerWidth, playerHeight, {
                label: `player-${data.id}`, inertia: Infinity,
                friction: 0.005, frictionAir: 0.01, restitution: 0,
                density: 0.002, collisionFilter: { group: -1 },
                slop: 0.05, chamfer: { radius: 10 }
            });
            playerBody.renderData = data; playerBodies.push(playerBody);
        });
        World.add(world, playerBodies);

        // --- Создание платформ и границ мира (без изменений) ---
        const platformBodies = []; const boundaryThickness = 100; const platformOptions = { isStatic: true, friction: 0.5, frictionStatic: 0.8, restitution: 0 }; const platformHeight = 30; const platformData = [ /* ... тот же platformData ... */ { x: worldWidth / 2, y: worldHeight + boundaryThickness / 2 - 10, width: worldWidth, height: boundaryThickness, angle: 0, label: 'platform-ground', visible: true }, { x: worldWidth / 2, y: -boundaryThickness / 2, width: worldWidth, height: boundaryThickness, angle: 0, label: 'platform-ceiling', visible: false }, { x: -boundaryThickness / 2, y: worldHeight / 2, width: boundaryThickness, height: worldHeight, angle: 0, label: 'wall-left', visible: false }, { x: worldWidth + boundaryThickness / 2, y: worldHeight / 2, width: boundaryThickness, height: worldHeight, angle: 0, label: 'wall-right', visible: false }, { x: p1StartX, y: worldHeight - 150, width: 250 * 2, height: platformHeight, angle: 0, label: 'platform-start-left' }, { x: p2StartX, y: worldHeight - 150, width: 250 * 2, height: platformHeight, angle: 0, label: 'platform-start-right' }, { x: 400, y: worldHeight - 250, width: 200, height: platformHeight, angle: 0, label: 'platform-low-far-left' }, { x: worldWidth - 400, y: worldHeight - 250, width: 200, height: platformHeight, angle: 0, label: 'platform-low-far-right' }, { x: worldWidth / 2, y: worldHeight - 350, width: 400 * 2, height: platformHeight, angle: 0, label: 'platform-low-center' }, { x: 600, y: worldHeight - 450, width: 180, height: platformHeight, angle: -Math.PI / 16, label: 'platform-mid-left-angled' }, { x: worldWidth - 600, y: worldHeight - 450, width: 180, height: platformHeight, angle: Math.PI / 16, label: 'platform-mid-right-angled' }, { x: 1100, y: worldHeight - 550, width: 250 * 2, height: platformHeight, angle: 0, label: 'platform-mid-center-left' }, { x: worldWidth - 1100, y: worldHeight - 550, width: 250 * 2, height: platformHeight, angle: 0, label: 'platform-mid-center-right' }, { x: 250, y: worldHeight - 700, width: 150, height: platformHeight, angle: 0, label: 'platform-mid-step-left' }, { x: worldWidth - 250, y: worldHeight - 700, width: 150, height: platformHeight, angle: 0, label: 'platform-mid-step-right' }, { x: 850, y: worldHeight - 750, width: 200, height: platformHeight, angle: 0, label: 'platform-upper-mid-left' }, { x: worldWidth - 850, y: worldHeight - 750, width: 200, height: platformHeight, angle: 0, label: 'platform-upper-mid-right' }, { x: worldWidth / 2, y: worldHeight - 900, width: 300 * 2, height: platformHeight, angle: 0, label: 'platform-upper-mid-center' }, { x: 400, y: worldHeight - 1100, width: 150, height: platformHeight, angle: Math.PI / 20, label: 'platform-high-far-left' }, { x: worldWidth - 400, y: worldHeight - 1100, width: 150, height: platformHeight, angle: -Math.PI / 20, label: 'platform-high-far-right' }, { x: 1200, y: worldHeight - 1200, width: 180 * 2, height: platformHeight, angle: 0, label: 'platform-high-center-left' }, { x: worldWidth - 1200, y: worldHeight - 1200, width: 180 * 2, height: platformHeight, angle: 0, label: 'platform-high-center-right' }, { x: worldWidth / 2, y: worldHeight - 1500, width: 250, height: platformHeight, angle: 0, label: 'platform-top-center' }, { x: 800, y: worldHeight - 1600, width: 150 * 2, height: platformHeight, angle: 0, label: 'platform-top-left' }, { x: worldWidth - 800, y: worldHeight - 1600, width: 150 * 2, height: platformHeight, angle: 0, label: 'platform-top-right' }, ];
        platformData.forEach((data) => { const platformBody = Bodies.rectangle(data.x, data.y, data.width, data.height, { ...platformOptions, angle: data.angle, label: data.label }); platformBody.renderData = { width: data.width, height: data.height, colorBase: colors.platformBase, colorTop: colors.platformEdge, visible: data.visible !== false }; platformBodies.push(platformBody); });
        World.add(world, platformBodies);

        // --- Декорации (без изменений) ---
        const decorations = [ /* ... тот же decorations ... */ { type: 'palm', platformLabel: 'platform-start-left', offsetX: -150 }, { type: 'palm', platformLabel: 'platform-start-right', offsetX: 150 }, { type: 'palm', platformLabel: 'platform-low-far-left', offsetX: 0 }, { type: 'palm', platformLabel: 'platform-low-far-right', offsetX: 0 }, { type: 'palm', platformLabel: 'platform-low-center', offsetX: -250 }, { type: 'palm', platformLabel: 'platform-low-center', offsetX: 250 }, { type: 'palm', platformLabel: 'platform-mid-center-left', offsetX: -100 }, { type: 'palm', platformLabel: 'platform-mid-center-right', offsetX: 100 }, { type: 'palm', platformLabel: 'platform-upper-mid-center', offsetX: -200 }, { type: 'palm', platformLabel: 'platform-upper-mid-center', offsetX: 200 }, { type: 'palm', platformLabel: 'platform-ground', offsetX: -worldWidth/2 + 250}, { type: 'palm', platformLabel: 'platform-ground', offsetX: worldWidth/2 - 250}, ];

        // --- Функции (без изменений, кроме handleInput) ---
        function getPlatformCoords(label) { /* ... */ const platform = platformBodies.find(p => p.label === label); return platform ? { x: platform.position.x, y: platform.position.y - platform.renderData.height / 2 } : null; }
        const keysPressed = {}; document.addEventListener('keydown', (event) => { keysPressed[event.code] = true; }); document.addEventListener('keyup', (event) => { keysPressed[event.code] = false; });
        function drawRoundRect(ctx, x, y, width, height, radius) { /* ... */ if (width < 2 * radius) radius = width / 2; if (height < 2 * radius) radius = height / 2; ctx.beginPath(); ctx.moveTo(x + radius, y); ctx.arcTo(x + width, y, x + width, y + height, radius); ctx.arcTo(x + width, y + height, x, y + height, radius); ctx.arcTo(x, y + height, x, y, radius); ctx.arcTo(x, y, x + width, y, radius); ctx.closePath(); ctx.fill(); }
        function drawParallaxBackground() { /* ... */ const camOffsetX = camera.focusX * parallaxFactor; const camOffsetY = camera.focusY * parallaxFactor * 0.5; ctx.save(); ctx.translate(-camOffsetX, -camOffsetY); const hillBaseY = worldHeight; ctx.fillStyle = colors.hillColorFar; ctx.beginPath(); ctx.moveTo(-worldWidth, hillBaseY); for (let x = -worldWidth; x < worldWidth * 2; x += 150) { const y = hillBaseY - (worldHeight * 0.1) - Math.sin(x * 0.0015 / 2 + 1) * (worldHeight * 0.05); ctx.lineTo(x, y); } ctx.lineTo(worldWidth * 2, hillBaseY); ctx.closePath(); ctx.fill(); ctx.fillStyle = colors.hillColorNear; ctx.beginPath(); ctx.moveTo(-worldWidth, hillBaseY); for (let x = -worldWidth; x < worldWidth * 2; x += 100) { const y = hillBaseY - (worldHeight * 0.05) - Math.cos(x * 0.002 / 2) * (worldHeight * 0.03); ctx.lineTo(x, y); } ctx.lineTo(worldWidth * 2, hillBaseY); ctx.closePath(); ctx.fill(); ctx.restore(); }
        function drawPlatforms() { /* ... */ const edgeHeight = 5; platformBodies.forEach(platformBody => { if (!platformBody.renderData.visible) return; const pos = platformBody.position; const angle = platformBody.angle; const width = platformBody.renderData.width; const height = platformBody.renderData.height; ctx.save(); ctx.translate(pos.x, pos.y); ctx.rotate(angle); ctx.fillStyle = platformBody.renderData.colorBase; ctx.fillRect(-width / 2, -height / 2, width, height); ctx.fillStyle = platformBody.renderData.colorTop; ctx.fillRect(-width / 2, -height / 2, width, edgeHeight); ctx.restore(); }); }
        function drawDecorations() { /* ... */ decorations.forEach(deco => { const platformCoords = getPlatformCoords(deco.platformLabel); if (platformCoords) { const x = platformCoords.x + deco.offsetX; const y = platformCoords.y; if (deco.type === 'palm') { drawPalm(ctx, x, y, 1.2); } } }); }
        function drawPalm(targetCtx, baseX, baseY, scale = 1) { /* ... */ const trunkWidth = 12 * scale; const trunkHeight = 70 * scale; const numLeaves = 7; const leafLength = 45 * scale; const leafWidth = 18 * scale; const topY = baseY - trunkHeight; targetCtx.fillStyle = colors.palmTrunk; targetCtx.fillRect(baseX - trunkWidth / 2, baseY - trunkHeight, trunkWidth, trunkHeight); targetCtx.fillStyle = colors.palmLeaves; for (let i = 0; i < numLeaves; i++) { targetCtx.save(); targetCtx.translate(baseX, topY); const angle = (i / (numLeaves -1)) * Math.PI * 1.4 - Math.PI * 0.7; targetCtx.rotate(angle); targetCtx.beginPath(); targetCtx.ellipse(0, leafLength / 2, leafWidth / 2, leafLength / 2, 0, 0, Math.PI * 2); targetCtx.fill(); targetCtx.restore(); } }
        function drawPlayer(playerBody, deltaTime) { /* ... */ const pos = playerBody.position; const data = playerBody.renderData; const headHeight = playerHeight * 0.4; const eyeRadius = playerWidth * 0.09; const pupilRadius = eyeRadius * 0.6; const eyeOffsetY = playerHeight * 0.18; const headbandHeight = playerHeight * 0.18; const legWidth = playerWidth * 0.2; const legHeight = playerHeight * 0.25; const legBaseY = playerHeight / 2 - legHeight; const eyeOffsetXBase = playerWidth * 0.2; let pupilOffsetX = 0; if (data.facingDirection === 'left') { pupilOffsetX = -eyeRadius * 0.4; } else if (data.facingDirection === 'right') { pupilOffsetX = eyeRadius * 0.4; } const legCycleDuration = legAnimationSpeed * 2; let legOffsetY1 = 0; let legOffsetY2 = 0; if (data.isMovingHorizontally && data.isOnGround) { data.legAnimationTimer = (data.legAnimationTimer + deltaTime) % legCycleDuration; const phase = (data.legAnimationTimer / legCycleDuration) * Math.PI * 2; legOffsetY1 = Math.sin(phase) * legHeight * 0.3; legOffsetY2 = Math.sin(phase + Math.PI) * legHeight * 0.3; } else { data.legAnimationTimer = 0; } ctx.save(); ctx.translate(pos.x, pos.y); const legDrawY = legBaseY; const legX1 = -playerWidth * 0.2; const legX2 = playerWidth * 0.2; ctx.fillStyle = colors.playerBody; drawRoundRect(ctx, legX1 - legWidth / 2, legDrawY + legOffsetY1, legWidth, legHeight, legWidth/3); drawRoundRect(ctx, legX2 - legWidth / 2, legDrawY + legOffsetY2, legWidth, legHeight, legWidth/3); const bodyDrawX = -playerWidth / 2; const bodyDrawY = -playerHeight / 2; ctx.fillStyle = colors.playerBody; drawRoundRect(ctx, bodyDrawX, bodyDrawY, playerWidth, playerHeight, playerCornerRadius); ctx.fillStyle = data.headbandColor; ctx.fillRect(bodyDrawX, bodyDrawY + headHeight * 0.15, playerWidth, headbandHeight); const eyeCenterY = bodyDrawY + eyeOffsetY; const eyeCenterX1 = eyeOffsetXBase * (data.facingDirection === 'left' ? 1.1 : 0.9); const eyeCenterX2 = -eyeOffsetXBase * (data.facingDirection === 'right' ? 1.1 : 0.9); const eyeDrawX1 = data.facingDirection === 'left' ? eyeCenterX2 : eyeCenterX1; const eyeDrawX2 = data.facingDirection === 'left' ? eyeCenterX1 : eyeCenterX2; ctx.fillStyle = colors.eyeWhite; ctx.beginPath(); ctx.arc(eyeDrawX1, eyeCenterY, eyeRadius, 0, Math.PI * 2); ctx.fill(); ctx.beginPath(); ctx.arc(eyeDrawX2, eyeCenterY, eyeRadius, 0, Math.PI * 2); ctx.fill(); ctx.fillStyle = colors.eyePupil; ctx.beginPath(); ctx.arc(eyeDrawX1 + pupilOffsetX, eyeCenterY, pupilRadius, 0, Math.PI * 2); ctx.fill(); ctx.beginPath(); ctx.arc(eyeDrawX2 + pupilOffsetX, eyeCenterY, pupilRadius, 0, Math.PI * 2); ctx.fill(); if (data.isTagger) { const indicatorY = bodyDrawY - 12; const indicatorSize = 8; ctx.fillStyle = data.tagTimer > 0 ? 'rgba(241, 196, 15, 0.5)' : colors.indicator; ctx.beginPath(); ctx.moveTo(0, indicatorY - indicatorSize * 0.8); ctx.lineTo(-indicatorSize, indicatorY + indicatorSize * 0.6); ctx.lineTo(indicatorSize, indicatorY + indicatorSize * 0.6); ctx.closePath(); ctx.fill(); if (data.tagTimer > 0) { const progressBarY = bodyDrawY - 20; const progressBarHeight = 4; const progress = 1 - data.tagTimer / tagCooldownTime; ctx.fillStyle = 'rgba(0, 0, 0, 0.5)'; ctx.fillRect(bodyDrawX, progressBarY, playerWidth, progressBarHeight); ctx.fillStyle = colors.indicator; ctx.fillRect(bodyDrawX, progressBarY, playerWidth * progress, progressBarHeight); } } ctx.restore(); }
        function drawFlash() { /* ... */
            if (flashOpacity > 0) {
                ctx.fillStyle = `rgba(255, 255, 0, ${flashOpacity.toFixed(2)})`;
                ctx.fillRect(0, 0, canvasWidth, canvasHeight);
                flashOpacity -= 0.05;
                if (flashOpacity < 0) flashOpacity = 0;
            }
        }
        function updateCamera() { /* ... */ const p1Pos = playerBodies[0].position; const p2Pos = playerBodies[1].position; const focusTargetX = (p1Pos.x + p2Pos.x) / 2; const focusTargetY = (p1Pos.y + p2Pos.y) / 2; const distX = Math.abs(p1Pos.x - p2Pos.x); const distY = Math.abs(p1Pos.y - p2Pos.y); const requiredWidth = distX + zoomPadding * 2; const requiredHeight = distY + zoomPadding * 2; const zoomTargetX = canvasWidth / Math.max(1, requiredWidth); const zoomTargetY = canvasHeight / Math.max(1, requiredHeight); let targetZoom = Math.min(zoomTargetX, zoomTargetY); camera.targetZoom = Math.max(minZoom, Math.min(maxZoom, targetZoom)); camera.zoom += (camera.targetZoom - camera.zoom) * zoomLerpFactor; camera.targetFocusX = focusTargetX; camera.targetFocusY = focusTargetY; camera.focusX += (camera.targetFocusX - camera.focusX) * cameraLerpFactor; camera.focusY += (camera.targetFocusY - camera.focusY) * cameraLerpFactor; const viewWidth = canvasWidth / camera.zoom; const viewHeight = canvasHeight / camera.zoom; camera.focusX = Math.max(viewWidth / 2, Math.min(worldWidth - viewWidth / 2, camera.focusX)); camera.focusY = Math.max(viewHeight / 2, Math.min(worldHeight - viewHeight / 2, camera.focusY)); }

        // *** ИЗМЕНЕНО: handleInput с плавной скоростью ***
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


        // --- Логика перед обновлением движка (Проверка земли через нормали v3.8) ---
        Events.on(engine, 'beforeUpdate', (event) => {
            playerBodies.forEach(playerBody => {
                playerBody.renderData.isOnGround = false; // Сброс
            });
            const activePairs = engine.pairs.list;
            activePairs.forEach(pair => {
                if (!pair.isActive) return;
                let playerBody = null; let otherBody = null;
                if (pair.bodyA.label.startsWith('player-')) { playerBody = pair.bodyA; otherBody = pair.bodyB; }
                else if (pair.bodyB.label.startsWith('player-')) { playerBody = pair.bodyB; otherBody = pair.bodyA; }
                else { return; }
                if (!(otherBody.label.startsWith('platform-') || otherBody.label.startsWith('wall-'))) { return; }
                if (pair.collision && pair.collision.normal) {
                    const normal = pair.collision.normal;
                    const isGroundContact = (playerBody === pair.bodyA && normal.y < -groundCheckThreshold) || (playerBody === pair.bodyB && normal.y > groundCheckThreshold);
                    if (isGroundContact) { playerBody.renderData.isOnGround = true; }
                }
            });
            // --- Проверка тега ---
            const p1 = playerBodies[0]; const p2 = playerBodies[1]; const p1Data = p1.renderData; const p2Data = p2.renderData;
            const collisionCheck = Query.collides(p1, [p2]);
             if (collisionCheck.length > 0) {
                 if (p1Data.isTagger !== p2Data.isTagger && p1Data.tagTimer <= 0 && p2Data.tagTimer <= 0) {
                     p1Data.isTagger = !p1Data.isTagger; p2Data.isTagger = !p2Data.isTagger;
                     p1Data.tagTimer = tagCooldownTime; p2Data.tagTimer = tagCooldownTime;
                     flashOpacity = 0.3; console.log("Tag! Roles swapped. Flash activated.");
                 }
             }
        });

        // --- Обработчик collisionStart для смягчения углов (без изменений v3.8.4) ---
        Events.on(engine, 'collisionStart', (event) => {
            const pairs = event.pairs;
            pairs.forEach(pair => {
                let playerBody = null; let otherBody = null;
                if (pair.bodyA.label.startsWith('player-')) { playerBody = pair.bodyA; otherBody = pair.bodyB; }
                else if (pair.bodyB.label.startsWith('player-')) { playerBody = pair.bodyB; otherBody = pair.bodyA; }
                else { return; }
                if (!(otherBody.label.startsWith('platform-') || otherBody.label.startsWith('wall-'))) { return; }
                if (pair.collision && pair.collision.normal) {
                    const normal = pair.collision.normal;
                    if (Math.abs(normal.y) < 0.8) {
                        const velocity = playerBody.velocity;
                        if (velocity.y < 0) { // Только если движется вверх
                            const maxUpwardVelocity = -jumpStrength;
                            if (velocity.y < maxUpwardVelocity) {
                                console.log(`Corner velocity capped (moving up): ${velocity.y.toFixed(2)} -> ${maxUpwardVelocity}`);
                                Body.setVelocity(playerBody, { x: velocity.x, y: maxUpwardVelocity });
                            }
                        }
                    }
                }
            });
        });


        // --- Игровой цикл ---
        let lastTime = 0;
        function gameLoop(timestamp) {
             const deltaTime = timestamp - lastTime; lastTime = timestamp; const dt = Math.min(deltaTime, 50);
            playerBodies.forEach(playerBody => {
                const data = playerBody.renderData; if (data.tagTimer > 0) { data.tagTimer -= dt; if (data.tagTimer < 0) { data.tagTimer = 0; } }
            });
            handleInput(); Engine.update(engine, dt); updateCamera();
            ctx.fillStyle = pageBackgroundColor; ctx.fillRect(0, 0, canvasWidth, canvasHeight); ctx.save();
            ctx.translate(canvasWidth / 2, canvasHeight / 2); ctx.scale(camera.zoom, camera.zoom); ctx.translate(-camera.focusX, -camera.focusY);
            const skyGradient = ctx.createLinearGradient(0, 0, 0, worldHeight); skyGradient.addColorStop(0, colors.backgroundStart); skyGradient.addColorStop(1, colors.backgroundEnd);
            ctx.fillStyle = skyGradient; ctx.fillRect(0, 0, worldWidth, worldHeight);
            drawParallaxBackground(); drawDecorations(); drawPlatforms(); playerBodies.forEach(pBody => drawPlayer(pBody, dt));
            ctx.restore(); drawFlash();
            requestAnimationFrame(gameLoop);
        }

        requestAnimationFrame(gameLoop);
    });
