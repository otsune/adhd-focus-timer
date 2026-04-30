import { tr } from './app-utils.js';
import { applyTheme, getSystemThemeMedia } from './theme.js';
import { initAudio } from './audio.js';
import { initSettings, getSettings, getSetting, isAppInitialized, setAppInitialized } from './state.js';
import { getTasks, getTaskCount, setTasks } from './tasks.js';
import { renderTaskSlots, addTask, undoRemoveTask, setTaskUICallbacks } from './task-ui.js';
import { stopFocusTimer, stopPauseTimer } from './timer.js';
import { exportAsJSON, exportAsCSV, exportAsTodoTxt, importFromTodoTxt } from './export.js';
import { getTodayKey } from './date-utils.js';
import { loadLogs, loadTasks, saveLogs, invalidateFocusTimeCache } from './storage.js';
import { applyTasksFromHash } from './url-tasks.js';
import { MAX_TASKS, SCREEN_SWITCH_DELAY_MS } from './constants.js';
import { startRoulette, clearRouletteInterval, setRouletteCallbacks } from './roulette.js';
import { renderRecoverySection, exitRecovery, setRecoveryCallbacks, getIsRecoveryMode, setIsRecoveryMode } from './recovery-ui.js';
import { showSummary, closeSummary, setSummaryCallbacks } from './summary-ui.js';
import { applyLanguage, handleThemePreview, handleLanguagePreview, showSettings, handleSaveSettings, setSettingsCallbacks } from './settings-ui.js';
import { startFocus, pauseAs, finishFocus, flashScreen, updateMainAccumulatedDisplay, updateRecoveryAccumulatedDisplay, setFocusSessionCallbacks, checkActiveState } from './focus-session.js';

function switchScreen(screenId) {
  document.querySelectorAll('.screen').forEach((screen) => screen.classList.remove('active'));
  document.getElementById(screenId).classList.add('active');

  setTimeout(() => {
    if (screenId === 'focus-screen') {
      document.getElementById('focus-timer-display').focus();
    } else if (screenId === 'main-screen') {
      if (getIsRecoveryMode()) {
        const resumeBtn = document.getElementById('btn-resume-last');
        if (resumeBtn) resumeBtn.focus();
      } else {
        const firstInput = document.querySelector('.task-slot input');
        if (firstInput) firstInput.focus();
      }
    }
  }, SCREEN_SWITCH_DELAY_MS);
}

function renderMainScreen() {
  const normalSection = document.getElementById('normal-section');
  const recoverySection = document.getElementById('recovery-section');

  if (getIsRecoveryMode()) {
    normalSection.style.display = 'none';
    recoverySection.style.display = 'flex';
    renderRecoverySection();
  } else {
    normalSection.style.display = '';
    recoverySection.style.display = 'none';
    renderTaskSlots();
    updateMainAccumulatedDisplay();
  }
}

function resetLog() {
  if (confirm(tr('resetConfirm'))) {
    const logs = loadLogs();
    const todayKey = getTodayKey();
    delete logs[todayKey];
    saveLogs(logs);
    invalidateFocusTimeCache();
    showSummary();
  }
}

async function handleImportTodoTxtChange(event) {
  const file = event.target.files?.[0];
  if (!file) return;

  const importedTasks = await importFromTodoTxt(file);
  event.target.value = '';

  if (!importedTasks || importedTasks.length === 0) {
    alert(tr('importTodoTxtEmpty'));
    return;
  }

  setTasks(importedTasks);
  renderMainScreen();
  alert(tr('importTodoTxtDone', { count: getTaskCount() }));
}

function clearAllIntervals() {
  stopFocusTimer();
  stopPauseTimer();
  clearRouletteInterval();
}

