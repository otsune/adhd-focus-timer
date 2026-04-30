import { describe, it, expect, beforeEach, vi } from 'vitest';

let state;

beforeEach(async () => {
  localStorage.clear();
  vi.resetModules();
  state = await import('../src/state.js');
});

describe('initSettings + getSettings', () => {
  it('initSettings() 後 getSettings() でデフォルト設定が返る', () => {
    state.initSettings();
    expect(state.getSettings()).toEqual({
      milestoneEnabled: true,
      soundEnabled: true,
      themeMode: 'system',
      language: 'ja',
    });
  });
});

describe('updateSettings', () => {
  it("updateSettings({ language: 'en' }) 後、getSetting('language') === 'en'", () => {
    state.initSettings();
    state.updateSettings({ language: 'en' });
    expect(state.getSetting('language')).toBe('en');
  });
});

describe('setSetting', () => {
  it("setSetting('themeMode', 'dark') 後、永続化される", () => {
    state.initSettings();
    state.setSetting('themeMode', 'dark');
    const stored = JSON.parse(localStorage.getItem('settings_v2'));
    expect(stored.themeMode).toBe('dark');
  });
});

describe('appInitialized', () => {
  it('setAppInitialized(true) 後、isAppInitialized() === true', () => {
    expect(state.isAppInitialized()).toBe(false);
    state.setAppInitialized(true);
    expect(state.isAppInitialized()).toBe(true);
  });
});

describe('lastFocusedElement', () => {
  it('setLastFocusedElement(el) + getLastFocusedElement() でラウンドトリップ', () => {
    const el = document.createElement('button');
    state.setLastFocusedElement(el);
    expect(state.getLastFocusedElement()).toBe(el);
  });
});

describe('clearTrapCleanup', () => {
  it('setCurrentTrapCleanup(fn) + clearTrapCleanup() で fn 実行 + null クリア', () => {
    let callCount = 0;
    const fn = () => { callCount++; };
    state.setCurrentTrapCleanup(fn);
    expect(state.getCurrentTrapCleanup()).toBe(fn);
    state.clearTrapCleanup();
    expect(callCount).toBe(1);
    expect(state.getCurrentTrapCleanup()).toBeNull();
  });
});
