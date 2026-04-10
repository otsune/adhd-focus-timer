/**
 * E2E Test: 02-task-management
 * 
 * タスク管理テスト - タスクの追加・削除・アンドゥが正しく動作することを確認
 */

import * as browser from '../helpers/browser.js';

export async function run() {
  const test = new browser.TestRunner('02-task-management');
  
  console.log('\n=== 02-task-management: タスク管理テスト ===\n');

  // セットアップ
  browser.resetStorage();
  browser.reload();
  browser.overrideDialogs();

  // === シナリオA: タスク追加 ===
  console.log('  [シナリオA: タスク追加]');

  // 初期状態: 1つのタスクスロット
  let taskCount = browser.countElements('.task-slot');
  test.assertEqual(taskCount, 1, '初期状態: タスクスロットは1つ');

  // タスク追加ボタンの状態を取得して押す
  const stateOutput = browser.state();
  
  // #btn-add-task を探してクリック（stateの出力からインデックスを特定）
  // 簡易的に evaluate で直接操作
  browser.evaluate("document.querySelector('#btn-add-task').click()");
  
  taskCount = browser.countElements('.task-slot');
  test.assertEqual(taskCount, 2, 'タスク追加後: スロットが2つ');

  // 最大6個まで追加
  for (let i = 0; i < 4; i++) {
    browser.evaluate("document.querySelector('#btn-add-task').click()");
  }
  
  taskCount = browser.countElements('.task-slot');
  test.assertEqual(taskCount, 6, '最大6個までタスクを追加できる');

  // 6個の状態でボタンが無効化されているか確認
  const addButtonDisabled = browser.evaluate(
    "document.querySelector('#btn-add-task').disabled ? 'true' : 'false'"
  );
  test.assert(addButtonDisabled.includes('true'), '6個で追加ボタンが無効化される');

  browser.screenshot('02-task-management-six-tasks');

  // === シナリオB: タスク入力 ===
  console.log('  [シナリオB: タスク入力]');

  browser.resetStorage();
  browser.reload();

  // 最初のタスクにテキスト入力
  browser.evaluate(`
    const input = document.querySelector('.task-slot input');
    input.value = 'テスト入力タスク';
    input.dispatchEvent(new Event('input', { bubbles: true }));
  `);

  // localStorageに保存されていることを確認
  const savedTasks = browser.getStorage('tasks_v2');
  test.assert(savedTasks.includes('テスト入力タスク'), 'タスクがlocalStorageに保存される');

  // === シナリオC: タスク削除 ===
  console.log('  [シナリオC: タスク削除]');

  browser.resetStorage();
  browser.evaluate("localStorage.setItem('tasks_v2', JSON.stringify(['タスク1']))");
  browser.reload();
  browser.overrideDialogs();

  // 2つ目のタスクを追加
  browser.evaluate("document.querySelector('#btn-add-task').click()");
  browser.evaluate(`
    const inputs = document.querySelectorAll('.task-slot input');
    inputs[1].value = '削除テスト';
    inputs[1].dispatchEvent(new Event('input', { bubbles: true }));
  `);

  taskCount = browser.countElements('.task-slot');
  test.assertEqual(taskCount, 2, '削除前: タスクは2つ');

  // 削除ボタンをクリック
  browser.evaluate("document.querySelector('.btn-remove').click()");

  taskCount = browser.countElements('.task-slot');
  test.assertEqual(taskCount, 1, '削除後: タスクは1つ');

  // アンドゥトーストが表示されることを確認
  const undoToastVisible = browser.isVisible('#undo-toast');
  test.assert(undoToastVisible, 'アンドゥトーストが表示される');

  // アンドゥボタンをクリック
  browser.evaluate("document.querySelector('#undo-toast-btn').click()");
  await browser.wait(300);

  taskCount = browser.countElements('.task-slot');
  test.assertEqual(taskCount, 2, 'アンドゥ後: タスクが復元される');

  browser.screenshot('02-task-management-undo');

  return test.summary();
}

// 直接実行時
if (process.argv[1].includes('02-task-management')) {
  browser.open();
  const passed = await run();
  process.exit(passed ? 0 : 1);
}
