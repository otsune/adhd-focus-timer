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
  'src/utils.js',
  'src/date-utils.js',
  'src/stats.js',
  'src/milestone.js',
  'src/storage.js', // date-utils.jsの後（依存あり）
  'src/app.js',
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
 * ビルド実行
 */
function build() {
  console.log('Building ADHD Focus Timer...\n');

  // 1. 全モジュールを変換・結合
  let inlinedModules = '';
  for (const modulePath of MODULE_ORDER) {
    const fullPath = join(__dirname, modulePath);
    console.log(`  Processing: ${modulePath}`);
    
    const content = readFileSync(fullPath, 'utf-8');
    const transformed = transformModule(content, modulePath);
    inlinedModules += transformed + '\n\n';
  }

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
