import { createPlatformData, getPlatformCoords } from './platforms.js';
import { initControls, handleInput } from './controls.js';
import { Engine, World, Bodies, Body, initPhysics, setupCollisionEvents } from "./physics.js";
import { createWorldRenderCache, drawCachedWorld, drawCosmosBackground, drawBulbBackground, drawPlayer, drawFlash, updateCamera } from './render.js';
import { initGame, isSinglePlayer, selectedMapId } from './initGame.js';
import { createBotAI, drawBotDebug } from './botAI.js';
import { createMapTheme } from './mapThemes.js';

    document.addEventListener('DOMContentLoaded', () => {

        const menu = document.getElementById('startScreen');
        const singleButton = document.getElementById('singleButton');
        const twoButton = document.getElementById('twoButton');
        const mapButtons = [...document.querySelectorAll('.map-button')];
        let pendingMapId = 'islands';

        mapButtons.forEach(button => {
            button.addEventListener('click', () => {
                pendingMapId = button.dataset.map || 'islands';
                mapButtons.forEach(mapButton => {
                    mapButton.classList.toggle('active', mapButton === button);
                });
            });
        });

        singleButton.addEventListener('click', () => {
            menu.style.display = 'none';
            initGame('single', pendingMapId);
            startGame();
        });

        twoButton.addEventListener('click', () => {
            menu.style.display = 'none';
            initGame('two', pendingMapId);
            startGame();
        });

        function startGame() {
            const canvas = document.getElementById('gameCanvas');
            const ctx = canvas.getContext('2d', { alpha: false });

        // --- Matter.js Модули ---
        const { engine, world } = initPhysics();
        initControls();

        // --- Размеры ---
        const canvasWidth = canvas.width; const canvasHeight = canvas.height;
        const worldWidth = 3200; const worldHeight = 2400;
        const boundaryThickness = 100; const platformHeight = 30;

        // --- Настройки игры ---
        const moveSpeed = 5.5; const jumpStrength = 15; const playerWidth = 35;
        const playerHeight = 45; const playerCornerRadius = 8; const tagCooldownTime = 1500;
        const cameraLerpFactor = 0.08; const zoomLerpFactor = 0.05; const minZoom = 0.25;
        const maxZoom = 0.8; const zoomPadding = 200;
        const worldBottomPadding = 220;
        const legAnimationSpeed = 80;
        const groundCheckThreshold = 0.6;
        const jumpVelocityThreshold = 0.5; // Оставляем для фикса углов
        // *** НОВЫЕ КОНСТАНТЫ: Ускорение и Замедление ***
        const accelerationFactor = 0.1; // Коэффициент ускорения (0.0 до 1.0)
        const decelerationFactor = 0.15; // Коэффициент замедления (0.0 до 1.0)
        const movementConfig = { moveSpeed, jumpStrength, accelerationFactor, decelerationFactor, jumpVelocityThreshold };

        const theme = createMapTheme(selectedMapId, worldWidth);
        const colors = theme.colors;
        const pageBackgroundColor = theme.pageBackgroundColor;
        const backgroundImage = theme.backgroundImageSrc ? new Image() : null;
        if (backgroundImage) {
            backgroundImage.decoding = 'async';
            backgroundImage.src = theme.backgroundImageSrc;
        }
        const platformTextureImage = theme.platformTextureSrc ? new Image() : null;
        if (platformTextureImage) {
            platformTextureImage.decoding = 'async';
        }

        // --- Состояние игры ---
        let flashOpacity = 0;

        // --- Камера ---
        const p1StartX = worldWidth / 4; const p2StartX = 3 * worldWidth / 4;
        const initialFocusX = worldWidth / 2; const initialFocusY = worldHeight - 400;
        const camera = { /* ... без изменений ... */
             zoom: 0.35, targetZoom: 0.35, focusX: initialFocusX, focusY: initialFocusY, targetFocusX: initialFocusX, targetFocusY: initialFocusY
        };

        const platformData = createPlatformData({ worldWidth, worldHeight, boundaryThickness, p1StartX, p2StartX, platformHeight });

        // --- Инициализация Matter.js ---

        // --- Создание игроков ---
        const playerBodies = [];
        const playerRenderData = [ /* ... без изменений ... */
             { id: 0, headbandColor: colors.player1Headband, controls: { up: 'KeyW', left: 'KeyA', right: 'KeyD' }, isTagger: !isSinglePlayer, tagTimer: 0, facingDirection: 'right', isMovingHorizontally: false, legAnimationTimer: 0, legAnimationFrame: 0, isOnGround: false, hasJumpedThisPress: false },
            { id: 1, headbandColor: colors.player2Headband, controls: { up: 'ArrowUp', left: 'ArrowLeft', right: 'ArrowRight' }, isTagger: isSinglePlayer, tagTimer: 0, facingDirection: 'left', isMovingHorizontally: false, legAnimationTimer: 0, legAnimationFrame: 0, isOnGround: false, hasJumpedThisPress: false }
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
        const platformBodies = []; const platformOptions = { isStatic: true, friction: 0.5, frictionStatic: 0.8, restitution: 0 };
        platformData.forEach((data) => { const platformBody = Bodies.rectangle(data.x, data.y, data.width, data.height, { ...platformOptions, angle: data.angle, label: data.label }); platformBody.renderData = { width: data.width, height: data.height, colorBase: colors.platformBase, colorTop: colors.platformEdge, visible: data.visible !== false }; platformBodies.push(platformBody); });
        World.add(world, platformBodies);
        setupCollisionEvents({ engine, playerBodies, tagCooldownTime, groundCheckThreshold, jumpStrength, onTag: () => { flashOpacity = 0.24; } });
        const aiDebugEnabled = new URLSearchParams(window.location.search).has('debugAI');
        const botAI = createBotAI({
            platformBodies,
            movement: { ...movementConfig, gravityPerFrame: 0.42 },
            playerWidth,
            playerHeight,
            worldWidth,
            worldHeight,
            debug: aiDebugEnabled
        });
        if (aiDebugEnabled) {
            window.__gameDebug = { botAI, playerBodies, platformBodies };
        }

        const decorations = theme.decorations;
        function buildWorldRenderCache() {
            return createWorldRenderCache({
                worldWidth,
                worldHeight,
                bottomPadding: worldBottomPadding,
                colors,
                platformBodies,
                decorations,
                getPlatformCoords,
                includeBackground: theme.cacheBackground,
                platformTextureImage
            });
        }

        let worldRenderCache = buildWorldRenderCache();
        if (platformTextureImage) {
            platformTextureImage.onload = () => {
                worldRenderCache = buildWorldRenderCache();
            };
            platformTextureImage.src = theme.platformTextureSrc;
        }

        // --- Функции (без изменений, кроме handleInput) ---


        // --- Игровой цикл ---
        const fixedTimeStep = 1000 / 60;
        const maxFrameTime = 100;
        const maxSimulationSteps = 4;
        let lastTime = null;
        let accumulatedTime = 0;

        function updateSimulation(dt) {
            playerBodies.forEach(playerBody => {
                const data = playerBody.renderData; if (data.tagTimer > 0) { data.tagTimer -= dt; if (data.tagTimer < 0) { data.tagTimer = 0; } }
            });
            handleInput({ playerBodies, Body, moveSpeed, jumpStrength, accelerationFactor, decelerationFactor, jumpVelocityThreshold, dt });
            if (isSinglePlayer) {
                botAI.update(playerBodies[1], playerBodies[0], movementConfig, dt);
            }
            Engine.update(engine, dt);
        }

        function renderFrame(deltaTime) {
            updateCamera(camera, canvasWidth, canvasHeight, worldWidth, worldHeight, zoomPadding, minZoom, maxZoom, zoomLerpFactor, cameraLerpFactor, playerBodies, worldBottomPadding);
            ctx.fillStyle = pageBackgroundColor; ctx.fillRect(0, 0, canvasWidth, canvasHeight); ctx.save();
            if (theme.background === 'cosmos') {
                drawCosmosBackground(ctx, camera, canvasWidth, canvasHeight, worldWidth, worldHeight, backgroundImage);
            } else if (theme.background === 'bulb') {
                drawBulbBackground(ctx, camera, canvasWidth, canvasHeight, worldWidth, worldHeight, backgroundImage, colors);
            }
            ctx.translate(canvasWidth / 2, canvasHeight / 2); ctx.scale(camera.zoom, camera.zoom); ctx.translate(-camera.focusX, -camera.focusY);
            drawCachedWorld(ctx, worldRenderCache, camera, canvasWidth, canvasHeight);
            if (aiDebugEnabled) drawBotDebug(ctx, botAI);
            playerBodies.forEach(pBody => drawPlayer(ctx, pBody, deltaTime, colors, { playerHeight, playerWidth, playerCornerRadius, legAnimationSpeed, tagCooldownTime }));
            ctx.restore();
            drawFlash(ctx, canvasWidth, canvasHeight, () => flashOpacity, op => { flashOpacity = op; });
        }

        function gameLoop(timestamp) {
            if (lastTime === null) {
                lastTime = timestamp;
            }

            const frameTime = Math.min(timestamp - lastTime, maxFrameTime);
            lastTime = timestamp;
            accumulatedTime += frameTime;

            let simulationSteps = 0;
            while (accumulatedTime >= fixedTimeStep && simulationSteps < maxSimulationSteps) {
                updateSimulation(fixedTimeStep);
                accumulatedTime -= fixedTimeStep;
                simulationSteps += 1;
            }

            if (simulationSteps === maxSimulationSteps) {
                accumulatedTime = 0;
            }

            renderFrame(frameTime);
            requestAnimationFrame(gameLoop);
        }

        requestAnimationFrame(gameLoop);
        }
    });
