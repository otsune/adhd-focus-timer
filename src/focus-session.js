import { tr, uiDuration } from './app-utils.js';
import { getSetting } from './state.js';
import { getIsRecoveryMode, setIsRecoveryMode, setRecoveryState } from './recovery-ui.js';
import { getTasks, reorderTask } from './tasks.js';
import { updateFocusScreenTranslations } from './settings-ui.js';
import { initAudio, playBeep } from './audio.js';
import { STORAGE_KEYS, clearActiveState, saveActiveState, saveFocusSegment, invalidateFocusTimeCache, loadLogs, parseActiveState } from './storage.js';
import { startFocusTimer, getFocusStartTime, getCurrentTaskName, getLastMilestone, setLastMilestone } from './timer.js';
import { showSummary } from './summary-ui.js';
import { getMilestoneAction, MILESTONE_INTERVAL } from './milestone.js';
import { getTotalFocusTime } from './stats.js';
import { getTodayKey } from './date-utils.js';
import { formatElapsedTime } from './utils.js';
import { FLASH_DURATION_MS, MILESTONE_MESSAGE_DURATION_MS } from './constants.js';

let _fsOnSwitchScreen = null;
let _fsOnClearAllIntervals = null;
let _fsOnRenderMain = null;

export function setFocusSessionCallbacks({ onSwitchScreen, onClearAllIntervals, onRenderMain }) {
  _fsOnSwitchScreen = onSwitchScreen;
  _fsOnClearAllIntervals = onClearAllIntervals;
  _fsOnRenderMain = onRenderMain;
}

let _fsCachedTodayFocusTime = -1;
let _fsCachedTodayKey = '';

window.addEventListener('focus-time-cache-invalidated', () => {
  _fsCachedTodayKey = '';
  _fsCachedTodayFocusTime = -1;
});

function getTodayLogs() {
  const logs = loadLogs();
  const todayKey = getTodayKey();
  return logs[todayKey] || [];
}

export function getCachedTodayFocusTime() {
  const todayKey = getTodayKey();
  if (_fsCachedTodayKey !== todayKey) {
    _fsCachedTodayKey = todayKey;
    _fsCachedTodayFocusTime = getTotalFocusTime(getTodayLogs());
  }
  return _fsCachedTodayFocusTime;
}

export function updateMainAccumulatedDisplay() {
  const el = document.getElementById('main-acc-value-display');
  if (!el) return;
  const totalSeconds = getCachedTodayFocusTime();
  el.innerText = totalSeconds > 0 ? uiDuration(totalSeconds) : '—';
}

export function updateFocusAccumulatedDisplay(currentElapsed = 0) {
  const el = document.getElementById('focus-acc-value-display');
  if (!el) return;
  const totalSeconds = getCachedTodayFocusTime() + currentElapsed;
  el.innerText = totalSeconds > 0 ? uiDuration(totalSeconds) : '—';
}

export function updateRecoveryAccumulatedDisplay() {
  const el = document.getElementById('recovery-acc-value');
  if (!el) return;
  const totalSeconds = getCachedTodayFocusTime();
  el.innerText = totalSeconds > 0 ? uiDuration(totalSeconds) : '—';
}

export function flashScreen() {
  const overlay = document.getElementById('flash-overlay');
  overlay.classList.remove('flash-red');
  void overlay.offsetWidth;
  overlay.classList.add('flash-red');
  setTimeout(() => overlay.classList.remove('flash-red'), FLASH_DURATION_MS);
}

export function showMilestoneMessage(text) {
  const el = document.getElementById('milestone-message');
  el.classList.remove('show');
  el.innerText = text;
  void el.offsetWidth;
  el.classList.add('show');
  setTimeout(() => el.classList.remove('show'), MILESTONE_MESSAGE_DURATION_MS);
}

export function handleFocusMilestone(elapsedSeconds) {
  const action = getMilestoneAction(elapsedSeconds, getLastMilestone());
  if (!action) return;

  setLastMilestone(action.newLastNotified);
  if (action.type === 'flash_chime') {
    flashScreen();
    if (getSetting('soundEnabled')) playBeep('milestone');
  } else if (action.type === 'sound_message') {
    if (getSetting('soundEnabled')) playBeep('milestone');
    showMilestoneMessage(action.message);
  }
}

export function handleFocusTimerTick(elapsed) {
  document.getElementById('focus-timer-display').innerText = formatElapsedTime(elapsed);
  updateFocusAccumulatedDisplay(elapsed);
  if (getSetting('milestoneEnabled')) handleFocusMilestone(elapsed);
}

export function handleFocusMidnight() {
  saveActiveState({ status: 'focus', taskName: getCurrentTaskName(), focusStartedAt: getFocusStartTime() });
  showMilestoneMessage('日付が変わりました');
}

