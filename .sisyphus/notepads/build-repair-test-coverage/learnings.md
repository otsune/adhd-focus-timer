# Learnings

## [2026-04-30] Session Start
- プロジェクト: ADHD Focus Timer (single-page app, no server)
- テストフレームワーク: vitest 3.2.4 + jsdom
- ビルド: build.js (カスタムスクリプト) → dist/index.html
- localStorage キープレフィックス: _v2
- 既存テスト: 177 passed (7 files)
- 既存テストパターン: vi.mock/useFakeTimers/setupFiles 未使用、vi.spyOn(Storage.prototype) のみ

## [2026-04-30] T1: ベースライン記録完了
- テスト数: 177 passed
- dist/index.html サイズ: -rwxrwxrwx 1 otsune otsune 87542 Apr 30 09:48 dist/index.html
- ABSENT シンボル: function setText, function setAttr, function trapFocus, const TRANSLATIONS
- git untracked: .sisyphus/, CLAUDE.md, src/audio.js, src/constants.js, src/export.js, src/i18n.js, src/state.js, src/tasks.js, src/theme.js, src/timer.js, src/ui.js

## [2026-04-30] T2+T3+T4: build.js 強化完了
- MODULE_ORDER: 17モジュール（4層構造: 第1層 5, 第2層 7, 第3層 4, 第4層 1）
- transformModule: `export async function` → `async function`, `export class` → `class` 対応追加
- 衝突検知: `detectCollisions(modules)` 関数追加、ビルドループ内でモジュール変換と同時に moduleContents を構築し、ループ後に 1 回だけ呼び出す
- 検出された衝突 (28 件):
  - constants.js ↔ app.js: MAX_TASKS, MAX_TASK_NAME_LENGTH (url-tasks.js も)
  - i18n.js ↔ app.js: t, TRANSLATIONS
  - ui.js ↔ app.js: setText, setAttr, getFocusableElements, trapFocus
  - audio.js ↔ app.js: initAudio, playBeep
  - theme.js ↔ app.js: applyTheme, systemThemeMedia
  - state.js ↔ app.js: appInitialized, lastFocusedElement, currentTrapCleanup, settings
  - tasks.js ↔ app.js: tasks
  - timer.js ↔ app.js: tickFocusTimer, startPauseTimer, stopPauseTimer, tickPauseTimer, focusIntervalId, focusSegmentStartedAt, currentTaskName, lastNotifiedMilestone, pausedAt, pauseIntervalId
  - export.js ↔ app.js: downloadFile
- npm test: 177 passed (7 files)
- npm run build: exit 0 (warnings 28、ビルド継続)
- 衝突警告ログ: .sisyphus/evidence/task-3-build-warnings.log

## [2026-04-30] T5-T12: app.js 重複削除完了
- 削除した関数/変数: TRANSLATIONS, t, applyTheme, setText, setAttr, getFocusableElements, trapFocus, playBeep, appInitialized, lastFocusedElement, currentTrapCleanup, settings, tasks, focusIntervalId, pauseIntervalId, focusSegmentStartedAt, currentTaskName, lastNotifiedMilestone, pausedAt, tickFocusTimer, downloadFile, exportLogsAsJSON, exportLogsAsCSV, exportTasksAsTodoTxt, handleImportTodoTxt
- 追加した import: i18n/theme/ui/audio/state/tasks/timer/export/constants の抽出済み API と storage.invalidateFocusTimeCache
- npm test: 177 passed
- npm run build: 成功
- 注意点: i18n は app 側 tr ヘルパーから getSetting('language') を第3引数に渡す。timer.js が使う invalidateFocusTimeCache は storage.js から focus-time-cache-invalidated イベントで app 側キャッシュを無効化する。build は既存の constants.js ↔ url-tasks.js の MAX_TASK_NAME_LENGTH 重複警告のみ残る。

