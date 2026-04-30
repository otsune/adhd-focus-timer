import { formatElapsedTime, formatDuration, escapeHtml } from './utils.js';
import { t, TRANSLATIONS } from './i18n.js';
import { applyTheme, getSystemThemeMedia } from './theme.js';
import { setText, setAttr, getFocusableElements, trapFocus } from './ui.js';
import { initAudio, getAudioContext, playBeep } from './audio.js';
import { initSettings, getSettings, updateSettings, setSetting, getSetting, isAppInitialized, setAppInitialized, getLastFocusedElement, setLastFocusedElement, getCurrentTrapCleanup, setCurrentTrapCleanup, clearTrapCleanup } from './state.js';
import { getTasks, getValidTasks, getTaskAt, setTaskAt, addNewTask, removeTaskAt, getTaskCount, canAddTask, setTasks, reorderTask } from './tasks.js';
import { startFocusTimer, stopFocusTimer, getFocusElapsed, getFocusStartTime, getCurrentTaskName, getLastMilestone, setLastMilestone, isTimerRunning, getPauseElapsed, startPauseTimer, stopPauseTimer } from './timer.js';
import { downloadFile, exportAsJSON, exportAsCSV, exportAsTodoTxt, importFromTodoTxt } from './export.js';
import { getTodayKey } from './date-utils.js';
import {
  STORAGE_KEYS,
  loadLogs,
  loadTasks,
  saveLogs,
  saveActiveState,
  clearActiveState,
  saveFocusSegment,
  parseActiveState,
  invalidateFocusTimeCache,
} from './storage.js';
import { applyTasksFromHash } from './url-tasks.js';
import {
  getTotalFocusTime,
  getLongestFocusSegment,
  getStartCount,
  getBestSession,
  getTaskTimeRanking,
  getFirstStartTime,
  didStartInMorning,
} from './stats.js';
import { MILESTONE_INTERVAL, getMilestoneAction } from './milestone.js';
import { MAX_TASKS, MAX_TASK_NAME_LENGTH } from './constants.js';

let rouletteIntervalId = null;

let undoTimeout = null;
let undoData = null;


let isRecoveryMode = false;
let lastTaskName = '';
let lastPauseType = '';

let recoveryPausedAt = null;


// 累積集中時間のキャッシュ（tickFocusTimer での毎秒計算を削減）
let cachedTodayFocusTime = -1;
let cachedTodayKey = '';

void getFocusableElements;
void getAudioContext;
void getCurrentTrapCleanup;
void getFocusElapsed;
void isTimerRunning;
void getPauseElapsed;
void downloadFile;

window.addEventListener('focus-time-cache-invalidated', () => {
  cachedTodayKey = '';
  cachedTodayFocusTime = -1;
});

const tr = (key, vars = {}) => t(key, vars, getSetting('language'));

function uiDuration(totalSeconds) {
  return formatDuration(totalSeconds, getSetting('language'));
}

function applyLanguage(language) {
  setSetting('language', TRANSLATIONS[language] ? language : 'ja');
  document.documentElement.lang = getSetting('language');
  applyStaticTranslations();
  renderMainScreen();

  if (document.getElementById('summary-modal').classList.contains('active')) {
    showSummary();
  }

  if (document.getElementById('recovery-banner').classList.contains('active')) {
    const data = localStorage.getItem(STORAGE_KEYS.activeState);
    if (data) {
      try {
        const state = JSON.parse(data);
        if (state?.status === 'focus' && state.focusStartedAt) {
          const elapsed = Math.floor((Date.now() - state.focusStartedAt) / 1000);
          document.getElementById('recovery-text').innerText = tr('recoveryBannerActive', {
            task: state.taskName,
            elapsed: formatElapsedTime(elapsed),
          });
        }
      } catch (e) { }
    }
  }

  updateFocusScreenTranslations();
}

