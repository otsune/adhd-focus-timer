import { tr, uiDuration } from './app-utils.js';
import { setLastFocusedElement, getLastFocusedElement, setCurrentTrapCleanup, clearTrapCleanup } from './state.js';
import { trapFocus } from './ui.js';
import { getTodayKey } from './date-utils.js';
import { loadLogs } from './storage.js';
import { getTotalFocusTime, getLongestFocusSegment, getStartCount, getBestSession, getTaskTimeRanking, getFirstStartTime, didStartInMorning } from './stats.js';
import { escapeHtml } from './utils.js';

let _sumOnRenderMain = null;
let _sumOnSwitchScreen = null;
let _sumOnResetRecovery = null;

export function setSummaryCallbacks({ onRenderMain, onSwitchScreen, onResetRecovery }) {
  _sumOnRenderMain = onRenderMain;
  _sumOnSwitchScreen = onSwitchScreen;
  _sumOnResetRecovery = onResetRecovery;
}

function _getSummaryLogs() {
  const logs = loadLogs();
  const todayKey = getTodayKey();
  return logs[todayKey] || [];
}

export function showSummary() {
  setLastFocusedElement(document.activeElement);
  const todayLogs = _getSummaryLogs();
  const container = document.getElementById('summary-content');

  if (todayLogs.length === 0) {
    container.innerHTML = '<div class="summary-empty">' + tr('summaryEmpty') + '</div>';
  } else {
    const totalSeconds = getTotalFocusTime(todayLogs);
    const longestSeconds = getLongestFocusSegment(todayLogs);
    const startCount = getStartCount(todayLogs);
    const bestSession = getBestSession(todayLogs);
    const taskRanking = getTaskTimeRanking(todayLogs);
    const firstStartTime = getFirstStartTime(todayLogs);
    const inMorning = didStartInMorning(todayLogs);

    let html = '';
    html += '<div class="summary-hero">';
    html += '<div class="summary-hero-label">' + tr('summaryHero') + '</div>';
    html += '<div class="summary-hero-value">' + uiDuration(totalSeconds) + '</div>';
    html += '</div>';

    html += '<div class="summary-stats">';
    html += '<div class="summary-stat-card"><div class="summary-stat-label">' + tr('summaryFirstStart') + '</div><div class="summary-stat-value">' + firstStartTime + '</div></div>';
    html += '<div class="summary-stat-card"><div class="summary-stat-label">' + tr('summaryMorningStart') + '</div><div class="summary-stat-value ' + (inMorning ? 'summary-stat-success' : 'summary-stat-muted') + '">' + (inMorning ? tr('summaryMorningDone') : tr('summaryMorningMiss')) + '</div></div>';
    html += '<div class="summary-stat-card"><div class="summary-stat-label">' + tr('summaryLongest') + '</div><div class="summary-stat-value">' + uiDuration(longestSeconds) + '</div></div>';
    html += '<div class="summary-stat-card"><div class="summary-stat-label">' + tr('summaryStartCount') + '</div><div class="summary-stat-value">' + tr('summaryStartCountValue', { count: startCount }) + '</div></div>';
    html += '</div>';

    if (bestSession) {
      html += '<div class="summary-section">';
      html += '<div class="summary-section-title">' + tr('summaryBestSession') + '</div>';
      html += '<div class="best-session-display">';
      html += '<span class="task-name">' + escapeHtml(bestSession.task) + '</span> ';
      html += uiDuration(bestSession.seconds);
      html += '</div></div>';
    }

    if (taskRanking.length > 0) {
      html += '<div class="summary-section">';
      html += '<div class="summary-section-title">' + tr('summaryTaskRanking') + '</div>';
      taskRanking.forEach((item, index) => {
        const medals = ['🥇', '🥈', '🥉'];
        const position = index < medals.length ? medals[index] : String(index + 1) + '.';
        html += '<div class="ranking-row">';
        html += '<span class="ranking-position">' + position + '</span>';
        html += '<span class="ranking-task">' + escapeHtml(item.task) + '</span>';
        html += '<span class="ranking-time">' + uiDuration(item.seconds) + '</span>';
        html += '</div>';
      });
      html += '</div>';
    }

    container.innerHTML = html;
  }

  const summaryModal = document.getElementById('summary-modal');
  summaryModal.classList.add('active');
  setCurrentTrapCleanup(trapFocus(summaryModal));
  document.getElementById('btn-close-summary').focus();
}

export function closeSummary() {
  clearTrapCleanup();
  document.getElementById('summary-modal').classList.remove('active');
  if (_sumOnResetRecovery) _sumOnResetRecovery();
  if (_sumOnRenderMain) _sumOnRenderMain();
  if (_sumOnSwitchScreen) _sumOnSwitchScreen('main-screen');

  const lastFocusedElement = getLastFocusedElement();
  if (lastFocusedElement && lastFocusedElement.isConnected) {
    lastFocusedElement.focus();
  } else {
    document.getElementById('btn-show-summary').focus();
  }
  setLastFocusedElement(null);
}
