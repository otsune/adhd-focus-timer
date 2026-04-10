/**
 * E2E Test: 03-timer-focus
 * 
 * 集中タイマーテスト - タイマーの開始・表示更新・終了が正しく動作することを確認
 */

import * as browser from '../helpers/browser.js';

export async function run() {
  const test = new browser.TestRunner('03-timer-focus');
  
  console.log('\n=== 03-timer-focus: 集中タイマーテスト ===\n');

  // セットアップ
  browser.resetStorage();
  browser.reload();
  browser.overrideDialogs();

  // === シナリオA: 直接開始 ===
  console.log('  [シナリオA: 直接開始]');

  // タスクを入力
  browser.evaluate(`
    const input = document.querySelector('.task-slot input');
    input.value = '集中テストタスク';
    input.dispatchEvent(new Event('input', { bubbles: true }));
  `);

  // 開始ボタンをクリック
  browser.evaluate("document.querySelector('.btn-start-direct').click()");
  await browser.wait(500);

  // 集中画面に遷移することを確認
  const focusScreenVisible = browser.isVisible('#focus-screen');
  test.assert(focusScreenVisible, '集中画面に遷移する');

  // タスク名が表示されていることを確認
  const displayedTask = browser.getText('#focus-task-display');
  test.assert(displayedTask.includes('集中テストタスク'), 'タスク名が表示される');

  // タイマーが「00:00」から開始することを確認
  let timerText = browser.getText('#focus-timer-display');
  test.assert(timerText.includes('00:0'), 'タイマーが00:00から開始');
  const initialTimerText = timerText;

  browser.screenshot('03-timer-focus-started');

  // 2秒待機後、タイマーが更新されていることを確認
  await browser.wait(2500);

  timerText = browser.getText('#focus-timer-display');
  test.assert(timerText !== initialTimerText, 'タイマーがカウントアップする');

  // === シナリオB: タイマー終了 ===
  console.log('  [シナリオB: タイマー終了]');

  // 終了ボタンをクリック
  browser.evaluate("document.querySelector('#btn-finish-focus').click()");
  await browser.wait(300);

  // サマリーモーダルが表示されることを確認
  const summaryModalVisible = browser.isVisible('#summary-modal');
  test.assert(summaryModalVisible, 'サマリーモーダルが表示される');

  // ログに記録されていることを確認
  await browser.wait(1000);
  const logs = browser.getStorage('logs_v2');
  test.assert(logs.includes('集中テストタスク'), '集中時間がログに記録される');

  browser.screenshot('03-timer-focus-summary');

  // モーダルを閉じる
  browser.evaluate("document.querySelector('#btn-close-summary').click()");

  // === シナリオC: ルーレット開始 ===
  console.log('  [シナリオC: ルーレット開始]');

  browser.resetStorage();
  browser.reload();

  // 複数タスクを入力
  browser.evaluate("document.querySelector('#btn-add-task').click()");
  browser.evaluate(`
    const inputs = document.querySelectorAll('.task-slot input');
    inputs[0].value = 'タスクA';
    inputs[0].dispatchEvent(new Event('input', { bubbles: true }));
    inputs[1].value = 'タスクB';
    inputs[1].dispatchEvent(new Event('input', { bubbles: true }));
  `);

  // ルーレットボタンをクリック
  browser.evaluate("document.querySelector('#btn-roulette').click()");

  // ルーレット演出後、集中画面に遷移することを確認（約2秒待機）
  await browser.wait(2500);
  await browser.wait(300);

  const focusAfterRoulette = browser.isVisible('#focus-screen');
  test.assert(focusAfterRoulette, 'ルーレット後に集中画面に遷移');

  // いずれかのタスク名が表示されていることを確認
  const rouletteTask = browser.getText('#focus-task-display');
  test.assert(
    rouletteTask.includes('タスクA') || rouletteTask.includes('タスクB'),
    'ルーレットで選ばれたタスクが表示される'
  );

  browser.screenshot('03-timer-focus-roulette');

  return test.summary();
}

// 直接実行時
if (process.argv[1].includes('03-timer-focus')) {
  browser.open();
  const passed = await run();
  process.exit(passed ? 0 : 1);
}