export function startFocus(taskName) {
  const wasRecovery = getIsRecoveryMode();
  setIsRecoveryMode(false);

  if (wasRecovery && taskName) {
    const idx = getTasks().indexOf(taskName);
    if (idx > 0) reorderTask(idx, 0);
  }

  const focusStartedAt = Date.now();
  document.getElementById('focus-task-display').innerText = taskName;
  document.getElementById('focus-timer-display').innerText = '00:00';
  updateFocusAccumulatedDisplay(0);
  updateFocusScreenTranslations();
  if (_fsOnSwitchScreen) _fsOnSwitchScreen('focus-screen');

  if (wasRecovery) flashScreen();
  if (getSetting('soundEnabled')) playBeep('start');

  clearActiveState();
  saveActiveState({ status: 'focus', taskName, focusStartedAt });
  if (_fsOnClearAllIntervals) _fsOnClearAllIntervals();
  startFocusTimer(taskName, focusStartedAt, handleFocusTimerTick, handleFocusMidnight);
}

export function pauseAs(type) {
  const endedAt = Date.now();
  const startedAt = getFocusStartTime();
  const taskName = getCurrentTaskName();
  const seconds = Math.round((endedAt - startedAt) / 1000);
  saveFocusSegment(taskName, startedAt, endedAt, seconds);
  invalidateFocusTimeCache();
  if (_fsOnClearAllIntervals) _fsOnClearAllIntervals();

  const pausedAt = Date.now();
  setRecoveryState({ taskName, pauseType: type, pausedAt });

  clearActiveState();
  saveActiveState({ status: 'recovery', taskName, pauseType: type, pausedAt });
  if (_fsOnRenderMain) _fsOnRenderMain();
  if (_fsOnSwitchScreen) _fsOnSwitchScreen('main-screen');
}

export function finishFocus() {
  const endedAt = Date.now();
  const startedAt = getFocusStartTime();
  const taskName = getCurrentTaskName();
  const seconds = Math.round((endedAt - startedAt) / 1000);
  saveFocusSegment(taskName, startedAt, endedAt, seconds);
  invalidateFocusTimeCache();
  if (_fsOnClearAllIntervals) _fsOnClearAllIntervals();
  clearActiveState();
  showSummary();
}

export function checkActiveState() {
  const data = localStorage.getItem(STORAGE_KEYS.activeState);
  if (!data) return;

  let raw;
  try {
    raw = JSON.parse(data);
  } catch (e) {
    clearActiveState();
    return;
  }

  const parsed = parseActiveState(raw);
  if (!parsed) {
    clearActiveState();
    return;
  }

  if (parsed.kind === 'recovery') {
    setRecoveryState({ taskName: parsed.taskName, pauseType: parsed.pauseType, pausedAt: parsed.pausedAt });
    if (_fsOnRenderMain) _fsOnRenderMain();
    return;
  }

  if (_fsOnRenderMain) _fsOnRenderMain();
  if (_fsOnSwitchScreen) _fsOnSwitchScreen('main-screen');

  const banner = document.getElementById('recovery-banner');
  const text = document.getElementById('recovery-text');
  const elapsed = Math.floor((Date.now() - parsed.focusStartedAt) / 1000);
  text.innerText = tr('recoveryBannerActive', { task: parsed.taskName, elapsed: formatElapsedTime(elapsed) });
  banner.classList.add('active');

  document.getElementById('btn-recovery-resume').onclick = () => {
    banner.classList.remove('active');
    initAudio();
    const elapsedSeconds = Math.floor((Date.now() - parsed.focusStartedAt) / 1000);
    document.getElementById('focus-task-display').innerText = parsed.taskName;
    updateFocusAccumulatedDisplay(elapsedSeconds);
    if (_fsOnSwitchScreen) _fsOnSwitchScreen('focus-screen');
    if (_fsOnClearAllIntervals) _fsOnClearAllIntervals();
    startFocusTimer(parsed.taskName, parsed.focusStartedAt, handleFocusTimerTick, handleFocusMidnight);
    setLastMilestone(Math.floor(elapsedSeconds / MILESTONE_INTERVAL) * MILESTONE_INTERVAL);
    saveActiveState({ status: 'focus', taskName: parsed.taskName, focusStartedAt: parsed.focusStartedAt });
    handleFocusTimerTick(elapsedSeconds);
  };

  document.getElementById('btn-recovery-discard').onclick = () => {
    banner.classList.remove('active');
    const endedAt = Date.now();
    const seconds = Math.round((endedAt - parsed.focusStartedAt) / 1000);
    if (seconds > 0) {
      saveFocusSegment(parsed.taskName, parsed.focusStartedAt, endedAt, seconds);
      invalidateFocusTimeCache();
    }
    clearActiveState();
  };
}