function applyStaticTranslations() {
  setText('btn-recovery-resume', tr('resume'));
  setText('btn-recovery-discard', tr('discard'));
  setText('btn-show-summary', tr('todaySummary'));
  setText('btn-show-settings', tr('settings'));
  setText('btn-roulette', tr('rouletteStart'));
  setText('main-acc-label', tr('accumulatedToday'));
  setText('recovery-pause-label', tr('paused'));
  setText('recovery-acc-label', tr('todayFocus'));
  setText('recovery-roulette-btn', tr('random'));
  setText('btn-finish-recovery', tr('finish'));
  setAttr('focus-timer-display', 'aria-label', tr('focusAria'));
  setText('focus-acc-label', tr('accumulatedToday'));
  setText('btn-away', tr('away'));
  setText('btn-meal', tr('meal'));
  setAttr('btn-away', 'aria-label', tr('awayAria'));
  setAttr('btn-meal', 'aria-label', tr('mealAria'));
  setAttr('btn-finish-focus', 'aria-label', tr('finishFocusAria'));
  setText('summary-modal-title', tr('todaySummary'));
  setText('btn-close-summary', tr('close'));
  setText('btn-reset-log', tr('resetLog'));
  setText('settings-modal-title', tr('settings'));
  setText('settings-theme-label', tr('theme'));
  setAttr('settings-theme-group', 'aria-label', tr('themeGroup'));
  setText('theme-option-system', tr('system'));
  setText('theme-option-light', tr('light'));
  setText('theme-option-dark', tr('dark'));
  setText('settings-language-label', tr('language'));
  setAttr('settings-language-group', 'aria-label', tr('languageGroup'));
  setText('language-option-ja', tr('japanese'));
  setText('language-option-en', tr('english'));
  setText('settings-milestone-label', tr('milestone'));
  setAttr('setting-milestone', 'aria-label', tr('milestone'));
  setText('settings-sound-label', tr('sound'));
  setAttr('setting-sound', 'aria-label', tr('sound'));
  setText('btn-save-settings', tr('saveAndClose'));
  setText('btn-export-json', tr('exportJson'));
  setText('btn-export-csv', tr('exportCsv'));
  setText('btn-export-todotxt', tr('exportTodoTxt'));
  setText('btn-import-todotxt', tr('importTodoTxt'));
}

function updateFocusScreenTranslations() {
  setText('focus-acc-label', tr('accumulatedToday'));
  setText('btn-away', tr('away'));
  setText('btn-meal', tr('meal'));
  setText('btn-finish-focus', '■ ' + tr('finish'));
  setAttr('btn-away', 'aria-label', tr('awayAria'));
  setAttr('btn-meal', 'aria-label', tr('mealAria'));
  setAttr('btn-finish-focus', 'aria-label', tr('finishFocusAria'));
}

function updateMainAccumulatedDisplay() {
  const el = document.getElementById('main-acc-value-display');
  if (!el) return;

  const totalSeconds = getCachedTodayFocusTime();
  el.innerText = totalSeconds > 0 ? uiDuration(totalSeconds) : '—';
}

function updateFocusAccumulatedDisplay(currentElapsed = 0) {
  const el = document.getElementById('focus-acc-value-display');
  if (!el) return;

  const totalSeconds = getCachedTodayFocusTime() + currentElapsed;
  el.innerText = totalSeconds > 0 ? uiDuration(totalSeconds) : '—';
}

function updateRecoveryAccumulatedDisplay() {
  const el = document.getElementById('recovery-acc-value');
  if (!el) return;

  const totalSeconds = getCachedTodayFocusTime();
  el.innerText = totalSeconds > 0 ? uiDuration(totalSeconds) : '—';
}

function addTask() {
  if (addNewTask()) {
    renderTaskSlots();
    setTimeout(() => {
      const inputs = document.querySelectorAll('.task-slot input');
      if (inputs.length > 0) inputs[inputs.length - 1].focus();
    }, 50);
  }
}

function removeTask(index) {
  if (getTaskCount() > 1) {
    const removedTask = getTaskAt(index);
    const removedIndex = index;
    removeTaskAt(index);
    renderTaskSlots();
    showUndoToast(removedTask, removedIndex);
  }
}

