import { describe, it, expect, beforeEach, vi } from 'vitest';
import { setSummaryCallbacks, showSummary, closeSummary } from '../src/summary-ui.js';
import { getTodayKey } from '../src/date-utils.js';

function setupDOM() {
  document.body.innerHTML = `
    <div id="summary-modal"></div>
    <div id="summary-content"></div>
    <button id="btn-close-summary">閉じる</button>
    <button id="btn-show-summary">今日のまとめ</button>
  `;
}

beforeEach(() => {
  setupDOM();
  setSummaryCallbacks({ onRenderMain: null, onSwitchScreen: null, onResetRecovery: null });
  localStorage.clear();
});

describe('setSummaryCallbacks', () => {
  it('コールバックを設定できる', () => {
    const onRenderMain = vi.fn();
    expect(() => setSummaryCallbacks({ onRenderMain, onSwitchScreen: null, onResetRecovery: null })).not.toThrow();
  });
});

describe('showSummary', () => {
  it('summary-modal に active クラスを追加する', () => {
    showSummary();
    expect(document.getElementById('summary-modal').classList.contains('active')).toBe(true);
  });

  it('ログなしのとき空状態メッセージを表示する', () => {
    localStorage.clear();
    showSummary();
    const content = document.getElementById('summary-content').innerHTML;
    expect(content).toContain('summary-empty');
  });

  it('ログありのとき統計情報を表示する', () => {
    const logs = {};
    logs[getTodayKey()] = [{ taskName: 'テスト', startedAt: Date.now() - 3600000, endedAt: Date.now(), seconds: 3600 }];
    localStorage.setItem('logs_v2', JSON.stringify(logs));
    showSummary();
    const content = document.getElementById('summary-content').innerHTML;
    expect(content).toContain('summary-hero');
  });

  it('activeElement を記録する', () => {
    const btn = document.getElementById('btn-show-summary');
    btn.focus();
    showSummary();
    closeSummary();
  });
});

describe('closeSummary', () => {
  it('summary-modal から active クラスを削除する', () => {
    showSummary();
    expect(document.getElementById('summary-modal').classList.contains('active')).toBe(true);
    closeSummary();
    expect(document.getElementById('summary-modal').classList.contains('active')).toBe(false);
  });

  it('onResetRecovery コールバックを呼ぶ', () => {
    const onResetRecovery = vi.fn();
    setSummaryCallbacks({ onRenderMain: null, onSwitchScreen: null, onResetRecovery });
    showSummary();
    closeSummary();
    expect(onResetRecovery).toHaveBeenCalledOnce();
  });

  it('onRenderMain コールバックを呼ぶ', () => {
    const onRenderMain = vi.fn();
    setSummaryCallbacks({ onRenderMain, onSwitchScreen: null, onResetRecovery: null });
    showSummary();
    closeSummary();
    expect(onRenderMain).toHaveBeenCalledOnce();
  });

  it('onSwitchScreen を main-screen で呼ぶ', () => {
    const onSwitchScreen = vi.fn();
    setSummaryCallbacks({ onRenderMain: null, onSwitchScreen, onResetRecovery: null });
    showSummary();
    closeSummary();
    expect(onSwitchScreen).toHaveBeenCalledWith('main-screen');
  });
});
