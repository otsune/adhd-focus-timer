import { getDayKey } from './date-utils.js';

export const STORAGE_KEYS = {
  tasks: 'tasks_v2',
  logs: 'logs_v2',
  settings: 'settings_v2',
  activeState: 'activeState_v2',
};

/**
 * ログセグメントの構造を検証する
 */
function isValidLogSegment(seg) {
  return seg &&
    typeof seg === 'object' &&
    typeof seg.taskName === 'string' &&
    Number.isFinite(seg.startedAt) && seg.startedAt > 0 &&
    Number.isFinite(seg.endedAt) && seg.endedAt > 0 &&
    Number.isFinite(seg.seconds) && seg.seconds > 0;
}

export function generateId() {
  return Date.now().toString(36) + Math.random().toString(36).substr(2, 5);
}

// Safari private mode 等で getItem 自体が SecurityError を投げる環境への防御
function safeGetItem(key) {
  try {
    return localStorage.getItem(key);
  } catch (e) {
    return null;
  }
}

export function loadLogs() {
  const data = safeGetItem(STORAGE_KEYS.logs);
  if (!data) return {};
  try {
    const parsed = JSON.parse(data);
    if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) return {};

    const sanitized = {};
    for (const [key, segments] of Object.entries(parsed)) {
      if (!/^\d{4}-\d{2}-\d{2}$/.test(key)) continue;
      if (!Array.isArray(segments)) continue;
      sanitized[key] = segments.filter(isValidLogSegment);
    }
    return sanitized;
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
  const saved = safeGetItem(STORAGE_KEYS.tasks);
  if (saved) {
    try {
      const parsed = JSON.parse(saved);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed
          .filter((t) => typeof t === 'string' && t.trim() !== '')
          .map((t) => String(t).slice(0, 200));
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
  const defaults = { milestoneEnabled: true, soundEnabled: true, themeMode: 'system', language: 'ja' };
  const saved = safeGetItem(STORAGE_KEYS.settings);
  if (saved) {
    try {
      const s = JSON.parse(saved);
      if (typeof s.milestoneEnabled === 'boolean') defaults.milestoneEnabled = s.milestoneEnabled;
      if (typeof s.soundEnabled === 'boolean') defaults.soundEnabled = s.soundEnabled;
      if (s.themeMode === 'system' || s.themeMode === 'light' || s.themeMode === 'dark') {
        defaults.themeMode = s.themeMode;
      }
      if (s.language === 'ja' || s.language === 'en') {
        defaults.language = s.language;
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

export function parseActiveState(raw) {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return null;

  if (raw.status === 'focus') {
    if (typeof raw.taskName !== 'string' || raw.taskName.trim() === '') return null;
    if (!Number.isFinite(raw.focusStartedAt) || raw.focusStartedAt <= 0) return null;
    return {
      kind: 'focus',
      taskName: raw.taskName.slice(0, 200),
      focusStartedAt: raw.focusStartedAt,
    };
  }

  if (raw.status === 'recovery') {
    if (typeof raw.taskName !== 'string' || raw.taskName.trim() === '') return null;
    if (!Number.isFinite(raw.pausedAt) || raw.pausedAt <= 0) return null;
    const pauseType = (raw.pauseType === 'away' || raw.pauseType === 'meal') ? raw.pauseType : '';
    return {
      kind: 'recovery',
      taskName: raw.taskName.slice(0, 200),
      pausedAt: raw.pausedAt,
      pauseType,
    };
  }

  return null;
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
