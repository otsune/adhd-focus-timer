import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import {
  STORAGE_KEYS,
  generateId,
  loadLogs,
  saveLogs,
  loadTasks,
  saveTasks,
  loadSettings,
  saveSettings,
  saveActiveState,
  clearActiveState,
  saveFocusSegment,
  parseActiveState,
} from '../src/storage.js';

beforeEach(() => {
  localStorage.clear();
});

describe('loadLogs / saveLogs', () => {
  it('未保存時は空オブジェクトを返す', () => {
    expect(loadLogs()).toEqual({});
  });

  it('保存→読込の往復', () => {
    const data = { '2025-01-15': [{ id: 'a', taskName: 'T', startedAt: 1, endedAt: 2, seconds: 1 }] };
    saveLogs(data);
    expect(loadLogs()).toEqual(data);
  });

  it('不正なログセグメントをフィルターする', () => {
    const data = {
      '2025-01-15': [
        { id: 'a', taskName: 'T', startedAt: 1, endedAt: 2, seconds: 1 },
        { id: 'b', taskName: '', startedAt: -1, endedAt: NaN, seconds: 0 },
        'invalid-string',
        null,
      ],
      'invalid-key': [{ id: 'c', taskName: 'X', startedAt: 1, endedAt: 2, seconds: 1 }],
    };
    saveLogs(data);
    const loaded = loadLogs();
    expect(loaded['2025-01-15']).toHaveLength(1);
    expect(loaded['invalid-key']).toBeUndefined();
  });

  it('不正JSONは空オブジェクトを返す', () => {
    localStorage.setItem(STORAGE_KEYS.logs, 'not json');
    expect(loadLogs()).toEqual({});
  });

  it('正しいストレージキー logs_v2 を使用', () => {
    saveLogs({ test: [] });
    expect(localStorage.getItem('logs_v2')).not.toBeNull();
  });

  it('上書き動作', () => {
    saveLogs({ '2025-01-01': [] });
    saveLogs({ '2025-01-02': [] });
    const result = loadLogs();
    expect(result).toEqual({ '2025-01-02': [] });
    expect(result['2025-01-01']).toBeUndefined();
  });
});

describe('loadTasks / saveTasks', () => {
  it('未保存時はデフォルト [""] を返す', () => {
    expect(loadTasks()).toEqual(['']);
  });

  it('保存→読込の往復', () => {
    const tasks = ['タスクA', 'タスクB'];
    saveTasks(tasks);
    expect(loadTasks()).toEqual(tasks);
  });

  it('長いタスク名は200文字に切り捨てる', () => {
    const longTasks = ['A'.repeat(300)];
    saveTasks(longTasks);
    expect(loadTasks()[0].length).toBe(200);
  });

  it('非文字列要素をフィルターする', () => {
    localStorage.setItem(STORAGE_KEYS.tasks, JSON.stringify([123, null, '', 'valid']));
    expect(loadTasks()).toEqual(['valid']);
  });

  it('空配列はデフォルトに戻る', () => {
    localStorage.setItem(STORAGE_KEYS.tasks, JSON.stringify([]));
    expect(loadTasks()).toEqual(['']);
  });

  it('配列でない値はデフォルトに戻る', () => {
    localStorage.setItem(STORAGE_KEYS.tasks, JSON.stringify('string'));
    expect(loadTasks()).toEqual(['']);
  });

  it('不正JSONはデフォルトに戻る', () => {
    localStorage.setItem(STORAGE_KEYS.tasks, 'broken');
    expect(loadTasks()).toEqual(['']);
  });

  it('正しいキー tasks_v2 を使用', () => {
    saveTasks(['A']);
    expect(localStorage.getItem('tasks_v2')).not.toBeNull();
  });
});

