import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  startFocusTimer,
  stopFocusTimer,
  isTimerRunning,
  getFocusElapsed,
  getCurrentTaskName,
  getLastMilestone,
  setLastMilestone,
  startPauseTimer,
  stopPauseTimer,
} from '../src/timer.js';

beforeEach(() => {
  vi.useFakeTimers();
  localStorage.clear();
  stopFocusTimer();
  stopPauseTimer();
});

afterEach(() => {
  stopFocusTimer();
  stopPauseTimer();
  vi.useRealTimers();
});

describe('focus timer', () => {
  it('startFocusTimer 開始後 isTimerRunning が true を返す', () => {
    const startTime = new Date(2025, 0, 15, 10, 0, 0).getTime();
    vi.setSystemTime(startTime);

    startFocusTimer('TaskA', startTime, vi.fn(), vi.fn());

    expect(isTimerRunning()).toBe(true);
  });

  it('1秒進めると tickFn が経過秒で呼ばれる', () => {
    const startTime = new Date(2025, 0, 15, 10, 0, 0).getTime();
    const tickFn = vi.fn();
    vi.setSystemTime(startTime);

    startFocusTimer('TaskA', startTime, tickFn, vi.fn());
    vi.advanceTimersByTime(1000);

    expect(tickFn).toHaveBeenCalledWith(1);
  });

  it('getFocusElapsed が経過秒を返す', () => {
    const startTime = new Date(2025, 0, 15, 10, 0, 0).getTime();
    vi.setSystemTime(startTime);

    startFocusTimer('TaskA', startTime, vi.fn(), vi.fn());
    vi.setSystemTime(startTime + 12_000);

    expect(getFocusElapsed()).toBe(12);
  });

  it('getCurrentTaskName が現在のタスク名を返す', () => {
    const startTime = new Date(2025, 0, 15, 10, 0, 0).getTime();
    vi.setSystemTime(startTime);

    startFocusTimer('TaskA', startTime, vi.fn(), vi.fn());

    expect(getCurrentTaskName()).toBe('TaskA');
  });

  it('stopFocusTimer 後 isTimerRunning が false を返す', () => {
    const startTime = new Date(2025, 0, 15, 10, 0, 0).getTime();
    vi.setSystemTime(startTime);

    startFocusTimer('TaskA', startTime, vi.fn(), vi.fn());
    stopFocusTimer();

    expect(isTimerRunning()).toBe(false);
  });

  it('4時境界を跨ぐと midnightFn が呼ばれる', () => {
    const startTime = new Date(2025, 0, 15, 3, 59, 59).getTime();
    const midnightFn = vi.fn();
    vi.setSystemTime(startTime);

    startFocusTimer('TaskA', startTime, vi.fn(), midnightFn);
    vi.advanceTimersByTime(1000);

    expect(midnightFn).toHaveBeenCalledTimes(1);
  });

  it('startPauseTimer で休憩タイマーが tickFn を呼ぶ', () => {
    const startTime = new Date(2025, 0, 15, 12, 0, 0).getTime();
    const tickFn = vi.fn();
    vi.setSystemTime(startTime);

    startPauseTimer(startTime, tickFn, vi.fn());
    vi.advanceTimersByTime(1000);

    expect(tickFn).toHaveBeenLastCalledWith(1);
  });

  it('setLastMilestone で節目値を保持する', () => {
    setLastMilestone(15);

    expect(getLastMilestone()).toBe(15);
  });
});
