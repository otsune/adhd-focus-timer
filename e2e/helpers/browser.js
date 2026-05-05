/**
 * browser-use CLI ヘルパー
 * 
 * browser-use コマンドをNode.jsから実行するためのラッパー
 */

import { execFileSync } from 'node:child_process';
import { mkdirSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const PROJECT_ROOT = resolve(__dirname, '../..');
const DIST_HTML = resolve(PROJECT_ROOT, 'dist/index.html');
const SCREENSHOTS_DIR = resolve(__dirname, '../screenshots');
const DIST_FILE_URL = `file:///${DIST_HTML.replace(/\\/g, '/')}`;
const BROWSER_USE_EXE = process.env.BROWSER_USE_EXE || 'C:\\Users\\user\\.browser-use-env\\Scripts\\browser-use.exe';
const PWSH_EXE = process.env.PWSH_EXE || 'C:\\Program Files\\PowerShell\\7\\pwsh.exe';
const DOM_READY_SCRIPT = `
  (() => {
    const body = document.body;
    return Boolean(body && body.children.length > 0);
  })()
`;

function normalizeResult(output) {
  return String(output)
    .replace(/^result:\s*/i, '')
    .trim();
}

/**
 * browser-use コマンドを実行
 */
export function run(cmd, options = {}) {
  const args = splitCliArgs(cmd);
  const psCommand = `& '${BROWSER_USE_EXE}' ${args.map(quotePowerShellArg).join(' ')}`;
  try {
    const result = execFileSync(PWSH_EXE, ['-Command', psCommand], {
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

function splitCliArgs(cmd) {
  const matches = cmd.match(/"[^"]*"|\S+/g) || [];
  return matches.map((part) => {
    if (part.startsWith('"') && part.endsWith('"')) {
      return part.slice(1, -1);
    }
    return part;
  });
}

function quotePowerShellArg(value) {
  return `'${String(value).replace(/'/g, "''")}'`;
}

function sleep(ms) {
  Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, ms);
}

function isEmptyDomError(error) {
  const message = String(error?.message || error || '');
  return message.includes('Empty DOM') || message.includes('Empty DOM tree');
}

function isOpenAbortOrMissingDomError(error) {
  const message = String(error?.message || error || '');
  return message.includes('net::ERR_ABORTED') || isEmptyDomError(error);
}

function readDomReadyFlag() {
  const result = normalizeResult(run(`eval "${DOM_READY_SCRIPT.replace(/"/g, '\\"').replace(/\n/g, ' ')}"`));
  return result.toLowerCase() === 'true';
}

function waitForDomReadySync(maxAttempts = 20, delayMs = 500) {
  let lastError = null;
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      if (readDomReadyFlag()) {
        return true;
      }
    } catch (error) {
      lastError = error;
      if (!isOpenAbortOrMissingDomError(error) && attempt === maxAttempts) {
        throw error;
      }
    }
    sleep(delayMs);
  }

  if (lastError && !isOpenAbortOrMissingDomError(lastError)) {
    throw lastError;
  }
  throw new Error('DOM was not ready in time');
}

/**
 * dist/index.html を file:// で開く
 */
export async function open() {
  return openUrl(DIST_FILE_URL);
}

/**
 * 指定URLを開く
 */
export async function openUrl(url) {
  const result = run(`open "${url}"`);
  await waitForDomReady();
  return result;
}

/**
 * ページの状態（クリック可能要素一覧）を取得
 */
export async function state() {
  await waitForDomReady();
  return retry(() => {
    const result = run('state');
    if (result.includes('Empty DOM tree')) {
      throw new Error('Empty DOM');
    }
    return result;
  }, 3, 800);
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
export async function screenshot(name) {
  await waitForDomReady(20, 500);
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
  return retrySync(() => {
    waitForDomReadySync(12, 400);
    const result = normalizeResult(run(`eval "${escaped}"`));
    if (result.includes('Empty DOM tree')) {
      throw new Error('Empty DOM');
    }
    return result;
  }, 4, 250);
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

export function waitWithJitter(baseMs, jitterMs = 300) {
  return wait(baseMs + Math.floor(Math.random() * jitterMs));
}

export async function retry(fn, maxAttempts = 3, baseDelay = 500) {
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await fn();
    } catch (e) {
      if (attempt === maxAttempts) throw e;
      await wait(baseDelay * Math.pow(2, attempt - 1));
    }
  }
}

export function retrySync(fn, maxAttempts = 3, baseDelay = 250) {
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return fn();
    } catch (e) {
      if (attempt === maxAttempts) throw e;
      sleep(baseDelay * Math.pow(2, attempt - 1));
    }
  }
}

export async function waitForDomReady(maxAttempts = 20, delayMs = 500) {
  return retry(async () => {
    waitForDomReadySync(maxAttempts, delayMs);
    return true;
  }, 2, delayMs);
}

export async function waitForVisible(selector, timeoutMs = 5000, pollMs = 200) {
  const maxAttempts = Math.max(1, Math.ceil(timeoutMs / pollMs));
  return retry(async () => {
    await waitForDomReady();
    const visible = isVisible(selector);
    if (!visible) {
      throw new Error(`Element not visible yet: ${selector}`);
    }
    return true;
  }, maxAttempts, pollMs);
}

export async function waitForHidden(selector, timeoutMs = 5000, pollMs = 200) {
  const maxAttempts = Math.max(1, Math.ceil(timeoutMs / pollMs));
  return retry(async () => {
    await waitForDomReady();
    const visible = isVisible(selector);
    if (visible) {
      throw new Error(`Element still visible: ${selector}`);
    }
    return true;
  }, maxAttempts, pollMs);
}

export async function waitForCondition(checkFn, timeoutMs = 5000, pollMs = 200) {
  const maxAttempts = Math.max(1, Math.ceil(timeoutMs / pollMs));
  return retry(async () => {
    await waitForDomReady();
    const result = checkFn();
    if (!result) {
      throw new Error('Condition not met yet');
    }
    return true;
  }, maxAttempts, pollMs);
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
