export let isSinglePlayer = false;

export function initGame(mode) {
  if (mode === 'single') {
    isSinglePlayer = true;
  } else {
    isSinglePlayer = false;
  }
}