function showUndoToast(task, index) {
  if (undoTimeout) clearTimeout(undoTimeout);
  undoData = { task, index };

  const toast = document.getElementById('undo-toast');
  const label = task.trim() || tr('taskFallback');
  document.getElementById('undo-toast-text').innerText = tr('undoToast', { task: label });
  toast.classList.add('show');

  undoTimeout = setTimeout(() => {
    toast.classList.remove('show');
    undoData = null;
    undoTimeout = null;
  }, 5000);
}

function undoRemoveTask() {
  if (!undoData) return;
  if (undoTimeout) clearTimeout(undoTimeout);

  const updatedTasks = getTasks();
  updatedTasks.splice(undoData.index, 0, undoData.task);
  setTasks(updatedTasks);
  renderTaskSlots();
  document.getElementById('undo-toast').classList.remove('show');
  undoData = null;
  undoTimeout = null;
}

function renderTaskSlots() {
  const container = document.getElementById('task-slots');
  container.innerHTML = '';

  const addBtn = document.getElementById('btn-add-task');
  if (!canAddTask()) {
    addBtn.disabled = true;
    addBtn.innerText = tr('addTaskMax');
  } else {
    addBtn.disabled = false;
    addBtn.innerText = tr('addTask');
  }

  container.style.gridTemplateColumns = '1fr';
  container.style.maxWidth = '860px';
  container.style.margin = '0 auto 16px auto';

  const tasks = getTasks();
  for (let i = 0; i < tasks.length; i++) {
    const slot = document.createElement('div');
    slot.className = 'task-slot';

    if (tasks.length > 1) {
      const removeBtn = document.createElement('button');
      removeBtn.className = 'btn-remove';
      removeBtn.innerHTML = '×';
      removeBtn.title = tr('taskRemove');
      removeBtn.setAttribute('aria-label', tr('taskRemove'));
      removeBtn.addEventListener('click', () => removeTask(i));
      slot.appendChild(removeBtn);
    }

    const input = document.createElement('input');
    input.type = 'text';
    input.placeholder = tr('taskPlaceholder');
    input.setAttribute('aria-label', tr('taskInputAria', { index: i + 1 }));
    input.setAttribute('maxlength', String(MAX_TASK_NAME_LENGTH));
    input.value = tasks[i] || '';
    input.addEventListener('input', (e) => {
      setTaskAt(i, e.target.value.slice(0, MAX_TASK_NAME_LENGTH));
    });
    slot.appendChild(input);

    const btn = document.createElement('button');
    btn.className = 'btn-start-direct';
    btn.innerText = tr('startDirect');
    btn.addEventListener('click', () => {
      initAudio();
      const taskName = input.value.trim().slice(0, MAX_TASK_NAME_LENGTH) || tr('unnamedTask');
      startFocus(taskName);
    });
    slot.appendChild(btn);
    container.appendChild(slot);
  }
}

function startRoulette() {
  const validTasks = getValidTasks();
  if (validTasks.length === 0) {
    alert(tr('needTaskAlert'));
    return;
  }

  const btnId = isRecoveryMode ? 'recovery-roulette-btn' : 'btn-roulette';
  const rouletteBtn = document.getElementById(btnId);
  const originalText = rouletteBtn.innerText;
  rouletteBtn.disabled = true;

  let counter = 0;
  rouletteIntervalId = setInterval(() => {
    if (rouletteIntervalId === null) return;
    rouletteBtn.innerText = validTasks[Math.floor(Math.random() * validTasks.length)];
    counter++;

    if (counter > 15) {
      clearInterval(rouletteIntervalId);
      rouletteIntervalId = null;
      const selected = validTasks[Math.floor(Math.random() * validTasks.length)];
      rouletteBtn.innerText = originalText;
      rouletteBtn.disabled = false;
      startFocus(selected);
    }
  }, 60);
}

