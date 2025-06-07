export function setupMenu(onStartCallback) {
  const startScreen = document.getElementById('startScreen');
  const onePlayerBtn = document.getElementById('onePlayerBtn');
  const twoPlayerBtn = document.getElementById('twoPlayerBtn');
  const startButton = document.getElementById('startButton');

  let selectedMode = null;

  function selectMode(mode) {
    selectedMode = mode;
    startButton.disabled = false;
  }

  onePlayerBtn.addEventListener('click', () => selectMode('single'));
  twoPlayerBtn.addEventListener('click', () => selectMode('two'));

  startButton.addEventListener('click', () => {
    if (!selectedMode) return;
    startScreen.style.display = 'none';
    onStartCallback(selectedMode);
  });
}
