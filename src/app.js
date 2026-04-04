import { formatElapsedTime, formatDuration, escapeHtml } from './utils.js';
import { getTodayKey, getNext4AM } from './date-utils.js';
import {
  STORAGE_KEYS,
  loadLogs,
  saveLogs,
  loadTasks,
  saveTasks,
  loadSettings,
  saveSettings,
  saveActiveState,
  clearActiveState,
  saveFocusSegment,
} from './storage.js';
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

const MAX_TASKS = 6;
const TRANSLATIONS = {
  ja: {
    appTitle: 'ADHD Focus Timer',
    resume: '再開',
    discard: '破棄',
    addTask: '＋ タスクを追加 (最大6個)',
    addTaskMax: '最大数 (6個) に達しています',
    todaySummary: '📊 今日の成果',
    settings: '⚙️ 設定',
    rouletteStart: '決められない時（開始）',
    accumulatedToday: '今日の累積集中',
    paused: '中断中',
    todayFocus: '今日の集中',
    random: 'ランダム',
    finish: '終了',
    focusAria: '集中時間',
    away: '離席',
    meal: '食事',
    awayAria: '一時中断: 離席',
    mealAria: '一時中断: 食事',
    finishFocusAria: '集中を終了',
    close: '閉じる',
    resetLog: 'ログをリセット',
    theme: 'テーマ',
    system: 'システム',
    light: 'ライト',
    dark: 'ダーク',
    language: '言語',
    languageGroup: '言語',
    themeGroup: 'テーマ',
    japanese: '日本語',
    english: 'English',
    milestone: '節目通知',
    sound: '音通知',
    saveAndClose: '保存して閉じる',
    exportJson: '📥 JSON エクスポート',
    exportCsv: '📥 CSV エクスポート',
    taskFallback: 'タスク',
    taskPlaceholder: 'タスクを入力...',
    taskInputAria: 'タスク{index}入力',
    taskRemove: 'タスクを削除',
    startDirect: '開始 ▶',
    unnamedTask: '名称未設定タスク',
    needTaskAlert: '少なくとも1つタスクを入力してください！',
    undoToast: '「{task}」を削除',
    recoveryAway: '🚶 離席中 — 戻ったらタスクを選んで再開しましょう',
    recoveryMeal: '🍽️ 食事中 — 戻ったらタスクを選んで再開しましょう',
    recoveryGeneric: '⏸️ 一時中断中 — タスクを選んで再開しましょう',
    resumeLastTask: '{task} を再開',
    summaryEmpty: 'まだ記録がありません。<br>タスクを選んで集中を始めましょう。',
    summaryHero: '累積集中時間',
    summaryFirstStart: '最初の着手',
    summaryMorningStart: '午前中に着手',
    summaryMorningDone: '✓ できた',
    summaryMorningMiss: '—',
    summaryLongest: '最長連続',
    summaryStartCount: '着手回数',
    summaryStartCountValue: '{count}回',
    summaryBestSession: '今日のベストセッション',
    summaryTaskRanking: 'タスク別 累積集中時間',
    resetConfirm: '今日の集中ログをリセットしますか？',
    recoveryBannerActive: '集中中の状態が残っています（{task} / {elapsed}経過）',
    exportJsonName: 'adhd_focus_log_{day}.json',
    exportCsvName: 'adhd_focus_log_{day}.csv',
    csvHeader: '日付,タスク名,開始時刻,終了時刻,集中秒数',
  },
  en: {
    appTitle: 'ADHD Focus Timer',
    resume: 'Resume',
    discard: 'Discard',
    addTask: '+ Add task (max 6)',
    addTaskMax: 'Maximum reached (6 tasks)',
    todaySummary: '📊 Today\'s Summary',
    settings: '⚙️ Settings',
    rouletteStart: 'Can\'t decide? Start',
    accumulatedToday: 'Today\'s total focus',
    paused: 'Paused',
    todayFocus: 'Today\'s focus',
    random: 'Random',
    finish: 'Finish',
    focusAria: 'Focus time',
    away: 'Away',
    meal: 'Meal',
    awayAria: 'Pause: away',
    mealAria: 'Pause: meal',
    finishFocusAria: 'Finish focus session',
    close: 'Close',
    resetLog: 'Reset log',
    theme: 'Theme',
    system: 'System',
    light: 'Light',
    dark: 'Dark',
    language: 'Language',
    languageGroup: 'Language',
    themeGroup: 'Theme',
    japanese: 'Japanese',
    english: 'English',
    milestone: 'Milestone alerts',
    sound: 'Sound alerts',
    saveAndClose: 'Save and close',
    exportJson: '📥 Export JSON',
    exportCsv: '📥 Export CSV',
    taskFallback: 'Task',
    taskPlaceholder: 'Enter a task...',
    taskInputAria: 'Task {index} input',
    taskRemove: 'Remove task',
    startDirect: 'Start ▶',
    unnamedTask: 'Untitled task',
    needTaskAlert: 'Please enter at least one task!',
    undoToast: 'Deleted "{task}"',
    recoveryAway: '🚶 Away — choose a task to resume when you return',
    recoveryMeal: '🍽️ Meal break — choose a task to resume when you return',
    recoveryGeneric: '⏸️ Paused — choose a task to resume',
    resumeLastTask: 'Resume {task}',
    summaryEmpty: 'No records yet.<br>Select a task and start focusing.',
    summaryHero: 'Total focus time',
    summaryFirstStart: 'First start',
    summaryMorningStart: 'Started in the morning',
    summaryMorningDone: '✓ done',
    summaryMorningMiss: '—',
    summaryLongest: 'Longest streak',
    summaryStartCount: 'Starts',
    summaryStartCountValue: '{count} times',
    summaryBestSession: 'Best session today',
    summaryTaskRanking: 'Focus time by task',
    resetConfirm: 'Reset today\'s focus log?',
    recoveryBannerActive: 'An active focus state remains ({task} / {elapsed} elapsed)',
    exportJsonName: 'adhd_focus_log_{day}.json',
    exportCsvName: 'adhd_focus_log_{day}.csv',
    csvHeader: 'Date,Task,Start time,End time,Focus seconds',
  },
};

