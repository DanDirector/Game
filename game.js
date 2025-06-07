import { keysPressed, handleInput } from './controls.js';
import { platformData, getPlatformCoords } from './platforms.js';
import { drawRoundRect, drawParallaxBackground, drawPlatforms, drawDecorations, drawPalm, drawPlayer, drawFlash, updateCamera } from './render.js';

document.addEventListener('DOMContentLoaded', () => {
  const canvas = document.getElementById('gameCanvas');
  const ctx = canvas.getContext('2d');
  window.ctx = ctx;

  const Engine = Matter.Engine; const World = Matter.World; const Bodies = Matter.Bodies;
  const Body = Matter.Body; const Events = Matter.Events; const Query = Matter.Query;

  const canvasWidth = canvas.width; const canvasHeight = canvas.height;
  const worldWidth = 3200; const worldHeight = 2400;

  const moveSpeed = 5.5; const jumpStrength = 15; const playerWidth = 35;
  const playerHeight = 45; const playerCornerRadius = 8; const tagCooldownTime = 1500;
  const cameraLerpFactor = 0.08; const zoomLerpFactor = 0.05; const minZoom = 0.25;
  const maxZoom = 0.8; const zoomPadding = 200; const parallaxFactor = 0.3;
  const legAnimationSpeed = 80;
  const groundCheckThreshold = 0.6;
  const jumpVelocityThreshold = 0.5;
  const accelerationFactor = 0.1; const decelerationFactor = 0.15;

  const colors = {
    backgroundStart: '#e0e6eb', backgroundEnd: '#b0b8c1',
    hillColorFar: 'rgba(130, 140, 150, 0.3)', hillColorNear: 'rgba(120, 130, 140, 0.4)',
    platformBase: '#f5d7a4', platformEdge: '#e4a76a',
    playerBody: '#2c3e50', player1Headband: '#3498db', player2Headband: '#e74c3c',
    eyeWhite: '#ffffff', eyePupil: '#000000',
    indicator: '#f1c40f', borderColor: '#f5c876',
    palmTrunk: '#a0795b', palmLeaves: '#27ae60',
    flash: 'rgba(255, 255, 0, 0.3)'
  };
  const pageBackgroundColor = '#2a2a2a';

  let flashOpacity = 0;

  const p1StartX = worldWidth / 4; const p2StartX = 3 * worldWidth / 4;
  const initialFocusX = worldWidth / 2; const initialFocusY = worldHeight - 400;
  const camera = {
    zoom: 0.35, targetZoom: 0.35,
    focusX: initialFocusX, focusY: initialFocusY,
    targetFocusX: initialFocusX, targetFocusY: initialFocusY
  };

  Object.assign(window, {
    canvasWidth, canvasHeight, worldWidth, worldHeight,
    moveSpeed, jumpStrength, playerWidth, playerHeight, playerCornerRadius,
    tagCooldownTime, cameraLerpFactor, zoomLerpFactor, minZoom, maxZoom,
    zoomPadding, parallaxFactor, legAnimationSpeed, groundCheckThreshold,
    jumpVelocityThreshold, accelerationFactor, decelerationFactor,
    colors, pageBackgroundColor, flashOpacity, camera,
    Body, Query
  });

  const engine = Engine.create(); const world = engine.world;
  engine.world.gravity.y = 1.4;

  const playerBodies = [];
  const playerRenderData = [
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
    playerBody.renderData = data;
    playerBodies.push(playerBody);
  });
  World.add(world, playerBodies);
  window.playerBodies = playerBodies;

  const platformBodies = [];
  const boundaryThickness = 100;
  const platformOptions = { isStatic: true, friction: 0.5, frictionStatic: 0.8, restitution: 0 };
  const platformHeight = 30;
  platformData.forEach((data) => {
    const platformBody = Bodies.rectangle(data.x, data.y, data.width, data.height, { ...platformOptions, angle: data.angle, label: data.label });
    platformBody.renderData = { width: data.width, height: data.height, colorBase: colors.platformBase, colorTop: colors.platformEdge, visible: data.visible !== false };
    platformBodies.push(platformBody);
  });
  World.add(world, platformBodies);
  window.platformBodies = platformBodies;

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
  window.decorations = decorations;

  window.getPlatformCoords = label => {
    const platform = platformBodies.find(p => p.label === label);
    return platform ? { x: platform.position.x, y: platform.position.y - platform.renderData.height / 2 } : null;
  };

  Events.on(engine, 'beforeUpdate', () => {
    playerBodies.forEach(playerBody => { playerBody.renderData.isOnGround = false; });
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
    const p1 = playerBodies[0]; const p2 = playerBodies[1];
    const p1Data = p1.renderData; const p2Data = p2.renderData;
    const collisionCheck = Query.collides(p1, [p2]);
    if (collisionCheck.length > 0) {
      if (p1Data.isTagger !== p2Data.isTagger && p1Data.tagTimer <= 0 && p2Data.tagTimer <= 0) {
        p1Data.isTagger = !p1Data.isTagger; p2Data.isTagger = !p2Data.isTagger;
        p1Data.tagTimer = tagCooldownTime; p2Data.tagTimer = tagCooldownTime;
        flashOpacity = 0.3; window.flashOpacity = flashOpacity;
      }
    }
  });

  Events.on(engine, 'collisionStart', event => {
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
          if (velocity.y < 0) {
            const maxUpwardVelocity = -jumpStrength;
            if (velocity.y < maxUpwardVelocity) {
              Body.setVelocity(playerBody, { x: velocity.x, y: maxUpwardVelocity });
            }
          }
        }
      }
    });
  });

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
