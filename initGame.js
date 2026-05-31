export let isSinglePlayer = false;
export let selectedMapId = 'islands';

export function initGame(mode, mapId = 'islands') {
  if (mode === 'single') {
    isSinglePlayer = true;
  } else {
    isSinglePlayer = false;
  }

  selectedMapId = ['islands', 'cosmos', 'bulb'].includes(mapId) ? mapId : 'islands';
}
