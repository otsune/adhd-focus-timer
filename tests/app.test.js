import { describe, it, expect, beforeEach, vi } from 'vitest';

function setAppFixture() {
  document.body.innerHTML = `
    <div id="flash-overlay" aria-hidden="true"></div>
    <div id="milestone-message" role="status" aria-live="polite" aria-atomic="true"></div>
    <div id="undo-toast" role="alert" aria-live="assertive" aria-atomic="true">
      <span id="undo-toast-text"></span>
      <button id="undo-toast-btn">元に戻す</button>
    </div>
    <div id="recovery-banner" role="alert" aria-live="polite">
      <span class="recovery-text" id="recovery-text"></span>
      <button id="btn-recovery-resume">再開</button>
      <button id="btn-recovery-discard">破棄</button>
    </div>
    <div id="main-screen" class="screen active">
      <div id="normal-section">
        <div class="grid-container" id="task-slots"></div>
        <button id="btn-add-task">＋ タスクを追加</button>
        <button id="btn-show-summary">📊 今日の成果</button>
        <button id="btn-show-settings">⚙️ 設定</button>
        <button id="btn-roulette">決められない時（開始）</button>
        <div id="main-accumulated-display">
          <span id="main-acc-label">今日の累積集中</span><span id="main-acc-value-display">—</span>
        </div>
      </div>
      <div id="recovery-section" style="display:none">
        <div id="recovery-header">
          <div id="recovery-pause-elapsed"><span id="recovery-pause-label">中断中</span><span id="pause-elapsed-value">00:00</span></div>
          <div id="recovery-today-acc"><span id="recovery-acc-label">今日の集中</span><span id="recovery-acc-value">—</span></div>
        </div>
        <div id="recovery-status-banner" aria-live="polite"></div>
        <div id="recovery-resume-area"></div>
        <div id="recovery-tasks-area"></div>
        <button id="recovery-roulette-btn">ランダム</button>
        <button id="btn-finish-recovery">終了</button>
      </div>
    </div>
    <div id="focus-screen" class="screen">
      <div id="focus-task-display">タスク名</div>
      <div id="focus-timer-display" tabindex="-1" role="timer" aria-label="集中時間">00:00</div>
      <div id="focus-accumulated-display"><span id="focus-acc-label">今日の累積集中</span><span id="focus-acc-value-display">—</span></div>
      <button id="btn-away" aria-label="一時中断: 離席">離席</button>
      <button id="btn-meal" aria-label="一時中断: 食事">食事</button>
      <button id="btn-finish-focus" aria-label="集中を終了">■ 終了</button>
    </div>
    <div id="summary-modal" role="dialog" aria-modal="true" aria-labelledby="summary-modal-title">
      <h2 id="summary-modal-title">📊 今日の成果</h2>
      <div id="summary-content"></div>
      <button id="btn-close-summary">閉じる</button>
      <button id="btn-reset-log">ログをリセット</button>
    </div>
    <div id="settings-modal" role="dialog" aria-modal="true" aria-labelledby="settings-modal-title">
      <h2 id="settings-modal-title">⚙️ 設定</h2>
      <span id="settings-theme-label">テーマ</span>
      <div role="radiogroup" aria-label="テーマ" id="settings-theme-group">
        <label><input type="radio" name="setting-theme" value="system" checked><span id="theme-option-system">システム</span></label>
        <label><input type="radio" name="setting-theme" value="light"><span id="theme-option-light">ライト</span></label>
        <label><input type="radio" name="setting-theme" value="dark"><span id="theme-option-dark">ダーク</span></label>
      </div>
      <span id="settings-language-label">言語</span>
      <div role="radiogroup" aria-label="言語" id="settings-language-group">
        <label><input type="radio" name="setting-language" value="ja" checked><span id="language-option-ja">日本語</span></label>
        <label><input type="radio" name="setting-language" value="en"><span id="language-option-en">English</span></label>
      </div>
      <span id="settings-milestone-label">節目通知</span><input type="checkbox" id="setting-milestone" checked aria-label="節目通知">
      <span id="settings-sound-label">音通知</span><input type="checkbox" id="setting-sound" checked aria-label="音通知">
      <button id="btn-save-settings">保存して閉じる</button>
      <button id="btn-export-json">📥 JSON エクスポート</button>
      <button id="btn-export-csv">📥 CSV エクスポート</button>
      <button id="btn-export-todotxt">📥 todo.txt エクスポート</button>
      <button id="btn-import-todotxt">📤 todo.txt インポート</button>
      <input type="file" id="input-import-todotxt" accept=".txt,.todo.txt,text/plain" hidden>
    </div>
  `;
}

beforeEach(() => {
  vi.resetModules();
  localStorage.clear();
  window.history.replaceState(null, '', '/');
  setAppFixture();
});

describe('app smoke', () => {
  it('initApp を import して実行しても throw せず main-screen が存在する', async () => {
    const { initApp } = await import('../src/app.js');

    expect(() => initApp()).not.toThrow();
    expect(document.querySelector('#main-screen')).not.toBeNull();
  });
});
