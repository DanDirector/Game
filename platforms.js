export const platformData = [
  { x: worldWidth / 2, y: worldHeight + boundaryThickness / 2 - 10, width: worldWidth, height: boundaryThickness, angle: 0, label: 'platform-ground', visible: true },
  { x: worldWidth / 2, y: -boundaryThickness / 2, width: worldWidth, height: boundaryThickness, angle: 0, label: 'platform-ceiling', visible: false },
  { x: -boundaryThickness / 2, y: worldHeight / 2, width: boundaryThickness, height: worldHeight, angle: 0, label: 'wall-left', visible: false },
  { x: worldWidth + boundaryThickness / 2, y: worldHeight / 2, width: boundaryThickness, height: worldHeight, angle: 0, label: 'wall-right', visible: false },
  { x: p1StartX, y: worldHeight - 150, width: 250 * 2, height: platformHeight, angle: 0, label: 'platform-start-left' },
  { x: p2StartX, y: worldHeight - 150, width: 250 * 2, height: platformHeight, angle: 0, label: 'platform-start-right' },
  { x: 400, y: worldHeight - 250, width: 200, height: platformHeight, angle: 0, label: 'platform-low-far-left' },
  { x: worldWidth - 400, y: worldHeight - 250, width: 200, height: platformHeight, angle: 0, label: 'platform-low-far-right' },
  { x: worldWidth / 2, y: worldHeight - 350, width: 400 * 2, height: platformHeight, angle: 0, label: 'platform-low-center' },
  { x: 600, y: worldHeight - 450, width: 180, height: platformHeight, angle: -Math.PI / 16, label: 'platform-mid-left-angled' },
  { x: worldWidth - 600, y: worldHeight - 450, width: 180, height: platformHeight, angle: Math.PI / 16, label: 'platform-mid-right-angled' },
  { x: 1100, y: worldHeight - 550, width: 250 * 2, height: platformHeight, angle: 0, label: 'platform-mid-center-left' },
  { x: worldWidth - 1100, y: worldHeight - 550, width: 250 * 2, height: platformHeight, angle: 0, label: 'platform-mid-center-right' },
  { x: 250, y: worldHeight - 700, width: 150, height: platformHeight, angle: 0, label: 'platform-mid-step-left' },
  { x: worldWidth - 250, y: worldHeight - 700, width: 150, height: platformHeight, angle: 0, label: 'platform-mid-step-right' },
  { x: 850, y: worldHeight - 750, width: 200, height: platformHeight, angle: 0, label: 'platform-upper-mid-left' },
  { x: worldWidth - 850, y: worldHeight - 750, width: 200, height: platformHeight, angle: 0, label: 'platform-upper-mid-right' },
  { x: worldWidth / 2, y: worldHeight - 900, width: 300 * 2, height: platformHeight, angle: 0, label: 'platform-upper-mid-center' },
  { x: 400, y: worldHeight - 1100, width: 150, height: platformHeight, angle: Math.PI / 20, label: 'platform-high-far-left' },
  { x: worldWidth - 400, y: worldHeight - 1100, width: 150, height: platformHeight, angle: -Math.PI / 20, label: 'platform-high-far-right' },
  { x: 1200, y: worldHeight - 1200, width: 180 * 2, height: platformHeight, angle: 0, label: 'platform-high-center-left' },
  { x: worldWidth - 1200, y: worldHeight - 1200, width: 180 * 2, height: platformHeight, angle: 0, label: 'platform-high-center-right' },
  { x: worldWidth / 2, y: worldHeight - 1500, width: 250, height: platformHeight, angle: 0, label: 'platform-top-center' },
  { x: 800, y: worldHeight - 1600, width: 150 * 2, height: platformHeight, angle: 0, label: 'platform-top-left' },
  { x: worldWidth - 800, y: worldHeight - 1600, width: 150 * 2, height: platformHeight, angle: 0, label: 'platform-top-right' },
];

export function getPlatformCoords(label) {
  const platform = window.platformBodies.find(p => p.label === label);
  return platform ? { x: platform.position.x, y: platform.position.y - platform.renderData.height / 2 } : null;
}
