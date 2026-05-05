/**
 * E2E Test Runner
 * 
 * すべてのE2Eテストを順次実行し、結果をサマリー表示
 * 
 * Usage: node e2e/run-all.js
 */

import * as browser from './helpers/browser.js';

// テストモジュールを動的インポート
const tests = [
  { name: '01-initial-load', module: './tests/01-initial-load.js' },
  { name: '02-task-management', module: './tests/02-task-management.js' },
  { name: '03-timer-focus', module: './tests/03-timer-focus.js' },
  { name: '04-recovery-mode', module: './tests/04-recovery-mode.js' },
  { name: '05-summary-modal', module: './tests/05-summary-modal.js' },
  { name: '06-settings-modal', module: './tests/06-settings-modal.js' },
  { name: '07-state-persistence', module: './tests/07-state-persistence.js' },
  { name: '08-edge-cases', module: './tests/08-edge-cases.js' },
];

function getSelectedTests() {
  const requested = process.argv.slice(2).map((item) => item.trim()).filter(Boolean);
  if (requested.length === 0) {
    return tests;
  }
  return tests.filter((test) => requested.some((item) => test.name.includes(item)));
}

async function runAllTests() {
  console.log('═══════════════════════════════════════════════════════════');
  console.log('  ADHD Focus Timer - E2E Test Suite');
  console.log('═══════════════════════════════════════════════════════════');
  console.log(`  開始時刻: ${new Date().toLocaleString('ja-JP')}`);
  console.log('');

  // 既存セッションをクリア
  browser.close();

  // アプリを開く
  console.log('  ブラウザを起動中...');
  await browser.open();
  console.log('  dist/index.html を読み込みました\n');

  const results = [];
  let passedCount = 0;
  let failedCount = 0;
  const selectedTests = getSelectedTests();

  for (const test of selectedTests) {
    try {
      console.log(`  -> running ${test.name}`);
      // テストモジュールを動的インポート
      const testModule = await import(test.module);
      
      // テスト実行
      const passed = await testModule.run();
      
      if (passed) {
        passedCount++;
        results.push({ name: test.name, status: 'PASSED' });
      } else {
        failedCount++;
        results.push({ name: test.name, status: 'FAILED' });
      }
    } catch (error) {
      failedCount++;
      results.push({ name: test.name, status: 'ERROR', error: error.message });
      console.error(`\n  ❌ ${test.name}: ERROR - ${error.message}\n`);
    }
  }

  // ブラウザを閉じる
  browser.close();

  // サマリー表示
  console.log('\n═══════════════════════════════════════════════════════════');
  console.log('  Test Results Summary');
  console.log('═══════════════════════════════════════════════════════════');
  
  for (const result of results) {
    const icon = result.status === 'PASSED' ? '✓' : '✗';
    const statusColor = result.status === 'PASSED' ? '\x1b[32m' : '\x1b[31m';
    console.log(`  ${statusColor}${icon}\x1b[0m [${result.name}] ${result.status}`);
    if (result.error) {
      console.log(`      Error: ${result.error}`);
    }
  }

  console.log('───────────────────────────────────────────────────────────');
  const totalTests = passedCount + failedCount;
  const allPassed = failedCount === 0;
  const statusIcon = allPassed ? '✓' : '✗';
  const statusText = allPassed ? 'ALL PASSED' : 'SOME FAILED';
  
  console.log(`  ${statusIcon} Results: ${passedCount}/${totalTests} passed`);
  console.log(`  終了時刻: ${new Date().toLocaleString('ja-JP')}`);
  console.log('═══════════════════════════════════════════════════════════\n');

  // スクリーンショットの場所を案内
  console.log('  📸 スクリーンショット: e2e/screenshots/\n');

  process.exit(allPassed ? 0 : 1);
}

// 実行
runAllTests().catch(error => {
  console.error('Fatal error:', error);
  browser.close();
  process.exit(1);
});
