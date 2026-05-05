/**
 * E2E Test: 07-state-persistence
 * 
 * 状態永続化テスト - ブラウザ再読み込み後の状態復元が正しく動作することを確認
 */

import * as browser from '../helpers/browser.js';

export async function run() {
  const test = new browser.TestRunner('07-state-persistence');
  
  console.log('\n=== 07-state-persistence: 状態永続化テスト ===\n');

  // === シナリオA: 集中中の状態復元 ===
  console.log('  [シナリオA: 集中中の状態復元]');

  browser.resetStorage();
  await browser.reload();
  browser.overrideDialogs();

  // タスクを入力して開始
  browser.evaluate(`
    const input = document.querySelector('.task-slot input');
    input.value = '永続化テストタスク';
    input.dispatchEvent(new Event('input', { bubbles: true }));
  `);
  browser.evaluate("document.querySelector('.btn-start-direct').click()");

  // 少し待機
  await browser.waitForVisible('#focus-screen');

  // 集中中であることを確認
  const focusScreenVisible = browser.isVisible('#focus-screen');
  test.assert(focusScreenVisible, '集中画面が表示されている');

  // ページをリロード
  await browser.reload();
  await browser.waitForCondition(
    () => {
      const bannerActive = browser.evaluate(
        "document.getElementById('recovery-banner')?.classList.contains('active') || false"
      );
      return bannerActive.toLowerCase() === 'true' || browser.isVisible('#focus-screen');
    },
    5000,
    250
  );

  // 復元バナーが表示されることを確認
  const recoveryBannerVisible = browser.evaluate(
    "document.getElementById('recovery-banner')?.classList.contains('active') || false"
  ).toLowerCase() === 'true';
  const focusStillVisible = browser.isVisible('#focus-screen');
  test.assert(recoveryBannerVisible || focusStillVisible, 'リロード後に復元バナーまたは集中画面が表示される');

  await browser.screenshot('07-state-persistence-banner');

  // 再開ボタンをクリック
  if (recoveryBannerVisible) {
    browser.evaluate("document.querySelector('.btn-recovery-resume').click()");
    await browser.waitForVisible('#focus-screen');
  }

  // 集中画面に戻ることを確認
  const focusAfterResume = browser.isVisible('#focus-screen');
  test.assert(focusAfterResume, '再開後に集中画面に戻る');

  // タイマーが継続していることを確認（0秒以上）
  const timerText = browser.getText('#focus-timer-display');
  test.assert(timerText.includes(':'), 'タイマーが継続している');

  await browser.screenshot('07-state-persistence-resumed');

  // === シナリオB: 復帰モードの状態復元 ===
  console.log('  [シナリオB: 復帰モードの状態復元]');

  browser.resetStorage();
  await browser.reload();
  browser.overrideDialogs();

  browser.evaluate(`
    const input = document.querySelector('.task-slot input');
    input.value = '復帰モードテスト';
    input.dispatchEvent(new Event('input', { bubbles: true }));
  `);
  browser.evaluate("document.querySelector('.btn-start-direct').click()");
  await browser.waitForVisible('#focus-screen');

  // 離席して復帰モードに入る
  browser.evaluate("document.querySelector('#btn-away').click()");

  // 復帰モードであることを確認
  const recoverySectionVisible = browser.isVisible('#recovery-section');
  test.assert(recoverySectionVisible, '復帰モードに入る');

  // ページをリロード
  await browser.reload();
  await browser.waitForVisible('#recovery-section');

  // 復帰モードが復元されることを確認
  const recoverySectionAfterReload = browser.isVisible('#recovery-section');
  test.assert(recoverySectionAfterReload, 'リロード後も復帰モードが復元される');

  await browser.screenshot('07-state-persistence-recovery');

  // === シナリオC: 破棄を選択 ===
  console.log('  [シナリオC: 破棄を選択]');

  browser.resetStorage();
  await browser.reload();
  browser.overrideDialogs();

  // 集中中の状態を注入
  browser.injectFocusState('破棄テストタスク');
  await browser.reload();
  await browser.waitForVisible('#recovery-banner');

  // 復元バナーが表示されることを確認
  const bannerVisible = browser.isVisible('#recovery-banner');
  test.assert(bannerVisible, '復元バナーが表示される');

  // 破棄ボタンをクリック
  browser.evaluate("document.querySelector('.btn-recovery-discard').click()");
  await browser.waitForVisible('#main-screen');

  // メイン画面に戻ることを確認
  const mainScreenVisible = browser.isVisible('#main-screen');
  const focusScreenHidden = !browser.isVisible('#focus-screen');
  test.assert(mainScreenVisible && focusScreenHidden, '破棄後にメイン画面に戻る');

  // ログに記録されていることを確認
  const logs = browser.getStorage('logs_v2');
  test.assert(logs.includes('破棄テストタスク'), '破棄時もログに記録される');

  await browser.screenshot('07-state-persistence-discard');

  return test.summary();
}

// 直接実行時
if (process.argv[1].includes('07-state-persistence')) {
  await browser.open();
  const passed = await run();
  process.exit(passed ? 0 : 1);
}
