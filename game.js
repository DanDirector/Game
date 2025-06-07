import { setupMenu } from './ui/menu.js';
import { initGame } from './init/initGame.js';

document.addEventListener('DOMContentLoaded', () => {
  setupMenu(initGame);
});
