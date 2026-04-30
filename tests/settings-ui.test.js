import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  setSettingsCallbacks,
  applyLanguage,
  applyStaticTranslations,
  updateFocusScreenTranslations,
  handleThemePreview,
  handleLanguagePreview,
  showSettings,
  handleSaveSettings,
} from '../src/settings-ui.js';
import { initSettings, getSetting } from '../src/state.js';

function setupDOM() {
  document.body.innerHTML = `
    <button id="btn-recovery-resume">Resume</button>
    <button id="btn-recovery-discard">Discard</button>
    <button id="btn-show-summary">Summary</button>
    <button id="btn-show-settings">Settings</button>
    <button id="btn-roulette">Roulette</button>
    <span id="main-acc-label"></span>
    <span id="recovery-pause-label"></span>
    <span id="recovery-acc-label"></span>
    <button id="recovery-roulette-btn"></button>
    <button id="btn-finish-recovery"></button>
    <div id="focus-timer-display"></div>
    <span id="focus-acc-label"></span>
    <button id="btn-away">離席</button>
    <button id="btn-meal">食事</button>
    <button id="btn-finish-focus">■ 終了</button>
    <span id="summary-modal-title"></span>
    <button id="btn-close-summary"></button>
    <button id="btn-reset-log"></button>
    <span id="settings-modal-title"></span>
    <span id="settings-theme-label"></span>
    <div id="settings-theme-group"></div>
    <span id="theme-option-system"></span>
    <span id="theme-option-light"></span>
    <span id="theme-option-dark"></span>
    <span id="settings-language-label"></span>
    <div id="settings-language-group"></div>
    <span id="language-option-ja"></span>
    <span id="language-option-en"></span>
    <span id="settings-milestone-label"></span>
    <input id="setting-milestone" type="checkbox" />
    <span id="settings-sound-label"></span>
    <input id="setting-sound" type="checkbox" />
    <button id="btn-save-settings"></button>
    <button id="btn-export-json"></button>
    <button id="btn-export-csv"></button>
    <button id="btn-export-todotxt"></button>
    <button id="btn-import-todotxt"></button>
    <div id="settings-modal"></div>
    <div id="summary-modal"></div>
    <div id="recovery-banner"></div>
    <input type="radio" name="setting-theme" value="system" checked />
    <input type="radio" name="setting-theme" value="light" />
    <input type="radio" name="setting-theme" value="dark" />
    <input type="radio" name="setting-language" value="ja" checked />
    <input type="radio" name="setting-language" value="en" />
    <div id="summary-content"></div>
    <button id="btn-close-summary">閉じる</button>
    <button id="btn-show-summary">まとめ</button>
  `;
}

beforeEach(() => {
  setupDOM();
  initSettings();
  setSettingsCallbacks({ onRenderMain: null });
  localStorage.clear();
});

describe('setSettingsCallbacks', () => {
  it('コールバックを設定できる', () => {
    const onRenderMain = vi.fn();
    expect(() => setSettingsCallbacks({ onRenderMain })).not.toThrow();
  });
});

describe('applyStaticTranslations', () => {
  it('設定ボタンのテキストを設定する', () => {
    applyStaticTranslations();
    const btn = document.getElementById('btn-show-settings');
    expect(btn.textContent).toBeTruthy();
  });

  it('エラーにならない', () => {
    expect(() => applyStaticTranslations()).not.toThrow();
  });
});

describe('applyLanguage', () => {
  it('言語設定を更新する', () => {
    applyLanguage('ja');
    expect(getSetting('language')).toBe('ja');
  });

  it('無効な言語の場合は ja にフォールバックする', () => {
    applyLanguage('invalid-lang');
    expect(getSetting('language')).toBe('ja');
  });

  it('英語を設定できる', () => {
    applyLanguage('en');
    expect(getSetting('language')).toBe('en');
  });

  it('onRenderMain コールバックを呼ぶ', () => {
    const onRenderMain = vi.fn();
    setSettingsCallbacks({ onRenderMain });
    applyLanguage('ja');
    expect(onRenderMain).toHaveBeenCalledOnce();
  });
});

describe('updateFocusScreenTranslations', () => {
  it('フォーカス画面の翻訳を更新する', () => {
    expect(() => updateFocusScreenTranslations()).not.toThrow();
    const finishBtn = document.getElementById('btn-finish-focus');
    expect(finishBtn.textContent).toBeTruthy();
  });
});

describe('handleThemePreview', () => {
  it('エラーにならない', () => {
    expect(() => handleThemePreview()).not.toThrow();
  });
});

describe('showSettings', () => {
  it('settings-modal に active クラスを追加する', () => {
    showSettings();
    expect(document.getElementById('settings-modal').classList.contains('active')).toBe(true);
  });
});

describe('handleSaveSettings', () => {
  it('settings-modal から active クラスを削除する', () => {
    showSettings();
    handleSaveSettings();
    expect(document.getElementById('settings-modal').classList.contains('active')).toBe(false);
  });

  it('設定を保存する', () => {
    showSettings();
    handleSaveSettings();
    expect(getSetting('language')).toBeTruthy();
  });
});
