import { t } from './i18n.js';
import { getSetting } from './state.js';
import { formatDuration } from './utils.js';

export const tr = (key, vars = {}) => t(key, vars, getSetting('language'));
export const uiDuration = (totalSeconds) => formatDuration(totalSeconds, getSetting('language'));