let tasks = [''];
let currentTaskName = '';
let focusSegmentStartedAt = null;
let focusIntervalId = null;
let pauseIntervalId = null;
let rouletteIntervalId = null;
let lastNotifiedMilestone = 0;
let appInitialized = false;

let undoTimeout = null;
let undoData = null;

let lastFocusedElement = null;
let currentTrapCleanup = null;

let isRecoveryMode = false;
let lastTaskName = '';
let lastPauseType = '';
let pausedAt = null;

let settings = {
  milestoneEnabled: true,
  soundEnabled: true,
  themeMode: 'system',
  language: 'ja',
};

let audioCtx;
const systemThemeMedia = window.matchMedia('(prefers-color-scheme: light)');

function t(key, vars = {}) {
  const lang = TRANSLATIONS[settings.language] ? settings.language : 'ja';
  const template = TRANSLATIONS[lang][key] ?? TRANSLATIONS.ja[key] ?? key;
  return template.replace(/\{(\w+)\}/g, (_, name) => String(vars[name] ?? ''));
}

function uiDuration(totalSeconds) {
  return formatDuration(totalSeconds, settings.language);
}

function applyTheme(mode) {
  const resolvedTheme = mode === 'system'
    ? (systemThemeMedia.matches ? 'light' : 'dark')
    : mode;

  document.documentElement.dataset.themeMode = mode;
  document.documentElement.dataset.theme = resolvedTheme;
}

function setText(id, text) {
  const el = document.getElementById(id);
  if (el) el.textContent = text;
}

function setHtml(id, html) {
  const el = document.getElementById(id);
  if (el) el.innerHTML = html;
}

function setAttr(id, name, value) {
  const el = document.getElementById(id);
  if (el) el.setAttribute(name, value);
}

