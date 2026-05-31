export let isSinglePlayer = false;
export let selectedMapId = 'islands';

export function initGame(mode, mapId = 'islands') {
  if (mode === 'single') {
    isSinglePlayer = true;
  } else {
    isSinglePlayer = false;
  }

  selectedMapId = mapId === 'cosmos' ? 'cosmos' : 'islands';
}