## [2026-04-30] T14: dist 動作確認完了
- pageerror: 0 件
- console.error: 0 件
- 主要フロー: 動作（main→focus→summary すべて遷移成功）
- スクリーンショット: 3枚保存済み (.sisyphus/evidence/task-14-screens/)
- 検証結果: mainVisible=true, taskSlots=1, focusVisible=true, elapsedText="00:03", focusTaskName="テストタスク", summaryVisible=true
- 環境メモ: Playwright MCP は `/opt/google/chrome/chrome` (chrome channel) を要求し sudo 不可で失敗。代替として Playwright npm モジュール（`@playwright/mcp` の同梱 playwright）+ Chromium-for-Testing バイナリ (`~/.cache/ms-playwright/chromium-1217/chrome-linux64/chrome`) を `executablePath` 指定で使用する Node.js スクリプト (`.sisyphus/evidence/task-14-runner.mjs`) を作成して回避。
- セレクタ: タスク入力は `.task-slot input`、開始ボタンは `.task-slot .btn-start-direct`、終了は `#btn-finish-focus`、サマリは `#summary-modal`。

## [2026-04-30] T16: Vitest setupFiles 追加完了
- `tests/setup.js` を追加し、matchMedia / AudioContext / URL.createObjectURL を最小 stub 化
- `vitest.config.js` に `setupFiles: ['./tests/setup.js']` を追加
- `npm test`: 177 passed, 7 files
- 証跡: `.sisyphus/evidence/task-16-tests.log`

## [2026-04-30] T17: i18n テスト追加
- `t(key, vars, language)` は未知言語を ja に落とし、未定義 vars でも空文字補間で落ちない
- 既存翻訳キーの実在確認には `TRANSLATIONS` の ja/en 両方を直接検証するのが安全
- 証跡: `.sisyphus/evidence/task-17-i18n-tests.log`

## [2026-04-30] T18+T19+T21+T22: tasks/state/theme/ui テスト追加
- tasks.js: モジュールスコープに `let tasks = ['']` を持つので各テスト前 `setTasks([''])` + `localStorage.clear()` で状態リセット
- state.js: `appInitialized` をモジュール内に保持し `initSettings()` のガードに使うため、テスト前に `vi.resetModules()` + 動的 import で完全リセット
- theme.js: `getSystemThemeMedia()` の結果（matchMedia stub の戻り値）を直接検証可能
- ui.js: jsdom は `offsetParent` を実装しておらず常に `null` を返すため、`getFocusableElements` の hidden 除外テストには `vi.spyOn(HTMLElement.prototype, 'offsetParent', 'get')` で `this.hidden ? null : document.body` を返すモック実装が必要。基本動作のテストでは `.toggle-switch` クラスをコンテナに付けると `el.closest('.toggle-switch')` フォールバックで保持される
- 追加テスト数: tasks=8, state=6, theme=4, ui=7 = 計 25
- 全テスト: 210 passed (12 files)
- 証跡: .sisyphus/evidence/task-{18,19,21,22}-*-tests.log

## 2026-04-30 T20/T23/T24/T25
- timer.js tests require vi.useFakeTimers + vi.setSystemTime; call stopFocusTimer/stopPauseTimer before/after to reset module-scope intervals.
- export.js download tests should spy on document.createElement while returning real jsdom anchors; plain object anchors fail appendChild Node checks.
- app.js smoke can use a simplified public_html DOM fixture if all IDs referenced by initApp/applyStaticTranslations/event binding are present.

## [2026-04-30] F3: 実機 QA (final-qa) 完了
- 8/8 シナリオ全てパス、pageerror=0、console.error=0、VERDICT: APPROVE
- 主要フロー: main → focus(00:02→00:05 progresses) → summary 動作確認
- ログ確認: localStorage.logs_v2 は配列ではなく `{ "YYYY-MM-DD": [seg, ...] }` のオブジェクト形式（loadLogs() の実装を確認すること）
- 言語切替（ja/en）: `#settings-language-label` が「言語」⇄「Language」、`#settings-theme-label` が「テーマ」⇄「Theme」を確認
- テーマ切替: light → data-theme=light, dark → data-theme=dark, system → light or dark に解決
- セレクタ落とし穴: `<input type="radio" name="setting-theme">` は CSS で視覚的に隠されており、Playwright の `.check()` で `<label>` がポインタイベントを intercept してタイムアウトする。代わりに `#theme-option-{system|light|dark}` および `#language-option-{ja|en}` の `<span class="theme-option-label">` を click すると正しく radio が選択される。
- 証跡: `.sisyphus/evidence/final-qa/` (01-initial-main.png ～ 07-final-state.png + final-qa.log + report.json)
- ランナー: `.sisyphus/evidence/final-qa-runner.mjs`（Playwright + Chromium-for-Testing）
