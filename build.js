/**
 * ADHD Focus Timer - Build Script
 * 
 * ESMモジュールをインライン化してfile://で動作するシングルファイルを生成
 * 
 * Usage: node build.js
 */

import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));

// モジュールの処理順序（依存関係に基づく）
const MODULE_ORDER = [
  // 第1層（依存なし）
  'src/constants.js',
  'src/utils.js',
  'src/i18n.js',
  'src/ui.js',
  'src/date-utils.js',
  // 第2層
  'src/storage.js',      // -> date-utils
  'src/audio.js',        // -> constants
  'src/theme.js',        // -> constants
  'src/milestone.js',    // -> constants
  'src/stats.js',        // -> utils, date-utils
  'src/url-tasks.js',    // -> utils
  'src/todotxt.js',      // -> constants, utils
  // 第3層
  'src/state.js',        // -> storage, constants
  'src/tasks.js',        // -> constants, storage
  'src/timer.js',        // -> constants, date-utils, storage
  'src/export.js',       // -> storage, todotxt, date-utils, constants
  // 第3.5層
  'src/app-utils.js',    // -> i18n, state, utils (shared tr/uiDuration)
  'src/task-ui.js',      // -> tasks, state, audio, constants, app-utils
  'src/roulette.js',     // -> tasks, state, constants, i18n
  // 第4a層
  'src/summary-ui.js',   // -> state, ui, stats, storage, utils, app-utils
  'src/settings-ui.js',  // -> state, theme, ui, app-utils, storage, summary-ui
  // 第4b層
  'src/recovery-ui.js',  // -> app-utils, tasks, audio, roulette, summary-ui, timer, storage, utils
  'src/focus-session.js', // -> app-utils, state, recovery-ui, tasks, settings-ui, audio, storage, timer, summary-ui, milestone, stats, date-utils, utils, constants
  // 第4層
  'src/app.js',          // -> ALL
];

const INPUT_HTML = 'public_html/index.html';
const OUTPUT_DIR = 'dist';
const OUTPUT_HTML = 'dist/index.html';

/**
 * モジュールファイルを変換
 * - import文を削除
 * - export prefixを削除
 */
function transformModule(content, modulePath) {
  let transformed = content;

  // Windows改行を統一
  transformed = transformed.replace(/\r\n/g, '\n');

  // import文を削除
  transformed = transformed.replace(/^\s*import\s+\{[^}]+\}\s+from\s+['"][^'"]+['"];?\s*$/gm, '');

  // export function → function
  transformed = transformed.replace(/^export\s+(function\s+)/gm, '$1');

  // export const → const
  transformed = transformed.replace(/^export\s+(const\s+)/gm, '$1');

  // export { ... } を削除
  transformed = transformed.replace(/^export\s+\{[^}]*\};?\s*$/gm, '');

  // export async function → async function
  transformed = transformed.replace(/^export\s+(async\s+function\s+)/gm, '$1');

  // export class → class（将来用）
  transformed = transformed.replace(/^export\s+(class\s+)/gm, '$1');

  // 連続する空行を1つに圧縮
  transformed = transformed.replace(/\n{3,}/g, '\n\n');

  // ヘッダーコメント追加
  return `// === ${modulePath} ===\n${transformed.trim()}`;
}

/**
 * index.htmlからメインスクリプトを抽出
 */
function extractMainScript(htmlContent) {
  const match = htmlContent.match(/<script\s+type="module">([\s\S]*?)<\/script>/);
  if (!match) {
    throw new Error('<script type="module"> が見つかりません');
  }
  return match[1];
}

/**
 * スクリプトからimport文を削除
 */
function removeImports(scriptContent) {
  return scriptContent.replace(/^\s*import\s+\{[^}]+\}\s+from\s+['"][^'"]+['"];?\s*$/gm, '');
}

/**
 * initApp()をDOMContentLoadedでラップする
 */
function wrapInitApp(scriptContent) {
  // initApp(); を DOMContentLoaded でラップ
  return scriptContent.replace(
    /(\s*)initApp\(\);(\s*)$/,
    "$1if (document.readyState === 'loading') {\n$1    document.addEventListener('DOMContentLoaded', initApp);\n$1} else {\n$1    initApp();\n$1}$2"
  );
}

/**
 * 識別子衝突を検知して警告
 *
 * トップレベルの function/const/let/var/class/async function 定義名を抽出し、
 * 複数モジュールで同名が定義されている場合は console.warn で警告する（ビルドは継続）。
 */
function detectCollisions(modules) {
  const identifiers = new Map();

  for (const { path, content } of modules) {
    const patterns = [
      /^function\s+(\w+)\s*\(/gm,
      /^const\s+(\w+)\s*=/gm,
      /^let\s+(\w+)\s*=/gm,
      /^var\s+(\w+)\s*=/gm,
      /^class\s+(\w+)\s*[{(]/gm,
      /^async\s+function\s+(\w+)\s*\(/gm,
    ];

    for (const pattern of patterns) {
      let match;
      while ((match = pattern.exec(content)) !== null) {
        const name = match[1];
        if (!identifiers.has(name)) {
          identifiers.set(name, []);
        }
        identifiers.get(name).push(path);
      }
    }
  }

  for (const [name, files] of identifiers) {
    if (files.length > 1) {
      const uniqueFiles = [...new Set(files)];
      if (uniqueFiles.length > 1) {
        console.warn(`[build] Duplicate identifier '${name}' in ${uniqueFiles.join(' and ')}`);
      }
    }
  }
}

/**
 * ビルド実行
 */
function build() {
  console.log('Building ADHD Focus Timer...\n');

  // 1. 全モジュールを変換・結合（同時に衝突検知用の配列を構築）
  let inlinedModules = '';
  const moduleContents = [];
  for (const modulePath of MODULE_ORDER) {
    const fullPath = join(__dirname, modulePath);
    console.log(`  Processing: ${modulePath}`);

    const content = readFileSync(fullPath, 'utf-8');
    const transformed = transformModule(content, modulePath);
    inlinedModules += transformed + '\n\n';
    moduleContents.push({ path: modulePath, content: transformed });
  }

  // 1.5. 識別子衝突検知（警告のみ、ビルドは継続）
  detectCollisions(moduleContents);

  // 2. index.htmlを読み込み
  const htmlPath = join(__dirname, INPUT_HTML);
  const html = readFileSync(htmlPath, 'utf-8');

  // 3. メインスクリプトを抽出・変換
  const mainScript = extractMainScript(html);
  let cleanedMainScript = removeImports(mainScript);
  cleanedMainScript = wrapInitApp(cleanedMainScript);

  // 4. 結合スクリプトを作成
  const combinedScript = `${inlinedModules}// === Main Application ===\n${cleanedMainScript.trim()}`;

  // 5. HTMLを変換（type="module"を通常スクリプトに変更してインラインスクリプトに置換）
  const outputHtml = html.replace(
    /<script\s+type="module">[\s\S]*?<\/script>/,
    `<script>\n${combinedScript}\n</script>`
  );

  // 6. dist/ディレクトリを作成
  const distPath = join(__dirname, OUTPUT_DIR);
  if (!existsSync(distPath)) {
    mkdirSync(distPath, { recursive: true });
  }

  // 7. 出力
  const outputPath = join(__dirname, OUTPUT_HTML);
  writeFileSync(outputPath, outputHtml, 'utf-8');

  console.log(`\nBuild complete: ${OUTPUT_HTML}`);
  console.log('ダブルクリックでブラウザから直接開けます（file://スキーム対応）');
}

// 実行
build();
