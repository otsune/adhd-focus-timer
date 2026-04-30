import { loadSettings, saveSettings, saveActiveState, clearActiveState } from './storage.js';
import {
  MAX_TASKS,
  MAX_TASK_NAME_LENGTH,
} from './constants.js';

let appInitialized = false;
let lastFocusedElement = null;
let currentTrapCleanup = null;

let settings = {
  milestoneEnabled: true,
  soundEnabled: true,
  themeMode: 'system',
  language: 'ja',
};

export function initSettings() {
  if (!appInitialized) {
    settings = loadSettings();
  }
  return settings;
}

export function getSettings() {
  return { ...settings };
}

export function updateSettings(newSettings) {
  settings = { ...settings, ...newSettings };
  saveSettings(settings);
}

export function setSetting(key, value) {
  settings[key] = value;
  saveSettings(settings);
}

export function getSetting(key) {
  return settings[key];
}

export function isAppInitialized() {
  return appInitialized;
}

export function setAppInitialized(value) {
  appInitialized = value;
}

export function getLastFocusedElement() {
  return lastFocusedElement;
}

export function setLastFocusedElement(el) {
  lastFocusedElement = el;
}

export function getCurrentTrapCleanup() {
  return currentTrapCleanup;
}

export function setCurrentTrapCleanup(fn) {
  currentTrapCleanup = fn;
}

export function clearTrapCleanup() {
  if (currentTrapCleanup) {
    currentTrapCleanup();
    currentTrapCleanup = null;
  }
}