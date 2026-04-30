import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import {
  setFocusSessionCallbacks,
  getCachedTodayFocusTime,
  flashScreen,
  showMilestoneMessage,
  handleFocusMilestone,
  handleFocusTimerTick,
  updateFocusAccumulatedDisplay,
  updateMainAccumulatedDisplay,
  updateRecoveryAccumulatedDisplay,
  checkActiveState,
} from '../src/focus-session.js';
import { initSettings } from '../src/state.js';
import { getTodayKey } from '../src/date-utils.js';

function setupDOM() {
  document.body.innerHTML = `
    <div id="flash-overlay"></div>
    <div id="milestone-message"></div>
    <div id="focus-timer-display">00:00</div>
    <div id="focus-acc-value-display"></div>
    <div id="main-acc-value-display"></div>
    <div id="recovery-acc-value"></div>
    <div id="focus-task-display"></div>
    <div id="recovery-banner"></div>
    <div id="recovery-text"></div>
    <button id="btn-recovery-resume"></button>
    <button id="btn-recovery-discard"></button>
    <div id="normal-section" style="display:"></div>
    <div id="recovery-section" style="display:none"></div>
    <div id="task-slots"></div>
    <button id="btn-add-task">追加</button>
  `;
}

beforeEach(() => {
  setupDOM();
  initSettings();
  setFocusSessionCallbacks({ onSwitchScreen: null, onClearAllIntervals: null, onRenderMain: null });
  localStorage.clear();
  vi.useFakeTimers();
});

afterEach(() => {
  vi.useRealTimers();
});

describe('setFocusSessionCallbacks', () => {
  it('コールバックを設定できる', () => {
    const onSwitchScreen = vi.fn();
    expect(() => setFocusSessionCallbacks({ onSwitchScreen, onClearAllIntervals: null, onRenderMain: null })).not.toThrow();
  });
});

describe('getCachedTodayFocusTime', () => {
  it('ログなしのとき 0 を返す', () => {
    localStorage.clear();
    const result = getCachedTodayFocusTime();
    expect(result).toBe(0);
  });

  it('ログありのとき累積時間を返す', () => {
    const today = getTodayKey();
    const logs = {};
    logs[today] = [{ taskName: 'テスト', startedAt: Date.now() - 3600000, endedAt: Date.now(), seconds: 3600 }];
    localStorage.setItem('logs_v2', JSON.stringify(logs));
    window.dispatchEvent(new CustomEvent('focus-time-cache-invalidated'));
    const result = getCachedTodayFocusTime();
    expect(result).toBe(3600);
  });
});

describe('flashScreen', () => {
  it('flash-overlay に flash-red クラスを追加する', () => {
    flashScreen();
    const overlay = document.getElementById('flash-overlay');
    expect(overlay.classList.contains('flash-red')).toBe(true);
  });

  it('FLASH_DURATION_MS 後にクラスを削除する', () => {
    flashScreen();
    vi.advanceTimersByTime(2000);
    const overlay = document.getElementById('flash-overlay');
    expect(overlay.classList.contains('flash-red')).toBe(false);
  });
});

describe('showMilestoneMessage', () => {
  it('メッセージを表示する', () => {
    showMilestoneMessage('テストメッセージ');
    const el = document.getElementById('milestone-message');
    expect(el.classList.contains('show')).toBe(true);
    expect(el.innerText).toBe('テストメッセージ');
  });

  it('MILESTONE_MESSAGE_DURATION_MS 後に非表示になる', () => {
    showMilestoneMessage('テスト');
    vi.advanceTimersByTime(4000);
    const el = document.getElementById('milestone-message');
    expect(el.classList.contains('show')).toBe(false);
  });
});

describe('handleFocusMilestone', () => {
  it('マイルストーン以前は何もしない', () => {
    const flashSpy = vi.spyOn(document.getElementById('flash-overlay').classList, 'add');
    handleFocusMilestone(60);
    expect(flashSpy).not.toHaveBeenCalled();
    flashSpy.mockRestore();
  });
});

describe('handleFocusTimerTick', () => {
  it('focus-timer-display を更新する', () => {
    handleFocusTimerTick(65);
    const display = document.getElementById('focus-timer-display');
    expect(display.innerText).toBe('01:05');
  });

  it('focus-acc-value-display を更新する', () => {
    handleFocusTimerTick(0);
    const display = document.getElementById('focus-acc-value-display');
    expect(display.innerText).toBeTruthy();
  });
});

describe('updateFocusAccumulatedDisplay', () => {
  it('focus-acc-value-display を更新する', () => {
    updateFocusAccumulatedDisplay(0);
    const el = document.getElementById('focus-acc-value-display');
    expect(el).not.toBeNull();
  });

  it('要素がなくてもエラーにならない', () => {
    document.getElementById('focus-acc-value-display').remove();
    expect(() => updateFocusAccumulatedDisplay(0)).not.toThrow();
  });
});

describe('updateMainAccumulatedDisplay', () => {
  it('main-acc-value-display を更新する', () => {
    expect(() => updateMainAccumulatedDisplay()).not.toThrow();
  });
});

describe('updateRecoveryAccumulatedDisplay', () => {
  it('recovery-acc-value を更新する', () => {
    expect(() => updateRecoveryAccumulatedDisplay()).not.toThrow();
  });
});

describe('checkActiveState', () => {
  it('ストレージが空のとき何もしない', () => {
    localStorage.clear();
    expect(() => checkActiveState()).not.toThrow();
  });

  it('無効な JSON のときエラーにならない', () => {
    localStorage.setItem('active_state_v2', 'invalid-json');
    expect(() => checkActiveState()).not.toThrow();
  });
});