describe('loadSettings / saveSettings', () => {
  it('未保存時はデフォルト設定を返す', () => {
    expect(loadSettings()).toEqual({ milestoneEnabled: true, soundEnabled: true, themeMode: 'system', language: 'ja' });
  });

  it('保存→読込の往復', () => {
    const settings = { milestoneEnabled: false, soundEnabled: false, themeMode: 'dark', language: 'en' };
    saveSettings(settings);
    expect(loadSettings()).toEqual(settings);
  });

  it('部分的設定は残りをデフォルトで補完', () => {
    localStorage.setItem(STORAGE_KEYS.settings, JSON.stringify({ milestoneEnabled: false }));
    expect(loadSettings()).toEqual({ milestoneEnabled: false, soundEnabled: true, themeMode: 'system', language: 'ja' });
  });

  it('型が不正なフィールドはデフォルト維持', () => {
    localStorage.setItem(STORAGE_KEYS.settings, JSON.stringify({ milestoneEnabled: 'yes', soundEnabled: 42, themeMode: 'blue', language: 'fr' }));
    expect(loadSettings()).toEqual({ milestoneEnabled: true, soundEnabled: true, themeMode: 'system', language: 'ja' });
  });

  it('不正JSONはデフォルトに戻る', () => {
    localStorage.setItem(STORAGE_KEYS.settings, 'broken');
    expect(loadSettings()).toEqual({ milestoneEnabled: true, soundEnabled: true, themeMode: 'system', language: 'ja' });
  });

  it('themeMode が light/dark/system のときだけ保持する', () => {
    localStorage.setItem(STORAGE_KEYS.settings, JSON.stringify({ themeMode: 'light' }));
    expect(loadSettings().themeMode).toBe('light');
  });

  it('language が ja/en のときだけ保持する', () => {
    localStorage.setItem(STORAGE_KEYS.settings, JSON.stringify({ language: 'en' }));
    expect(loadSettings().language).toBe('en');
  });

  it('正しいキー settings_v2 を使用', () => {
    saveSettings({ milestoneEnabled: true, soundEnabled: true });
    expect(localStorage.getItem('settings_v2')).not.toBeNull();
  });
});

describe('saveActiveState / clearActiveState', () => {
  it('保存→localStorageに存在確認', () => {
    saveActiveState({ status: 'focus', taskName: 'テスト' });
    expect(localStorage.getItem('activeState_v2')).not.toBeNull();
  });

  it('クリア→localStorageから削除確認', () => {
    saveActiveState({ status: 'focus' });
    clearActiveState();
    expect(localStorage.getItem('activeState_v2')).toBeNull();
  });

  it('オブジェクト形式で正しく保存・復元', () => {
    const state = { status: 'focus', taskName: 'テスト', focusStartedAt: 1234567890 };
    saveActiveState(state);
    const restored = JSON.parse(localStorage.getItem('activeState_v2'));
    expect(restored).toEqual(state);
  });
});

describe('generateId', () => {
  it('文字列を返す', () => {
    expect(typeof generateId()).toBe('string');
  });

  it('空文字ではない', () => {
    expect(generateId().length).toBeGreaterThan(0);
  });

  it('連続2回呼び出しで異なる値', () => {
    const id1 = generateId();
    const id2 = generateId();
    expect(id1).not.toBe(id2);
  });
});

describe('saveFocusSegment', () => {
  it('正常保存', () => {
    const startedAt = new Date(2025, 0, 15, 10, 0).getTime();
    const endedAt = startedAt + 900000;
    saveFocusSegment('タスクA', startedAt, endedAt, 900);
    const logs = loadLogs();
    expect(logs['2025-01-15']).toBeDefined();
    expect(logs['2025-01-15']).toHaveLength(1);
    expect(logs['2025-01-15'][0].taskName).toBe('タスクA');
    expect(logs['2025-01-15'][0].seconds).toBe(900);
  });

  it('seconds=0は保存しない', () => {
    const startedAt = new Date(2025, 0, 15, 10, 0).getTime();
    saveFocusSegment('タスクA', startedAt, startedAt, 0);
    expect(loadLogs()).toEqual({});
  });

  it('seconds<0は保存しない', () => {
    const startedAt = new Date(2025, 0, 15, 10, 0).getTime();
    saveFocusSegment('タスクA', startedAt, startedAt, -1);
    expect(loadLogs()).toEqual({});
  });

  it('既存ログへの追加', () => {
    const startedAt1 = new Date(2025, 0, 15, 10, 0).getTime();
    const startedAt2 = new Date(2025, 0, 15, 14, 0).getTime();
    saveFocusSegment('タスクA', startedAt1, startedAt1 + 900000, 900);
    saveFocusSegment('タスクB', startedAt2, startedAt2 + 1800000, 1800);
    const logs = loadLogs();
    expect(logs['2025-01-15']).toHaveLength(2);
  });

  it('セグメント構造に全フィールドが含まれる', () => {
    const startedAt = new Date(2025, 0, 15, 10, 0).getTime();
    const endedAt = startedAt + 900000;
    saveFocusSegment('タスクA', startedAt, endedAt, 900);
    const segment = loadLogs()['2025-01-15'][0];
    expect(segment).toHaveProperty('id');
    expect(segment).toHaveProperty('taskName', 'タスクA');
    expect(segment).toHaveProperty('startedAt', startedAt);
    expect(segment).toHaveProperty('endedAt', endedAt);
    expect(segment).toHaveProperty('seconds', 900);
  });

  it('4AM境界: 3:30AMのstartedAtは前日キーに保存', () => {
    const startedAt = new Date(2025, 0, 15, 3, 30).getTime();
    const endedAt = startedAt + 900000;
    saveFocusSegment('タスクA', startedAt, endedAt, 900);
    const logs = loadLogs();
    expect(logs['2025-01-14']).toBeDefined();
    expect(logs['2025-01-14']).toHaveLength(1);
    expect(logs['2025-01-15']).toBeUndefined();
  });
});

