// F3 Final QA Runner — `dist/index.html` を file:// で開いて主要動作を検証
// Output: .sisyphus/evidence/final-qa/ にスクリーンショットとログを保存
//
// Scenarios:
//  S1. dist/index.html を file:// で開き、#main-screen 表示確認
//  S2. タスク追加 → 集中開始 → カウントアップ確認 → 終了 → 集計確認の主要フロー
//  S3. JavaScript エラーゼロ（pageerror, console.error 監視）
//  S4. 言語切替 ja ⇔ en
//  S5. テーマ切替 light / dark / system
//
// Implementation notes:
//  - Playwright module は npx cache から require
//  - Chromium-for-Testing バイナリを直接指定
//  - file:// で動作することを保証

import { chromium } from '/home/otsune/.npm/_npx/9833c18b2d85bc59/node_modules/playwright/index.mjs';
import { mkdirSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';

const PROJECT_ROOT = '/mnt/c/Users/user/Documents/adhd-focus-timer';
const EV_DIR = resolve(PROJECT_ROOT, '.sisyphus/evidence/final-qa');
const LOG_PATH = resolve(EV_DIR, 'final-qa.log');
const REPORT_PATH = resolve(EV_DIR, 'report.json');
const DIST_URL = `file://${resolve(PROJECT_ROOT, 'dist/index.html')}`;
const CHROMIUM_BIN = '/home/otsune/.cache/ms-playwright/chromium-1217/chrome-linux64/chrome';

mkdirSync(EV_DIR, { recursive: true });

const pageErrors = [];
const consoleErrors = [];
const scenarioResults = [];

function recordScenario(name, pass, detail = {}) {
  scenarioResults.push({ name, pass, ...detail });
  console.log(`[${pass ? 'PASS' : 'FAIL'}] ${name}`, JSON.stringify(detail));
}

const browser = await chromium.launch({
  executablePath: CHROMIUM_BIN,
  headless: true,
});

let summary = {};
try {
  const context = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  const page = await context.newPage();

  page.on('pageerror', (err) => {
    pageErrors.push({
      message: err.message,
      stack: String(err.stack || '').split('\n').slice(0, 6).join('\n'),
    });
  });
  page.on('console', (msg) => {
    if (msg.type() === 'error') consoleErrors.push(msg.text());
  });

  // ── S1: dist/index.html 起動 + #main-screen 表示
  await page.goto(DIST_URL, { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(1500);
  // Avoid stale state from previous runs
  await page.evaluate(() => {
    try { localStorage.clear(); } catch (e) { /* ignore */ }
  });
  await page.reload({ waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(1200);

  const mainVisible = await page.locator('#main-screen').isVisible();
  const mainActive = await page.locator('#main-screen.active').count();
  const taskSlots = await page.locator('.task-slot').count();
  const addBtnVisible = await page.locator('#btn-add-task').isVisible();
  await page.screenshot({ path: `${EV_DIR}/01-initial-main.png`, fullPage: true });
  recordScenario('S1_main_screen_visible', mainVisible && mainActive > 0 && taskSlots >= 1, {
    mainVisible, mainActive, taskSlots, addBtnVisible,
  });

  // ── S2a: タスク追加 → 集中開始
  const taskInput = page.locator('.task-slot input').first();
  await taskInput.fill('QAタスクA');
  await page.locator('.task-slot .btn-start-direct').first().click();
  await page.waitForTimeout(2500);

  const focusVisible = await page.locator('#focus-screen').isVisible();
  const focusActive = await page.locator('#focus-screen.active').count();
  const focusTaskName = await page.locator('#focus-task-display').innerText();
  const elapsedTextEarly = await page.locator('#focus-timer-display').innerText();
  await page.screenshot({ path: `${EV_DIR}/02-focus-running.png`, fullPage: true });
  recordScenario('S2a_focus_started', focusVisible && focusActive > 0 && focusTaskName === 'QAタスクA', {
    focusVisible, focusActive, focusTaskName, elapsedTextEarly,
  });

  // ── S2b: カウントアップが進行する（少し待って数字が増加するか）
  await page.waitForTimeout(2500);
  const elapsedTextLater = await page.locator('#focus-timer-display').innerText();
  const elapsedAdvanced = elapsedTextEarly !== elapsedTextLater;
  recordScenario('S2b_countup_advances', elapsedAdvanced, { elapsedTextEarly, elapsedTextLater });

  // ── S2c: 終了 → 集計モーダル表示
  await page.locator('#btn-finish-focus').click();
  await page.waitForTimeout(1500);
  const summaryModalVisible = await page.locator('#summary-modal').isVisible();
  const summaryHasContent = (await page.locator('#summary-content').innerText()).trim().length > 0;
  await page.screenshot({ path: `${EV_DIR}/03-summary.png`, fullPage: true });
  recordScenario('S2c_summary_shown', summaryModalVisible && summaryHasContent, {
    summaryModalVisible, summaryHasContent,
  });

  // ── S2d: ログ確認（localStorage 内 logs_v2 にエントリーが入っているか）
  // logs_v2 schema: { "YYYY-MM-DD": [{ taskName, startedAt, endedAt, seconds }, ...] }
  const logsInfo = await page.evaluate(() => {
    try {
      const raw = localStorage.getItem('logs_v2');
      if (!raw) return { exists: false };
      const obj = JSON.parse(raw);
      const flat = [];
      for (const [day, segs] of Object.entries(obj || {})) {
        if (Array.isArray(segs)) {
          for (const s of segs) flat.push({ ...s, _day: day });
        }
      }
      return { exists: true, dayCount: Object.keys(obj || {}).length, flatCount: flat.length, sample: flat[0] || null };
    } catch (e) {
      return { exists: false, error: String(e) };
    }
  });
  const logsValid = !!logsInfo.exists
    && logsInfo.flatCount >= 1
    && logsInfo.sample
    && logsInfo.sample.taskName === 'QAタスクA'
    && typeof logsInfo.sample.seconds === 'number'
    && logsInfo.sample.seconds > 0;
  recordScenario('S2d_log_recorded', logsValid, logsInfo);

  // close summary
  await page.locator('#btn-close-summary').click();
  await page.waitForTimeout(600);

  // ── S4: 言語切替 ja ⇔ en
  await page.locator('#btn-show-settings').click();
  await page.waitForTimeout(700);
  const settingsVisible = await page.locator('#settings-modal').isVisible();
  const labelJaInitial = await page.locator('#settings-language-label').innerText();

  // 英語に切替（radio は視覚的に隠れているので label をクリック）
  await page.locator('#language-option-en').click();
  await page.waitForTimeout(500);
  const labelEn = await page.locator('#settings-language-label').innerText();
  const themeLabelEn = await page.locator('#settings-theme-label').innerText();
  await page.screenshot({ path: `${EV_DIR}/04-settings-en.png`, fullPage: true });

  // 日本語に戻す
  await page.locator('#language-option-ja').click();
  await page.waitForTimeout(500);
  const labelJaAfter = await page.locator('#settings-language-label').innerText();
  await page.screenshot({ path: `${EV_DIR}/05-settings-ja.png`, fullPage: true });

  recordScenario('S4_language_switch_ja_en', settingsVisible && labelEn === 'Language' && themeLabelEn === 'Theme' && labelJaAfter === '言語', {
    settingsVisible, labelJaInitial, labelEn, themeLabelEn, labelJaAfter,
  });

  // ── S5: テーマ切替 light / dark / system （radio は視覚的に隠れているので label をクリック）
  const themeReadings = {};
  for (const mode of ['light', 'dark', 'system']) {
    await page.locator(`#theme-option-${mode}`).click();
    await page.waitForTimeout(400);
    const themeMode = await page.evaluate(() => document.documentElement.dataset.themeMode);
    const dataTheme = await page.evaluate(() => document.documentElement.dataset.theme);
    themeReadings[mode] = { themeMode, dataTheme };
    await page.screenshot({ path: `${EV_DIR}/06-theme-${mode}.png`, fullPage: true });
  }
  // light → light, dark → dark, system → light or dark depending on prefers-color-scheme
  const lightOk = themeReadings.light.themeMode === 'light' && themeReadings.light.dataTheme === 'light';
  const darkOk = themeReadings.dark.themeMode === 'dark' && themeReadings.dark.dataTheme === 'dark';
  const systemOk = themeReadings.system.themeMode === 'system' && (themeReadings.system.dataTheme === 'light' || themeReadings.system.dataTheme === 'dark');
  recordScenario('S5_theme_switch_light_dark_system', lightOk && darkOk && systemOk, themeReadings);

  // 保存
  await page.locator('#btn-save-settings').click();
  await page.waitForTimeout(500);

  // ── S3: pageerror = 0 / console.error = 0 (collected throughout the session)
  recordScenario('S3_no_js_errors', pageErrors.length === 0 && consoleErrors.length === 0, {
    pageErrorCount: pageErrors.length,
    consoleErrorCount: consoleErrors.length,
    pageErrorsHead: pageErrors.slice(0, 3),
    consoleErrorsHead: consoleErrors.slice(0, 3),
  });

  // 全画面 final state
  await page.screenshot({ path: `${EV_DIR}/07-final-state.png`, fullPage: true });

  summary = {
    pageErrorCount: pageErrors.length,
    consoleErrorCount: consoleErrors.length,
    scenarios: scenarioResults,
    totalScenarios: scenarioResults.length,
    passedScenarios: scenarioResults.filter((s) => s.pass).length,
  };
} finally {
  await browser.close();
}

// Persist log + report
const logBody = [
  '=== F3 Final QA verification ===',
  `URL: ${DIST_URL}`,
  `Timestamp: ${new Date().toISOString()}`,
  '',
  `pageError count: ${pageErrors.length}`,
  `console.error count: ${consoleErrors.length}`,
  '',
  '--- pageErrors ---',
  pageErrors.length === 0 ? '(none)' : pageErrors.map((e) => `[message] ${e.message}\n[stack]\n${e.stack}`).join('\n---\n'),
  '',
  '--- consoleErrors ---',
  consoleErrors.length === 0 ? '(none)' : consoleErrors.join('\n---\n'),
  '',
  '--- Scenario Results ---',
  ...scenarioResults.map((s) => `[${s.pass ? 'PASS' : 'FAIL'}] ${s.name}: ${JSON.stringify({ ...s, name: undefined, pass: undefined })}`),
  '',
].join('\n');

writeFileSync(LOG_PATH, logBody, 'utf8');
writeFileSync(REPORT_PATH, JSON.stringify(summary, null, 2), 'utf8');

const allPassed = summary.passedScenarios === summary.totalScenarios && pageErrors.length === 0;
console.log('---');
console.log(`SCENARIOS ${summary.passedScenarios}/${summary.totalScenarios} pass | pageError=${pageErrors.length} | consoleError=${consoleErrors.length} | VERDICT: ${allPassed ? 'APPROVE' : 'REJECT'}`);
process.exit(allPassed ? 0 : 1);
