/**
 * E2E Test: 08-edge-cases
 * 
 * エッジケーステスト - 境界条件やエラーケースの動作を確認
 */

import * as browser from '../helpers/browser.js';

export async function run() {
  const test = new browser.TestRunner('08-edge-cases');
  
  console.log('\n=== 08-edge-cases: エッジケーステスト ===\n');

  // セットアップ
  browser.resetStorage();
  await browser.reload();
  browser.overrideDialogs();

  // === シナリオA: 空タスクでのルーレット ===
  console.log('  [シナリオA: 空タスクでのルーレット]');

  // タスクを空にする
  browser.evaluate(`
    const input = document.querySelector('.task-slot input');
    input.value = '';
    input.dispatchEvent(new Event('input', { bubbles: true }));
  `);

  // ルーレットボタンをクリック（アラートが表示されるはず）
  const beforeRoulette = browser.isVisible('#main-screen');
  browser.evaluate("document.querySelector('#btn-roulette').click()");

  // メイン画面のままであることを確認（集中画面に遷移しない）
  const afterRoulette = browser.isVisible('#main-screen');
  test.assert(beforeRoulette && afterRoulette, '空タスクではルーレットが実行されない');

  await browser.screenshot('08-edge-cases-empty-roulette');

  // === シナリオB: 長いタスク名 ===
  console.log('  [シナリオB: 長いタスク名]');

  // 100文字以上の長いタスク名を入力
  const longTaskName = 'これは非常に長いタスク名です。'.repeat(10);
  browser.evaluate(`
    const input = document.querySelector('.task-slot input');
    input.value = '${longTaskName}';
    input.dispatchEvent(new Event('input', { bubbles: true }));
  `);

  // タスクを開始
  browser.evaluate("document.querySelector('.btn-start-direct').click()");

  // 集中画面が表示されることを確認
  const focusScreenVisible = browser.isVisible('#focus-screen');
  test.assert(focusScreenVisible, '長いタスク名でも集中画面に遷移する');

  // タスク名が表示されていることを確認（UIが破綻していない）
  const displayedTask = browser.getText('#focus-task-display');
  test.assert(displayedTask.length > 0, '長いタスク名が表示される');

  await browser.screenshot('08-edge-cases-long-task');

  // 終了して戻る
  browser.evaluate("document.querySelector('#btn-finish-focus').click()");
  browser.evaluate("document.querySelector('#btn-close-summary').click()");

  // === シナリオC: 特殊文字を含むタスク名（XSS対策）===
  console.log('  [シナリオC: 特殊文字（XSS対策）]');

  browser.resetStorage();
  await browser.reload();

  // XSSペイロードを入力
  const xssPayload = '<script>alert("xss")</script>';
  browser.evaluate(`
    const input = document.querySelector('.task-slot input');
    input.value = '${xssPayload}';
    input.dispatchEvent(new Event('input', { bubbles: true }));
  `);

  // タスクを開始
  browser.evaluate("document.querySelector('.btn-start-direct').click()");

  // 集中画面が表示されることを確認
  const focusScreenXss = browser.isVisible('#focus-screen');
  test.assert(focusScreenXss, 'XSSペイロードでも正常に動作する');

  // HTMLタグがエスケープされていることを確認
  const displayedXss = browser.getText('#focus-task-display');
  test.assert(
    displayedXss.includes(xssPayload),
    'XSSペイロードが文字列として表示される'
  );

  await browser.screenshot('08-edge-cases-xss');

  // === シナリオD: 単一タスクでの削除ボタン非表示 ===
  console.log('  [シナリオD: 単一タスクでの削除ボタン]');

  browser.resetStorage();
  await browser.reload();

  // 単一タスク状態で削除ボタンが非表示であることを確認
  const removeButtonCount = browser.countElements('.btn-remove');
  test.assertEqual(removeButtonCount, 0, '単一タスクでは削除ボタンが非表示');

  // タスクを追加
  browser.evaluate("document.querySelector('#btn-add-task').click()");

  // 2つになったら削除ボタンが表示されることを確認
  const removeButtonCountAfter = browser.countElements('.btn-remove');
  test.assert(removeButtonCountAfter > 0, '複数タスクで削除ボタンが表示される');

  await browser.screenshot('08-edge-cases-remove-button');

  // === シナリオE: タスク上限後の追加ボタン ===
  console.log('  [シナリオE: タスク上限]');

  // 6個までタスクを追加
  for (let i = 0; i < 4; i++) {
    browser.evaluate("document.querySelector('#btn-add-task').click()");
  }

  const taskCount = browser.countElements('.task-slot');
  test.assertEqual(taskCount, 6, 'タスクは6個まで追加可能');

  // 追加ボタンが無効化されていることを確認
  const addButtonDisabled = browser.evaluate(
    "document.querySelector('#btn-add-task').disabled ? 'true' : 'false'"
  );
  test.assert(addButtonDisabled.includes('true'), '6個で追加ボタンが無効化');

  await browser.screenshot('08-edge-cases-max-tasks');

  return test.summary();
}

// 直接実行時
if (process.argv[1].includes('08-edge-cases')) {
  await browser.open();
  const passed = await run();
  process.exit(passed ? 0 : 1);
}