describe('save関数の戻り値', () => {
  it('saveLogs: 正常時はtrueを返す', () => {
    expect(saveLogs({ test: [] })).toBe(true);
  });

  it('saveTasks: 正常時はtrueを返す', () => {
    expect(saveTasks(['A'])).toBe(true);
  });

  it('saveSettings: 正常時はtrueを返す', () => {
    expect(saveSettings({ milestoneEnabled: true, soundEnabled: true })).toBe(true);
  });

  it('saveActiveState: 正常時はtrueを返す', () => {
    expect(saveActiveState({ status: 'focus' })).toBe(true);
  });

  it('saveFocusSegment: 正常時はtrueを返す', () => {
    const startedAt = new Date(2025, 0, 15, 10, 0).getTime();
    expect(saveFocusSegment('タスク', startedAt, startedAt + 60000, 60)).toBe(true);
  });

  it('saveFocusSegment: seconds<=0はfalseを返す', () => {
    const startedAt = new Date(2025, 0, 15, 10, 0).getTime();
    expect(saveFocusSegment('タスク', startedAt, startedAt, 0)).toBe(false);
  });
});

describe('QuotaExceededError ハンドリング', () => {
  let setItemSpy;

  beforeEach(() => {
    setItemSpy = vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new DOMException('quota exceeded', 'QuotaExceededError');
    });
  });

  afterEach(() => {
    setItemSpy.mockRestore();
  });

  it('saveLogs: 例外時はfalseを返し例外を投げない', () => {
    expect(saveLogs({ test: [] })).toBe(false);
  });

  it('saveTasks: 例外時はfalseを返し例外を投げない', () => {
    expect(saveTasks(['A'])).toBe(false);
  });

  it('saveSettings: 例外時はfalseを返し例外を投げない', () => {
    expect(saveSettings({ milestoneEnabled: true, soundEnabled: true })).toBe(false);
  });

  it('saveActiveState: 例外時はfalseを返し例外を投げない', () => {
    expect(saveActiveState({ status: 'focus' })).toBe(false);
  });

  it('saveFocusSegment: 内部saveLogs失敗でも例外を投げない', () => {
    setItemSpy.mockRestore();
    setItemSpy = vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new DOMException('quota exceeded', 'QuotaExceededError');
    });
    const startedAt = new Date(2025, 0, 15, 10, 0).getTime();
    expect(saveFocusSegment('タスク', startedAt, startedAt + 60000, 60)).toBe(false);
  });
});

