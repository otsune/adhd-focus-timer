/**
 * E2E Test: 05-summary-modal
 * 
 * サマリーモーダルテスト - 今日の成果表示が正しく動作することを確認
 */

import * as browser from '../helpers/browser.js';

export async function run() {
  const test = new browser.TestRunner('05-summary-modal');
  
  console.log('\n=== 05-summary-modal: サマリーモーダルテスト ===\n');

  // === シナリオA: 記録なし状態 ===
  console.log('  [シナリオA: 記録なし状態]');

  browser.resetStorage();
  await browser.reload();
  browser.overrideDialogs();

  // 今日の成果ボタンをクリック
  browser.evaluate("document.querySelector('#btn-show-summary').click()");

  // サマリーモーダルが表示されることを確認
  const summaryModalVisible = browser.isVisible('#summary-modal');
  test.assert(summaryModalVisible, 'サマリーモーダルが表示される');

  // 「まだ記録がありません」メッセージを確認
  const summaryContent = browser.getText('#summary-content');
  test.assert(
    summaryContent.includes('まだ') || summaryContent.includes('記録'),
    '記録なし時のメッセージが表示される'
  );

  await browser.screenshot('05-summary-modal-empty');

  // 閉じるボタンで閉じる
  browser.evaluate("document.querySelector('#btn-close-summary').click()");

  const summaryModalHidden = !browser.isVisible('#summary-modal');
  test.assert(summaryModalHidden, 'モーダルが閉じる');

  // === シナリオB: 記録あり状態 ===
  console.log('  [シナリオB: 記録あり状態]');

  // テストログデータを注入
  browser.injectTestLogs();
  await browser.reload();

  // 今日の成果ボタンをクリック
  browser.evaluate("document.querySelector('#btn-show-summary').click()");

  // 累積集中時間が表示されることを確認
  const heroValue = browser.getText('.summary-hero-value');
  test.assert(heroValue.length > 0, '累積集中時間が表示される');

  // 統計カードが表示されることを確認
  const statCardCount = browser.countElements('.summary-stat-card');
  test.assert(statCardCount >= 4, '統計カードが表示される');

  await browser.screenshot('05-summary-modal-with-data');

  // === シナリオC: エクスポートボタンの存在確認 ===
  console.log('  [シナリオC: エクスポートボタン]');

  browser.evaluate("document.querySelector('#btn-show-settings').click()");

  const jsonExportExists = browser.isVisible('#btn-export-json');
  test.assert(jsonExportExists, 'JSONエクスポートボタンが存在する');

  const csvExportExists = browser.isVisible('#btn-export-csv');
  test.assert(csvExportExists, 'CSVエクスポートボタンが存在する');

  browser.evaluate("document.querySelector('#btn-save-settings').click()");

  // === シナリオD: ログリセット ===
  console.log('  [シナリオD: ログリセット]');

  // リセットボタンをクリック（confirmは自動承認）
  browser.evaluate("document.querySelector('#btn-reset-log').click()");

  // リセット後の状態確認
  browser.evaluate("document.querySelector('#btn-show-summary').click()");
  
  const afterResetContent = browser.getText('#summary-content');
  test.assert(
    afterResetContent.includes('まだ') || afterResetContent.includes('0'),
    'リセット後は記録なし状態になる'
  );

  await browser.screenshot('05-summary-modal-after-reset');

  return test.summary();
}

// 直接実行時
if (process.argv[1].includes('05-summary-modal')) {
  await browser.open();
  const passed = await run();
  process.exit(passed ? 0 : 1);
}
