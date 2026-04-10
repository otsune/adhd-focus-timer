/**
 * browser-use CLI ヘルパー
 * 
 * browser-use コマンドをNode.jsから実行するためのラッパー
 */

import { execSync } from 'node:child_process';
import { mkdirSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const PROJECT_ROOT = resolve(__dirname, '../..');
const DIST_HTML = resolve(PROJECT_ROOT, 'dist/index.html');
const SCREENSHOTS_DIR = resolve(__dirname, '../screenshots');
const DIST_FILE_URL = `file:///${DIST_HTML.replace(/\\/g, '/')}`;

function normalizeResult(output) {
  return String(output)
    .replace(/^result:\s*/i, '')
    .trim();
}

/**
 * browser-use コマンドを実行
 */
export function run(cmd, options = {}) {
  const fullCmd = `browser-use ${cmd}`;
  try {
    const result = execSync(fullCmd, {
      encoding: 'utf-8',
      timeout: options.timeout || 30000,
      env: {
        ...process.env,
        PYTHONIOENCODING: 'utf-8',
      },
      ...options
    });
    return result.trim();
  } catch (error) {
    if (String(error.stderr || '').includes('net::ERR_ABORTED') && cmd.startsWith('open ')) {
      return 'OPEN_ABORTED';
    }
    if (error.stdout) return error.stdout.trim();
    throw error;
  }
}

/**
 * dist/index.html を file:// で開く
 */
export function open() {
  return openUrl(DIST_FILE_URL);
}

/**
 * 指定URLを開く
 */
export function openUrl(url) {
  const result = run(`open "${url}"`);
  wait(1500);
  return result;
}

/**
 * ページの状態（クリック可能要素一覧）を取得
 */
export function state() {
  let result = run('state');
  if (result.includes('Empty DOM tree')) {
    wait(1000);
    result = run('state');
  }
  return result;
}

/**
 * 要素をクリック（インデックス指定）
 */
export function click(index) {
  return run(`click ${index}`);
}

/**
 * テキスト入力
 */
export function input(index, text) {
  return run(`input ${index} "${text}"`);
}

/**
 * キーボード入力
 */
export function keys(keySequence) {
  return run(`keys "${keySequence}"`);
}

/**
 * スクリーンショット保存
 */
export function screenshot(name) {
  mkdirSync(SCREENSHOTS_DIR, { recursive: true });
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
  const filename = `${SCREENSHOTS_DIR}/${name}_${timestamp}.png`;
  return run(`screenshot "${filename}"`);
}

/**
 * JavaScript を実行
 */
export function evaluate(jsCode) {
  const escaped = jsCode.replace(/"/g, '\\"').replace(/\n/g, ' ');
  return normalizeResult(run(`eval "${escaped}"`));
}

/**
 * localStorage をクリア
 */
export function resetStorage() {
  return evaluate(`
    localStorage.removeItem('tasks_v2');
    localStorage.removeItem('logs_v2');
    localStorage.removeItem('settings_v2');
    localStorage.removeItem('activeState_v2');
    'STORAGE_CLEARED';
  `);
}

/**
 * ダイアログをオーバーライド（confirm/alert を自動承認）
 */
export function overrideDialogs() {
  return evaluate(`
    window.confirm = () => true;
    window.alert = (msg) => console.log('ALERT:', msg);
    'DIALOGS_OVERRIDDEN';
  `);
}

/**
 * ページをリロード
 */
export function reload() {
  return open();
}

/**
 * ブラウザを閉じる
 */
export function close() {
  try {
    return run('close');
  } catch {
    return 'CLOSED';
  }
}

/**
 * 要素のテキストを取得
 */
export function getText(selector) {
  return evaluate(`document.querySelector('${selector}')?.textContent || ''`);
}

/**
 * 要素が表示されているか確認
 */
export function isVisible(selector) {
  const result = evaluate(`
    (() => {
      const el = document.querySelector('${selector}');
      if (!el) return false;
      const style = getComputedStyle(el);
      const rect = el.getBoundingClientRect();
      return style.display !== 'none'
        && style.visibility !== 'hidden'
        && style.opacity !== '0'
        && rect.width > 0
        && rect.height > 0;
    })()
  `);
  return result.toLowerCase() === 'true';
}

/**
 * 要素の数を取得
 */
export function countElements(selector) {
  const result = evaluate(`document.querySelectorAll('${selector}').length`);
  return parseInt(result, 10) || 0;
}

/**
 * 指定ミリ秒待機
 */
export function wait(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * localStorage の値を取得
 */
export function getStorage(key) {
  return evaluate(`localStorage.getItem('${key}') || 'null'`);
}

/**
 * localStorage に値を設定
 */
export function setStorage(key, value) {
  const escaped = JSON.stringify(value).replace(/"/g, '\\"');
  return evaluate(`localStorage.setItem('${key}', '${escaped}'); 'SET'`);
}

/**
 * テスト用ログデータを注入
 */
export function injectTestLogs() {
  return evaluate(`
    const today = new Date();
    if (today.getHours() < 4) today.setDate(today.getDate() - 1);
    const dayKey = today.getFullYear() + '-' + String(today.getMonth() + 1).padStart(2, '0') + '-' + String(today.getDate()).padStart(2, '0');
    const logs = {};
    logs[dayKey] = [
      { id: 'test1', taskName: 'テストタスクA', startedAt: Date.now() - 3600000, endedAt: Date.now() - 1800000, seconds: 1800 },
      { id: 'test2', taskName: 'テストタスクB', startedAt: Date.now() - 1200000, endedAt: Date.now() - 600000, seconds: 600 }
    ];
    localStorage.setItem('logs_v2', JSON.stringify(logs));
    'LOGS_INJECTED';
  `);
}

/**
 * 集中中の状態を注入（復帰テスト用）
 */
export function injectFocusState(taskName = 'テストタスク') {
  return evaluate(`
    const state = {
      status: 'focus',
      taskName: '${taskName}',
      focusStartedAt: Date.now() - 120000
    };
    localStorage.setItem('activeState_v2', JSON.stringify(state));
    'FOCUS_STATE_INJECTED';
  `);
}

/**
 * 復帰モード状態を注入
 */
export function injectRecoveryState(taskName = 'テストタスク', pauseType = 'away') {
  return evaluate(`
    const state = {
      status: 'recovery',
      taskName: '${taskName}',
      pauseType: '${pauseType}',
      pausedAt: Date.now() - 60000,
      focusStartedAt: Date.now() - 300000
    };
    localStorage.setItem('activeState_v2', JSON.stringify(state));
    'RECOVERY_STATE_INJECTED';
  `);
}

// テスト結果レポート用
export class TestRunner {
  constructor(name) {
    this.name = name;
    this.passed = 0;
    this.failed = 0;
    this.errors = [];
  }

  assert(condition, message) {
    if (condition) {
      this.passed++;
      console.log(`  ✓ ${message}`);
    } else {
      this.failed++;
      this.errors.push(message);
      console.log(`  ✗ ${message}`);
    }
  }

  assertEqual(actual, expected, message) {
    this.assert(actual === expected, `${message} (expected: ${expected}, actual: ${actual})`);
  }

  assertContains(text, substring, message) {
    this.assert(text.includes(substring), `${message} (looking for: "${substring}")`);
  }

  summary() {
    const total = this.passed + this.failed;
    const status = this.failed === 0 ? 'PASSED' : 'FAILED';
    console.log(`\n[${this.name}] ${status} (${this.passed}/${total})`);
    return this.failed === 0;
  }
}
