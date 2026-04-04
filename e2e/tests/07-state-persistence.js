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
  browser.reload();
  browser.overrideDialogs();

  // タスクを入力して開始
  browser.evaluate(`
    const input = document.querySelector('.task-slot input');
    input.value = '永続化テストタスク';
    input.dispatchEvent(new Event('input', { bubbles: true }));
  `);
  browser.evaluate("document.querySelector('.btn-start-direct').click()");

  // 少し待機
  browser.wait(1500);

  // 集中中であることを確認
  const focusScreenVisible = browser.isVisible('#focus-screen');
  test.assert(focusScreenVisible, '集中画面が表示されている');

  // ページをリロード
  browser.reload();

  // 復元バナーが表示されることを確認
  const recoveryBannerVisible = browser.isVisible('#recovery-banner');
  const focusStillVisible = browser.isVisible('#focus-screen');
  test.assert(recoveryBannerVisible || focusStillVisible, 'リロード後に復元バナーまたは集中画面が表示される');

  browser.screenshot('07-state-persistence-banner');

  // 再開ボタンをクリック
  if (recoveryBannerVisible) {
    browser.evaluate("document.querySelector('.btn-recovery-resume').click()");
    browser.wait(300);
  }

  // 集中画面に戻ることを確認
  const focusAfterResume = browser.isVisible('#focus-screen');
  test.assert(focusAfterResume, '再開後に集中画面に戻る');

  // タイマーが継続していることを確認（0秒以上）
  const timerText = browser.getText('#focus-timer-display');
  test.assert(timerText.includes(':'), 'タイマーが継続している');

  browser.screenshot('07-state-persistence-resumed');

  // === シナリオB: 復帰モードの状態復元 ===
  console.log('  [シナリオB: 復帰モードの状態復元]');

  browser.resetStorage();
  browser.reload();
  browser.overrideDialogs();

  browser.evaluate(`
    const input = document.querySelector('.task-slot input');
    input.value = '復帰モードテスト';
    input.dispatchEvent(new Event('input', { bubbles: true }));
  `);
  browser.evaluate("document.querySelector('.btn-start-direct').click()");
  browser.wait(500);

  // 離席して復帰モードに入る
  browser.evaluate("document.querySelector('#btn-away').click()");

  // 復帰モードであることを確認
  const recoverySectionVisible = browser.isVisible('#recovery-section');
  test.assert(recoverySectionVisible, '復帰モードに入る');

  // ページをリロード
  browser.reload();

  // 復帰モードが復元されることを確認
  const recoverySectionAfterReload = browser.isVisible('#recovery-section');
  test.assert(recoverySectionAfterReload, 'リロード後も復帰モードが復元される');

  browser.screenshot('07-state-persistence-recovery');

  // === シナリオC: 破棄を選択 ===
  console.log('  [シナリオC: 破棄を選択]');

  browser.resetStorage();
  browser.reload();
  browser.overrideDialogs();

  // 集中中の状態を注入
  browser.injectFocusState('破棄テストタスク');
  browser.reload();

  // 復元バナーが表示されることを確認
  const bannerVisible = browser.isVisible('#recovery-banner');
  test.assert(bannerVisible, '復元バナーが表示される');

  // 破棄ボタンをクリック
  browser.evaluate("document.querySelector('.btn-recovery-discard').click()");
  browser.wait(500);

  // メイン画面に戻ることを確認
  const mainScreenVisible = browser.isVisible('#main-screen');
  const focusScreenHidden = !browser.isVisible('#focus-screen');
  test.assert(mainScreenVisible && focusScreenHidden, '破棄後にメイン画面に戻る');

  // ログに記録されていることを確認
  const logs = browser.getStorage('logs_v2');
  test.assert(logs.includes('破棄テストタスク'), '破棄時もログに記録される');

  browser.screenshot('07-state-persistence-discard');

  return test.summary();
}

// 直接実行時
if (process.argv[1].includes('07-state-persistence')) {
  browser.open();
  const passed = await run();
  process.exit(passed ? 0 : 1);
}
