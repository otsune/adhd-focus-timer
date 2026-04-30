import { tr } from './app-utils.js';
import { getValidTasks } from './tasks.js';
import { initAudio } from './audio.js';
import { startRoulette } from './roulette.js';
import { showSummary } from './summary-ui.js';
import { stopPauseTimer, startPauseTimer } from './timer.js';
import { clearActiveState } from './storage.js';
import { formatElapsedTime } from './utils.js';

let isRecoveryMode = false;
let lastTaskName = '';
let lastPauseType = '';
let recoveryPausedAt = null;

let _recOnStartFocus = null;
let _recOnFlashScreen = null;
let _recOnUpdateRecoveryAcc = null;

export function setRecoveryCallbacks({ onStartFocus, onFlashScreen, onUpdateRecoveryAcc }) {
  _recOnStartFocus = onStartFocus;
  _recOnFlashScreen = onFlashScreen;
  _recOnUpdateRecoveryAcc = onUpdateRecoveryAcc;
}

export function getIsRecoveryMode() { return isRecoveryMode; }
export function setIsRecoveryMode(value) { isRecoveryMode = value; }
export function getLastTaskName() { return lastTaskName; }

export function setRecoveryState({ taskName, pauseType, pausedAt }) {
  isRecoveryMode = true;
  lastTaskName = taskName;
  lastPauseType = pauseType;
  recoveryPausedAt = pausedAt;
}

export function clearRecoveryState() {
  isRecoveryMode = false;
  lastTaskName = '';
  lastPauseType = '';
  recoveryPausedAt = null;
}

function updatePauseElapsedDisplay(elapsed) {
  const el = document.getElementById('pause-elapsed-value');
  if (!el) return;
  el.innerText = formatElapsedTime(elapsed);
  if (elapsed < 300) {
    el.classList.remove('over5');
  }
}

function handlePauseWarning() {
  const el = document.getElementById('pause-elapsed-value');
  if (!el || el.classList.contains('over5')) return;
  el.classList.add('over5');
  if (_recOnFlashScreen) _recOnFlashScreen();
}

export function renderRecoverySection() {
  const banner = document.getElementById('recovery-status-banner');
  if (lastPauseType === 'away') {
    banner.innerText = tr('recoveryAway');
  } else if (lastPauseType === 'meal') {
    banner.innerText = tr('recoveryMeal');
  } else {
    banner.innerText = tr('recoveryGeneric');
  }

  const resumeArea = document.getElementById('recovery-resume-area');
  resumeArea.innerHTML = '';
  const resumeBtn = document.createElement('button');
  resumeBtn.className = 'btn-resume-main';
  resumeBtn.id = 'btn-resume-last';
  resumeBtn.innerText = tr('resumeLastTask', { task: lastTaskName });
  resumeBtn.addEventListener('click', () => {
    initAudio();
    if (_recOnStartFocus) _recOnStartFocus(lastTaskName);
  });
  resumeArea.appendChild(resumeBtn);

  const tasksArea = document.getElementById('recovery-tasks-area');
  tasksArea.innerHTML = '';
  getValidTasks().forEach((name) => {
    const btn = document.createElement('button');
    btn.className = 'btn-task-recovery';
    btn.innerText = name;
    btn.addEventListener('click', () => {
      initAudio();
      if (_recOnStartFocus) _recOnStartFocus(name);
    });
    tasksArea.appendChild(btn);
  });

  const rouletteBtn = document.getElementById('recovery-roulette-btn');
  rouletteBtn.onclick = () => {
    initAudio();
    startRoulette();
  };

  if (_recOnUpdateRecoveryAcc) _recOnUpdateRecoveryAcc();
  startPauseTimer(recoveryPausedAt, updatePauseElapsedDisplay, handlePauseWarning);
}

export function exitRecovery() {
  clearRecoveryState();
  stopPauseTimer();
  clearActiveState();
  showSummary();
}
