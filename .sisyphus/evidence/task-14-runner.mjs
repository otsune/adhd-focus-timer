// Temporary Playwright runner for T14 - dist/index.html verification
// Uses Playwright module from npx cache and Chromium-for-Testing binary.
import { chromium } from '/home/otsune/.npm/_npx/9833c18b2d85bc59/node_modules/playwright/index.mjs';
import { mkdirSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';

const PROJECT_ROOT = '/mnt/c/Users/user/Documents/adhd-focus-timer';
const SCREENS_DIR = resolve(PROJECT_ROOT, '.sisyphus/evidence/task-14-screens');
const LOG_PATH = resolve(PROJECT_ROOT, '.sisyphus/evidence/task-14-pageerror.log');
const DIST_URL = `file://${resolve(PROJECT_ROOT, 'dist/index.html')}`;
const CHROMIUM_BIN = '/home/otsune/.cache/ms-playwright/chromium-1217/chrome-linux64/chrome';

mkdirSync(SCREENS_DIR, { recursive: true });

const pageErrors = [];
const consoleErrors = [];

const browser = await chromium.launch({
  executablePath: CHROMIUM_BIN,
  headless: true,
});

let result = {};
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

  await page.goto(DIST_URL, { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(1500);

  const mainVisible = await page.locator('#main-screen').isVisible();
  const taskSlots = await page.locator('.task-slot').count();
  const addBtnVisible = await page.locator('#btn-add-task').isVisible();

  await page.screenshot({ path: `${SCREENS_DIR}/01-initial.png`, fullPage: true });

  // Fill the first task input with テストタスク
  const taskInput = page.locator('.task-slot input').first();
  await taskInput.fill('テストタスク');

  // Click "開始 ▶" (.btn-start-direct on the same slot)
  await page.locator('.task-slot .btn-start-direct').first().click();
  await page.waitForTimeout(3500);

  const focusVisible = await page.locator('#focus-screen').isVisible();
  const elapsedText = await page.locator('#focus-timer-display').innerText();
  const focusTaskName = await page.locator('#focus-task-display').innerText();

  await page.screenshot({ path: `${SCREENS_DIR}/02-focus-running.png`, fullPage: true });

  // Click 終了
  await page.locator('#btn-finish-focus').click();
  await page.waitForTimeout(1500);

  const summaryVisible = await page.locator('#summary-modal').isVisible().catch(() => false);
  const mainBack = await page.locator('#main-screen').isVisible().catch(() => false);

  await page.screenshot({ path: `${SCREENS_DIR}/03-summary.png`, fullPage: true });

  result = {
    mainVisible,
    taskSlots,
    addBtnVisible,
    focusVisible,
    elapsedText,
    focusTaskName,
    summaryVisible,
    mainBack,
    pageErrorCount: pageErrors.length,
    consoleErrorCount: consoleErrors.length,
  };
} finally {
  await browser.close();
}

const logBody = [
  '=== T14 dist/index.html verification ===',
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
  '--- Result ---',
  JSON.stringify(result, null, 2),
  '',
].join('\n');

writeFileSync(LOG_PATH, logBody, 'utf8');

console.log(JSON.stringify({ ...result, pageErrors, consoleErrors }, null, 2));
