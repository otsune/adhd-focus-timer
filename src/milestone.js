export const MILESTONE_INTERVAL = 15 * 60; // 15分（秒）

/**
 * マイルストーン判定を行い、アクション記述を返す純粋関数
 *
 * @param {number} elapsedSeconds - セッション開始からの経過秒数
 * @param {number} lastNotifiedMilestone - 最後に通知した節目（秒）
 * @returns {null|{type: 'flash_chime', newLastNotified: number}|{type: 'sound_message', message: string, newLastNotified: number}}
 */
export function getMilestoneAction(elapsedSeconds, lastNotifiedMilestone) {
  const currentMilestone = Math.floor(elapsedSeconds / MILESTONE_INTERVAL) * MILESTONE_INTERVAL;

  if (currentMilestone > 0 && currentMilestone > lastNotifiedMilestone) {
    const milestoneMinutes = currentMilestone / 60;
    const milestoneIndex = currentMilestone / MILESTONE_INTERVAL; // 1, 2, 3, 4...

    if (milestoneIndex % 2 === 1) {
      // 奇数 (15, 45, 75, 105...): 赤フラッシュ＋チャイム音
      return { type: 'flash_chime', newLastNotified: currentMilestone };
    } else {
      // 偶数 (30, 60, 90, 120...): 音＋文言
      return { type: 'sound_message', message: milestoneMinutes + '分経過', newLastNotified: currentMilestone };
    }
  }

  return null;
}
