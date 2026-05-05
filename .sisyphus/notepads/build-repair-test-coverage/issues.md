# Issues

## [2026-04-30] Session Start
- build.js の MODULE_ORDER が 8 モジュールしか含まず、抽出済みの 9 モジュールが dist に inline されない
- tasks.js, state.js, timer.js, export.js は git untracked でコミット前
- app.js 内に重複実装あり（function t, applyTheme$app, function playBeep, tasks 配列, addTask, focusIntervalId, downloadFile, exportLogsAs* など）
- dist/index.html は MAX_TASKS, applyTheme, setText, trapFocus, initAudio, TRANSLATIONS 等が未定義参照のまま
- src/timer.js:6 は storage.js から invalidateFocusTimeCache を import するが、storage.js はそれを export していない（壊れている）

## [2026-04-30T10:57] F2 コード品質レビュー所見

### 軽微（hint レベル、機能影響なし）
- src/app.js:52-58 で `void` を使った 7 個の未使用 import 抑制
  - getFocusableElements, getAudioContext, getCurrentTrapCleanup, getFocusElapsed, isTimerRunning, getPauseElapsed, downloadFile
  - 適切な対処は import 文から削除すること（`void` は code smell）
- src/export.js: loadTasks, loadSettings, tasks, settings 引数が未使用
- src/state.js: saveActiveState, clearActiveState 未使用、import 行全体未使用（line 2）
- src/tasks.js: MAX_TASK_NAME_LENGTH, UNDO_TIMEOUT_MS, loadTasks 未使用
- src/theme.js: BOUNDARY_HOUR 未使用
- 既存（修正対象外）: src/audio.js / tests/setup.js の webkitAudioContext 型 hint、tests/stats.test.js の deprecated `substr`

### 既存 empty catch（設計判断、許容）
- src/app.js:93 - 言語切替時の JSON parse fallback
- src/storage.js:76 - loadTasks の corrupt data graceful degradation
- src/storage.js:110 - loadSettings の corrupt data graceful degradation
- いずれも localStorage 破損時のデフォルト復元として意図的

### 確認済み（PASS）
- console.log/warn/error は src/ にゼロ
- commented-out コードなし（実コメントは `//` 2 件のみ、いずれも意味あり）
- detectCollisions ビルド実行で衝突警告ゼロ（重複実装が完全削除された証左）
- invalidateFocusTimeCache は storage.js から正しく export され、timer.js / app.js から呼ばれる
- イベントループ `focus-time-cache-invalidated` は app.js の listener で処理
- transformModule は import 削除・export prefix 削除・改行統一を適切に処理
- tests/setup.js stub（matchMedia / AudioContext / URL.createObjectURL）は適切

### テスト件数
- 「既存 177」と記載されたが現状 229 件。F1 で +52 件（i18n 8, tasks 8, state 6, theme 4, ui 7, timer 8, audio 4, export 6, app 1）追加済み。
