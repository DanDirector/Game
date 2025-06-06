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
        setupPlatforms();
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
