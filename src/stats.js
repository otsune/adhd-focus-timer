/**
 * 今日のログの合計集中時間（秒）を返す
 */
export function getTotalFocusTime(todayLogs) {
  return todayLogs.reduce((sum, log) => sum + log.seconds, 0);
}

/**
 * 最長の集中区間（秒）を返す
 */
export function getLongestFocusSegment(todayLogs) {
  if (todayLogs.length === 0) return 0;
  return Math.max(...todayLogs.map(log => log.seconds));
}

/**
 * 着手回数を返す
 */
export function getStartCount(todayLogs) {
  return todayLogs.length;
}

/**
 * ベストセッション（最長のログエントリ）を返す
 */
export function getBestSession(todayLogs) {
  if (todayLogs.length === 0) return null;
  const best = todayLogs.reduce((a, b) => a.seconds > b.seconds ? a : b);
  return { task: best.taskName, seconds: best.seconds };
}

/**
 * タスク別の累積集中時間ランキングを返す
 */
export function getTaskTimeRanking(todayLogs) {
  const totals = new Map();

  for (const log of todayLogs) {
    const taskName = log.taskName || '名称未設定タスク';
    totals.set(taskName, (totals.get(taskName) || 0) + log.seconds);
  }

  return Array.from(totals.entries())
    .map(([task, seconds]) => ({ task, seconds }))
    .sort((a, b) => b.seconds - a.seconds);
}

/**
 * 最初の着手時刻を "HH:MM" 形式で返す
 */
export function getFirstStartTime(todayLogs) {
  if (todayLogs.length === 0) return '—';
  const earliest = Math.min(...todayLogs.map(log => log.startedAt));
  const d = new Date(earliest);
  return String(d.getHours()).padStart(2, '0') + ':' + String(d.getMinutes()).padStart(2, '0');
}

/**
 * 午前中（4:00-11:59）に着手したかどうかを返す
 */
export function didStartInMorning(todayLogs) {
  if (todayLogs.length === 0) return false;
  const earliest = Math.min(...todayLogs.map(log => log.startedAt));
  const h = new Date(earliest).getHours();
  return h >= 4 && h < 12;
}
