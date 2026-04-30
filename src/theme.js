import { BOUNDARY_HOUR } from './constants.js';

const systemThemeMedia = window.matchMedia('(prefers-color-scheme: light)');

export function applyTheme(mode) {
  const resolvedTheme = mode === 'system'
    ? (systemThemeMedia.matches ? 'light' : 'dark')
    : mode;

  document.documentElement.dataset.themeMode = mode;
  document.documentElement.dataset.theme = resolvedTheme;
}

export function getSystemThemeMedia() {
  return systemThemeMedia;
}