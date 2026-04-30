import {
  TIMER_INTERVAL_MS,
  PAUSE_WARNING_SECONDS,
} from './constants.js';
import { getNext4AM } from './date-utils.js';
import { saveFocusSegment, invalidateFocusTimeCache } from './storage.js';

let focusIntervalId = null;
let focusSegmentStartedAt = null;
let currentTaskName = '';
let lastNotifiedMilestone = 0;
let onTickCallback = null;
let onMidnightCallback = null;

export function startFocusTimer(taskName, startTime, tickFn, midnightFn) {
  currentTaskName = taskName;
  focusSegmentStartedAt = startTime || Date.now();
  lastNotifiedMilestone = 0;
  onTickCallback = tickFn;
  onMidnightCallback = midnightFn;
  
  focusIntervalId = setInterval(tickFocusTimer, TIMER_INTERVAL_MS);
}

export function stopFocusTimer() {
  if (focusIntervalId) {
    clearInterval(focusIntervalId);
    focusIntervalId = null;
  }
}

export function getFocusElapsed() {
  if (!focusSegmentStartedAt) return 0;
  return Math.floor((Date.now() - focusSegmentStartedAt) / 1000);
}

export function getFocusStartTime() {
  return focusSegmentStartedAt;
}

export function getCurrentTaskName() {
  return currentTaskName;
}

export function getLastMilestone() {
  return lastNotifiedMilestone;
}

export function setLastMilestone(value) {
  lastNotifiedMilestone = value;
}

export function isTimerRunning() {
  return focusIntervalId !== null;
}

function tickFocusTimer() {
  const now = Date.now();
  
  if (now >= getNext4AM(focusSegmentStartedAt)) {
    const next4AM = getNext4AM(focusSegmentStartedAt);
    const splitSeconds = Math.round((next4AM - focusSegmentStartedAt) / 1000);
    saveFocusSegment(currentTaskName, focusSegmentStartedAt, next4AM, splitSeconds);
    focusSegmentStartedAt = next4AM;
    lastNotifiedMilestone = 0;
    invalidateFocusTimeCache();
    
    if (onMidnightCallback) {
      onMidnightCallback();
    }
  }
  
  const elapsed = Math.floor((now - focusSegmentStartedAt) / 1000);
  
  if (onTickCallback) {
    onTickCallback(elapsed);
  }
}

export function getPauseElapsed() {
  return Math.floor((Date.now() - pausedAt) / 1000);
}

let pausedAt = null;
let pauseIntervalId = null;
let onPauseTickCallback = null;
let onPauseWarningCallback = null;

export function startPauseTimer(startTime, tickFn, warningFn) {
  pausedAt = startTime || Date.now();
  onPauseTickCallback = tickFn;
  onPauseWarningCallback = warningFn;
  
  pauseIntervalId = setInterval(tickPauseTimer, TIMER_INTERVAL_MS);
  tickPauseTimer();
}

export function stopPauseTimer() {
  if (pauseIntervalId) {
    clearInterval(pauseIntervalId);
    pauseIntervalId = null;
  }
  pausedAt = null;
}

function tickPauseTimer() {
  if (!pausedAt) return;
  
  const elapsed = Math.floor((Date.now() - pausedAt) / 1000);
  
  if (onPauseTickCallback) {
    onPauseTickCallback(elapsed);
  }
  
  if (elapsed >= PAUSE_WARNING_SECONDS) {
    if (onPauseWarningCallback) {
      onPauseWarningCallback();
    }
  }
}