import { tr } from './app-utils.js';
import { TRANSLATIONS } from './i18n.js';
import { setSetting, getSetting, updateSettings, setLastFocusedElement, getLastFocusedElement, setCurrentTrapCleanup, clearTrapCleanup } from './state.js';
import { applyTheme } from './theme.js';
import { setText, setAttr, trapFocus } from './ui.js';
import { formatElapsedTime } from './utils.js';
import { STORAGE_KEYS } from './storage.js';
import { showSummary } from './summary-ui.js';

let _setOnRenderMain = null;

export function setSettingsCallbacks({ onRenderMain }) {
  _setOnRenderMain = onRenderMain;
}

export function applyLanguage(language) {
  setSetting('language', TRANSLATIONS[language] ? language : 'ja');
  document.documentElement.lang = getSetting('language');
  applyStaticTranslations();
  if (_setOnRenderMain) _setOnRenderMain();

  if (document.getElementById('summary-modal').classList.contains('active')) {
    showSummary();
  }

  if (document.getElementById('recovery-banner').classList.contains('active')) {
    const data = localStorage.getItem(STORAGE_KEYS.activeState);
    if (data) {
      try {
        const state = JSON.parse(data);
        if (state?.status === 'focus' && state.focusStartedAt) {
          const elapsed = Math.floor((Date.now() - state.focusStartedAt) / 1000);
          document.getElementById('recovery-text').innerText = tr('recoveryBannerActive', {
            task: state.taskName,
            elapsed: formatElapsedTime(elapsed),
          });
        }
      } catch (e) { }
    }
  }

  updateFocusScreenTranslations();
}

export function applyStaticTranslations() {
  setText('btn-recovery-resume', tr('resume'));
  setText('btn-recovery-discard', tr('discard'));
  setText('btn-show-summary', tr('todaySummary'));
  setText('btn-show-settings', tr('settings'));
  setText('btn-roulette', tr('rouletteStart'));
  setText('main-acc-label', tr('accumulatedToday'));
  setText('recovery-pause-label', tr('paused'));
  setText('recovery-acc-label', tr('todayFocus'));
  setText('recovery-roulette-btn', tr('random'));
  setText('btn-finish-recovery', tr('finish'));
  setAttr('focus-timer-display', 'aria-label', tr('focusAria'));
  setText('focus-acc-label', tr('accumulatedToday'));
  setText('btn-away', tr('away'));
  setText('btn-meal', tr('meal'));
  setAttr('btn-away', 'aria-label', tr('awayAria'));
  setAttr('btn-meal', 'aria-label', tr('mealAria'));
  setAttr('btn-finish-focus', 'aria-label', tr('finishFocusAria'));
  setText('summary-modal-title', tr('todaySummary'));
  setText('btn-close-summary', tr('close'));
  setText('btn-reset-log', tr('resetLog'));
  setText('settings-modal-title', tr('settings'));
  setText('settings-theme-label', tr('theme'));
  setAttr('settings-theme-group', 'aria-label', tr('themeGroup'));
  setText('theme-option-system', tr('system'));
  setText('theme-option-light', tr('light'));
  setText('theme-option-dark', tr('dark'));
  setText('settings-language-label', tr('language'));
  setAttr('settings-language-group', 'aria-label', tr('languageGroup'));
  setText('language-option-ja', tr('japanese'));
  setText('language-option-en', tr('english'));
  setText('settings-milestone-label', tr('milestone'));
  setAttr('setting-milestone', 'aria-label', tr('milestone'));
  setText('settings-sound-label', tr('sound'));
  setAttr('setting-sound', 'aria-label', tr('sound'));
  setText('btn-save-settings', tr('saveAndClose'));
  setText('btn-export-json', tr('exportJson'));
  setText('btn-export-csv', tr('exportCsv'));
  setText('btn-export-todotxt', tr('exportTodoTxt'));
  setText('btn-import-todotxt', tr('importTodoTxt'));
}

export function updateFocusScreenTranslations() {
  setText('focus-acc-label', tr('accumulatedToday'));
  setText('btn-away', tr('away'));
  setText('btn-meal', tr('meal'));
  setText('btn-finish-focus', '■ ' + tr('finish'));
  setAttr('btn-away', 'aria-label', tr('awayAria'));
  setAttr('btn-meal', 'aria-label', tr('mealAria'));
  setAttr('btn-finish-focus', 'aria-label', tr('finishFocusAria'));
}

export function handleThemePreview() {
  const previewTheme = document.querySelector('input[name="setting-theme"]:checked')?.value || getSetting('themeMode');
  applyTheme(previewTheme);
}

export function handleLanguagePreview() {
  const previewLanguage = document.querySelector('input[name="setting-language"]:checked')?.value || getSetting('language');
  applyLanguage(previewLanguage);
}

export function showSettings() {
  setLastFocusedElement(document.activeElement);
  document.getElementById('setting-milestone').checked = getSetting('milestoneEnabled');
  document.getElementById('setting-sound').checked = getSetting('soundEnabled');
  const checkedThemeRadio = document.querySelector(`input[name="setting-theme"][value="${getSetting('themeMode')}"]`);
  if (checkedThemeRadio) checkedThemeRadio.checked = true;
  const checkedLanguageRadio = document.querySelector(`input[name="setting-language"][value="${getSetting('language')}"]`);
  if (checkedLanguageRadio) checkedLanguageRadio.checked = true;

  const settingsModal = document.getElementById('settings-modal');
  settingsModal.classList.add('active');
  setCurrentTrapCleanup(trapFocus(settingsModal));
  const firstRadio = document.querySelector('input[name="setting-theme"]:checked') || document.getElementById('setting-milestone');
  firstRadio.focus();
}

export function handleSaveSettings() {
  clearTrapCleanup();
  const newSettings = {
    milestoneEnabled: document.getElementById('setting-milestone').checked,
    soundEnabled: document.getElementById('setting-sound').checked,
    themeMode: document.querySelector('input[name="setting-theme"]:checked')?.value || 'system',
    language: document.querySelector('input[name="setting-language"]:checked')?.value || 'ja',
  };
  updateSettings(newSettings);
  applyTheme(newSettings.themeMode);
  applyLanguage(newSettings.language);
  document.getElementById('settings-modal').classList.remove('active');

  const lastFocusedElement = getLastFocusedElement();
  if (lastFocusedElement && lastFocusedElement.isConnected) {
    lastFocusedElement.focus();
  } else {
    document.getElementById('btn-show-settings').focus();
  }
  setLastFocusedElement(null);
}
