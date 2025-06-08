import { createPlatformData, getPlatformCoords } from './platforms.js';
import { initControls, handleInput } from './controls.js';
import { Engine, World, Bodies, Body, initPhysics, setupCollisionEvents } from "./physics.js";
import { drawParallaxBackground, drawPlatforms, drawDecorations, drawPlayer, drawFlash, updateCamera } from './render.js';
import { initGame, isSinglePlayer } from './initGame.js';
import { updateBotAI } from './botAI.js';
import { buildMatrix } from './pathfindingGrid.js';

    document.addEventListener('DOMContentLoaded', () => {

        const menu = document.getElementById('startScreen');
        const singleButton = document.getElementById('singleButton');
        const twoButton = document.getElementById('twoButton');

        singleButton.addEventListener('click', () => {
            menu.style.display = 'none';
            initGame('single');
            startGame();
        });

        twoButton.addEventListener('click', () => {
            menu.style.display = 'none';
            initGame('two');
            startGame();
        });

        function startGame() {
            const canvas = document.getElementById('gameCanvas');
            const ctx = canvas.getContext('2d');

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

        const platformData = createPlatformData({ worldWidth, worldHeight, boundaryThickness, p1StartX, p2StartX, platformHeight });

        const matrix = buildMatrix(platformData, worldWidth, worldHeight);
        const baseGrid = new window.PF.Grid(matrix);
        const finder = new window.PF.AStarFinder();

        // --- Инициализация Matter.js ---

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
        const platformBodies = []; const platformOptions = { isStatic: true, friction: 0.5, frictionStatic: 0.8, restitution: 0 };
        platformData.forEach((data) => { const platformBody = Bodies.rectangle(data.x, data.y, data.width, data.height, { ...platformOptions, angle: data.angle, label: data.label }); platformBody.renderData = { width: data.width, height: data.height, colorBase: colors.platformBase, colorTop: colors.platformEdge, visible: data.visible !== false }; platformBodies.push(platformBody); });
        World.add(world, platformBodies);
        setupCollisionEvents({ engine, playerBodies, tagCooldownTime, groundCheckThreshold, jumpStrength, onTag: () => { flashOpacity = 0.3; console.log("Tag! Roles swapped. Flash activated."); } });

        // --- Декорации (без изменений) ---
        const decorations = [ /* ... тот же decorations ... */ { type: 'palm', platformLabel: 'platform-start-left', offsetX: -150 }, { type: 'palm', platformLabel: 'platform-start-right', offsetX: 150 }, { type: 'palm', platformLabel: 'platform-low-far-left', offsetX: 0 }, { type: 'palm', platformLabel: 'platform-low-far-right', offsetX: 0 }, { type: 'palm', platformLabel: 'platform-low-center', offsetX: -250 }, { type: 'palm', platformLabel: 'platform-low-center', offsetX: 250 }, { type: 'palm', platformLabel: 'platform-mid-center-left', offsetX: -100 }, { type: 'palm', platformLabel: 'platform-mid-center-right', offsetX: 100 }, { type: 'palm', platformLabel: 'platform-upper-mid-center', offsetX: -200 }, { type: 'palm', platformLabel: 'platform-upper-mid-center', offsetX: 200 }, { type: 'palm', platformLabel: 'platform-ground', offsetX: -worldWidth/2 + 250}, { type: 'palm', platformLabel: 'platform-ground', offsetX: worldWidth/2 - 250}, ];

        // --- Функции (без изменений, кроме handleInput) ---


        // --- Игровой цикл ---
        let lastTime = 0;
        function gameLoop(timestamp) {
             const deltaTime = timestamp - lastTime; lastTime = timestamp; const dt = Math.min(deltaTime, 50);
            playerBodies.forEach(playerBody => {
                const data = playerBody.renderData; if (data.tagTimer > 0) { data.tagTimer -= dt; if (data.tagTimer < 0) { data.tagTimer = 0; } }
            });
            handleInput({ playerBodies, Body, moveSpeed, jumpStrength, accelerationFactor, decelerationFactor, jumpVelocityThreshold, dt });
            if (isSinglePlayer) {
                updateBotAI(playerBodies[1], playerBodies[0], {
                    moveSpeed,
                    jumpStrength,
                    accelerationFactor,
                    decelerationFactor,
                    jumpVelocityThreshold
                }, dt, { grid: baseGrid, finder });
            }
            Engine.update(engine, dt); updateCamera(camera, canvasWidth, canvasHeight, worldWidth, worldHeight, zoomPadding, minZoom, maxZoom, zoomLerpFactor, cameraLerpFactor, playerBodies);
            ctx.fillStyle = pageBackgroundColor; ctx.fillRect(0, 0, canvasWidth, canvasHeight); ctx.save();
            ctx.translate(canvasWidth / 2, canvasHeight / 2); ctx.scale(camera.zoom, camera.zoom); ctx.translate(-camera.focusX, -camera.focusY);
            const skyGradient = ctx.createLinearGradient(0, 0, 0, worldHeight); skyGradient.addColorStop(0, colors.backgroundStart); skyGradient.addColorStop(1, colors.backgroundEnd);
            ctx.fillStyle = skyGradient; ctx.fillRect(0, 0, worldWidth, worldHeight);
            drawParallaxBackground(ctx, camera, worldWidth, worldHeight, colors, parallaxFactor);
            drawDecorations(ctx, decorations, platformBodies, getPlatformCoords, colors);
            drawPlatforms(ctx, platformBodies, colors);
            playerBodies.forEach(pBody => drawPlayer(ctx, pBody, dt, colors, { playerHeight, playerWidth, playerCornerRadius, legAnimationSpeed, tagCooldownTime }));
            ctx.restore();
            drawFlash(ctx, canvasWidth, canvasHeight, () => flashOpacity, op => { flashOpacity = op; });
            requestAnimationFrame(gameLoop);
        }

        requestAnimationFrame(gameLoop);
        }
    });
