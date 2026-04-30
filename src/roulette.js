import { tr } from './app-utils.js';
import { getValidTasks } from './tasks.js';
import { ROULETTE_INTERVAL_MS, ROULETTE_CYCLES } from './constants.js';

let rouletteIntervalId = null;
let _rouOnStartFocus = null;
let _rouGetIsRecoveryMode = null;

export function setRouletteCallbacks({ onStartFocus, getIsRecoveryMode }) {
  _rouOnStartFocus = onStartFocus;
  _rouGetIsRecoveryMode = getIsRecoveryMode;
}

export function clearRouletteInterval() {
  if (rouletteIntervalId) {
    clearInterval(rouletteIntervalId);
    rouletteIntervalId = null;
  }
}

export function startRoulette() {
  const validTasks = getValidTasks();
  if (validTasks.length === 0) {
    alert(tr('needTaskAlert'));
    return;
  }

  const isRecoveryMode = _rouGetIsRecoveryMode ? _rouGetIsRecoveryMode() : false;
  const btnId = isRecoveryMode ? 'recovery-roulette-btn' : 'btn-roulette';
  const rouletteBtn = document.getElementById(btnId);
  const originalText = rouletteBtn.innerText;
  rouletteBtn.disabled = true;

  let counter = 0;
  rouletteIntervalId = setInterval(() => {
    if (rouletteIntervalId === null) return;
    rouletteBtn.innerText = validTasks[Math.floor(Math.random() * validTasks.length)];
    counter++;

    if (counter > ROULETTE_CYCLES) {
      clearInterval(rouletteIntervalId);
      rouletteIntervalId = null;
      const selected = validTasks[Math.floor(Math.random() * validTasks.length)];
      rouletteBtn.innerText = originalText;
      rouletteBtn.disabled = false;
      if (_rouOnStartFocus) _rouOnStartFocus(selected);
    }
  }, ROULETTE_INTERVAL_MS);
}
