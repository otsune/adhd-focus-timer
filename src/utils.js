/**
 * 経過時間を "MM:SS" or "H:MM:SS" 形式でフォーマットする
 */
export function formatElapsedTime(totalSeconds) {
  const h = Math.floor(totalSeconds / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  const s = totalSeconds % 60;

  if (h > 0) {
    return h + ':' + String(m).padStart(2, '0') + ':' + String(s).padStart(2, '0');
  }
  return String(m).padStart(2, '0') + ':' + String(s).padStart(2, '0');
}

/**
 * 秒数を継続時間表記でフォーマットする
 */
export function formatDuration(totalSeconds, language = 'ja') {
  const h = Math.floor(totalSeconds / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  const isEnglish = language === 'en';

  if (h > 0 && m > 0) {
    return isEnglish ? `${h} hr ${m} min` : h + '時間' + m + '分';
  } else if (h > 0) {
    return isEnglish ? `${h} hr` : h + '時間';
  } else if (m > 0) {
    return isEnglish ? `${m} min` : m + '分';
  } else {
    return isEnglish ? '<1 min' : '1分未満';
  }
}

/**
 * HTMLタグをエスケープする（DOM非依存版）
 */
export function escapeHtml(text) {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}