describe('parseActiveState (schema validation)', () => {
  it('null/undefined/非オブジェクト/配列は null を返す', () => {
    expect(parseActiveState(null)).toBeNull();
    expect(parseActiveState(undefined)).toBeNull();
    expect(parseActiveState('string')).toBeNull();
    expect(parseActiveState(42)).toBeNull();
    expect(parseActiveState([])).toBeNull();
  });

  it('未知の status は null を返す', () => {
    expect(parseActiveState({ status: 'unknown' })).toBeNull();
    expect(parseActiveState({ status: '' })).toBeNull();
    expect(parseActiveState({})).toBeNull();
  });

  it('focus: taskName が空/欠損なら null', () => {
    expect(parseActiveState({ status: 'focus', focusStartedAt: 1000 })).toBeNull();
    expect(parseActiveState({ status: 'focus', taskName: '', focusStartedAt: 1000 })).toBeNull();
    expect(parseActiveState({ status: 'focus', taskName: '   ', focusStartedAt: 1000 })).toBeNull();
  });

  it('focus: focusStartedAt が非有限/0以下なら null', () => {
    expect(parseActiveState({ status: 'focus', taskName: 'A' })).toBeNull();
    expect(parseActiveState({ status: 'focus', taskName: 'A', focusStartedAt: NaN })).toBeNull();
    expect(parseActiveState({ status: 'focus', taskName: 'A', focusStartedAt: 0 })).toBeNull();
    expect(parseActiveState({ status: 'focus', taskName: 'A', focusStartedAt: -100 })).toBeNull();
  });

  it('recovery: taskName が空/欠損なら null', () => {
    expect(parseActiveState({ status: 'recovery', pausedAt: 1000 })).toBeNull();
    expect(parseActiveState({ status: 'recovery', taskName: '', pausedAt: 1000 })).toBeNull();
  });

  it('recovery: pausedAt が非有限/0以下なら null', () => {
    expect(parseActiveState({ status: 'recovery', taskName: 'A' })).toBeNull();
    expect(parseActiveState({ status: 'recovery', taskName: 'A', pausedAt: NaN })).toBeNull();
    expect(parseActiveState({ status: 'recovery', taskName: 'A', pausedAt: -1 })).toBeNull();
  });

  it('正常な focus を {kind:"focus", ...} で返す + taskName を 200 字に切り詰める', () => {
    const long = 'A'.repeat(300);
    expect(parseActiveState({ status: 'focus', taskName: 'タスクA', focusStartedAt: 1234567890 })).toEqual({
      kind: 'focus',
      taskName: 'タスクA',
      focusStartedAt: 1234567890,
    });
    const result = parseActiveState({ status: 'focus', taskName: long, focusStartedAt: 1 });
    expect(result.taskName.length).toBe(200);
  });

  it('正常な recovery を {kind:"recovery", ...} で返す + pauseType を away/meal/空に正規化', () => {
    expect(parseActiveState({ status: 'recovery', taskName: 'A', pausedAt: 1000, pauseType: 'away' })).toEqual({
      kind: 'recovery', taskName: 'A', pausedAt: 1000, pauseType: 'away',
    });
    expect(parseActiveState({ status: 'recovery', taskName: 'A', pausedAt: 1000, pauseType: 'meal' })).toEqual({
      kind: 'recovery', taskName: 'A', pausedAt: 1000, pauseType: 'meal',
    });
    expect(parseActiveState({ status: 'recovery', taskName: 'A', pausedAt: 1000, pauseType: 'invalid' })).toEqual({
      kind: 'recovery', taskName: 'A', pausedAt: 1000, pauseType: '',
    });
    expect(parseActiveState({ status: 'recovery', taskName: 'A', pausedAt: 1000 })).toEqual({
      kind: 'recovery', taskName: 'A', pausedAt: 1000, pauseType: '',
    });
  });
});

describe('SecurityError ハンドリング on getItem (Safari private mode 等)', () => {
  let getItemSpy;

  beforeEach(() => {
    getItemSpy = vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new DOMException('access denied', 'SecurityError');
    });
  });

  afterEach(() => {
    getItemSpy.mockRestore();
  });

  it('loadLogs: SecurityError時は例外を投げず空オブジェクトを返す', () => {
    expect(() => loadLogs()).not.toThrow();
    expect(loadLogs()).toEqual({});
  });

  it('loadTasks: SecurityError時は例外を投げずデフォルト [""] を返す', () => {
    expect(() => loadTasks()).not.toThrow();
    expect(loadTasks()).toEqual(['']);
  });

  it('loadSettings: SecurityError時は例外を投げずデフォルト設定を返す', () => {
    expect(() => loadSettings()).not.toThrow();
    expect(loadSettings()).toEqual({
      milestoneEnabled: true,
      soundEnabled: true,
      themeMode: 'system',
      language: 'ja',
    });
  });
});
