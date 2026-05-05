/**
 * E2E Test: 04-recovery-mode
 * 
 * 復帰モードテスト - 離席・食事後の復帰モードが正しく動作することを確認
 */

import * as browser from '../helpers/browser.js';

export async function run() {
  const test = new browser.TestRunner('04-recovery-mode');
  
  console.log('\n=== 04-recovery-mode: 復帰モードテスト ===\n');

  // セットアップ
  browser.resetStorage();
  await browser.reload();
  browser.overrideDialogs();

  // === シナリオA: 離席からの復帰 ===
  console.log('  [シナリオA: 離席からの復帰]');

  // タスクを入力して開始
  browser.evaluate(`
    const input = document.querySelector('.task-slot input');
    input.value = '復帰テストタスク';
    input.dispatchEvent(new Event('input', { bubbles: true }));
  `);
  browser.evaluate("document.querySelector('.btn-start-direct').click()");

  // 少し待機
  await browser.wait(1000);

  // 離席ボタンをクリック
  browser.evaluate("document.querySelector('#btn-away').click()");

  // メイン画面に戻ることを確認
  const mainScreenVisible = browser.isVisible('#main-screen');
  test.assert(mainScreenVisible, '離席後にメイン画面に戻る');

  // 復帰モードUIが表示されることを確認
  const recoverySectionVisible = browser.isVisible('#recovery-section');
  test.assert(recoverySectionVisible, '復帰モードセクションが表示される');

  // 復帰ステータスバナーが表示されることを確認
  const statusBannerVisible = browser.isVisible('#recovery-status-banner');
  test.assert(statusBannerVisible, '復帰ステータスバナーが表示される');

  await browser.screenshot('04-recovery-mode-away');

  // 再開ボタンをクリック
  browser.evaluate("document.querySelector('#btn-resume-last').click()");

  // 集中画面に戻ることを確認
  const focusScreenVisible = browser.isVisible('#focus-screen');
  test.assert(focusScreenVisible, '再開後に集中画面に戻る');

  await browser.screenshot('04-recovery-mode-resumed');

  // === シナリオB: 食事からの別タスク復帰 ===
  console.log('  [シナリオB: 食事からの別タスク復帰]');

  // 食事ボタンをクリック
  browser.evaluate("document.querySelector('#btn-meal').click()");

  // 復帰モードに入ることを確認
  const recoverySectionVisible2 = browser.isVisible('#recovery-section');
  test.assert(recoverySectionVisible2, '食事後に復帰モードになる');

  // タスク選択ボタンが表示されることを確認
  const taskButtonsExist = browser.countElements('.btn-task-recovery') > 0;
  test.assert(taskButtonsExist, 'タスク選択ボタンが表示される');

  await browser.screenshot('04-recovery-mode-meal');

  // === シナリオC: 復帰モードから終了 ===
  console.log('  [シナリオC: 復帰モードから終了]');

  // 終了ボタンをクリック
  browser.evaluate("document.querySelector('#btn-finish-recovery').click()");

  // サマリーモーダルが表示されることを確認
  const summaryModalVisible = browser.isVisible('#summary-modal');
  test.assert(summaryModalVisible, '終了後にサマリーモーダルが表示される');

  await browser.screenshot('04-recovery-mode-finish');

  return test.summary();
}

// 直接実行時
if (process.argv[1].includes('04-recovery-mode')) {
  await browser.open();
  const passed = await run();
  process.exit(passed ? 0 : 1);
}
