import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  setRecoveryCallbacks,
  getIsRecoveryMode,
  setIsRecoveryMode,
  setRecoveryState,
  clearRecoveryState,
  getLastTaskName,
  renderRecoverySection,
  exitRecovery,
} from '../src/recovery-ui.js';
import { setTasks } from '../src/tasks.js';

function setupDOM() {
  document.body.innerHTML = `
    <div id="recovery-status-banner"></div>
    <div id="recovery-resume-area"></div>
    <div id="recovery-tasks-area"></div>
    <button id="recovery-roulette-btn">ランダム</button>
    <div id="recovery-acc-value"></div>
    <div id="pause-elapsed-value">00:00</div>
    <div id="summary-modal"></div>
    <div id="summary-content"></div>
    <button id="btn-close-summary">閉じる</button>
    <button id="btn-show-summary">まとめ</button>
  `;
}

beforeEach(() => {
  setupDOM();
  clearRecoveryState();
  setTasks(['タスクA', 'タスクB']);
  setRecoveryCallbacks({ onStartFocus: null, onFlashScreen: null, onUpdateRecoveryAcc: null });
  localStorage.clear();
});

describe('getIsRecoveryMode / setIsRecoveryMode', () => {
  it('初期状態は false', () => {
    expect(getIsRecoveryMode()).toBe(false);
  });

  it('setIsRecoveryMode(true) で true になる', () => {
    setIsRecoveryMode(true);
    expect(getIsRecoveryMode()).toBe(true);
  });

  it('setIsRecoveryMode(false) で false に戻る', () => {
    setIsRecoveryMode(true);
    setIsRecoveryMode(false);
    expect(getIsRecoveryMode()).toBe(false);
  });
});

describe('setRecoveryState', () => {
  it('全フィールドを設定する', () => {
    setRecoveryState({ taskName: 'テスト', pauseType: 'away', pausedAt: 12345 });
    expect(getIsRecoveryMode()).toBe(true);
    expect(getLastTaskName()).toBe('テスト');
  });
});

describe('clearRecoveryState', () => {
  it('全フィールドをリセットする', () => {
    setRecoveryState({ taskName: 'テスト', pauseType: 'meal', pausedAt: 99999 });
    clearRecoveryState();
    expect(getIsRecoveryMode()).toBe(false);
    expect(getLastTaskName()).toBe('');
  });
});

describe('setRecoveryCallbacks', () => {
  it('コールバックを設定できる', () => {
    const onStartFocus = vi.fn();
    expect(() => setRecoveryCallbacks({ onStartFocus, onFlashScreen: null, onUpdateRecoveryAcc: null })).not.toThrow();
  });
});

describe('renderRecoverySection', () => {
  it('away モードで recovery-status-banner を更新する', () => {
    setRecoveryState({ taskName: 'テスト', pauseType: 'away', pausedAt: Date.now() });
    renderRecoverySection();
    const banner = document.getElementById('recovery-status-banner');
    expect(banner.innerText).toBeTruthy();
  });

  it('resume ボタンを生成する', () => {
    setRecoveryState({ taskName: 'タスク1', pauseType: 'away', pausedAt: Date.now() });
    renderRecoverySection();
    const resumeBtn = document.getElementById('btn-resume-last');
    expect(resumeBtn).not.toBeNull();
  });

  it('タスクボタンを生成する', () => {
    setTasks(['タスクA', 'タスクB']);
    setRecoveryState({ taskName: 'タスクA', pauseType: 'away', pausedAt: Date.now() });
    renderRecoverySection();
    const taskBtns = document.querySelectorAll('.btn-task-recovery');
    expect(taskBtns.length).toBeGreaterThan(0);
  });

  it('onUpdateRecoveryAcc コールバックを呼ぶ', () => {
    const onUpdateRecoveryAcc = vi.fn();
    setRecoveryCallbacks({ onStartFocus: null, onFlashScreen: null, onUpdateRecoveryAcc });
    setRecoveryState({ taskName: 'テスト', pauseType: 'away', pausedAt: Date.now() });
    renderRecoverySection();
    expect(onUpdateRecoveryAcc).toHaveBeenCalledOnce();
  });
});

describe('exitRecovery', () => {
  it('recovery 状態をリセットする', () => {
    setRecoveryState({ taskName: 'テスト', pauseType: 'away', pausedAt: Date.now() });
    exitRecovery();
    expect(getIsRecoveryMode()).toBe(false);
    expect(getLastTaskName()).toBe('');
  });
});