function applyLanguage(language) {
  settings.language = TRANSLATIONS[language] ? language : 'ja';
  document.documentElement.lang = settings.language;
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
          document.getElementById('recovery-text').innerText = t('recoveryBannerActive', {
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
  setText('btn-recovery-resume', t('resume'));
  setText('btn-recovery-discard', t('discard'));
  setText('btn-show-summary', t('todaySummary'));
  setText('btn-show-settings', t('settings'));
  setText('btn-roulette', t('rouletteStart'));
  setText('main-acc-label', t('accumulatedToday'));
  setText('recovery-pause-label', t('paused'));
  setText('recovery-acc-label', t('todayFocus'));
  setText('recovery-roulette-btn', t('random'));
  setText('btn-finish-recovery', t('finish'));
  setAttr('focus-timer-display', 'aria-label', t('focusAria'));
  setText('focus-acc-label', t('accumulatedToday'));
  setText('btn-away', t('away'));
  setText('btn-meal', t('meal'));
  setAttr('btn-away', 'aria-label', t('awayAria'));
  setAttr('btn-meal', 'aria-label', t('mealAria'));
  setAttr('btn-finish-focus', 'aria-label', t('finishFocusAria'));
  setText('summary-modal-title', t('todaySummary'));
  setText('btn-close-summary', t('close'));
  setText('btn-reset-log', t('resetLog'));
  setText('settings-modal-title', t('settings'));
  setText('settings-theme-label', t('theme'));
  setAttr('settings-theme-group', 'aria-label', t('themeGroup'));
  setText('theme-option-system', t('system'));
  setText('theme-option-light', t('light'));
  setText('theme-option-dark', t('dark'));
  setText('settings-language-label', t('language'));
  setAttr('settings-language-group', 'aria-label', t('languageGroup'));
  setText('language-option-ja', t('japanese'));
  setText('language-option-en', t('english'));
  setText('settings-milestone-label', t('milestone'));
  setAttr('setting-milestone', 'aria-label', t('milestone'));
  setText('settings-sound-label', t('sound'));
  setAttr('setting-sound', 'aria-label', t('sound'));
  setText('btn-save-settings', t('saveAndClose'));
  setText('btn-export-json', t('exportJson'));
  setText('btn-export-csv', t('exportCsv'));
}

function updateFocusScreenTranslations() {
  setText('focus-acc-label', t('accumulatedToday'));
  setText('btn-away', t('away'));
  setText('btn-meal', t('meal'));
  setText('btn-finish-focus', '■ ' + t('finish'));
  setAttr('btn-away', 'aria-label', t('awayAria'));
  setAttr('btn-meal', 'aria-label', t('mealAria'));
  setAttr('btn-finish-focus', 'aria-label', t('finishFocusAria'));
}

function initAudio() {
  if (!audioCtx) {
    audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  }
  if (audioCtx.state === 'suspended') {
    audioCtx.resume();
  }
}

function playBeep(type) {
  if (!audioCtx || !settings.soundEnabled) return;

  const osc = audioCtx.createOscillator();
  const gainNode = audioCtx.createGain();
  osc.connect(gainNode);
  gainNode.connect(audioCtx.destination);

  if (type === 'start') {
    osc.type = 'square';
    osc.frequency.setValueAtTime(440, audioCtx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(880, audioCtx.currentTime + 0.1);
    gainNode.gain.setValueAtTime(0.1, audioCtx.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.3);
    osc.start(audioCtx.currentTime);
    osc.stop(audioCtx.currentTime + 0.3);
  } else if (type === 'milestone') {
    osc.type = 'sine';
    osc.frequency.setValueAtTime(660, audioCtx.currentTime);
    osc.frequency.setValueAtTime(880, audioCtx.currentTime + 0.15);
    gainNode.gain.setValueAtTime(0.15, audioCtx.currentTime);
    gainNode.gain.linearRampToValueAtTime(0, audioCtx.currentTime + 0.5);
    osc.start(audioCtx.currentTime);
    osc.stop(audioCtx.currentTime + 0.5);
  }
}

function updateMainAccumulatedDisplay() {
  const el = document.getElementById('main-acc-value-display');
  if (!el) return;

  const totalSeconds = getTotalFocusTime(getTodayLogs());
  el.innerText = totalSeconds > 0 ? uiDuration(totalSeconds) : '—';
}

function updateFocusAccumulatedDisplay(currentElapsed = 0) {
  const el = document.getElementById('focus-acc-value-display');
  if (!el) return;

  const totalSeconds = getTotalFocusTime(getTodayLogs()) + currentElapsed;
  el.innerText = totalSeconds > 0 ? uiDuration(totalSeconds) : '—';
}

function updateRecoveryAccumulatedDisplay() {
  const el = document.getElementById('recovery-acc-value');
  if (!el) return;

  const totalSeconds = getTotalFocusTime(getTodayLogs());
  el.innerText = totalSeconds > 0 ? uiDuration(totalSeconds) : '—';
}

function addTask() {
  if (tasks.length < MAX_TASKS) {
    tasks.push('');
    saveTasks(tasks);
    renderTaskSlots();
    setTimeout(() => {
      const inputs = document.querySelectorAll('.task-slot input');
      if (inputs.length > 0) inputs[inputs.length - 1].focus();
    }, 50);
  }
}

function removeTask(index) {
  if (tasks.length > 1) {
    const removedTask = tasks[index];
    const removedIndex = index;
    tasks.splice(index, 1);
    saveTasks(tasks);
    renderTaskSlots();
    showUndoToast(removedTask, removedIndex);
  }
}

function showUndoToast(task, index) {
  if (undoTimeout) clearTimeout(undoTimeout);
  undoData = { task, index };

  const toast = document.getElementById('undo-toast');
  const label = task.trim() || t('taskFallback');
  document.getElementById('undo-toast-text').innerText = t('undoToast', { task: label });
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

  tasks.splice(undoData.index, 0, undoData.task);
  saveTasks(tasks);
  renderTaskSlots();
  document.getElementById('undo-toast').classList.remove('show');
  undoData = null;
  undoTimeout = null;
}

function renderTaskSlots() {
  const container = document.getElementById('task-slots');
  container.innerHTML = '';

  const addBtn = document.getElementById('btn-add-task');
  if (tasks.length >= MAX_TASKS) {
    addBtn.disabled = true;
    addBtn.innerText = t('addTaskMax');
  } else {
    addBtn.disabled = false;
    addBtn.innerText = t('addTask');
  }

  if (tasks.length === 1) {
    container.style.gridTemplateColumns = '1fr';
    container.style.maxWidth = '700px';
    container.style.margin = '0 auto 20px auto';
  } else {
    container.style.gridTemplateColumns = '1fr 1fr';
    container.style.maxWidth = '100%';
    container.style.margin = '0 0 20px 0';
  }

  for (let i = 0; i < tasks.length; i++) {
    const slot = document.createElement('div');
    slot.className = 'task-slot';

    if (tasks.length > 1) {
      const removeBtn = document.createElement('button');
      removeBtn.className = 'btn-remove';
      removeBtn.innerHTML = '×';
      removeBtn.title = t('taskRemove');
      removeBtn.setAttribute('aria-label', t('taskRemove'));
      removeBtn.addEventListener('click', () => removeTask(i));
      slot.appendChild(removeBtn);
    }

    const input = document.createElement('input');
    input.type = 'text';
    input.placeholder = t('taskPlaceholder');
    input.setAttribute('aria-label', t('taskInputAria', { index: i + 1 }));
    input.value = tasks[i] || '';
    input.addEventListener('input', (e) => {
      tasks[i] = e.target.value;
      saveTasks(tasks);
    });
    slot.appendChild(input);

    const btn = document.createElement('button');
    btn.className = 'btn-start-direct';
    btn.innerText = t('startDirect');
    btn.addEventListener('click', () => {
      initAudio();
      const taskName = input.value.trim() || t('unnamedTask');
      startFocus(taskName);
    });
    slot.appendChild(btn);
    container.appendChild(slot);
  }
}

function startRoulette() {
  const validTasks = tasks.map((t) => t.trim()).filter((t) => t !== '');
  if (validTasks.length === 0) {
    alert(t('needTaskAlert'));
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

  currentTaskName = taskName;
  focusSegmentStartedAt = Date.now();
  lastNotifiedMilestone = 0;

  document.getElementById('focus-task-display').innerText = currentTaskName;
  document.getElementById('focus-timer-display').innerText = '00:00';
  updateFocusAccumulatedDisplay(0);
  updateFocusScreenTranslations();
  switchScreen('focus-screen');

  if (wasRecovery) {
    flashScreen();
  }
  playBeep('start');

  clearActiveState();
  saveActiveState({ status: 'focus', taskName: currentTaskName, focusStartedAt: focusSegmentStartedAt });
  clearAllIntervals();
  focusIntervalId = setInterval(tickFocusTimer, 1000);
}

function tickFocusTimer() {
  const now = Date.now();
  const next4AM = getNext4AM(focusSegmentStartedAt);

  if (now >= next4AM) {
    const splitSeconds = Math.round((next4AM - focusSegmentStartedAt) / 1000);
    saveFocusSegment(currentTaskName, focusSegmentStartedAt, next4AM, splitSeconds);
    focusSegmentStartedAt = next4AM;
    lastNotifiedMilestone = 0;
    saveActiveState({ status: 'focus', taskName: currentTaskName, focusStartedAt: focusSegmentStartedAt });
    showMilestoneMessage('日付が変わりました');
  }

  const elapsed = Math.floor((now - focusSegmentStartedAt) / 1000);
  document.getElementById('focus-timer-display').innerText = formatElapsedTime(elapsed);
  updateFocusAccumulatedDisplay(elapsed);
  if (settings.milestoneEnabled) handleFocusMilestone(elapsed);
}

function pauseAs(type) {
  const endedAt = Date.now();
  const seconds = Math.round((endedAt - focusSegmentStartedAt) / 1000);
  saveFocusSegment(currentTaskName, focusSegmentStartedAt, endedAt, seconds);
  clearAllIntervals();

  isRecoveryMode = true;
  lastTaskName = currentTaskName;
  lastPauseType = type;
  pausedAt = Date.now();

  clearActiveState();
  saveActiveState({ status: 'recovery', taskName: currentTaskName, pauseType: type, pausedAt });
  renderMainScreen();
  switchScreen('main-screen');
}

function finishFocus() {
  const endedAt = Date.now();
  const seconds = Math.round((endedAt - focusSegmentStartedAt) / 1000);
  saveFocusSegment(currentTaskName, focusSegmentStartedAt, endedAt, seconds);
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
    banner.innerText = t('recoveryAway');
  } else if (lastPauseType === 'meal') {
    banner.innerText = t('recoveryMeal');
  } else {
    banner.innerText = t('recoveryGeneric');
  }

  const resumeArea = document.getElementById('recovery-resume-area');
  resumeArea.innerHTML = '';
  const resumeBtn = document.createElement('button');
  resumeBtn.className = 'btn-resume-main';
  resumeBtn.id = 'btn-resume-last';
  resumeBtn.innerText = t('resumeLastTask', { task: lastTaskName });
  resumeBtn.addEventListener('click', () => {
    initAudio();
    startFocus(lastTaskName);
  });
  resumeArea.appendChild(resumeBtn);

  const tasksArea = document.getElementById('recovery-tasks-area');
  tasksArea.innerHTML = '';
  tasks
    .map((task) => task.trim())
    .filter((task) => task !== '')
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
  startPauseTimer();
}

function exitRecovery() {
  isRecoveryMode = false;
  lastTaskName = '';
  lastPauseType = '';
  pausedAt = null;
  stopPauseTimer();
  clearActiveState();
  showSummary();
}

function startPauseTimer() {
  stopPauseTimer();
  tickPauseTimer();
  pauseIntervalId = setInterval(tickPauseTimer, 1000);
}

function tickPauseTimer() {
  if (!pausedAt) return;

  const elapsed = Math.floor((Date.now() - pausedAt) / 1000);
  const el = document.getElementById('pause-elapsed-value');
  if (!el) return;

  el.innerText = formatElapsedTime(elapsed);
  if (elapsed >= 300) {
    if (!el.classList.contains('over5')) {
      el.classList.add('over5');
      flashScreen();
    }
  } else {
    el.classList.remove('over5');
  }
}

function stopPauseTimer() {
  if (pauseIntervalId) {
    clearInterval(pauseIntervalId);
    pauseIntervalId = null;
  }

  const el = document.getElementById('pause-elapsed-value');
  if (el) {
    el.classList.remove('over5');
    el.innerText = '00:00';
  }
}

function handleFocusMilestone(elapsedSeconds) {
  const action = getMilestoneAction(elapsedSeconds, lastNotifiedMilestone);
  if (!action) return;

  lastNotifiedMilestone = action.newLastNotified;
  if (action.type === 'flash') {
    flashScreen();
  } else if (action.type === 'sound_message') {
    playBeep('milestone');
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

function showSummary() {
  lastFocusedElement = document.activeElement;
  const todayLogs = getTodayLogs();
  const container = document.getElementById('summary-content');

  if (todayLogs.length === 0) {
    container.innerHTML = '<div class="summary-empty">' + t('summaryEmpty') + '</div>';
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
    html += '<div class="summary-hero-label">' + t('summaryHero') + '</div>';
    html += '<div class="summary-hero-value">' + uiDuration(totalSeconds) + '</div>';
    html += '</div>';

    html += '<div class="summary-stats">';
    html += '<div class="summary-stat-card"><div class="summary-stat-label">' + t('summaryFirstStart') + '</div><div class="summary-stat-value">' + firstStartTime + '</div></div>';
    html += '<div class="summary-stat-card"><div class="summary-stat-label">' + t('summaryMorningStart') + '</div><div class="summary-stat-value ' + (inMorning ? 'summary-stat-success' : 'summary-stat-muted') + '">' + (inMorning ? t('summaryMorningDone') : t('summaryMorningMiss')) + '</div></div>';
    html += '<div class="summary-stat-card"><div class="summary-stat-label">' + t('summaryLongest') + '</div><div class="summary-stat-value">' + uiDuration(longestSeconds) + '</div></div>';
    html += '<div class="summary-stat-card"><div class="summary-stat-label">' + t('summaryStartCount') + '</div><div class="summary-stat-value">' + t('summaryStartCountValue', { count: startCount }) + '</div></div>';
    html += '</div>';

    if (bestSession) {
      html += '<div class="summary-section">';
      html += '<div class="summary-section-title">' + t('summaryBestSession') + '</div>';
      html += '<div class="best-session-display">';
      html += '<span class="task-name">' + escapeHtml(bestSession.task) + '</span> ';
      html += uiDuration(bestSession.seconds);
      html += '</div></div>';
    }

    if (taskRanking.length > 0) {
      html += '<div class="summary-section">';
      html += '<div class="summary-section-title">' + t('summaryTaskRanking') + '</div>';
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
  currentTrapCleanup = trapFocus(summaryModal);
  document.getElementById('btn-close-summary').focus();
}

function closeSummary() {
  if (currentTrapCleanup) {
    currentTrapCleanup();
    currentTrapCleanup = null;
  }
  document.getElementById('summary-modal').classList.remove('active');
  isRecoveryMode = false;
  renderMainScreen();
  switchScreen('main-screen');

  if (lastFocusedElement && lastFocusedElement.isConnected) {
    lastFocusedElement.focus();
  } else {
    document.getElementById('btn-show-summary').focus();
  }
  lastFocusedElement = null;
}

function resetLog() {
  if (confirm(t('resetConfirm'))) {
    const logs = loadLogs();
    const todayKey = getTodayKey();
    delete logs[todayKey];
    saveLogs(logs);
    showSummary();
  }
}

function exportLogsAsJSON() {
  const logs = loadLogs();
  const exportData = {
    version: '1.0',
    exportedAt: new Date().toISOString(),
    tasks,
    settings,
    logs,
  };

  const json = JSON.stringify(exportData, null, 2);
  const todayKey = getTodayKey();
  downloadFile(json, t('exportJsonName', { day: todayKey }), 'application/json');
}

function exportLogsAsCSV() {
  const logs = loadLogs();
  const rows = [t('csvHeader')];

  for (const [dayKey, segments] of Object.entries(logs)) {
    for (const seg of segments) {
      const startStr = new Date(seg.startedAt).toLocaleString('ja-JP');
      const endStr = new Date(seg.endedAt).toLocaleString('ja-JP');
      const taskEscaped = '"' + seg.taskName.replace(/"/g, '""') + '"';
      rows.push([dayKey, taskEscaped, startStr, endStr, seg.seconds].join(','));
    }
  }

  const csv = rows.join('\n');
  const todayKey = getTodayKey();
  downloadFile('\uFEFF' + csv, t('exportCsvName', { day: todayKey }), 'text/csv;charset=utf-8');
}

function downloadFile(content, filename, mimeType) {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

function showSettings() {
  lastFocusedElement = document.activeElement;
  document.getElementById('setting-milestone').checked = settings.milestoneEnabled;
  document.getElementById('setting-sound').checked = settings.soundEnabled;
  const checkedThemeRadio = document.querySelector(`input[name="setting-theme"][value="${settings.themeMode}"]`);
  if (checkedThemeRadio) checkedThemeRadio.checked = true;
  const checkedLanguageRadio = document.querySelector(`input[name="setting-language"][value="${settings.language}"]`);
  if (checkedLanguageRadio) checkedLanguageRadio.checked = true;

  const settingsModal = document.getElementById('settings-modal');
  settingsModal.classList.add('active');
  currentTrapCleanup = trapFocus(settingsModal);
  const firstRadio = document.querySelector('input[name="setting-theme"]:checked') || document.getElementById('setting-milestone');
  firstRadio.focus();
}

function handleThemePreview() {
  const previewTheme = document.querySelector('input[name="setting-theme"]:checked')?.value || settings.themeMode;
  applyTheme(previewTheme);
}

function handleLanguagePreview() {
  const previewLanguage = document.querySelector('input[name="setting-language"]:checked')?.value || settings.language;
  applyLanguage(previewLanguage);
}

function handleSaveSettings() {
  if (currentTrapCleanup) {
    currentTrapCleanup();
    currentTrapCleanup = null;
  }
  settings.milestoneEnabled = document.getElementById('setting-milestone').checked;
  settings.soundEnabled = document.getElementById('setting-sound').checked;
  settings.themeMode = document.querySelector('input[name="setting-theme"]:checked')?.value || 'system';
  settings.language = document.querySelector('input[name="setting-language"]:checked')?.value || 'ja';
  saveSettings(settings);
  applyTheme(settings.themeMode);
  applyLanguage(settings.language);
  document.getElementById('settings-modal').classList.remove('active');

  if (lastFocusedElement && lastFocusedElement.isConnected) {
    lastFocusedElement.focus();
  } else {
    document.getElementById('btn-show-settings').focus();
  }
  lastFocusedElement = null;
}

function checkActiveState() {
  const data = localStorage.getItem(STORAGE_KEYS.activeState);
  if (!data) return;

  try {
    const state = JSON.parse(data);
    if (!state || !state.status) {
      clearActiveState();
      return;
    }

    if (state.status === 'recovery') {
      isRecoveryMode = true;
      lastTaskName = state.taskName || '';
      lastPauseType = state.pauseType || '';
      pausedAt = state.pausedAt || null;
      renderMainScreen();
      return;
    }

    if (state.status !== 'focus') {
      clearActiveState();
      return;
    }

    const banner = document.getElementById('recovery-banner');
    const text = document.getElementById('recovery-text');
    const elapsed = Math.floor((Date.now() - state.focusStartedAt) / 1000);
    text.innerText = t('recoveryBannerActive', { task: state.taskName, elapsed: formatElapsedTime(elapsed) });
    banner.classList.add('active');

    document.getElementById('btn-recovery-resume').onclick = () => {
      banner.classList.remove('active');
      initAudio();
      currentTaskName = state.taskName;
      focusSegmentStartedAt = state.focusStartedAt;
      const elapsedSeconds = Math.floor((Date.now() - focusSegmentStartedAt) / 1000);
      lastNotifiedMilestone = Math.floor(elapsedSeconds / MILESTONE_INTERVAL) * MILESTONE_INTERVAL;
      document.getElementById('focus-task-display').innerText = currentTaskName;
      updateFocusAccumulatedDisplay(elapsedSeconds);
      switchScreen('focus-screen');
      clearAllIntervals();
      focusIntervalId = setInterval(tickFocusTimer, 1000);
      saveActiveState({ status: 'focus', taskName: currentTaskName, focusStartedAt: focusSegmentStartedAt });
      tickFocusTimer();
    };

    document.getElementById('btn-recovery-discard').onclick = () => {
      banner.classList.remove('active');
      if (state.focusStartedAt) {
        const endedAt = Date.now();
        const seconds = Math.round((endedAt - state.focusStartedAt) / 1000);
        if (seconds > 0) saveFocusSegment(state.taskName, state.focusStartedAt, endedAt, seconds);
      }
      clearActiveState();
    };
  } catch (e) {
    clearActiveState();
  }
}

function clearAllIntervals() {
  if (focusIntervalId) {
    clearInterval(focusIntervalId);
    focusIntervalId = null;
  }
  stopPauseTimer();
  if (rouletteIntervalId) {
    clearInterval(rouletteIntervalId);
    rouletteIntervalId = null;
  }
}

function getFocusableElements(container) {
  const els = container.querySelectorAll(
    'button:not([disabled]):not([tabindex="-1"]), input:not([disabled]), [href], [tabindex]:not([tabindex="-1"])'
  );
  return Array.from(els).filter((el) => el.offsetParent !== null || el.closest('.toggle-switch'));
}

function trapFocus(modalElement) {
  function handler(e) {
    if (e.key !== 'Tab') return;
    const focusable = getFocusableElements(modalElement);
    if (focusable.length === 0) return;

    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    if (e.shiftKey) {
      if (document.activeElement === first) {
        e.preventDefault();
        last.focus();
      }
    } else if (document.activeElement === last) {
      e.preventDefault();
      first.focus();
    }
  }

  modalElement.addEventListener('keydown', handler);
  return () => modalElement.removeEventListener('keydown', handler);
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
  if (appInitialized) return;
  appInitialized = true;

  settings = loadSettings();
  applyTheme(settings.themeMode);
  applyLanguage(settings.language);
  tasks = loadTasks();
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
  document.getElementById('btn-export-json').addEventListener('click', exportLogsAsJSON);
  document.getElementById('btn-export-csv').addEventListener('click', exportLogsAsCSV);
  document.getElementById('undo-toast-btn').addEventListener('click', undoRemoveTask);
  document.querySelectorAll('input[name="setting-theme"]').forEach((radio) => {
    radio.addEventListener('change', handleThemePreview);
  });
  document.querySelectorAll('input[name="setting-language"]').forEach((radio) => {
    radio.addEventListener('change', handleLanguagePreview);
  });
  document.addEventListener('keydown', handleGlobalKeydown);
  systemThemeMedia.addEventListener('change', () => {
    if (settings.themeMode === 'system') {
      applyTheme('system');
    }
  });

  checkActiveState();
}
