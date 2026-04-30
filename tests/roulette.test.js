import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { setRouletteCallbacks, clearRouletteInterval, startRoulette } from '../src/roulette.js';
import { setTasks } from '../src/tasks.js';

function setupDOM() {
  document.body.innerHTML = `
    <button id="btn-roulette">ルーレット</button>
    <button id="recovery-roulette-btn">ランダム</button>
  `;
}

beforeEach(() => {
  setupDOM();
  setTasks(['タスクA', 'タスクB', 'タスクC']);
  clearRouletteInterval();
  setRouletteCallbacks({ onStartFocus: null, getIsRecoveryMode: () => false });
  vi.useFakeTimers();
});

afterEach(() => {
  vi.useRealTimers();
});

describe('setRouletteCallbacks', () => {
  it('コールバックを設定できる', () => {
    const mockFn = vi.fn();
    setRouletteCallbacks({ onStartFocus: mockFn, getIsRecoveryMode: () => false });
    expect(typeof mockFn).toBe('function');
  });
});

describe('clearRouletteInterval', () => {
  it('インターバルがないときもエラーにならない', () => {
    expect(() => clearRouletteInterval()).not.toThrow();
  });
});

describe('startRoulette', () => {
  it('有効タスクがゼロのとき alert を呼ぶ', () => {
    setTasks(['']);
    const alertMock = vi.spyOn(window, 'alert').mockImplementation(() => {});
    startRoulette();
    expect(alertMock).toHaveBeenCalledOnce();
    alertMock.mockRestore();
  });

  it('有効タスクがあるときボタンを無効化する', () => {
    setTasks(['タスクA', 'タスクB']);
    startRoulette();
    const btn = document.getElementById('btn-roulette');
    expect(btn.disabled).toBe(true);
  });

  it('ルーレット完了後に onStartFocus コールバックを呼ぶ', () => {
    const onStartFocus = vi.fn();
    setRouletteCallbacks({ onStartFocus, getIsRecoveryMode: () => false });
    setTasks(['タスクA', 'タスクB']);
    startRoulette();
    vi.advanceTimersByTime(5000);
    expect(onStartFocus).toHaveBeenCalledOnce();
  });

  it('リカバリーモード中は recovery-roulette-btn を使用する', () => {
    setRouletteCallbacks({ onStartFocus: vi.fn(), getIsRecoveryMode: () => true });
    setTasks(['タスクA', 'タスクB']);
    startRoulette();
    const recBtn = document.getElementById('recovery-roulette-btn');
    expect(recBtn.disabled).toBe(true);
  });
});