function switchScreen(screenId) {
  document.querySelectorAll('.screen').forEach((screen) => screen.classList.remove('active'));
  document.getElementById(screenId).classList.add('active');

  setTimeout(() => {
    if (screenId === 'focus-screen') {
      document.getElementById('focus-timer-display').focus();
    } else if (screenId === 'main-screen') {
      if (isRecoveryMode) {
        const resumeBtn = document.getElementById('btn-resume-last');
        if (resumeBtn) resumeBtn.focus();
      } else {
        const firstInput = document.querySelector('.task-slot input');
        if (firstInput) firstInput.focus();
      }
    }
  }, 100);
}

function startFocus(taskName) {
  const wasRecovery = isRecoveryMode;
  isRecoveryMode = false;

  if (wasRecovery && taskName) {
    const idx = getTasks().indexOf(taskName);
    if (idx > 0) {
      reorderTask(idx, 0);
    }
  }

  const focusStartedAt = Date.now();
  document.getElementById('focus-task-display').innerText = taskName;
  document.getElementById('focus-timer-display').innerText = '00:00';
  updateFocusAccumulatedDisplay(0);
  updateFocusScreenTranslations();
  switchScreen('focus-screen');

  if (wasRecovery) {
    flashScreen();
  }
  if (getSetting('soundEnabled')) playBeep('start');

  clearActiveState();
  saveActiveState({ status: 'focus', taskName, focusStartedAt });
  clearAllIntervals();
  startFocusTimer(taskName, focusStartedAt, handleFocusTimerTick, handleFocusMidnight);
}


function handleFocusTimerTick(elapsed) {
  document.getElementById('focus-timer-display').innerText = formatElapsedTime(elapsed);
  updateFocusAccumulatedDisplay(elapsed);
  if (getSetting('milestoneEnabled')) handleFocusMilestone(elapsed);
}

function handleFocusMidnight() {
  saveActiveState({ status: 'focus', taskName: getCurrentTaskName(), focusStartedAt: getFocusStartTime() });
  showMilestoneMessage('日付が変わりました');
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
  flashScreen();
}

function pauseAs(type) {
  const endedAt = Date.now();
  const startedAt = getFocusStartTime();
  const taskName = getCurrentTaskName();
  const seconds = Math.round((endedAt - startedAt) / 1000);
  saveFocusSegment(taskName, startedAt, endedAt, seconds);
  invalidateFocusTimeCache();
  clearAllIntervals();

  isRecoveryMode = true;
  lastTaskName = taskName;
  lastPauseType = type;
  recoveryPausedAt = Date.now();

  clearActiveState();
  saveActiveState({ status: 'recovery', taskName, pauseType: type, pausedAt: recoveryPausedAt });
  renderMainScreen();
  switchScreen('main-screen');
}

function finishFocus() {
  const endedAt = Date.now();
  const startedAt = getFocusStartTime();
  const taskName = getCurrentTaskName();
  const seconds = Math.round((endedAt - startedAt) / 1000);
  saveFocusSegment(taskName, startedAt, endedAt, seconds);
  invalidateFocusTimeCache();
  clearAllIntervals();
  clearActiveState();
  showSummary();
}

function renderMainScreen() {
  const normalSection = document.getElementById('normal-section');
  const recoverySection = document.getElementById('recovery-section');

  if (isRecoveryMode) {
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

function renderRecoverySection() {
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
    startFocus(lastTaskName);
  });
  resumeArea.appendChild(resumeBtn);

  const tasksArea = document.getElementById('recovery-tasks-area');
  tasksArea.innerHTML = '';
  getValidTasks()
    .forEach((name) => {
      const btn = document.createElement('button');
      btn.className = 'btn-task-recovery';
      btn.innerText = name;
      btn.addEventListener('click', () => {
        initAudio();
        startFocus(name);
      });
      tasksArea.appendChild(btn);
    });

  const rouletteBtn = document.getElementById('recovery-roulette-btn');
  rouletteBtn.onclick = () => {
    initAudio();
    startRoulette();
  };

  updateRecoveryAccumulatedDisplay();
  startPauseTimer(recoveryPausedAt, updatePauseElapsedDisplay, handlePauseWarning);
}

