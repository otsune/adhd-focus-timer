import { describe, it, expect } from 'vitest';
import {
  getTotalFocusTime,
  getLongestFocusSegment,
  getStartCount,
  getBestSession,
  getTaskTimeRanking,
  getFirstStartTime,
  didStartInMorning,
} from '../src/stats.js';

// テスト用ヘルパー: ログエントリを生成
function makeLog(taskName, hours, minutes, seconds) {
  const startedAt = new Date(2025, 0, 15, hours, minutes).getTime();
  return {
    id: 'test-' + Math.random().toString(36).substr(2, 5),
    taskName,
    startedAt,
    endedAt: startedAt + seconds * 1000,
    seconds,
  };
}

describe('getTotalFocusTime', () => {
  it('空配列 → 0', () => {
    expect(getTotalFocusTime([])).toBe(0);
  });

  it('単一エントリ', () => {
    expect(getTotalFocusTime([makeLog('A', 9, 0, 900)])).toBe(900);
  });

  it('複数エントリの合計', () => {
    const logs = [
      makeLog('A', 9, 0, 900),
      makeLog('B', 10, 0, 1800),
      makeLog('A', 14, 0, 2700),
    ];
    expect(getTotalFocusTime(logs)).toBe(5400);
  });
});

describe('getLongestFocusSegment', () => {
  it('空配列 → 0', () => {
    expect(getLongestFocusSegment([])).toBe(0);
  });

  it('単一エントリ', () => {
    expect(getLongestFocusSegment([makeLog('A', 9, 0, 900)])).toBe(900);
  });

  it('最大値を返す', () => {
    const logs = [
      makeLog('A', 9, 0, 900),
      makeLog('B', 10, 0, 2700),
      makeLog('C', 14, 0, 1800),
    ];
    expect(getLongestFocusSegment(logs)).toBe(2700);
  });

  it('全て同じ値', () => {
    const logs = [
      makeLog('A', 9, 0, 900),
      makeLog('B', 10, 0, 900),
      makeLog('C', 11, 0, 900),
    ];
    expect(getLongestFocusSegment(logs)).toBe(900);
  });
});

describe('getStartCount', () => {
  it('空配列 → 0', () => {
    expect(getStartCount([])).toBe(0);
  });

  it('N件 → N', () => {
    const logs = [makeLog('A', 9, 0, 900), makeLog('B', 10, 0, 900), makeLog('C', 11, 0, 900)];
    expect(getStartCount(logs)).toBe(3);
  });
});

describe('getBestSession', () => {
  it('空配列 → null', () => {
    expect(getBestSession([])).toBeNull();
  });

  it('単一エントリ → そのセッション', () => {
    const result = getBestSession([makeLog('タスクA', 9, 0, 900)]);
    expect(result).toEqual({ task: 'タスクA', seconds: 900 });
  });

  it('最大secondsのセッションを返す', () => {
    const logs = [
      makeLog('タスクA', 9, 0, 900),
      makeLog('タスクB', 10, 0, 2700),
      makeLog('タスクC', 14, 0, 1800),
    ];
    expect(getBestSession(logs)).toEqual({ task: 'タスクB', seconds: 2700 });
  });

  it('同点の場合はreduceの挙動により後のエントリ', () => {
    const logs = [
      makeLog('タスクA', 9, 0, 1800),
      makeLog('タスクB', 10, 0, 1800),
    ];
    expect(getBestSession(logs)).toEqual({ task: 'タスクB', seconds: 1800 });
  });
});

describe('getTaskTimeRanking', () => {
  it('空配列 → 空配列', () => {
    expect(getTaskTimeRanking([])).toEqual([]);
  });

  it('タスクごとに合算して降順で返す', () => {
    const logs = [
      makeLog('タスクA', 9, 0, 900),
      makeLog('タスクB', 10, 0, 1800),
      makeLog('タスクA', 14, 0, 2700),
    ];

    expect(getTaskTimeRanking(logs)).toEqual([
      { task: 'タスクA', seconds: 3600 },
      { task: 'タスクB', seconds: 1800 },
    ]);
  });

  it('空の taskName は名称未設定タスクで集計する', () => {
    const logs = [
      makeLog('', 9, 0, 600),
      makeLog('', 10, 0, 1200),
    ];

    expect(getTaskTimeRanking(logs)).toEqual([
      { task: '名称未設定タスク', seconds: 1800 },
    ]);
  });
});

describe('getFirstStartTime', () => {
  it('空配列 → "—"', () => {
    expect(getFirstStartTime([])).toBe('—');
  });

  it('単一エントリ → HH:MM', () => {
    const result = getFirstStartTime([makeLog('A', 9, 5, 900)]);
    expect(result).toBe('09:05');
  });

  it('最も早いstartedAtの時刻を返す', () => {
    const logs = [
      makeLog('A', 14, 0, 900),
      makeLog('B', 9, 15, 900),
      makeLog('C', 10, 30, 900),
    ];
    expect(getFirstStartTime(logs)).toBe('09:15');
  });

  it('深夜0時', () => {
    const result = getFirstStartTime([makeLog('A', 0, 0, 900)]);
    expect(result).toBe('00:00');
  });

  it('1桁の時刻もゼロ埋め', () => {
    const result = getFirstStartTime([makeLog('A', 5, 3, 900)]);
    expect(result).toBe('05:03');
  });
});

describe('didStartInMorning', () => {
  it('空配列 → false', () => {
    expect(didStartInMorning([])).toBe(false);
  });

  it('4:00開始 → true', () => {
    expect(didStartInMorning([makeLog('A', 4, 0, 900)])).toBe(true);
  });

  it('11:59開始 → true', () => {
    expect(didStartInMorning([makeLog('A', 11, 59, 900)])).toBe(true);
  });

  it('12:00開始 → false', () => {
    expect(didStartInMorning([makeLog('A', 12, 0, 900)])).toBe(false);
  });

  it('3:59開始 → false', () => {
    expect(didStartInMorning([makeLog('A', 3, 59, 900)])).toBe(false);
  });

  it('15:00開始 → false', () => {
    expect(didStartInMorning([makeLog('A', 15, 0, 900)])).toBe(false);
  });

  it('複数ログで最も早いものが午前中 → true', () => {
    const logs = [
      makeLog('A', 14, 0, 900),
      makeLog('B', 9, 0, 1800),
    ];
    expect(didStartInMorning(logs)).toBe(true);
  });

  it('複数ログで最も早いものが午後 → false', () => {
    const logs = [
      makeLog('A', 14, 0, 900),
      makeLog('B', 13, 0, 1800),
    ];
    expect(didStartInMorning(logs)).toBe(false);
  });
});
