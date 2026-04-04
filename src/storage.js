import { getDayKey } from './date-utils.js';

export const STORAGE_KEYS = {
  tasks: 'tasks_v2',
  logs: 'logs_v2',
  settings: 'settings_v2',
  activeState: 'activeState_v2',
};

export function generateId() {
  return Date.now().toString(36) + Math.random().toString(36).substr(2, 5);
}

export function loadLogs() {
  const data = localStorage.getItem(STORAGE_KEYS.logs);
  if (!data) return {};
  try {
    return JSON.parse(data);
  } catch (e) {
    return {};
  }
}

export function saveLogs(logs) {
  try {
    localStorage.setItem(STORAGE_KEYS.logs, JSON.stringify(logs));
    return true;
  } catch (e) {
    return false;
  }
}

/**
 * タスク一覧をlocalStorageから読み込んで返す
 */
export function loadTasks() {
  const saved = localStorage.getItem(STORAGE_KEYS.tasks);
  if (saved) {
    try {
      const parsed = JSON.parse(saved);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed;
      }
    } catch (e) { }
  }
  return [''];
}

/**
 * タスク一覧をlocalStorageに保存する
 */
export function saveTasks(tasks) {
  try {
    localStorage.setItem(STORAGE_KEYS.tasks, JSON.stringify(tasks));
    return true;
  } catch (e) {
    return false;
  }
}

/**
 * 設定をlocalStorageから読み込んで返す
 */
export function loadSettings() {
  const defaults = { milestoneEnabled: true, soundEnabled: true, themeMode: 'system' };
  const saved = localStorage.getItem(STORAGE_KEYS.settings);
  if (saved) {
    try {
      const s = JSON.parse(saved);
      if (typeof s.milestoneEnabled === 'boolean') defaults.milestoneEnabled = s.milestoneEnabled;
      if (typeof s.soundEnabled === 'boolean') defaults.soundEnabled = s.soundEnabled;
      if (s.themeMode === 'system' || s.themeMode === 'light' || s.themeMode === 'dark') {
        defaults.themeMode = s.themeMode;
      }
    } catch (e) { }
  }
  return defaults;
}

/**
 * 設定をlocalStorageに保存する
 */
export function saveSettings(settings) {
  try {
    localStorage.setItem(STORAGE_KEYS.settings, JSON.stringify(settings));
    return true;
  } catch (e) {
    return false;
  }
}

export function saveActiveState(state) {
  try {
    localStorage.setItem(STORAGE_KEYS.activeState, JSON.stringify(state));
    return true;
  } catch (e) {
    return false;
  }
}

export function clearActiveState() {
  localStorage.removeItem(STORAGE_KEYS.activeState);
}

/**
 * 集中区間をログに保存する
 */
export function saveFocusSegment(taskName, startedAt, endedAt, seconds) {
  if (seconds <= 0) return false;

  const logs = loadLogs();
  const dayKey = getDayKey(new Date(startedAt));

  if (!logs[dayKey]) {
    logs[dayKey] = [];
  }

  logs[dayKey].push({
    id: generateId(),
    taskName: taskName,
    startedAt: startedAt,
    endedAt: endedAt,
    seconds: seconds,
  });

  return saveLogs(logs);
}
