/**
 * E2E Test: 01-initial-load
 * 
 * 初期表示テスト - アプリの初期状態が正しいことを確認
 */

import * as browser from '../helpers/browser.js';

export async function run() {
  const test = new browser.TestRunner('01-initial-load');
  
  console.log('\n=== 01-initial-load: 初期表示テスト ===\n');

  // セットアップ: localStorageクリア → リロード
  browser.resetStorage();
  await browser.reload();
  browser.overrideDialogs();

  // 1. メイン画面が表示されていることを確認
  const mainScreenVisible = browser.isVisible('#main-screen');
  test.assert(mainScreenVisible, 'メイン画面が表示されている');

  // 2. タスクスロットが1つ存在することを確認
  const taskSlotCount = browser.countElements('.task-slot');
  test.assertEqual(taskSlotCount, 1, 'タスクスロットが1つ存在する');

  // 3. タスク追加ボタンが存在することを確認
  const addButtonVisible = browser.isVisible('#btn-add-task');
  test.assert(addButtonVisible, 'タスク追加ボタンが存在する');

  // 4. ルーレットボタンが存在することを確認
  const rouletteButtonVisible = browser.isVisible('#btn-roulette');
  test.assert(rouletteButtonVisible, 'ルーレットボタンが存在する');

  // 5. 今日の成果ボタンが存在することを確認
  const summaryButtonVisible = browser.isVisible('#btn-show-summary');
  test.assert(summaryButtonVisible, '今日の成果ボタンが存在する');

  // 6. 設定ボタンが存在することを確認
  const settingsButtonVisible = browser.isVisible('#btn-show-settings');
  test.assert(settingsButtonVisible, '設定ボタンが存在する');

  // 7. 集中画面が非表示であることを確認
  const focusScreenHidden = !browser.isVisible('#focus-screen');
  test.assert(focusScreenHidden, '集中画面は非表示');

  // 8. サマリーモーダルが非表示であることを確認
  const summaryModalHidden = !browser.isVisible('#summary-modal');
  test.assert(summaryModalHidden, 'サマリーモーダルは非表示');

  // スクリーンショット
  await browser.screenshot('01-initial-load');

  return test.summary();
}

// 直接実行時
if (process.argv[1].includes('01-initial-load')) {
  await browser.open();
  const passed = await run();
  process.exit(passed ? 0 : 1);
}
