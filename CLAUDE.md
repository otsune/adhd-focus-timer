# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

ADHD特化型カウントアップ式集中タイマー。サーバー不要で `public_html/index.html` 単体で動作するシングルページアプリ。データは `localStorage` に保存（キープレフィックス: `_v2`）。

## Commands

```bash
# ユニットテスト (vitest + jsdom)
npm test

# ウォッチモード
npm run test:watch

# 特定テストファイルのみ
npx vitest run tests/stats.test.js

# ビルド (dist/index.html を生成)
npm run build

# E2Eテスト (browser-use CLIが必要)
npm run test:e2e
```

## Architecture

### Two-File Model

- **`public_html/index.html`** — 開発用。`<script type="module">` で `src/` の各モジュールを `import` する
- **`dist/index.html`** — ビルド成果物。`build.js` が全モジュールをインライン化し `type="module"` なしの単一ファイルにする（`file://` スキームで動作するため）

### Source Modules (`src/`)

依存関係の順序（`build.js` の `MODULE_ORDER` に対応）:

| ファイル | 役割 |
|---|---|
| `utils.js` | `formatElapsedTime`, `formatDuration`, `escapeHtml` などの純粋関数 |
| `date-utils.js` | 午前4時区切りの日付キー生成 (`getDayKey`, `getTodayKey`) |
| `stats.js` | ログから統計値を算出（累積時間、最長セッション等） |
| `milestone.js` | 15分ごとの節目通知ロジック（奇数回=フラッシュ、偶数回=チャイム） |
| `storage.js` | `localStorage` の read/write ラッパー。キー: `tasks_v2`, `logs_v2`, `settings_v2`, `activeState_v2` |
| `todotxt.js` | todo.txt 形式のシリアライズ/パース |
| `url-tasks.js` | URL hash (`#tasks=...`) からタスクを自動投入するロジック |
| `app.js` | メインの UI・状態管理・タイマーロジック |

### Testing

- **ユニットテスト**: `tests/*.test.js`（vitest + jsdom、`src/` の各モジュールに対応）
- **E2Eテスト**: `e2e/tests/*.js`（`browser-use` CLI でブラウザを自動操作、`dist/index.html` を対象とする）

E2Eテストを実行する前に `npm run build` が必要。

### Key Domain Concepts

- **集中セグメント**: `{ taskName, startedAt, endedAt, seconds }` の形式でログに記録
- **日付キー**: 午前4時を境界とする `YYYY-MM-DD` 文字列（深夜0〜4時は前日扱い）
- **画面遷移**: `initial` → `focus` → `recovery`（離席/食事時）または `summary`（終了時）
- **節目通知**: 15分ごとにカウント。奇数回=赤フラッシュ3回、偶数回=チャイム音+トースト
