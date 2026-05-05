/**
 * E2E Test: 06-settings-modal
 * 
 * 設定モーダルテスト - 設定の変更と永続化が正しく動作することを確認
 */

import * as browser from '../helpers/browser.js';

export async function run() {
  const test = new browser.TestRunner('06-settings-modal');
  
  console.log('\n=== 06-settings-modal: 設定モーダルテスト ===\n');

  // セットアップ
  browser.resetStorage();
  await browser.reload();
  browser.overrideDialogs();

  // === シナリオA: 設定の表示 ===
  console.log('  [シナリオA: 設定の表示]');

  // 設定ボタンをクリック
  browser.evaluate("document.querySelector('#btn-show-settings').click()");
  await browser.waitForVisible('#settings-modal');

  // 設定モーダルが表示されることを確認
  const settingsModalVisible = browser.isVisible('#settings-modal');
  test.assert(settingsModalVisible, '設定モーダルが表示される');

  // トグルスイッチが存在することを確認
  const milestoneToggleExists = browser.isVisible('#setting-milestone');
  test.assert(milestoneToggleExists, '節目通知トグルが存在する');

  const soundToggleExists = browser.isVisible('#setting-sound');
  test.assert(soundToggleExists, '音通知トグルが存在する');

  // 初期状態はON（チェック済み）であることを確認
  const milestoneChecked = browser.evaluate(
    "document.querySelector('#setting-milestone').checked ? 'true' : 'false'"
  );
  test.assert(milestoneChecked.includes('true'), '節目通知はデフォルトでON');

  await browser.screenshot('06-settings-modal-initial');

  // === シナリオB: 設定の変更 ===
  console.log('  [シナリオB: 設定の変更]');

  // 節目通知をOFFに変更
  browser.evaluate("document.querySelector('#setting-milestone').click()");

  // 音通知をOFFに変更
  browser.evaluate("document.querySelector('#setting-sound').click()");

  // 保存ボタンをクリック
  browser.evaluate("document.querySelector('#btn-save-settings').click()");
  await browser.waitForHidden('#settings-modal');

  // モーダルが閉じることを確認
  const settingsModalHidden = !browser.isVisible('#settings-modal');
  test.assert(settingsModalHidden, '保存後にモーダルが閉じる');

  // localStorageに設定が保存されていることを確認
  const savedSettings = browser.evaluate(`
    (() => {
      const settings = JSON.parse(localStorage.getItem('settings_v2') || '{}');
      return settings.milestoneEnabled === false && settings.soundEnabled === false;
    })()
  `);
  test.assert(savedSettings.toLowerCase() === 'true', '設定がlocalStorageに保存される');

  // === シナリオC: 設定の永続化確認 ===
  console.log('  [シナリオC: 設定の永続化確認]');

  // ページをリロード
  await browser.reload();

  // 設定モーダルを再度開く
  browser.evaluate("document.querySelector('#btn-show-settings').click()");
  await browser.waitForVisible('#settings-modal');

  // 変更が保持されていることを確認
  const milestoneAfterReload = browser.evaluate(
    "document.querySelector('#setting-milestone').checked ? 'true' : 'false'"
  );
  test.assert(milestoneAfterReload.includes('false'), '節目通知OFFが保持される');

  const soundAfterReload = browser.evaluate(
    "document.querySelector('#setting-sound').checked ? 'true' : 'false'"
  );
  test.assert(soundAfterReload.includes('false'), '音通知OFFが保持される');

  await browser.screenshot('06-settings-modal-persisted');

  // === シナリオD: 設定をONに戻す ===
  console.log('  [シナリオD: 設定をONに戻す]');

  // 節目通知をONに戻す
  browser.evaluate("document.querySelector('#setting-milestone').click()");
  browser.evaluate("document.querySelector('#setting-sound').click()");
  browser.evaluate("document.querySelector('#btn-save-settings').click()");
  await browser.waitForHidden('#settings-modal');

  // 保存後の確認
  const finalSettings = browser.evaluate(`
    (() => {
      const settings = JSON.parse(localStorage.getItem('settings_v2') || '{}');
      return settings.milestoneEnabled === true && settings.soundEnabled === true;
    })()
  `);
  test.assert(finalSettings.toLowerCase() === 'true', '設定がONに戻る');

  return test.summary();
}

// 直接実行時
if (process.argv[1].includes('06-settings-modal')) {
  await browser.open();
  const passed = await run();
  process.exit(passed ? 0 : 1);
}