function exitRecovery() {
  isRecoveryMode = false;
  lastTaskName = '';
  lastPauseType = '';
  recoveryPausedAt = null;
  stopPauseTimer();
  clearActiveState();
  showSummary();
}

function handleFocusMilestone(elapsedSeconds) {
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

function flashScreen() {
  const overlay = document.getElementById('flash-overlay');
  overlay.classList.remove('flash-red');
  void overlay.offsetWidth;
  overlay.classList.add('flash-red');
  setTimeout(() => overlay.classList.remove('flash-red'), 1900);
}

function showMilestoneMessage(text) {
  const el = document.getElementById('milestone-message');
  el.classList.remove('show');
  el.innerText = text;
  void el.offsetWidth;
  el.classList.add('show');
  setTimeout(() => el.classList.remove('show'), 3600);
}

function getTodayLogs() {
  const logs = loadLogs();
  const todayKey = getTodayKey();
  return logs[todayKey] || [];
}

/**
 * 今日の累積集中時間（秒）をキャッシュ付きで返す
 */
function getCachedTodayFocusTime() {
  const todayKey = getTodayKey();
  if (cachedTodayKey !== todayKey) {
    // 日付が変わったらキャッシュをリセット
    cachedTodayKey = todayKey;
    cachedTodayFocusTime = getTotalFocusTime(getTodayLogs());
  }
  return cachedTodayFocusTime;
}

function showSummary() {
  setLastFocusedElement(document.activeElement);
  const todayLogs = getTodayLogs();
  const container = document.getElementById('summary-content');

  if (todayLogs.length === 0) {
    container.innerHTML = '<div class="summary-empty">' + tr('summaryEmpty') + '</div>';
  } else {
    const totalSeconds = getTotalFocusTime(todayLogs);
    const longestSeconds = getLongestFocusSegment(todayLogs);
    const startCount = getStartCount(todayLogs);
    const bestSession = getBestSession(todayLogs);
    const taskRanking = getTaskTimeRanking(todayLogs);
    const firstStartTime = getFirstStartTime(todayLogs);
    const inMorning = didStartInMorning(todayLogs);

    let html = '';
    html += '<div class="summary-hero">';
    html += '<div class="summary-hero-label">' + tr('summaryHero') + '</div>';
    html += '<div class="summary-hero-value">' + uiDuration(totalSeconds) + '</div>';
    html += '</div>';

    html += '<div class="summary-stats">';
    html += '<div class="summary-stat-card"><div class="summary-stat-label">' + tr('summaryFirstStart') + '</div><div class="summary-stat-value">' + firstStartTime + '</div></div>';
    html += '<div class="summary-stat-card"><div class="summary-stat-label">' + tr('summaryMorningStart') + '</div><div class="summary-stat-value ' + (inMorning ? 'summary-stat-success' : 'summary-stat-muted') + '">' + (inMorning ? tr('summaryMorningDone') : tr('summaryMorningMiss')) + '</div></div>';
    html += '<div class="summary-stat-card"><div class="summary-stat-label">' + tr('summaryLongest') + '</div><div class="summary-stat-value">' + uiDuration(longestSeconds) + '</div></div>';
    html += '<div class="summary-stat-card"><div class="summary-stat-label">' + tr('summaryStartCount') + '</div><div class="summary-stat-value">' + tr('summaryStartCountValue', { count: startCount }) + '</div></div>';
    html += '</div>';

    if (bestSession) {
      html += '<div class="summary-section">';
      html += '<div class="summary-section-title">' + tr('summaryBestSession') + '</div>';
      html += '<div class="best-session-display">';
      html += '<span class="task-name">' + escapeHtml(bestSession.task) + '</span> ';
      html += uiDuration(bestSession.seconds);
      html += '</div></div>';
    }

    if (taskRanking.length > 0) {
      html += '<div class="summary-section">';
      html += '<div class="summary-section-title">' + tr('summaryTaskRanking') + '</div>';
      taskRanking.forEach((item, index) => {
        const medals = ['🥇', '🥈', '🥉'];
        const position = index < medals.length ? medals[index] : String(index + 1) + '.';
        html += '<div class="ranking-row">';
        html += '<span class="ranking-position">' + position + '</span>';
        html += '<span class="ranking-task">' + escapeHtml(item.task) + '</span>';
        html += '<span class="ranking-time">' + uiDuration(item.seconds) + '</span>';
        html += '</div>';
      });
      html += '</div>';
    }

    container.innerHTML = html;
  }

  const summaryModal = document.getElementById('summary-modal');
  summaryModal.classList.add('active');
  setCurrentTrapCleanup(trapFocus(summaryModal));
  document.getElementById('btn-close-summary').focus();
}

function closeSummary() {
  clearTrapCleanup();
  document.getElementById('summary-modal').classList.remove('active');
  isRecoveryMode = false;
  renderMainScreen();
  switchScreen('main-screen');

  const lastFocusedElement = getLastFocusedElement();
  if (lastFocusedElement && lastFocusedElement.isConnected) {
    lastFocusedElement.focus();
  } else {
    document.getElementById('btn-show-summary').focus();
  }
  setLastFocusedElement(null);
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

function showSettings() {
  setLastFocusedElement(document.activeElement);
  document.getElementById('setting-milestone').checked = getSetting('milestoneEnabled');
  document.getElementById('setting-sound').checked = getSetting('soundEnabled');
  const checkedThemeRadio = document.querySelector(`input[name="setting-theme"][value="${getSetting('themeMode')}"]`);
  if (checkedThemeRadio) checkedThemeRadio.checked = true;
  const checkedLanguageRadio = document.querySelector(`input[name="setting-language"][value="${getSetting('language')}"]`);
  if (checkedLanguageRadio) checkedLanguageRadio.checked = true;

  const settingsModal = document.getElementById('settings-modal');
  settingsModal.classList.add('active');
  setCurrentTrapCleanup(trapFocus(settingsModal));
  const firstRadio = document.querySelector('input[name="setting-theme"]:checked') || document.getElementById('setting-milestone');
  firstRadio.focus();
}

function handleThemePreview() {
  const previewTheme = document.querySelector('input[name="setting-theme"]:checked')?.value || getSetting('themeMode');
  applyTheme(previewTheme);
}

function handleLanguagePreview() {
  const previewLanguage = document.querySelector('input[name="setting-language"]:checked')?.value || getSetting('language');
  applyLanguage(previewLanguage);
}

function handleSaveSettings() {
  clearTrapCleanup();
  const newSettings = {
    milestoneEnabled: document.getElementById('setting-milestone').checked,
    soundEnabled: document.getElementById('setting-sound').checked,
    themeMode: document.querySelector('input[name="setting-theme"]:checked')?.value || 'system',
    language: document.querySelector('input[name="setting-language"]:checked')?.value || 'ja',
  };
  updateSettings(newSettings);
  applyTheme(newSettings.themeMode);
  applyLanguage(newSettings.language);
  document.getElementById('settings-modal').classList.remove('active');

  const lastFocusedElement = getLastFocusedElement();
  if (lastFocusedElement && lastFocusedElement.isConnected) {
    lastFocusedElement.focus();
  } else {
    document.getElementById('btn-show-settings').focus();
  }
  setLastFocusedElement(null);
}

function checkActiveState() {
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
    isRecoveryMode = true;
    lastTaskName = parsed.taskName;
    lastPauseType = parsed.pauseType;
    recoveryPausedAt = parsed.pausedAt;
    renderMainScreen();
    return;
  }

  renderMainScreen();
  switchScreen('main-screen');

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
    switchScreen('focus-screen');
    clearAllIntervals();
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

function clearAllIntervals() {
  stopFocusTimer();
  stopPauseTimer();
  if (rouletteIntervalId) {
    clearInterval(rouletteIntervalId);
    rouletteIntervalId = null;
  }
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
