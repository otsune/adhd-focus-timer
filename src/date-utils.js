/**
 * タイムスタンプから日付キー (YYYY-MM-DD) を返す
 * 午前4時を1日の境界とする（4時前は前日扱い）
 */
export function getDayKey(date) {
  const d = new Date(date);
  if (d.getHours() < 4) {
    d.setDate(d.getDate() - 1);
  }
  return d.getFullYear() + '-'
    + String(d.getMonth() + 1).padStart(2, '0') + '-'
    + String(d.getDate()).padStart(2, '0');
}

/**
 * 今日の日付キーを返す
 */
export function getTodayKey() {
  return getDayKey(new Date());
}

/**
 * 指定時刻以降の次の午前4:00のタイムスタンプを返す
 */
export function getNext4AM(fromTimestamp) {
  const d = new Date(fromTimestamp);
  const target = new Date(d.getFullYear(), d.getMonth(), d.getDate(), 4, 0, 0, 0);
  if (d >= target) {
    target.setDate(target.getDate() + 1);
  }
  return target.getTime();
}
