import { describe, it, expect, beforeEach } from 'vitest';
import { applyTheme, getSystemThemeMedia } from '../src/theme.js';

beforeEach(() => {
  document.documentElement.dataset.themeMode = '';
  document.documentElement.dataset.theme = '';
});

describe('applyTheme', () => {
  it("applyTheme('light') で document.documentElement.dataset.themeMode === 'light'", () => {
    applyTheme('light');
    expect(document.documentElement.dataset.themeMode).toBe('light');
    expect(document.documentElement.dataset.theme).toBe('light');
  });

  it("applyTheme('dark') で dataset.themeMode === 'dark'", () => {
    applyTheme('dark');
    expect(document.documentElement.dataset.themeMode).toBe('dark');
    expect(document.documentElement.dataset.theme).toBe('dark');
  });

  it("applyTheme('system') で dataset.themeMode === 'system'", () => {
    applyTheme('system');
    expect(document.documentElement.dataset.themeMode).toBe('system');
    expect(['light', 'dark']).toContain(document.documentElement.dataset.theme);
  });
});

describe('getSystemThemeMedia', () => {
  it('MediaQueryList オブジェクト（matches プロパティを持つ）を返す', () => {
    const mql = getSystemThemeMedia();
    expect(mql).toBeDefined();
    expect(typeof mql.matches).toBe('boolean');
  });
});