function handleGlobalKeydown(e) {
  if (e.key !== 'Escape') return;

  const summaryModal = document.getElementById('summary-modal');
  if (summaryModal.classList.contains('active')) {
    e.preventDefault();
    closeSummary();
    return;
  }

  const settingsModal = document.getElementById('settings-modal');
  if (settingsModal.classList.contains('active')) {
    e.preventDefault();
    handleSaveSettings();
    return;
  }

  const recoveryBanner = document.getElementById('recovery-banner');
  if (recoveryBanner.classList.contains('active')) {
    e.preventDefault();
    document.getElementById('btn-recovery-discard').click();
  }
}

export function initApp() {
  if (isAppInitialized()) return;
  setAppInitialized(true);

  setTaskUICallbacks({ onStartFocus: startFocus });
  setRouletteCallbacks({ onStartFocus: startFocus, getIsRecoveryMode });
  setSummaryCallbacks({ onRenderMain: renderMainScreen, onSwitchScreen: switchScreen, onResetRecovery: () => setIsRecoveryMode(false) });
  setSettingsCallbacks({ onRenderMain: renderMainScreen });
  setRecoveryCallbacks({ onStartFocus: startFocus, onFlashScreen: flashScreen, onUpdateRecoveryAcc: updateRecoveryAccumulatedDisplay });
  setFocusSessionCallbacks({ onSwitchScreen: switchScreen, onClearAllIntervals: clearAllIntervals, onRenderMain: renderMainScreen });

  initSettings();
  applyTheme(getSetting('themeMode'));
  applyLanguage(getSetting('language'));
  setTasks(loadTasks());
  const initialTasks = getTasks();
  const hashTasks = applyTasksFromHash(window.location.hash, initialTasks, MAX_TASKS);
  if (hashTasks) {
    if (hashTasks.applied) {
      setTasks(hashTasks.tasks);
    }
    if (hashTasks.shouldClearHash) {
      if (window.history?.replaceState) {
        window.history.replaceState(null, '', window.location.pathname + window.location.search);
      } else {
        window.location.hash = '';
      }
    }
  }
  renderMainScreen();

  document.getElementById('btn-roulette').addEventListener('click', () => {
    initAudio();
    startRoulette();
  });
  document.getElementById('btn-add-task').addEventListener('click', addTask);
  document.getElementById('btn-show-summary').addEventListener('click', showSummary);
  document.getElementById('btn-show-settings').addEventListener('click', showSettings);
  document.getElementById('btn-finish-recovery').addEventListener('click', exitRecovery);
  document.getElementById('btn-away').addEventListener('click', () => pauseAs('away'));
  document.getElementById('btn-meal').addEventListener('click', () => pauseAs('meal'));
  document.getElementById('btn-finish-focus').addEventListener('click', finishFocus);
  document.getElementById('btn-close-summary').addEventListener('click', closeSummary);
  document.getElementById('btn-reset-log').addEventListener('click', resetLog);
  document.getElementById('btn-save-settings').addEventListener('click', handleSaveSettings);
  document.getElementById('btn-export-json').addEventListener('click', () => exportAsJSON(getTasks(), getSettings()));
  document.getElementById('btn-export-csv').addEventListener('click', () => exportAsCSV(getTasks(), getSettings()));
  document.getElementById('btn-export-todotxt').addEventListener('click', () => exportAsTodoTxt(getTasks()));
  document.getElementById('btn-import-todotxt').addEventListener('click', () => {
    document.getElementById('input-import-todotxt').click();
  });
  document.getElementById('input-import-todotxt').addEventListener('change', handleImportTodoTxtChange);
  document.getElementById('undo-toast-btn').addEventListener('click', undoRemoveTask);
  document.querySelectorAll('input[name="setting-theme"]').forEach((radio) => {
    radio.addEventListener('change', handleThemePreview);
  });
  document.querySelectorAll('input[name="setting-language"]').forEach((radio) => {
    radio.addEventListener('change', handleLanguagePreview);
  });
  document.addEventListener('keydown', handleGlobalKeydown);
  getSystemThemeMedia().addEventListener('change', () => {
    if (getSetting('themeMode') === 'system') {
      applyTheme('system');
    }
  });

  checkActiveState();
}
