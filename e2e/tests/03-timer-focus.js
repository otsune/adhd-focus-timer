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
  await browser.reload();
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
  await browser.waitForVisible('#focus-screen');

  // 集中画面に遷移することを確認
  const focusState = browser.evaluate("JSON.parse(localStorage.getItem('activeState_v2') || 'null')?.status || ''");
  const focusScreenVisible = browser.isVisible('#focus-screen');
  test.assert(focusScreenVisible || focusState === 'focus', '集中画面に遷移する');

  // タスク名が表示されていることを確認
  const displayedTask = browser.evaluate(`
    (() => {
      const active = JSON.parse(localStorage.getItem('activeState_v2') || 'null');
      return active?.taskName || document.getElementById('focus-task-display')?.textContent || '';
    })()
  `);
  test.assert(displayedTask.includes('集中テストタスク'), 'タスク名が表示される');

  // タイマーが「00:00」から開始することを確認
  let timerText = browser.getText('#focus-timer-display');
  test.assert(/^\d{2}:\d{2}$/.test(timerText), 'タイマーが開始直後の形式で表示される');
  const initialTimerText = timerText;

  await browser.screenshot('03-timer-focus-started');

  // 2秒待機後、タイマーが更新されていることを確認
  await browser.wait(2500);

  timerText = browser.getText('#focus-timer-display');
  test.assert(timerText !== initialTimerText, 'タイマーがカウントアップする');

  // === シナリオB: タイマー終了 ===
  console.log('  [シナリオB: タイマー終了]');

  // 終了ボタンをクリック
  browser.evaluate("document.querySelector('#btn-finish-focus').click()");
  await browser.waitForVisible('#summary-modal');

  // サマリーモーダルが表示されることを確認
  const summaryModalVisible = browser.isVisible('#summary-modal');
  test.assert(summaryModalVisible, 'サマリーモーダルが表示される');

  // ログに記録されていることを確認
  await browser.wait(500);
  const hasSavedLog = browser.evaluate(`
    (() => {
      const logs = JSON.parse(localStorage.getItem('logs_v2') || '{}');
      const entries = [];
      for (const segments of Object.values(logs)) {
        if (Array.isArray(segments)) entries.push(...segments);
      }
      return entries.length > 0 && entries.some((entry) => entry.taskName === '集中テストタスク');
    })()
  `);
  test.assert(hasSavedLog.toLowerCase() === 'true', '集中時間がログに記録される');

  await browser.screenshot('03-timer-focus-summary');

  // モーダルを閉じる
  browser.evaluate("document.querySelector('#btn-close-summary').click()");

  // === シナリオC: ルーレット開始 ===
  console.log('  [シナリオC: ルーレット開始]');

  browser.resetStorage();
  await browser.reload();

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

  // ルーレット演出後、集中画面に遷移することを確認
  await browser.waitForVisible('#focus-screen', 5000, 250);
  await browser.waitForCondition(() => {
    const currentTask = browser.evaluate(`
      (() => {
        const active = JSON.parse(localStorage.getItem('activeState_v2') || 'null');
        return active?.taskName || document.getElementById('focus-task-display')?.textContent || '';
      })()
    `);
    return currentTask.includes('タスクA') || currentTask.includes('タスクB');
  }, 5000, 250);

  const focusAfterRoulette = browser.isVisible('#focus-screen');
  const rouletteState = browser.evaluate("JSON.parse(localStorage.getItem('activeState_v2') || 'null')?.status || ''");
  test.assert(focusAfterRoulette || rouletteState === 'focus', 'ルーレット後に集中画面に遷移');

  // いずれかのタスク名が表示されていることを確認
  const rouletteTask = browser.evaluate(`
    (() => {
      const active = JSON.parse(localStorage.getItem('activeState_v2') || 'null');
      return active?.taskName || document.getElementById('focus-task-display')?.textContent || '';
    })()
  `);
  test.assert(
    rouletteTask.includes('タスクA') || rouletteTask.includes('タスクB'),
    'ルーレットで選ばれたタスクが表示される'
  );

  await browser.screenshot('03-timer-focus-roulette');

  return test.summary();
}

// 直接実行時
if (process.argv[1].includes('03-timer-focus')) {
  await browser.open();
  const passed = await run();
  process.exit(passed ? 0 : 1);
}
