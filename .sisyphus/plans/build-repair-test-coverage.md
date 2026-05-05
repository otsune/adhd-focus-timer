# Build System Repair + Test Coverage Expansion

## TL;DR

> **Quick Summary**: ADHD Focus Timer のビルドシステム不整合（`build.js` の `MODULE_ORDER` 欠落 + `app.js` 内の重複実装）を修復し、モジュール化リファクタリングを完成させた上で、未テストの9モジュールに vitest ユニットテストを追加し、`@vitest/coverage-v8` でカバレッジ計測を有効化する。
>
> **Deliverables**:
> - `build.js`: `MODULE_ORDER` を 8→17 に拡張、`transformModule` に `export async function` 対応追加
> - `src/app.js`: 重複実装を削除し、抽出済みモジュール（i18n/theme/audio/ui/state/tasks/timer/export）への import に統一
> - `src/state.js`, `tasks.js`, `timer.js`, `export.js`: git untracked 状態から正規モジュールとしてコミット可能な状態に
> - `dist/index.html`: 全シンボル解決済みで file:// から動作する状態
> - `tests/setup.js`: 新規（matchMedia, AudioContext スタブ）
> - `tests/{i18n,theme,audio,ui,state,tasks,timer,export,app}.test.js`: 9 個の新規テストファイル（合計 51+ テスト）
> - `vitest.config.js`: coverage 設定追加
> - `package.json`: `@vitest/coverage-v8` 追加、`test:coverage` script 追加
>
> **Estimated Effort**: Large
> **Parallel Execution**: YES - 6 waves
> **Critical Path**: T1 → T2 → T3 → T5..T12（並列）→ T13 → T14 → T16 → T17..T25（並列）→ T26..T28 → F1..F4

---

## Context

### Original Request
ユーザーは `/refactor` コマンドで「テストカバレッジ拡充」を選択。スコープ: module、戦略: safe。

### Pivot
Metis レビュー中に **ビルドシステムの構造的不整合** が判明：
- `build.js` の `MODULE_ORDER` が 8 モジュールしか含まず、抽出済みの 9 モジュール（`constants`, `i18n`, `theme`, `audio`, `ui`, `state`, `tasks`, `timer`, `export`）が dist に inline されない
- `tasks.js`, `state.js`, `timer.js`, `export.js` は git untracked でコミット前
- `app.js` 内に重複実装あり（`function t`, `applyTheme$app`, `function playBeep`, `tasks` 配列, `addTask`, `focusIntervalId`, `downloadFile`, `exportLogsAs*` など）
- `dist/index.html` は `MAX_TASKS`, `applyTheme`, `setText`, `trapFocus`, `initAudio`, `TRANSLATIONS` 等が **未定義参照** のまま（壊れている可能性が高い）

### User Decision Summary
| 項目 | 決定 |
|---|---|
| Source of Truth | モジュール化を完成させる |
| Dead Modules | MODULE_ORDER に追加して生かす |
| Test Expansion | 同一プランで build修復 → テスト拡充 |
| Source Modification | 許可 |
| Test Depth | 標準（Happy path + 主要エッジケース） |
| Coverage Tool | @vitest/coverage-v8 導入 |
| UI Test Strategy | unit + jsdom |
| constants.js テスト | 作成しない |

### Research Findings
- 既存テスト: 177 passed (7 files)
- 既存テストパターン: `vi.mock`/`useFakeTimers`/`setupFiles` 未使用、`vi.spyOn(Storage.prototype)` のみ
- `theme.js` は `window.matchMedia` をトップレベル評価 → `setupFiles` 必須
- `audio.js` の Web Audio API は jsdom 未対応 → グローバル stub 必須
- `timer.js` の `setInterval` + `Date.now` → `vi.useFakeTimers()` 必須（既存パターン逸脱を許可）
- `export.js` の `importFromTodoTxt` は `export async function` → `build.js` の transformModule 拡張必須
- モジュール依存関係（連結順）:
  - 第1層（依存なし）: `constants.js`, `utils.js`, `i18n.js`, `ui.js`, `date-utils.js`
  - 第2層: `storage.js` (date-utils), `audio.js` (constants), `theme.js` (constants), `milestone.js` (constants), `stats.js` (utils, date-utils), `url-tasks.js` (utils), `todotxt.js` (constants, utils)
  - 第3層: `state.js` (storage, constants), `tasks.js` (constants, storage), `timer.js` (constants, date-utils, storage), `export.js` (storage, todotxt, date-utils, constants)
  - 第4層: `app.js` (ALL)

### Metis Review (gaps addressed)
- 各モジュール最低テスト数を明示（合計 51+）
- `tests/setup.js` 集約方式を採用
- `vi.useFakeTimers()` の使用を timer.js 限定で許可
- `vi.stubGlobal('AudioContext', ...)` の使用を audio.js 限定で許可
- 既存7テストファイルは1文字も変更しない（拡張も禁止）
- 各タスク後に `npm test` 実行を強制（最終のみではない）
- カバレッジ閾値は設定しない（baseline 記録のみ）
- app.js のテストは smoke レベル（DOM fixture 注入 + `initApp()` throw なし）

---

## Work Objectives

### Core Objective
モジュール化リファクタリング途中で停止していたビルドシステムを完成させ、`dist/index.html` を完全動作可能な状態に修復した上で、抽出済みモジュール群に網羅的なユニットテストを追加する。

### Concrete Deliverables
1. `build.js`: 17モジュール対応 + `export async function` 対応 + 識別子衝突警告
2. `src/app.js`: 重複実装ゼロ、import 経由に完全統一
3. `dist/index.html`: 必要シンボル全て解決済み、file:// で正常起動
4. `tests/setup.js`: グローバル stub 集約（matchMedia, AudioContext）
5. `tests/{module}.test.js`: 9 個の新規テスト（合計 51+ テスト追加）
6. `vitest.config.js`: coverage 設定済み
7. `package.json`: `@vitest/coverage-v8` 導入、`test:coverage` script
8. `coverage/`: baseline レポート生成（閾値設定なし）

### Definition of Done
- [ ] `npm run build` 成功 + `dist/index.html` の必要 7 シンボルが全て定義済み（grep 検証）
- [ ] `npm test` で **228+ tests passed** (177 既存 + 51+ 新規)
- [ ] 既存7テストファイルの行数・テスト数が完全一致（不変保証）
- [ ] `npm test -- --coverage` で `coverage/coverage-summary.json` 生成
- [ ] `dist/index.html` を Playwright で開いて `initApp()` 完了 + 主要 UI 要素が描画
- [ ] `npm run test:e2e` 既存 E2E が緑（壊していない確認）
- [ ] `npx vitest run --sequence.shuffle=true` で全テスト緑（モジュール状態漏れ無し）

### Must Have
- `MODULE_ORDER` に `constants.js`, `i18n.js`, `ui.js`, `audio.js`, `theme.js`, `state.js`, `tasks.js`, `timer.js`, `export.js` を依存順で追加
- `transformModule` の `export async function` / `export class` 対応
- `app.js` から重複実装を削除し import に置換（`function t`, `applyTheme$app`, `function playBeep`, 状態変数, タスク配列, タイマー interval, export 関数群）
- `tests/setup.js` で `window.matchMedia` と `window.AudioContext` を stub
- 9モジュール各々に最低テスト数を達成（i18n: 8 / ui: 6 / theme: 4 / audio: 4 / tasks: 8 / state: 6 / timer: 8 / export: 6 / app: 1-3）

### Must NOT Have (Guardrails)
- **既存7テストファイル（`tests/storage.test.js`, `url-tasks.test.js`, `utils.test.js`, `todotxt.test.js`, `stats.test.js`, `milestone.test.js`, `date-utils.test.js`）の変更は一切禁止**（行数・テスト数・内容すべて不変）
- **`public_html/index.html` の構造変更禁止**（`<script type="module">` 形式維持）
- **README.md の更新禁止**（別タスクで実施）
- **CI ワークフロー（`.github/workflows/*.yml`）にテスト実行ジョブ追加禁止**（別プラン）
- **カバレッジ閾値設定禁止**（baseline 記録のみ）
- **eslint, prettier, husky, lint-staged など追加ツール導入禁止**
- **TypeScript 化禁止**
- **`tasks.js`, `state.js`, `timer.js`, `export.js` の API シグネチャ変更禁止**（既存実装を尊重）
- **AI Slop 禁止**: `as any` 相当の `// @ts-ignore`、過剰コメント、過剰抽象化、未使用変数
- **e2e テスト追加禁止**（`e2e/` 既存テストの呼び出しのみ可）
- **app.js 内の `initApp()` シグネチャ変更禁止**

---

## Verification Strategy (MANDATORY)

> **ZERO HUMAN INTERVENTION** - ALL verification is agent-executed.

### Test Decision
- **Infrastructure exists**: YES (vitest + jsdom)
- **Automated tests**: YES (TDD ではなく Tests-after — 各機能修復後にテスト追加)
- **Framework**: vitest 3.2.4
- **Setup file**: `tests/setup.js` 新規作成（vitest.config.js で `setupFiles` に追加）

### QA Policy
- **Module/Library**: Bash で vitest run（特定 test file ピンポイント実行）
- **Build artifact**: Bash で `npm run build` + `grep` で dist 内シンボル検証
- **Browser/UI**: Playwright で `dist/index.html` を `file://` で開いて `initApp()` 動作確認
- **Coverage**: Bash で `npm test -- --coverage` + `coverage/coverage-summary.json` 存在確認
- **Evidence**: `.sisyphus/evidence/task-{N}-{slug}.{ext}`

---

## Execution Strategy

### Parallel Execution Waves

```
Wave 1 (Start Immediately - Baseline):
└── T1: ベースライン記録 (test 177, build, dist 状態) [quick]

Wave 2 (After Wave 1 - Build System Foundation):
├── T2: transformModule 強化 (export async, export class) [unspecified-high]
├── T3: MODULE_ORDER 拡張 (依存順 17モジュール) [quick]
└── T4: 識別子衝突検知ロジック追加 [unspecified-high]

Wave 3 (After Wave 2 - app.js Duplicate Removal, MAX PARALLEL):
├── T5: i18n統合 (function t / TRANSLATIONS 削除) [unspecified-high]
├── T6: theme統合 (applyTheme$app 削除) [unspecified-high]
├── T7: audio統合 (function playBeep 削除) [unspecified-high]
├── T8: ui統合 (setText/setAttr/trapFocus 重複削除) [unspecified-high]
├── T9: state統合 (settings/appInitialized/trap 状態を state.js 経由) [deep]
├── T10: tasks統合 (tasks 配列管理を tasks.js 経由) [deep]
├── T11: timer統合 (focusInterval/pauseInterval を timer.js 経由) [deep]
└── T12: export統合 (downloadFile/exportLogsAs* を export.js 経由) [unspecified-high]

Wave 4 (After Wave 3 - Build Verification):
├── T13: dist ビルド + シンボル検証 [quick]
├── T14: dist 動作確認 (Playwright + file://) [unspecified-high]
└── T15: 既存 e2e テスト緑確認 [quick]

Wave 5 (After Wave 4 - Test Setup + Module Tests, MAX PARALLEL):
├── T16: tests/setup.js + vitest.config.js 更新 [quick]
├── T17: i18n.test.js (8+) [quick]
├── T18: tasks.test.js (8+) [unspecified-high]
├── T19: state.test.js (6+) [unspecified-high]
├── T20: timer.test.js (8+, fake timers) [deep]
├── T21: theme.test.js (4+) [unspecified-high]
├── T22: ui.test.js (6+) [unspecified-high]
├── T23: audio.test.js (4+, AudioContext mock) [deep]
├── T24: export.test.js (6+, Blob/URL mock) [deep]
└── T25: app.test.js (1-3, smoke) [deep]

Wave 6 (After Wave 5 - Coverage Tool):
├── T26: @vitest/coverage-v8 導入 [quick]
├── T27: vitest.config.js coverage 設定 [quick]
└── T28: .gitignore 更新 + baseline 記録 [quick]

Wave FINAL (After ALL tasks - 4 並列レビュー → user okay):
├── F1: Plan 準拠監査 (oracle)
├── F2: コード品質レビュー (unspecified-high)
├── F3: 実機 QA (unspecified-high + playwright)
└── F4: スコープ整合性チェック (deep)
-> 結果提示 -> ユーザーokay待ち

Critical Path: T1 → T2 → T3 → T5..T12 (並列) → T13 → T14 → T16 → T17..T25 (並列) → T26..T28 → F1..F4 → user okay
Parallel Speedup: ~65% 短縮（順次比）
Max Concurrent: 9 (Wave 5)
```

### Dependency Matrix

| Task | Depends On | Blocks |
|---|---|---|
| T1 | - | T2, T3, T4 |
| T2 | T1 | T13, T12 (export.js async) |
| T3 | T1 | T13, T5-T12 (app.js が import 解決) |
| T4 | T1 | T13 |
| T5-T12 | T2, T3 | T13 |
| T13 | T2, T3, T4, T5-T12 | T14 |
| T14 | T13 | T15 |
| T15 | T14 | T16 |
| T16 | T15 | T17-T25 |
| T17-T25 | T16 | T26 |
| T26 | T17-T25 | T27 |
| T27 | T26 | T28 |
| T28 | T27 | F1-F4 |
| F1-F4 | T1..T28 | (user okay) |

### Agent Dispatch Summary

- **Wave 1**: T1 → `quick`
- **Wave 2**: T2 → `unspecified-high`, T3 → `quick`, T4 → `unspecified-high`
- **Wave 3**: T5-T8, T12 → `unspecified-high`, T9-T11 → `deep`
- **Wave 4**: T13 → `quick`, T14 → `unspecified-high`, T15 → `quick`
- **Wave 5**: T16, T17 → `quick`, T18, T19, T21, T22 → `unspecified-high`, T20, T23, T24, T25 → `deep`
- **Wave 6**: T26-T28 → `quick`
- **Wave FINAL**: F1 → `oracle`, F2 → `unspecified-high`, F3 → `unspecified-high` (+playwright skill), F4 → `deep`

---

## TODOs

- [x] 1. ベースライン記録 + Wave 0 環境確認

  **What to do**:
  - `npm test` 実行 → 出力を `.sisyphus/evidence/task-1-baseline-tests.log` に保存
  - 期待: `Tests 177 passed (177)` と一致することを確認（誤認識「176」修正）
  - `npm run build` 実行 → `dist/index.html` 生成確認
  - `dist/index.html` の重要シンボル grep 結果を `.sisyphus/evidence/task-1-dist-symbols-before.txt` に保存
    - 検査対象: `function applyTheme`, `function setText`, `function setAttr`, `function trapFocus`, `function initAudio`, `const TRANSLATIONS`, `const MAX_TASKS`
  - `git status --short` 出力を `.sisyphus/evidence/task-1-git-status-before.txt` に保存（dead module の untracked 状態を記録）
  - 各テストファイルのテスト数を記録（`npx vitest run tests/<file>.test.js` 個別実行）

  **Must NOT do**:
  - ソースコードを変更しない
  - テストを実行する以外の操作をしない

  **Recommended Agent Profile**:
  - **Category**: `quick`
    - Reason: 単純な状態記録、判断不要、コマンド実行のみ
  - **Skills**: なし
  - **Skills Evaluated but Omitted**: `playwright` (現時点で UI 検証不要)

  **Parallelization**:
  - **Can Run In Parallel**: NO (Wave 1 単独タスク)
  - **Parallel Group**: Wave 1
  - **Blocks**: T2, T3, T4
  - **Blocked By**: None

  **References**:

  **Pattern References**:
  - `package.json:scripts.test` - テスト実行コマンドの確認

  **WHY Each Reference Matters**:
  - `package.json` - `npm test` が `vitest run` を実行することを前提とした検証

  **Acceptance Criteria**:

  - [ ] `.sisyphus/evidence/task-1-baseline-tests.log` 存在 + "Tests 177 passed" を含む
  - [ ] `.sisyphus/evidence/task-1-dist-symbols-before.txt` 存在
  - [ ] `.sisyphus/evidence/task-1-git-status-before.txt` 存在
  - [ ] 既存ビルドが成功すること: `npm run build` exit code 0

  **QA Scenarios**:

  ```
  Scenario: Baseline テスト実行成功
    Tool: Bash
    Preconditions: cwd = /mnt/c/Users/user/Documents/adhd-focus-timer, node_modules インストール済み
    Steps:
      1. mkdir -p .sisyphus/evidence
      2. npm test 2>&1 | tee .sisyphus/evidence/task-1-baseline-tests.log
      3. grep -E "Tests +177 passed \(177\)" .sisyphus/evidence/task-1-baseline-tests.log
    Expected Result: grep が exit code 0 で完了（"Tests 177 passed (177)" が含まれる）
    Failure Indicators: テスト数が 177 でない、テスト失敗、ファイル未生成
    Evidence: .sisyphus/evidence/task-1-baseline-tests.log

  Scenario: dist シンボル状態を記録
    Tool: Bash
    Preconditions: dist/index.html 存在
    Steps:
      1. for sym in "function applyTheme\b" "function setText" "function setAttr" "function trapFocus" "function initAudio" "const TRANSLATIONS" "const MAX_TASKS"; do
           echo "=== $sym ===" >> .sisyphus/evidence/task-1-dist-symbols-before.txt
           grep -nE "$sym" dist/index.html || echo "ABSENT" >> .sisyphus/evidence/task-1-dist-symbols-before.txt
         done
      2. cat .sisyphus/evidence/task-1-dist-symbols-before.txt
    Expected Result: 7シンボル中、最低5個が ABSENT と記録される（壊れている前提を確認）
    Failure Indicators: 全シンボル PRESENT (= 修復不要、計画前提崩壊)
    Evidence: .sisyphus/evidence/task-1-dist-symbols-before.txt
  ```

  **Evidence to Capture**:
  - [ ] task-1-baseline-tests.log
  - [ ] task-1-dist-symbols-before.txt
  - [ ] task-1-git-status-before.txt

  **Commit**: NO（記録のみ、変更なし）

- [x] 2. transformModule 強化（async/class/default export 対応）

  **What to do**:
  - `build.js` の `transformModule` 関数を強化:
    - `export async function NAME` → `async function NAME` 変換
    - `export class NAME` → `class NAME` 変換（将来用）
    - 既存 `export function`, `export const` の変換を保持
  - 多行 `import { ... }` の取り扱いも強化（必要なら）
  - 識別子衝突の警告ロジック追加（同一名の `function` / `const` が複数モジュールに出現したら console.warn）
  - 単体テスト的な動作確認: 既存 `MODULE_ORDER` で実行して `dist/index.html` が生成できることを保証

  **Must NOT do**:
  - `MODULE_ORDER` をこのタスクで変更しない（T3 で実施）
  - 既存ビルドの正常系を壊さない（regression 注意）
  - dynamic import / re-export / namespace import 対応は範囲外

  **Recommended Agent Profile**:
  - **Category**: `unspecified-high`
    - Reason: regex 強化 + 衝突検知ロジックの追加。テスト不要だが品質要求あり
  - **Skills**: なし
  - **Skills Evaluated but Omitted**: `git-master` (このタスクではコミットしない)

  **Parallelization**:
  - **Can Run In Parallel**: YES (T3, T4 と並列可)
  - **Parallel Group**: Wave 2
  - **Blocks**: T13, T12 (export.js の async function 対応必須)
  - **Blocked By**: T1

  **References**:

  **Pattern References**:
  - `build.js:transformModule関数全体` - 既存の regex ベースの変換ロジック
  - `build.js:MODULE_ORDER` - 現在のリスト（変更しないが文脈として参照）

  **API/Type References**:
  - `src/export.js:importFromTodoTxt` - `export async function` の実例（このタスクの主要対応対象）

  **External References**:
  - MDN: `async function` 構文仕様（regex で `export async function` をマッチさせる際の参考）

  **WHY Each Reference Matters**:
  - `build.js:transformModule` - 既存のロジックパターンを維持しつつ async 対応を追加するため
  - `src/export.js:importFromTodoTxt` - このタスクが扱う具体的なケース。修復後に export.js が正しくインライン化されるか左右する

  **Acceptance Criteria**:

  - [ ] `build.js` の transformModule に `export async function` の正規表現追加
  - [ ] `build.js` の transformModule に `export class` の正規表現追加（将来用）
  - [ ] 既存 `MODULE_ORDER` での `npm run build` が成功（regression なし）
  - [ ] 衝突検知ロジック追加（同一名検出時に console.warn）

  **QA Scenarios**:

  ```
  Scenario: 既存ビルドの regression なし
    Tool: Bash
    Preconditions: build.js 修正済み、MODULE_ORDER 未変更
    Steps:
      1. npm run build 2>&1 | tee .sisyphus/evidence/task-2-build-output.log
      2. test -f dist/index.html
      3. ls -l dist/index.html
    Expected Result: 既存と同様に dist/index.html が生成される（壊さない）
    Failure Indicators: ビルド失敗、dist/index.html 未生成
    Evidence: .sisyphus/evidence/task-2-build-output.log

  Scenario: export async function の変換動作確認（モック検証）
    Tool: Bash
    Preconditions: build.js が transformModule 関数を export しているか、または node REPL で require 可能
    Steps:
      1. node -e "const { transformModule } = require('./build.js'); const result = transformModule('src/test.js', 'export async function foo() { return 1; }'); console.log(result);" 2>&1 | tee .sisyphus/evidence/task-2-transform-async.log
      2. grep -q "async function foo" .sisyphus/evidence/task-2-transform-async.log
      3. ! grep -q "^export" .sisyphus/evidence/task-2-transform-async.log
    Expected Result: "async function foo" が含まれ、"export" キーワードが残らない
    Failure Indicators: "export" が残っている、または変換失敗
    Evidence: .sisyphus/evidence/task-2-transform-async.log
    Note: build.js が transformModule を export していない場合、このシナリオは T13 の dist 内検証で代替
  ```

  **Evidence to Capture**:
  - [ ] task-2-build-output.log
  - [ ] task-2-transform-async.log (オプション、build.js の構造による)

  **Commit**: YES (Wave 2 完了時にまとめてコミット、または T2 単独で)
  - Message: `refactor(build): support export async/class in transformModule`
  - Files: `build.js`
  - Pre-commit: `npm test` (177 passed 維持) + `npm run build` (成功)

- [x] 3. MODULE_ORDER 拡張（依存順 17モジュール）

  **What to do**:
  - `build.js` の `MODULE_ORDER` を以下の依存順に拡張:
    ```js
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
      // 第4層
      'src/app.js',          // -> ALL
    ];
    ```
  - `npm run build` 実行 → `dist/index.html` 再生成
  - 衝突検知（T2 の警告機能）の出力を `.sisyphus/evidence/task-3-build-warnings.log` に記録

  **Must NOT do**:
  - app.js 内の重複実装をこのタスクで削除しない（T5-T12 で実施）
  - 既存7モジュールの順序を変更しない
  - 第1層を意味なく並び替えない（依存関係に基づく）

  **Recommended Agent Profile**:
  - **Category**: `quick`
    - Reason: リスト拡張のみ、依存順は事前に確定済み
  - **Skills**: なし
  - **Skills Evaluated but Omitted**: なし

  **Parallelization**:
  - **Can Run In Parallel**: YES (T2, T4 と並列可)
  - **Parallel Group**: Wave 2
  - **Blocks**: T13, T5-T12 (app.js が import 解決可能になる前提)
  - **Blocked By**: T1

  **References**:

  **Pattern References**:
  - `build.js:MODULE_ORDER` - 現在の8モジュールリスト

  **API/Type References**:
  - `src/app.js:1-30` - 各モジュールの import 文（依存関係の確認）

  **WHY Each Reference Matters**:
  - `build.js:MODULE_ORDER` - 既存パターンを尊重しつつ拡張する
  - `src/app.js` の import 文 - 17モジュールが正しく解決される必要がある

  **Acceptance Criteria**:

  - [ ] `MODULE_ORDER` が 17 要素を持つ
  - [ ] 依存順が正しい（constants → audio/theme、storage → state/tasks/timer 等）
  - [ ] `npm run build` が成功
  - [ ] T2 の衝突検知が現状の重複実装を検出する（app.js と各モジュールの同名関数）

  **QA Scenarios**:

  ```
  Scenario: MODULE_ORDER 拡張後のビルド成功
    Tool: Bash
    Preconditions: T2 の transformModule 強化済み、build.js の MODULE_ORDER 拡張済み
    Steps:
      1. npm run build 2>&1 | tee .sisyphus/evidence/task-3-build-warnings.log
      2. test -f dist/index.html
      3. wc -l dist/index.html
    Expected Result: dist/index.html が再生成される。行数は元の dist より多い（モジュール追加分）
    Failure Indicators: ビルド失敗、SyntaxError、識別子衝突で停止
    Evidence: .sisyphus/evidence/task-3-build-warnings.log

  Scenario: dist に新モジュールのシンボルが含まれる
    Tool: Bash
    Preconditions: 前シナリオが成功
    Steps:
      1. for sym in "function applyTheme\b" "function setText" "function setAttr" "function trapFocus" "function initAudio" "const TRANSLATIONS" "const MAX_TASKS"; do
           echo "=== $sym ===" >> .sisyphus/evidence/task-3-dist-symbols-after.txt
           grep -nE "$sym" dist/index.html | head -3 >> .sisyphus/evidence/task-3-dist-symbols-after.txt || echo "ABSENT" >> .sisyphus/evidence/task-3-dist-symbols-after.txt
         done
      2. ! grep -q "ABSENT" .sisyphus/evidence/task-3-dist-symbols-after.txt
    Expected Result: 全シンボルが PRESENT
    Failure Indicators: いずれかの ABSENT が残る
    Evidence: .sisyphus/evidence/task-3-dist-symbols-after.txt
    Note: app.js の重複実装と新モジュールのシンボルが両方 PRESENT な状態（T5-T12 で重複削除）
  ```

  **Evidence to Capture**:
  - [ ] task-3-build-warnings.log（衝突警告含む）
  - [ ] task-3-dist-symbols-after.txt

  **Commit**: NO (Wave 2 完了時にまとめてコミット、T2-T4 を 1 commit)

- [x] 4. 識別子衝突検知ロジック追加

  **What to do**:
  - `build.js` に「同一識別子が複数モジュールで定義された場合に警告」する関数追加
  - 検査対象: `function NAME`, `const NAME =`, `let NAME =`, `var NAME =`, `class NAME` のトップレベル定義
  - 衝突検出時の動作:
    - `console.warn(\`[build] Duplicate identifier '${name}' in ${file1} and ${file2}\`)`
    - ビルド自体は継続（fatal にしない）
  - T3 で MODULE_ORDER 拡張後、現状の重複（app.js の `t`, `applyTheme$app` ではなく重複名 `playBeep` 等）を全て列挙して `.sisyphus/evidence/task-4-collisions.log` に保存

  **Must NOT do**:
  - 衝突を fatal error にしない（現段階では警告のみ）
  - 内部スコープの変数（関数内ローカル）を検査しない
  - regex の overfitting を避ける（コメント内の "function foo" を誤検出しない最低限の工夫）

  **Recommended Agent Profile**:
  - **Category**: `unspecified-high`
    - Reason: 一定の regex 設計 + 出力フォーマット設計が必要
  - **Skills**: なし

  **Parallelization**:
  - **Can Run In Parallel**: YES (T2, T3 と並列可だが T3 の出力に依存する場合あり)
  - **Parallel Group**: Wave 2
  - **Blocks**: T13 (衝突状況の前提として必要)
  - **Blocked By**: T1

  **References**:

  **Pattern References**:
  - `build.js:transformModule` - 既存の regex 利用パターン

  **WHY Each Reference Matters**:
  - 既存の regex スタイルに合わせて衝突検知も実装

  **Acceptance Criteria**:

  - [ ] `build.js` に collision detection 関数追加
  - [ ] `npm run build` 実行で衝突警告が console に出力される
  - [ ] `.sisyphus/evidence/task-4-collisions.log` に重複識別子のリストが記録される
  - [ ] ビルド自体は成功（fatal でない）

  **QA Scenarios**:

  ```
  Scenario: 衝突警告が出力される
    Tool: Bash
    Preconditions: T2/T3 完了済み、app.js に重複実装あり（T5-T12 未実施）
    Steps:
      1. npm run build 2>&1 | tee .sisyphus/evidence/task-4-collisions.log
      2. grep -qE "\[build\] Duplicate identifier" .sisyphus/evidence/task-4-collisions.log
    Expected Result: 警告が最低 1 個出力される（app.js の `playBeep`, `t` 等と各モジュールの重複）
    Failure Indicators: 警告ゼロ（regex バグ、または期待と異なる構造）
    Evidence: .sisyphus/evidence/task-4-collisions.log

  Scenario: ビルドが警告でも継続する
    Tool: Bash
    Preconditions: 衝突警告ありの状態
    Steps:
      1. npm run build
      2. test -f dist/index.html
      3. echo "exit: $?"
    Expected Result: exit code 0、dist/index.html 生成
    Failure Indicators: ビルド停止、exit code != 0
    Evidence: 上記コマンドの組み合わせ出力
  ```

  **Evidence to Capture**:
  - [ ] task-4-collisions.log

  **Commit**: T2/T3/T4 をまとめて
  - Message: `refactor(build): extend MODULE_ORDER, support async exports, add collision detection`
  - Files: `build.js`
  - Pre-commit: `npm test` (177 passed) + `npm run build` (成功)

- [x] 5. i18n統合（function t / 自前翻訳の削除）

  **What to do**:
  - `src/app.js` 内の `function t(key, vars, language)` 自前定義（line 85付近）を削除
  - `src/app.js` 内の自前 `TRANSLATIONS` 定義（あれば）削除
  - `import { t, TRANSLATIONS } from './i18n.js'` の alias `t_i18n` を直接 `t` 名で利用するように整理
    - 現状: `import { t as t_i18n } from './i18n.js'` の可能性 → `import { t } from './i18n.js'` に統一
  - 全ての `t(...)` 呼び出しが import 由来の関数を呼ぶことを確認
  - `npm test` (177) + `npm run build` で regression なし
  - Playwright で `dist/index.html` を開いて言語切替が動作することを確認

  **Must NOT do**:
  - `src/i18n.js` の API シグネチャを変更しない（`t(key, vars, language)`, `TRANSLATIONS` のままに）
  - 翻訳キーの内容を変更しない（i18n.js の TRANSLATIONS 既存値を尊重）
  - 他モジュール（theme/audio/ui）の重複削除はこのタスクで触らない（T6, T7, T8 で）

  **Recommended Agent Profile**:
  - **Category**: `unspecified-high`
    - Reason: app.js の修正範囲が一定量、慎重さが必要
  - **Skills**: なし

  **Parallelization**:
  - **Can Run In Parallel**: YES (T6, T7, T8, T9, T10, T11, T12 と並列可だが、競合回避のため app.js 編集は **シリアル実行を推奨**)
  - **Parallel Group**: Wave 3 (実質シリアル: T5 → T6 → T7 → T8 → T9 → T10 → T11 → T12)
  - **Blocks**: T13 (build verification)
  - **Blocked By**: T2, T3, T4

  **References**:

  **Pattern References**:
  - `src/app.js:85付近` - 自前 `function t` の定義（削除対象）
  - `src/app.js:全体` - `t(...)` 呼び出し箇所（多数）
  - `src/i18n.js:t関数` - 正規の翻訳関数（維持）

  **API/Type References**:
  - `src/i18n.js:TRANSLATIONS` - 翻訳辞書の構造
  - `src/i18n.js:t(key, vars, language)` - 期待されるシグネチャ

  **WHY Each Reference Matters**:
  - `src/app.js:function t` - 削除対象を特定するため
  - `src/i18n.js:t` - import 後の動作が同一であることを保証するため

  **Acceptance Criteria**:

  - [ ] `src/app.js` から `function t(` の定義が削除されている
  - [ ] `src/app.js` の import 文が `import { t, TRANSLATIONS } from './i18n.js'` 形式
  - [ ] `npm test` で 177 passed 維持
  - [ ] `npm run build` 成功
  - [ ] dist/index.html を開いて UI の文字列が日本語/英語両方で表示される

  **QA Scenarios**:

  ```
  Scenario: app.js から自前 t 関数が削除されている
    Tool: Bash
    Preconditions: T5 実施後
    Steps:
      1. ! grep -nE "^function t\(" src/app.js
      2. grep -nE "^import.*\{.*t.*\}.*from.*i18n" src/app.js
      3. npm test 2>&1 | grep -qE "Tests +177 passed"
    Expected Result: 自前 function t なし、import 文あり、177 tests pass
    Failure Indicators: 自前定義が残っている、import がない、テスト失敗
    Evidence: コマンド出力を .sisyphus/evidence/task-5-app-i18n.log に保存

  Scenario: 言語切替が dist で動作する
    Tool: Playwright (playwright skill)
    Preconditions: npm run build 成功、dist/index.html 存在
    Steps:
      1. browser.newContext() / page.goto("file:///mnt/c/Users/user/Documents/adhd-focus-timer/dist/index.html")
      2. 言語セレクター/トグル要素を取得（例: `[data-action="toggle-language"]` または該当 button）
      3. 初期表示が日本語（or 設定保存値）であることを確認: page.locator('h1, [data-i18n]').first().textContent() に日本語文字を含む
      4. 英語に切替: 該当ボタンクリック
      5. 切替後表示が英語: textContent に "Focus" 等の英語文字を含む
      6. screenshot を保存
    Expected Result: 言語切替後、UI 表示が変化する
    Failure Indicators: 表示文字列が変わらない、エラー、要素未発見
    Evidence: .sisyphus/evidence/task-5-i18n-toggle-ja.png, task-5-i18n-toggle-en.png

  Scenario: 翻訳キー欠落のエラーがコンソールに出ない
    Tool: Playwright
    Preconditions: 上記シナリオ完了
    Steps:
      1. page.on('console', msg => collect)
      2. ページリロード + 言語切替
      3. console errors を grep "missing translation" 等
    Expected Result: 翻訳キー欠落エラーゼロ
    Failure Indicators: "missing translation" や undefined を含むエラー
    Evidence: .sisyphus/evidence/task-5-console-log.txt
  ```

  **Evidence to Capture**:
  - [ ] task-5-app-i18n.log
  - [ ] task-5-i18n-toggle-ja.png
  - [ ] task-5-i18n-toggle-en.png
  - [ ] task-5-console-log.txt

  **Commit**: YES
  - Message: `refactor(app): use i18n module instead of inline t()`
  - Files: `src/app.js`
  - Pre-commit: `npm test` + `npm run build`

- [x] 6. theme統合（applyTheme$app の削除 + import 経由）

  **What to do**:
  - `src/app.js` の `function applyTheme$app(...)` 定義（line 93付近）を削除
  - `import { applyTheme, getSystemThemeMedia } from './theme.js'` を活かす
  - `applyTheme$app(...)` 呼び出し箇所を `applyTheme(...)` に置換
  - `src/app.js` 内の自前 `systemThemeMedia` 変数（あれば）を `getSystemThemeMedia()` 経由に
  - `npm test` (177) + `npm run build` で regression なし
  - Playwright で `dist/index.html` を開いて light/dark/system テーマ切替動作を確認

  **Must NOT do**:
  - `src/theme.js` の API シグネチャを変更しない（`applyTheme(mode)`, `getSystemThemeMedia()`）
  - `data-theme-mode` / `data-theme` 属性命名を変更しない
  - matchMedia の listener 登録ロジックを theme.js から app.js に移動しない（責務分離維持）

  **Recommended Agent Profile**:
  - **Category**: `unspecified-high`
    - Reason: app.js 修正 + 動作確認の慎重さ
  - **Skills**: `playwright`（dist 動作検証用）

  **Parallelization**:
  - **Can Run In Parallel**: YES (T5 完了後、T7, T8 等と並列可だが app.js 競合回避でシリアル推奨)
  - **Parallel Group**: Wave 3 (T5 の後)
  - **Blocks**: T13
  - **Blocked By**: T2, T3, T4 (理想的には T5)

  **References**:

  **Pattern References**:
  - `src/app.js:93付近` - `function applyTheme$app` 定義
  - `src/theme.js:applyTheme` - 正規の関数

  **API/Type References**:
  - `src/theme.js:applyTheme(mode)` - mode は `'system'|'light'|'dark'`
  - `src/theme.js:getSystemThemeMedia()` - matchMedia 結果を返す

  **WHY Each Reference Matters**:
  - `applyTheme$app` の動作（dataset 更新）が `applyTheme` と一致するか確認するため
  - `getSystemThemeMedia` の listener 登録ロジックが app.js 内にある場合、それを theme.js 経由に移すか判断

  **Acceptance Criteria**:

  - [ ] `src/app.js` から `function applyTheme$app` の定義が削除
  - [ ] `applyTheme$app(...)` の呼び出しが全て `applyTheme(...)` に置換
  - [ ] `npm test` で 177 passed 維持
  - [ ] `npm run build` 成功
  - [ ] dist/index.html で light/dark/system テーマ切替が動作

  **QA Scenarios**:

  ```
  Scenario: app.js から applyTheme$app が削除されている
    Tool: Bash
    Preconditions: T6 実施後
    Steps:
      1. ! grep -nE "applyTheme\\\$app" src/app.js
      2. grep -nE "^import.*applyTheme.*from.*theme" src/app.js
      3. npm test 2>&1 | grep -qE "Tests +177 passed"
    Expected Result: 削除済み、import あり、テスト緑
    Failure Indicators: 残存、テスト失敗
    Evidence: .sisyphus/evidence/task-6-app-theme.log

  Scenario: テーマ切替が dist で動作
    Tool: Playwright
    Preconditions: T6 実施後、npm run build 成功
    Steps:
      1. page.goto("file:///mnt/c/Users/user/Documents/adhd-focus-timer/dist/index.html")
      2. document.documentElement.dataset.themeMode の初期値確認
      3. テーマセレクター（settings 内 or トップレベル）でダーク選択
      4. document.documentElement.dataset.themeMode === 'dark' を確認
      5. screenshot保存（dark mode 表示）
      6. ライト選択 → dataset 更新確認 → screenshot
      7. システム選択 → dataset 'system' + 内部 data-theme が prefers-color-scheme に応じて変化
    Expected Result: 各モードで dataset と表示が一致
    Failure Indicators: dataset 更新されない、表示不変、エラー
    Evidence: .sisyphus/evidence/task-6-theme-light.png, task-6-theme-dark.png, task-6-theme-system.png

  Scenario: ページリロード後にテーマが永続化
    Tool: Playwright
    Preconditions: 前シナリオでダーク設定済み
    Steps:
      1. page.reload()
      2. document.documentElement.dataset.themeMode === 'dark' を確認
    Expected Result: localStorage から復元されダークが維持
    Failure Indicators: light に戻る
    Evidence: .sisyphus/evidence/task-6-theme-persist.png
  ```

  **Evidence to Capture**:
  - [ ] task-6-app-theme.log
  - [ ] task-6-theme-light.png, task-6-theme-dark.png, task-6-theme-system.png
  - [ ] task-6-theme-persist.png

  **Commit**: YES
  - Message: `refactor(app): use theme module instead of applyTheme$app`
  - Files: `src/app.js`
  - Pre-commit: `npm test` + `npm run build`

- [x] 7. audio統合（自前 playBeep 削除 + import 経由）

  **What to do**:
  - `src/app.js` の `function playBeep(type)` 自前定義（line 153付近）を削除
  - `function initAudioWrapper(...)` があれば確認（残すか統合するか判断）
  - `import { initAudio, getAudioContext, playBeep } from './audio.js'` を活かす
  - `playBeep(...)` 呼び出しが import 由来であることを確認
  - `initAudio()` の呼び出しタイミング（ユーザーインタラクション後）を維持
  - `npm test` (177) + `npm run build` で regression なし
  - Playwright で `dist/index.html` を開いてセッション開始/節目通知時の音声を確認（音声出力は jsdom で限定的だが、AudioContext の生成と suspended → resume の遷移は検証可能）

  **Must NOT do**:
  - `src/audio.js` の API シグネチャを変更しない
  - `playBeep('start')` / `playBeep('milestone')` の type 値を変更しない
  - AudioContext の lazy 生成パターンを変更しない（ユーザーインタラクションまで遅延）

  **Recommended Agent Profile**:
  - **Category**: `unspecified-high`
    - Reason: 音声まわりは副作用が見えにくいため検証注意
  - **Skills**: `playwright`

  **Parallelization**:
  - **Can Run In Parallel**: T5/T6 完了後 (app.js 競合回避でシリアル推奨)
  - **Parallel Group**: Wave 3
  - **Blocks**: T13
  - **Blocked By**: T2, T3, T4

  **References**:

  **Pattern References**:
  - `src/app.js:153付近` - 自前 `function playBeep` 定義
  - `src/audio.js:playBeep関数` - 正規実装

  **API/Type References**:
  - `src/audio.js:initAudio()` - lazy 生成
  - `src/audio.js:playBeep(type)` - type は `'start'|'milestone'`

  **WHY Each Reference Matters**:
  - 自前 playBeep と audio.js の playBeep の挙動が同等か確認
  - lazy 生成パターンの維持が必要

  **Acceptance Criteria**:

  - [ ] `src/app.js` から `function playBeep(` の定義が削除
  - [ ] `playBeep('start')`, `playBeep('milestone')` の呼び出しが import 由来
  - [ ] `npm test` で 177 passed 維持
  - [ ] `npm run build` 成功
  - [ ] dist で AudioContext が初回ユーザーインタラクション後に生成

  **QA Scenarios**:

  ```
  Scenario: app.js から自前 playBeep が削除
    Tool: Bash
    Preconditions: T7 実施後
    Steps:
      1. ! grep -nE "^function playBeep\(" src/app.js
      2. grep -nE "^import.*playBeep.*from.*audio" src/app.js
      3. npm test 2>&1 | grep -qE "Tests +177 passed"
    Expected Result: 削除済み、import あり、177 passed
    Failure Indicators: 残存、テスト失敗
    Evidence: .sisyphus/evidence/task-7-app-audio.log

  Scenario: dist で AudioContext lazy 生成 + start 時に音声トリガー
    Tool: Playwright
    Preconditions: T7 実施後、build 成功
    Steps:
      1. page.goto("file://...dist/index.html")
      2. await page.evaluate(() => window.audioCtx === null || typeof window.audioCtx === 'undefined') → 初期値 null/undefined
      3. タスク追加 + 集中開始ボタンクリック（最初のユーザーインタラクション）
      4. await page.evaluate(() => !!document.querySelector('audio') || !!window.audioCtx) → AudioContext が生成された証跡
      5. screenshot保存（タイマー画面）
    Expected Result: 集中開始後に AudioContext が生成される（または音声が再生される証跡）
    Failure Indicators: クリックで何も起きない、エラー
    Evidence: .sisyphus/evidence/task-7-audio-on-start.png
    Note: jsdom と Playwright の制約上、音声波形までは検証できない。AudioContext の存在 + 例外なしを確認するに留める。
  ```

  **Evidence to Capture**:
  - [ ] task-7-app-audio.log
  - [ ] task-7-audio-on-start.png

  **Commit**: YES
  - Message: `refactor(app): use audio module instead of inline playBeep`
  - Files: `src/app.js`
  - Pre-commit: `npm test` + `npm run build`

- [x] 8. ui統合（DOM ヘルパーの import 経由化）

  **What to do**:
  - `src/app.js` の自前 `setText`, `setAttr`, `getFocusableElements`, `trapFocus` 定義（あれば）を削除
  - `import { setText, setAttr, getFocusableElements, trapFocus } from './ui.js'` を活かす
  - 呼び出し箇所が import 由来であることを確認
  - `npm test` (177) + `npm run build` で regression なし
  - Playwright でモーダルのフォーカストラップが動作することを確認

  **Must NOT do**:
  - `src/ui.js` の API シグネチャを変更しない
  - フォーカストラップの挙動を変更しない（Tab 循環ループ）
  - `setText(id, text)` の id 引数仕様を変更しない

  **Recommended Agent Profile**:
  - **Category**: `unspecified-high`
    - Reason: DOM 操作と focus trap の細かい挙動確認が必要
  - **Skills**: `playwright`

  **Parallelization**:
  - **Can Run In Parallel**: T5-T7 完了後 (app.js 競合回避でシリアル推奨)
  - **Parallel Group**: Wave 3
  - **Blocks**: T13
  - **Blocked By**: T2, T3, T4

  **References**:

  **Pattern References**:
  - `src/app.js` - `setText`/`setAttr`/`trapFocus` 自前定義（あれば line 確認）
  - `src/ui.js` 全体 - 正規の DOM helpers

  **API/Type References**:
  - `src/ui.js:setText(id, text)` - getElementById で text 更新
  - `src/ui.js:setAttr(id, name, value)` - getElementById で属性更新
  - `src/ui.js:trapFocus(modalElement)` - cleanup function を返す

  **WHY Each Reference Matters**:
  - 重複定義の特定 + 削除のため
  - trapFocus の cleanup function 戻り値が app.js で正しく扱われているか

  **Acceptance Criteria**:

  - [ ] `src/app.js` から `function setText`, `function setAttr`, `function trapFocus`, `function getFocusableElements` の自前定義が削除
  - [ ] import 文が `import { setText, setAttr, getFocusableElements, trapFocus } from './ui.js'` 形式
  - [ ] `npm test` で 177 passed 維持
  - [ ] `npm run build` 成功
  - [ ] dist でモーダルが開いた際に focus trap が動作

  **QA Scenarios**:

  ```
  Scenario: app.js から DOM helpers の自前定義が削除
    Tool: Bash
    Preconditions: T8 実施後
    Steps:
      1. ! grep -nE "^function setText\(" src/app.js
      2. ! grep -nE "^function setAttr\(" src/app.js
      3. ! grep -nE "^function trapFocus\(" src/app.js
      4. grep -nE "^import.*setText.*from.*ui" src/app.js
      5. npm test 2>&1 | grep -qE "Tests +177 passed"
    Expected Result: 自前定義なし、import あり、177 passed
    Failure Indicators: 残存、テスト失敗
    Evidence: .sisyphus/evidence/task-8-app-ui.log

  Scenario: モーダルでフォーカストラップが動作
    Tool: Playwright
    Preconditions: T8 実施後、build 成功、設定モーダルがある前提
    Steps:
      1. page.goto("file://...dist/index.html")
      2. 設定モーダルを開く（設定ボタン click）
      3. await page.locator('[role="dialog"]').isVisible() === true
      4. Tab 連打 → focus がモーダル内をループ（document.activeElement がモーダル内のまま）
      5. Shift+Tab で逆方向ループ確認
      6. Esc キーでモーダル閉じる → focus 戻り元の要素に戻る
      7. screenshot保存
    Expected Result: focus がモーダル外に escape しない、Esc で閉じる
    Failure Indicators: focus が body に escape、Esc 無効
    Evidence: .sisyphus/evidence/task-8-focus-trap.png

  Scenario: setText/setAttr が DOM を正しく更新
    Tool: Playwright
    Preconditions: T8 実施後
    Steps:
      1. dist 起動 → タイマー表示の値が 00:00 等の初期値
      2. 集中開始
      3. 1秒待機 → タイマー表示が 00:01 などに更新
      4. await page.locator('[data-timer]').textContent() で値取得
    Expected Result: setText 経由で DOM が更新される
    Failure Indicators: タイマー表示が変わらない
    Evidence: .sisyphus/evidence/task-8-timer-update.png
  ```

  **Evidence to Capture**:
  - [ ] task-8-app-ui.log
  - [ ] task-8-focus-trap.png
  - [ ] task-8-timer-update.png

  **Commit**: YES
  - Message: `refactor(app): use ui module for DOM helpers and focus trap`
  - Files: `src/app.js`
  - Pre-commit: `npm test` + `npm run build`

- [x] 9. state統合（settings/appInitialized/trap 状態を state.js 経由）

  **What to do**:
  - `src/app.js` 内の自前状態変数を state.js の getter/setter 経由に置換:
    - `let appInitialized = false` → `setAppInitialized()`/`isAppInitialized()` 経由
    - `let lastFocusedElement = null` → `getLastFocusedElement()`/`setLastFocusedElement()` 経由
    - `let currentTrapCleanup = null` → `getCurrentTrapCleanup()`/`setCurrentTrapCleanup()`/`clearTrapCleanup()` 経由
    - `let settings = ...` → `getSettings()`/`updateSettings()`/`setSetting()`/`getSetting()` 経由
    - `function loadSettings()` 自前定義を削除（state.js の `initSettings()` を呼ぶ）
    - `function saveSettings()` 自前定義を削除（state.js の `updateSettings()` を呼ぶ）
  - `import { initSettings, getSettings, updateSettings, setSetting, getSetting, isAppInitialized, setAppInitialized, getLastFocusedElement, setLastFocusedElement, getCurrentTrapCleanup, setCurrentTrapCleanup, clearTrapCleanup } from './state.js'` を追加
  - `npm test` (177) + `npm run build` で regression なし
  - Playwright で設定が永続化することを確認

  **Must NOT do**:
  - `src/state.js` の API シグネチャを変更しない
  - 設定の構造（`{ language, themeMode, soundEnabled, ... }`）を変更しない
  - `localStorage` キー (`settings_v2`) を変更しない
  - state.js のモジュールスコープ変数（state.js 内部の状態）に直接アクセスしない（必ず getter/setter 経由）

  **Recommended Agent Profile**:
  - **Category**: `deep`
    - Reason: 状態管理は副作用が多く、慎重な置換が必要。複数 getter/setter の整合性確保
  - **Skills**: なし

  **Parallelization**:
  - **Can Run In Parallel**: T5-T8 完了後 (app.js 競合回避でシリアル推奨)
  - **Parallel Group**: Wave 3
  - **Blocks**: T13
  - **Blocked By**: T2, T3, T4

  **References**:

  **Pattern References**:
  - `src/app.js` - 自前 `let appInitialized`, `let lastFocusedElement`, `let currentTrapCleanup`, `let settings`, `function loadSettings`, `function saveSettings`
  - `src/state.js` 全体 - 正規の状態管理 API

  **API/Type References**:
  - `src/state.js:getSettings()` - 設定オブジェクト返却
  - `src/state.js:updateSettings(newSettings)` - 部分更新
  - `src/state.js:setSetting(key, value)` - 個別キー更新
  - `src/storage.js:saveSettings/loadSettings` - 永続化（state.js が呼ぶ）

  **WHY Each Reference Matters**:
  - state.js は内部でモジュールスコープに変数を持つため、app.js から直接代入できない → API 経由必須
  - `currentTrapCleanup` の cleanup 実行タイミング（モーダルクローズ時）を維持

  **Acceptance Criteria**:

  - [ ] `src/app.js` から `let appInitialized`, `let lastFocusedElement`, `let currentTrapCleanup`, `let settings` の宣言が削除
  - [ ] `function loadSettings`, `function saveSettings` の自前定義が削除
  - [ ] import 文に上記 12 個の関数が追加
  - [ ] 全ての `settings.X` 参照が `getSetting('X')` または `getSettings().X` に置換
  - [ ] `settings.X = Y` 代入が `setSetting('X', Y)` または `updateSettings({ X: Y })` に置換
  - [ ] `npm test` で 177 passed 維持
  - [ ] `npm run build` 成功
  - [ ] 設定変更（言語/テーマ/音）→ ページリロード → 値が永続化されている

  **QA Scenarios**:

  ```
  Scenario: app.js から自前状態が削除
    Tool: Bash
    Preconditions: T9 実施後
    Steps:
      1. ! grep -nE "^let appInitialized" src/app.js
      2. ! grep -nE "^let lastFocusedElement" src/app.js
      3. ! grep -nE "^let currentTrapCleanup" src/app.js
      4. ! grep -nE "^let settings = " src/app.js
      5. ! grep -nE "^function loadSettings\(" src/app.js
      6. ! grep -nE "^function saveSettings\(" src/app.js
      7. grep -nE "^import.*\{.*getSettings.*\}.*from.*state" src/app.js
      8. npm test 2>&1 | grep -qE "Tests +177 passed"
    Expected Result: 自前定義なし、import あり、テスト緑
    Failure Indicators: いずれか残存、テスト失敗
    Evidence: .sisyphus/evidence/task-9-app-state.log

  Scenario: 設定永続化が動作
    Tool: Playwright
    Preconditions: T9 実施後、build 成功
    Steps:
      1. page.goto("file://...dist/index.html")
      2. 言語を「English」に変更
      3. テーマを「Dark」に変更
      4. await page.evaluate(() => JSON.parse(localStorage.getItem('settings_v2'))) で値確認
      5. page.reload()
      6. UI 表示が English + Dark のままであることを確認
    Expected Result: localStorage に保存され、リロード後も維持
    Failure Indicators: 設定が初期値に戻る
    Evidence: .sisyphus/evidence/task-9-settings-persist.png + task-9-localstorage.json

  Scenario: モーダルクローズ時の trap cleanup
    Tool: Playwright
    Preconditions: 設定モーダル + フォーカストラップ動作
    Steps:
      1. 設定モーダルを開く
      2. await page.evaluate(() => /* getCurrentTrapCleanup() === null ではない */ true)
      3. Esc でモーダルを閉じる
      4. 元の trigger 要素にフォーカスが戻る
    Expected Result: cleanup が実行され、focus 復帰
    Failure Indicators: focus が body に残る、エラー
    Evidence: .sisyphus/evidence/task-9-trap-cleanup.png
  ```

  **Evidence to Capture**:
  - [ ] task-9-app-state.log
  - [ ] task-9-settings-persist.png
  - [ ] task-9-localstorage.json
  - [ ] task-9-trap-cleanup.png

  **Commit**: YES
  - Message: `refactor(app): use state module for app-level state`
  - Files: `src/app.js`
  - Pre-commit: `npm test` + `npm run build`

- [x] 10. tasks統合（tasks 配列管理を tasks.js 経由）

  **What to do**:
  - `src/app.js` 内の自前 `let tasks = ...` 定義を削除
  - `function addTask`, `function removeTask`, `function updateTask`, `function reorderTasks` 等の自前定義を tasks.js の API 呼び出しに置換
  - `import { getTasks, getValidTasks, getTaskAt, setTaskAt, addNewTask, removeTaskAt, getTaskCount, canAddTask, setTasks, reorderTask } from './tasks.js'` を追加
  - `tasks` 配列への直接アクセスを `getTasks()` 経由に
  - 配列代入を `setTasks()` 経由に
  - `npm test` (177) + `npm run build` で regression なし
  - Playwright でタスク追加/削除/編集が動作することを確認

  **Must NOT do**:
  - `src/tasks.js` の API シグネチャを変更しない
  - `MAX_TASKS` 上限の値を変更しない（constants.js）
  - localStorage キー (`tasks_v2`) を変更しない
  - undo 機能（あれば）の挙動を変更しない

  **Recommended Agent Profile**:
  - **Category**: `deep`
    - Reason: タスク管理は CRUD + 永続化 + UI 更新が絡む。慎重な置換が必要
  - **Skills**: `playwright`

  **Parallelization**:
  - **Can Run In Parallel**: T9 完了後 (app.js 競合回避でシリアル推奨)
  - **Parallel Group**: Wave 3
  - **Blocks**: T13
  - **Blocked By**: T2, T3, T4

  **References**:

  **Pattern References**:
  - `src/app.js` - 自前 `let tasks`, タスク CRUD 関数
  - `src/tasks.js` 全体 - 正規の API

  **API/Type References**:
  - `src/tasks.js:getTasks()` - 配列の参照を返す（書換可能か確認）
  - `src/tasks.js:setTasks(newTasks)` - 配列全体置換
  - `src/tasks.js:addNewTask()` - 上限チェック付き追加
  - `src/tasks.js:removeTaskAt(index)` - 削除

  **WHY Each Reference Matters**:
  - tasks.js が永続化（saveTasks）を内部で呼ぶか確認 → 呼ばないなら app.js 側で saveTasks を残す必要あり

  **Acceptance Criteria**:

  - [ ] `src/app.js` から `let tasks =` の宣言が削除
  - [ ] タスク CRUD 関数の自前定義が削除（または tasks.js のラッパーに変換）
  - [ ] import 文に tasks.js の API が追加
  - [ ] `npm test` で 177 passed 維持
  - [ ] `npm run build` 成功
  - [ ] dist でタスクの追加/編集/削除/並び替えが動作

  **QA Scenarios**:

  ```
  Scenario: app.js から tasks 配列の自前管理が削除
    Tool: Bash
    Preconditions: T10 実施後
    Steps:
      1. ! grep -nE "^let tasks = \[" src/app.js
      2. grep -nE "^import.*\{.*getTasks.*\}.*from.*tasks" src/app.js
      3. npm test 2>&1 | grep -qE "Tests +177 passed"
    Expected Result: 自前 tasks 配列なし、import あり、テスト緑
    Failure Indicators: 残存、テスト失敗
    Evidence: .sisyphus/evidence/task-10-app-tasks.log

  Scenario: タスク CRUD 動作確認
    Tool: Playwright
    Preconditions: T10 実施後、build 成功
    Steps:
      1. page.goto("file://...dist/index.html")
      2. 「タスク追加」ボタンクリック → 入力欄表示 → "テストタスク1" 入力 → Enter
      3. タスクリストに "テストタスク1" が表示される
      4. await page.evaluate(() => JSON.parse(localStorage.getItem('tasks_v2'))) で確認
      5. タスクを 5 個追加（MAX_TASKS の前提によるが、上限テスト）
      6. 上限超過しようとした際の挙動確認（追加ボタンが無効、またはアラート）
      7. タスク削除 → リストから消える
      8. ドラッグ＆ドロップで並び替え（可能なら）
    Expected Result: 全 CRUD 操作が動作
    Failure Indicators: 追加できない、削除できない、永続化されない
    Evidence: .sisyphus/evidence/task-10-tasks-crud.png + task-10-tasks-localstorage.json
  ```

  **Evidence to Capture**:
  - [ ] task-10-app-tasks.log
  - [ ] task-10-tasks-crud.png
  - [ ] task-10-tasks-localstorage.json

  **Commit**: YES
  - Message: `refactor(app): use tasks module for task list management`
  - Files: `src/app.js`
  - Pre-commit: `npm test` + `npm run build`

- [x] 11. timer統合（focusInterval/pauseInterval を timer.js 経由）

  > **CRITICAL PRE-REQUISITE**: `src/timer.js:6` は `import { saveFocusSegment, invalidateFocusTimeCache } from './storage.js'` を行うが、`storage.js` は `invalidateFocusTimeCache` を export していない（現状壊れている）。
  > このタスクの最初のサブステップとして、`src/app.js:577` の `function invalidateFocusTimeCache()` を `src/storage.js` に移動し export することを必須とする。

  **What to do**:

  **Sub-step 0 (PRE-REQUISITE - 必ず最初に実施)**:
  - `src/app.js:577` の `function invalidateFocusTimeCache()` 実装を読む
  - 同実装を `src/storage.js` に移動して `export function invalidateFocusTimeCache()` として公開
  - `src/app.js:577` の自前定義を削除
  - `src/app.js` の `invalidateFocusTimeCache()` 呼び出し（line 380, 395, 413, 662, 846）が動作するように、app.js の import 文に `invalidateFocusTimeCache` を `./storage.js` から追加
  - これにより `src/timer.js:6` の import が解決可能になる
  - `npm test` で 177 passed が維持されることを確認

  **Sub-step 1 (本来のタスク)**:
  - `src/app.js` 内の自前タイマー状態を timer.js 経由に置換:
    - `let focusIntervalId = null` → timer.js の内部状態に
    - `let focusSegmentStartedAt = null` → timer.js
    - `let currentTaskName = ''` → timer.js
    - `let lastNotifiedMilestone = -1` → timer.js (`getLastMilestone`/`setLastMilestone`)
    - `let pauseIntervalId = null` → timer.js
    - `let pausedAt = null` → timer.js
    - `function tickFocusTimer` 自前定義を削除（timer.js の callback として渡す）
    - `function startFocus`, `function stopFocus` 等を timer.js の `startFocusTimer`, `stopFocusTimer` 呼び出しに置換
  - `import { startFocusTimer, stopFocusTimer, getFocusElapsed, getFocusStartTime, getCurrentTaskName, getLastMilestone, setLastMilestone, isTimerRunning, getPauseElapsed, startPauseTimer, stopPauseTimer } from './timer.js'` を追加
  - 4時境界処理（midnightFn callback）の動作を維持
  - 節目通知（milestoneFn callback）との連携を維持
  - `npm test` (177) + `npm run build` で regression なし
  - Playwright でタイマー動作 + 節目通知を確認（時刻モック必要）

  **Must NOT do**:
  - `src/timer.js` の API シグネチャを変更しない
  - `setInterval` の周期（1000ms）を変更しない
  - 4時境界判定ロジックを変更しない
  - 節目（15分ごと）の値を変更しない（`MILESTONE_INTERVAL_SECONDS`）

  **Recommended Agent Profile**:
  - **Category**: `deep`
    - Reason: タイマー + 副作用 + 4時境界 + 節目通知の絡む複雑な置換
  - **Skills**: `playwright`

  **Parallelization**:
  - **Can Run In Parallel**: T10 完了後 (app.js 競合回避でシリアル推奨)
  - **Parallel Group**: Wave 3
  - **Blocks**: T13
  - **Blocked By**: T2, T3, T4

  **References**:

  **Pattern References**:
  - `src/app.js` - 自前 `focusIntervalId`, `tickFocusTimer`, `startFocus` 関連
  - `src/timer.js` 全体 - 正規 API
  - `src/milestone.js` - 節目通知ロジック（timer の callback で呼ばれる）

  **API/Type References**:
  - `src/timer.js:startFocusTimer(taskName, startTime, tickFn, midnightFn)` - 4 引数
  - `src/timer.js:tickFn(elapsedSeconds)` - 1秒ごとに呼ばれる callback
  - `src/timer.js:midnightFn(beforeMidnightSeconds, afterMidnightStartTime)` - 4時境界 callback

  **WHY Each Reference Matters**:
  - tickFn の中で UI 更新 + 節目通知判定が行われる → app.js が callback を渡す責務
  - midnightFn の中で日跨ぎセッション保存 → app.js が callback を渡す責務

  **Acceptance Criteria**:

  - [ ] `src/storage.js` に `export function invalidateFocusTimeCache()` 追加（app.js から移動）
  - [ ] `src/app.js:577` の `function invalidateFocusTimeCache()` 自前定義削除
  - [ ] `src/timer.js:6` の import が解決可能（`storage.js` が export している）
  - [ ] `src/app.js` から `let focusIntervalId`, `let pauseIntervalId`, `let focusSegmentStartedAt`, `let currentTaskName`, `let lastNotifiedMilestone`, `let pausedAt` の宣言削除
  - [ ] `function tickFocusTimer` 自前定義を削除（callback として timer.js に渡す形に）
  - [ ] import 文に timer.js の API 追加
  - [ ] `npm test` で 177 passed 維持
  - [ ] `npm run build` 成功
  - [ ] dist で集中開始 → タイマー動作 → 終了の主要フローが動作

  **QA Scenarios**:

  ```
  Scenario: invalidateFocusTimeCache が storage.js に移動済み
    Tool: Bash
    Preconditions: T11 sub-step 0 完了後
    Steps:
      1. grep -nE "^export function invalidateFocusTimeCache" src/storage.js
      2. ! grep -nE "^function invalidateFocusTimeCache" src/app.js
      3. grep -nE "^import.*\{.*invalidateFocusTimeCache.*\}.*from.*storage" src/app.js
      4. node -e "import('./src/timer.js').then(() => console.log('OK')).catch(e => { console.error(e); process.exit(1); })"
    Expected Result: storage.js に export あり、app.js に自前定義なし、timer.js の import が解決可能
    Failure Indicators: storage.js に未追加、app.js に重複残存、timer.js import 失敗
    Evidence: .sisyphus/evidence/task-11-invalidate-cache.log

  Scenario: app.js から自前タイマー状態が削除
    Tool: Bash
    Preconditions: T11 sub-step 1 実施後
    Steps:
      1. ! grep -nE "^let focusIntervalId" src/app.js
      2. ! grep -nE "^let pauseIntervalId" src/app.js
      3. ! grep -nE "^function tickFocusTimer" src/app.js
      4. grep -nE "^import.*\{.*startFocusTimer.*\}.*from.*timer" src/app.js
      5. npm test 2>&1 | grep -qE "Tests +177 passed"
    Expected Result: 自前定義なし、import あり、テスト緑
    Failure Indicators: 残存、テスト失敗
    Evidence: .sisyphus/evidence/task-11-app-timer.log

  Scenario: タイマー動作確認（実機）
    Tool: Playwright
    Preconditions: T11 実施後、build 成功
    Steps:
      1. page.goto("file://...dist/index.html")
      2. タスク追加 + 集中開始
      3. 3秒待機
      4. await page.locator('[data-timer]').textContent() で値取得
      5. 値が 00:00:03 等 (3秒経過の表示) であることを確認
      6. 終了ボタンクリック → サマリー画面遷移
      7. localStorage の logs_v2 に新規セグメント追加確認
    Expected Result: タイマーが秒単位で進み、終了時にログ保存
    Failure Indicators: 表示変わらず、ログ未保存
    Evidence: .sisyphus/evidence/task-11-timer-running.png + task-11-logs.json

  Scenario: 4時境界処理（時刻モック使用）
    Tool: Playwright (with date mocking)
    Preconditions: page.addInitScript でDate モック注入可能
    Steps:
      1. Date.now を 03:59:55 に固定
      2. 集中開始
      3. 10秒経過させる（実際は setTimeout、または sinon.useFakeTimers）
      4. 4時境界を跨いだ際にセッション分割保存される
      5. localStorage.logs_v2 に 2 セグメント記録（境界前と境界後）
    Expected Result: 4時境界でセッション分割
    Failure Indicators: 1セグメントしか記録されない、または前日のキーに集約
    Evidence: .sisyphus/evidence/task-11-midnight-split.json
    Note: 完全な時刻モックは Playwright で複雑。困難なら timer.test.js (T20) で fake timers 使用してカバー。
  ```

  **Evidence to Capture**:
  - [ ] task-11-invalidate-cache.log
  - [ ] task-11-app-timer.log
  - [ ] task-11-timer-running.png
  - [ ] task-11-logs.json
  - [ ] task-11-midnight-split.json (オプショナル)

  **Commit**: YES (sub-step 0 と sub-step 1 をまとめて 1 commit)
  - Message: `refactor(app,storage,timer): move invalidateFocusTimeCache to storage and use timer module`
  - Files: `src/app.js`, `src/storage.js`
  - Pre-commit: `npm test` + `npm run build`

- [x] 12. export統合（downloadFile/exportLogsAs* を export.js 経由）

  **What to do**:
  - `src/app.js` 内の自前ファイル出力関数を export.js 経由に置換:
    - `function downloadFile(content, filename, mimeType)` 自前定義を削除
    - `function exportLogsAsJSON()`, `exportLogsAsCSV()`, `exportTasksAsTodoTxt()` 等を `exportAsJSON`, `exportAsCSV`, `exportAsTodoTxt` 呼び出しに置換
    - `function handleImportTodoTxt(file)` 自前定義を `importFromTodoTxt(file)` 呼び出しに置換
  - `import { downloadFile, exportAsJSON, exportAsCSV, exportAsTodoTxt, importFromTodoTxt } from './export.js'` を追加
  - export.js の `importFromTodoTxt` は `export async function` なので T2 の transformModule 強化が前提
  - `npm test` (177) + `npm run build` で regression なし
  - Playwright で各種エクスポート + インポートが動作することを確認

  **Must NOT do**:
  - `src/export.js` の API シグネチャを変更しない
  - エクスポートファイル名のフォーマットを変更しない（`src/constants.js:EXPORT_JSON_PATTERN = 'adhd_focus_log_{day}.json'`, `EXPORT_CSV_PATTERN`, `EXPORT_TODOTXT_PATTERN` および `src/i18n.js:exportJsonName/exportCsvName/exportTodoTxtName` 参照。フォーマット例: `adhd_focus_log_2026-04-30.json`）
  - CSV ヘッダーの順序を変更しない
  - todo.txt のフォーマット仕様を変更しない（todotxt.js 参照）

  **Recommended Agent Profile**:
  - **Category**: `unspecified-high`
    - Reason: ファイル I/O 系で Blob/URL/FileReader を扱うが、API 置換は比較的素直
  - **Skills**: `playwright`

  **Parallelization**:
  - **Can Run In Parallel**: T11 完了後 (app.js 競合回避でシリアル推奨)
  - **Parallel Group**: Wave 3
  - **Blocks**: T13
  - **Blocked By**: T2 (export async function), T3, T4

  **References**:

  **Pattern References**:
  - `src/app.js` - 自前 `downloadFile`, `exportLogsAsJSON/CSV`, `exportTasksAsTodoTxt`, `handleImportTodoTxt`
  - `src/export.js` 全体 - 正規 API

  **API/Type References**:
  - `src/export.js:downloadFile(content, filename, mimeType)` - DOM 経由でダウンロード
  - `src/export.js:exportAsJSON(tasks, settings)` - JSON 形式
  - `src/export.js:exportAsCSV(tasks, settings)` - CSV 形式（ログを含む）
  - `src/export.js:exportAsTodoTxt(tasks)` - todo.txt 形式
  - `src/export.js:importFromTodoTxt(file)` - async, file.text() を await

  **WHY Each Reference Matters**:
  - export.js は内部で `loadLogs`, `loadTasks`, `loadSettings` を storage から読む可能性 → 引数取り扱いに注意
  - `importFromTodoTxt` の戻り値は未完了タスク配列 → app.js での扱い方を維持

  **Acceptance Criteria**:

  - [ ] `src/app.js` から `function downloadFile`, `function exportLogsAsJSON/CSV`, `function exportTasksAsTodoTxt`, `function handleImportTodoTxt` の自前定義削除
  - [ ] import 文に export.js の API 追加
  - [ ] `npm test` で 177 passed 維持
  - [ ] `npm run build` 成功
  - [ ] dist で JSON/CSV/todo.txt のエクスポート + todo.txt インポートが動作

  **QA Scenarios**:

  ```
  Scenario: app.js から自前 export 関数が削除
    Tool: Bash
    Preconditions: T12 実施後
    Steps:
      1. ! grep -nE "^function downloadFile\(" src/app.js
      2. ! grep -nE "^function exportLogsAsJSON" src/app.js
      3. ! grep -nE "^function exportLogsAsCSV" src/app.js
      4. ! grep -nE "^function handleImportTodoTxt" src/app.js
      5. grep -nE "^import.*\{.*exportAsJSON.*\}.*from.*export" src/app.js
      6. npm test 2>&1 | grep -qE "Tests +177 passed"
    Expected Result: 自前定義なし、import あり、テスト緑
    Failure Indicators: 残存、テスト失敗
    Evidence: .sisyphus/evidence/task-12-app-export.log

  Scenario: JSON エクスポートが動作
    Tool: Playwright
    Preconditions: T12 実施後、build 成功、タスクとログが localStorage に存在
    Steps:
      1. page.goto("file://...dist/index.html")
      2. ダウンロードイベント監視: page.on('download', ...)
      3. 「JSON エクスポート」ボタンクリック
      4. ダウンロードファイル名が `adhd_focus_log_YYYY-MM-DD.json` 形式（`src/constants.js:EXPORT_JSON_PATTERN` 参照）
      5. ダウンロード内容を読み取り → JSON.parse 成功
      6. ファイル内に tasks/settings/logs キーが含まれる
    Expected Result: JSON ファイルダウンロード成功、内容が正しい
    Failure Indicators: ダウンロード起動せず、JSON パース失敗
    Evidence: .sisyphus/evidence/task-12-export-json.json + task-12-export-button.png

  Scenario: todo.txt インポートが動作
    Tool: Playwright
    Preconditions: テスト用 .txt ファイル準備
    Steps:
      1. テスト用 todo.txt を fixture として準備（"(A) Buy milk\nFinish report" 等）
      2. page.goto("file://...dist/index.html")
      3. 「インポート」ボタン → ファイル選択ダイアログで fixture 選択
      4. インポート完了後、タスクリストに "Buy milk", "Finish report" が表示
    Expected Result: タスク追加成功
    Failure Indicators: エラー、タスク未追加
    Evidence: .sisyphus/evidence/task-12-import-todotxt.png
  ```

  **Evidence to Capture**:
  - [ ] task-12-app-export.log
  - [ ] task-12-export-json.json
  - [ ] task-12-export-button.png
  - [ ] task-12-import-todotxt.png

  **Commit**: YES
  - Message: `refactor(app): use export module for file I/O operations`
  - Files: `src/app.js`
  - Pre-commit: `npm test` + `npm run build`

- [x] 13. dist ビルド + シンボル検証

  **What to do**:
  - Wave 3 完了後の状態で `npm run build` 実行
  - 生成された `dist/index.html` で必要シンボルが全て解決されていることを検証
  - app.js の重複削除完了の最終確認:
    - `function applyTheme` (theme.js から) PRESENT
    - `function setText`, `setAttr`, `trapFocus` (ui.js から) PRESENT
    - `function initAudio`, `function playBeep` (audio.js から) PRESENT
    - `const TRANSLATIONS` (i18n.js から) PRESENT
    - `const MAX_TASKS` (constants.js から) PRESENT
    - `function applyTheme$app` ABSENT (削除済み)
  - dist のサイズが極端に肥大化していないか確認（目安: 3MB 以下、極端な重複なし）
  - `node -e "require('vm').runInNewContext(require('fs').readFileSync('dist/index.html', 'utf8').match(/<script>([\\s\\S]*?)<\\/script>/)[1] + '; void 0;', { document: {}, window: {}, ... })"` 等の構文チェック（最低限のシンタックスエラーを検出）

  **Must NOT do**:
  - app.js を変更しない（このタスクは検証のみ）
  - dist/index.html を手動編集しない
  - build.js を変更しない（T2-T4 で完了済みの前提）

  **Recommended Agent Profile**:
  - **Category**: `quick`
    - Reason: ビルド + grep 検証、判断不要
  - **Skills**: なし

  **Parallelization**:
  - **Can Run In Parallel**: NO (Wave 4 単独タスク)
  - **Parallel Group**: Wave 4
  - **Blocks**: T14, T15
  - **Blocked By**: T2-T12

  **References**:

  **Pattern References**:
  - `.sisyphus/evidence/task-1-dist-symbols-before.txt` - 修復前の状態（ABSENT 多数）
  - `.sisyphus/evidence/task-3-dist-symbols-after.txt` - MODULE_ORDER 拡張直後の状態

  **WHY Each Reference Matters**:
  - 修復前後の差分で、修復が確実に進んだかを定量的に確認

  **Acceptance Criteria**:

  - [ ] `npm run build` 成功
  - [ ] 必要シンボル 7 個全て PRESENT
  - [ ] 削除対象シンボル（applyTheme$app 等）ABSENT
  - [ ] dist/index.html のシンタックスエラーなし

  **QA Scenarios**:

  ```
  Scenario: dist 内シンボル全件 PRESENT
    Tool: Bash
    Preconditions: Wave 3 全タスク完了
    Steps:
      1. npm run build 2>&1 | tee .sisyphus/evidence/task-13-build.log
      2. > .sisyphus/evidence/task-13-dist-symbols-final.txt
      3. for sym in "function applyTheme\b" "function setText" "function setAttr" "function trapFocus" "function initAudio" "function playBeep" "const TRANSLATIONS" "const MAX_TASKS"; do
           echo "=== $sym ===" >> .sisyphus/evidence/task-13-dist-symbols-final.txt
           grep -nE "$sym" dist/index.html | head -3 >> .sisyphus/evidence/task-13-dist-symbols-final.txt || echo "ABSENT" >> .sisyphus/evidence/task-13-dist-symbols-final.txt
         done
      4. ! grep -q "ABSENT" .sisyphus/evidence/task-13-dist-symbols-final.txt
    Expected Result: 全 8 シンボル PRESENT、ABSENT ゼロ
    Failure Indicators: 1個以上の ABSENT
    Evidence: .sisyphus/evidence/task-13-dist-symbols-final.txt

  Scenario: dist 内に削除対象 applyTheme$app が ABSENT
    Tool: Bash
    Preconditions: Wave 3 完了
    Steps:
      1. ! grep -nE "applyTheme\\\$app" dist/index.html
    Expected Result: applyTheme$app の参照ゼロ
    Failure Indicators: 残存
    Evidence: 上記コマンドの exit code

  Scenario: dist のシンタックスチェック
    Tool: Bash
    Preconditions: dist/index.html 生成済み
    Steps:
      1. node -e "
           const fs = require('fs');
           const html = fs.readFileSync('dist/index.html', 'utf8');
           const match = html.match(/<script>([\\s\\S]*?)<\\/script>/);
           if (!match) { console.error('No inline script'); process.exit(1); }
           try { new Function(match[1]); console.log('SYNTAX_OK'); } catch (e) { console.error('SYNTAX_ERROR:', e.message); process.exit(2); }
         " | tee .sisyphus/evidence/task-13-syntax.log
      2. grep -q "SYNTAX_OK" .sisyphus/evidence/task-13-syntax.log
    Expected Result: SYNTAX_OK
    Failure Indicators: SYNTAX_ERROR、parse 失敗
    Evidence: .sisyphus/evidence/task-13-syntax.log
  ```

  **Evidence to Capture**:
  - [ ] task-13-build.log
  - [ ] task-13-dist-symbols-final.txt
  - [ ] task-13-syntax.log

  **Commit**: NO（検証のみ）

- [x] 14. dist 動作確認（Playwright + file://）

  **What to do**:
  - Playwright で `dist/index.html` を `file://` から開いて主要動作を確認:
    - 初期画面表示（main-screen）
    - タスク追加 → 集中開始 → カウントアップ → 終了
    - 言語切替（ja ⇔ en）
    - テーマ切替（system/light/dark）
    - 設定モーダル開閉 + フォーカストラップ
    - エクスポート（JSON/CSV/todo.txt）
    - インポート（todo.txt）
  - JavaScript エラーゼロ（page.on('pageerror', ...) で監視）
  - コンソール warning/error の出力を記録
  - 主要画面の screenshot を `.sisyphus/evidence/task-14-screens/` に保存

  **Must NOT do**:
  - 手動操作に依存しない（全て Playwright で自動化）
  - 「動いているように見える」で OK にしない（明示的なアサーション必須）
  - 既存 e2e/ のテストファイルを変更しない（呼び出すのみ）

  **Recommended Agent Profile**:
  - **Category**: `unspecified-high`
    - Reason: Playwright 操作 + 動作検証、エラー詳細記録
  - **Skills**: `playwright`

  **Parallelization**:
  - **Can Run In Parallel**: NO (T13 完了が前提)
  - **Parallel Group**: Wave 4
  - **Blocks**: T15, T16
  - **Blocked By**: T13

  **References**:

  **Pattern References**:
  - `e2e/tests/*.js` - 既存 E2E テストのパターン参考
  - `dist/index.html` - 実機検証対象
  - `public_html/index.html` - 開発版（ID 等の参照）

  **WHY Each Reference Matters**:
  - 既存 e2e と同じ ID/selector を使うことで一貫性確保

  **Acceptance Criteria**:

  - [ ] `dist/index.html` を file:// で開いて pageerror ゼロ
  - [ ] 主要 UI 要素が描画される（#main-screen 等）
  - [ ] タスク追加 → 集中フロー → 終了が動作
  - [ ] 言語/テーマ切替が動作
  - [ ] エクスポート/インポートが動作
  - [ ] フォーカストラップが動作

  **QA Scenarios**:

  ```
  Scenario: dist 起動 + 初期画面
    Tool: Playwright (playwright skill)
    Preconditions: T13 完了、dist/index.html 存在
    Steps:
      1. mkdir -p .sisyphus/evidence/task-14-screens
      2. browser.newContext({ viewport: { width: 1280, height: 720 } })
      3. const errors = []; page.on('pageerror', e => errors.push(e.message));
      4. await page.goto("file:///mnt/c/Users/user/Documents/adhd-focus-timer/dist/index.html")
      5. await page.waitForLoadState('domcontentloaded')
      6. expect(errors.length).toBe(0)
      7. await expect(page.locator('#main-screen')).toBeVisible()
      8. await page.screenshot({ path: '.sisyphus/evidence/task-14-screens/01-initial.png' })
    Expected Result: pageerror ゼロ、main-screen 表示
    Failure Indicators: エラー検出、main-screen 不可視
    Evidence: .sisyphus/evidence/task-14-screens/01-initial.png

  Scenario: メインフロー（タスク追加 → 集中 → 終了 → サマリー）
    Tool: Playwright
    Preconditions: 上記シナリオ成功
    Steps:
      1. 「タスク追加」相当のボタンクリック → 入力欄に "QA Task 1" 入力 → 確定
      2. await expect(page.locator('text="QA Task 1"')).toBeVisible()
      3. screenshot: 02-task-added.png
      4. タスクをクリックまたは「集中開始」ボタン → focus-screen 遷移
      5. await page.waitForTimeout(3000) (3秒経過)
      6. await page.locator('[data-timer]').textContent() === "00:00:03" 等
      7. screenshot: 03-focus-running.png
      8. 「終了」ボタンクリック → summary-screen 遷移
      9. screenshot: 04-summary.png
    Expected Result: 主要フロー動作
    Failure Indicators: 画面遷移しない、タイマー進まない
    Evidence: .sisyphus/evidence/task-14-screens/02-04-*.png

  Scenario: エクスポート + インポート
    Tool: Playwright
    Preconditions: メインフロー後、ログ存在
    Steps:
      1. 「JSON エクスポート」 → download イベント受信 → ファイル名 `adhd-*.json`
      2. ダウンロードファイルを保存し、内容を読んで JSON.parse → tasks/logs/settings 含む
      3. 「CSV エクスポート」 → 同様
      4. 「todo.txt エクスポート」 → 同様
      5. ファイル選択 input を fillin → "(A) New task\n" 入力した tmp.txt を upload
      6. インポート完了後、タスクリストに "New task" 表示
    Expected Result: 全エクスポート/インポート動作
    Failure Indicators: ダウンロード起動せず、JSON パース失敗、インポート失敗
    Evidence: .sisyphus/evidence/task-14-screens/05-export.png + 06-import.png + .sisyphus/evidence/task-14-export-json.json
  ```

  **Evidence to Capture**:
  - [ ] task-14-screens/01-initial.png .. 06-import.png
  - [ ] task-14-export-json.json
  - [ ] task-14-pageerror.log（pageerror 配列の出力）

  **Commit**: NO（検証のみ）

- [x] 15. 既存 e2e テスト緑確認

  **What to do**:
  - `npm run test:e2e` 実行
  - 既存 E2E テストが全て緑であることを確認（修復によって壊していないことを保証）
  - 失敗があれば原因を特定し、修正タスクを作る or 計画書に追加（Sisyphus が判断）
  - E2E 出力を `.sisyphus/evidence/task-15-e2e.log` に保存

  **Must NOT do**:
  - `e2e/` 配下のテストファイルを変更しない（既存テストは不変）
  - dist/index.html を編集して E2E を通す（根本対応のみ）

  **Recommended Agent Profile**:
  - **Category**: `quick`
    - Reason: 既存スクリプト実行 + 結果記録のみ
  - **Skills**: なし

  **Parallelization**:
  - **Can Run In Parallel**: NO (T14 完了が前提、dist 動作検証後)
  - **Parallel Group**: Wave 4
  - **Blocks**: T16
  - **Blocked By**: T14

  **References**:

  **Pattern References**:
  - `e2e/tests/*.js` - 既存テストファイル
  - `package.json:scripts.test:e2e` - E2E 実行コマンド

  **WHY Each Reference Matters**:
  - 既存 E2E が壊れていないことが「修復成功」の最終的な証跡

  **Acceptance Criteria**:

  - [ ] `npm run test:e2e` exit code 0
  - [ ] 既存 E2E テスト全件緑

  **QA Scenarios**:

  ```
  Scenario: 既存 e2e テスト実行
    Tool: Bash
    Preconditions: T14 完了、dist 動作確認済み
    Steps:
      1. npm run test:e2e 2>&1 | tee .sisyphus/evidence/task-15-e2e.log
      2. echo "exit: $?"
      3. grep -qE "(passed|completed|success)" .sisyphus/evidence/task-15-e2e.log
    Expected Result: exit 0、success/passed メッセージ
    Failure Indicators: exit != 0、failure メッセージ
    Evidence: .sisyphus/evidence/task-15-e2e.log
    Note: e2e の実行が browser-use CLI に依存している場合、CLI が利用可能でなければ「実行不可」をログに記録。代替として T14 の Playwright 検証で代用可能。
  ```

  **Evidence to Capture**:
  - [ ] task-15-e2e.log

  **Commit**: NO（検証のみ）

- [x] 16. tests/setup.js 作成 + vitest.config.js 更新

  **What to do**:
  - `tests/setup.js` 新規作成:
    ```js
    import { vi } from 'vitest';

    // matchMedia stub (theme.js のトップレベル評価対応)
    if (typeof window !== 'undefined' && !window.matchMedia) {
      window.matchMedia = vi.fn().mockImplementation(query => ({
        matches: false,
        media: query,
        onchange: null,
        addListener: vi.fn(),
        removeListener: vi.fn(),
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        dispatchEvent: vi.fn(),
      }));
    }

    // AudioContext stub (audio.js テスト用)
    // src/audio.js が実際に呼ぶメソッド:
    //   - osc.frequency.setValueAtTime(...)
    //   - osc.frequency.exponentialRampToValueAtTime(...)
    //   - gainNode.gain.setValueAtTime(...)
    //   - gainNode.gain.exponentialRampToValueAtTime(...)
    //   - gainNode.gain.linearRampToValueAtTime(...)
    if (typeof window !== 'undefined' && !window.AudioContext && !window.webkitAudioContext) {
      class MockAudioContext {
        constructor() {
          this.state = 'suspended';
          this.currentTime = 0;
          this.destination = {};
        }
        resume() { this.state = 'running'; return Promise.resolve(); }
        createOscillator() {
          return {
            type: 'sine',
            frequency: {
              value: 440,
              setValueAtTime: vi.fn(),
              linearRampToValueAtTime: vi.fn(),
              exponentialRampToValueAtTime: vi.fn(),
            },
            connect: vi.fn(),
            start: vi.fn(),
            stop: vi.fn(),
          };
        }
        createGain() {
          return {
            gain: {
              value: 1,
              setValueAtTime: vi.fn(),
              linearRampToValueAtTime: vi.fn(),
              exponentialRampToValueAtTime: vi.fn(),
            },
            connect: vi.fn(),
          };
        }
      }
      window.AudioContext = MockAudioContext;
    }

    // URL.createObjectURL stub (export.js テスト用)
    if (typeof URL !== 'undefined' && !URL.createObjectURL) {
      URL.createObjectURL = vi.fn(() => 'blob:mock-url');
      URL.revokeObjectURL = vi.fn();
    }
    ```
  - `vitest.config.js` を更新:
    ```js
    import { defineConfig } from 'vitest/config';

    export default defineConfig({
      test: {
        environment: 'jsdom',
        globals: true,
        include: ['tests/**/*.test.js'],
        setupFiles: ['./tests/setup.js'],  // 新規追加
      },
    });
    ```
  - `npm test` 実行 → 既存 177 tests が全て緑のままを確認

  **Must NOT do**:
  - 既存テストファイル（7個）を1文字も変更しない
  - global を直接 polyfill しない（jsdom で利用可能なものは jsdom に任せる）
  - 過剰な mock を追加しない（実際のテストで必要な最小限のみ）

  **Recommended Agent Profile**:
  - **Category**: `quick`
    - Reason: ファイル新規作成 + 設定更新、判断不要
  - **Skills**: なし

  **Parallelization**:
  - **Can Run In Parallel**: NO (Wave 5 の前提タスク)
  - **Parallel Group**: Wave 5
  - **Blocks**: T17-T25
  - **Blocked By**: T15

  **References**:

  **Pattern References**:
  - `vitest.config.js` (現状) - environment, globals 設定の配置
  - `tests/storage.test.js` - vi.spyOn の既存例

  **External References**:
  - vitest docs: setupFiles - https://vitest.dev/config/#setupfiles

  **WHY Each Reference Matters**:
  - vitest.config.js の既存形式を維持しつつ setupFiles 追加
  - matchMedia/AudioContext/URL の最小 stub で 9モジュール全テストが通る前提

  **Acceptance Criteria**:

  - [ ] `tests/setup.js` 新規作成
  - [ ] `vitest.config.js` に `setupFiles: ['./tests/setup.js']` 追加
  - [ ] `npm test` で既存 177 tests 緑のまま
  - [ ] setup.js が `import './theme.js'` でエラー出さない（事前 stub のため）

  **QA Scenarios**:

  ```
  Scenario: setup.js 後でも既存テストが緑
    Tool: Bash
    Preconditions: T16 実施後
    Steps:
      1. npm test 2>&1 | tee .sisyphus/evidence/task-16-tests.log
      2. grep -qE "Tests +177 passed" .sisyphus/evidence/task-16-tests.log
    Expected Result: Tests 177 passed (177)
    Failure Indicators: テスト数変化、失敗
    Evidence: .sisyphus/evidence/task-16-tests.log

  Scenario: matchMedia stub が動作（theme.js 直接 import 検証）
    Tool: Bash
    Preconditions: T16 実施後、setup.js が theme.js を破壊しない
    Steps:
      1. node -e "
           import('./node_modules/vitest/dist/index.js').then(async ({ describe, it, expect }) => {
             // 簡易 smoke
             const theme = await import('./src/theme.js');
             console.log(typeof theme.applyTheme === 'function' ? 'OK' : 'FAIL');
           });
         " 2>&1 | tee .sisyphus/evidence/task-16-matchmedia.log
    Expected Result: theme.js が import 可能で applyTheme が関数（matchMedia エラーなし）
    Failure Indicators: ReferenceError: matchMedia is not defined
    Evidence: .sisyphus/evidence/task-16-matchmedia.log
    Note: vitest を直接使わない bare node 実行ではモジュール form 制約あり。代替として T21 の theme.test.js で間接検証可。
  ```

  **Evidence to Capture**:
  - [ ] task-16-tests.log
  - [ ] task-16-matchmedia.log (オプショナル)

  **Commit**: YES (Wave 5 の最初として T16 単独で commit)
  - Message: `test(setup): add jsdom stubs for matchMedia, AudioContext, URL`
  - Files: `tests/setup.js` (new), `vitest.config.js`
  - Pre-commit: `npm test` (177 passed)

- [x] 17. tests/i18n.test.js 作成（最低 8 テスト）

  **What to do**:
  - `tests/i18n.test.js` 新規作成。最低 8 個のテストケース（**実在キーを使用すること**、後述の References 参照）:
    1. `t('appTitle', {}, 'ja')` で日本語訳が返る（既知キー / 日本語）
    2. `t('appTitle', {}, 'en')` で英語訳が返る（既知キー / 英語）
    3. `t('non_existent_key_xyz', {}, 'ja')` でフォールバック挙動（key 自体 or undefined を返す動作を i18n.js の実装に合わせて検証）
    4. `t('summaryStartCountValue', { count: 3 }, 'ja')` で `'3回'` のように `{count}` が補間される
    5. `t('importTodoTxtDone', { count: 5 }, 'en')` で `{count}` の英語側補間（実在キー、両言語で異なる文言）
    6. `t('appTitle', {}, 'fr')` などの不明言語でデフォルト（ja or en）にフォールバック - 実装挙動を観察して仕様化
    7. `t('appTitle', undefined, 'ja')` のように `vars` 省略でもエラーなく動作
    8. `TRANSLATIONS` オブジェクトが `ja` と `en` キーを持つこと（`expect(TRANSLATIONS).toHaveProperty('ja')` 等）
  - 既存テストパターン（`import { describe, it, expect } from 'vitest'`、日本語 it 名、`toBe`/`toEqual`）に従う
  - `npx vitest run tests/i18n.test.js` で全件緑

  > **重要**: 計画書では実在する i18n キーを使用すること。`start_focus`, `progress` 等の架空キーは使わない。実在キー一覧（部分）: `appTitle`, `addTask`, `startDirect`, `summaryStartCountValue`, `importTodoTxtDone`, `resumeLastTask`, `recoveryBannerActive`, `taskInputAria`, `undoToast`, `exportJsonName` など。プレースホルダ持ちキーは特に `summaryStartCountValue` (`{count}`), `resumeLastTask` (`{task}`), `recoveryBannerActive` (`{task}` + `{elapsed}`), `taskInputAria` (`{index}`), `undoToast` (`{task}`), `importTodoTxtDone` (`{count}`), `exportJsonName` (`{day}`) を使う。

  **Must NOT do**:
  - 既存テストファイルを変更しない
  - i18n.js のソースを変更しない
  - 翻訳キーの追加/削除を提案しない
  - スナップショットテストを使わない（脆い）

  **Recommended Agent Profile**:
  - **Category**: `quick`
    - Reason: 純粋関数テスト、モック不要
  - **Skills**: なし

  **Parallelization**:
  - **Can Run In Parallel**: YES (T18-T25 と並列可)
  - **Parallel Group**: Wave 5
  - **Blocks**: T26
  - **Blocked By**: T16

  **References**:

  **Pattern References**:
  - `tests/utils.test.js` - 純粋関数テストの代表例
  - `tests/stats.test.js` - 日本語 it 名の例

  **API/Type References**:
  - `src/i18n.js:t(key, vars, language)` - シグネチャ
  - `src/i18n.js:TRANSLATIONS` - 辞書構造（`ja` / `en` の 2 言語）
  - `src/i18n.js` の **実在キー一覧（先に確認すること）**:
    - プレースホルダなし: `appTitle`, `addTask`, `addTaskMax`, `todaySummary`, `settings`, `startDirect`, `accumulatedToday`, `paused`, `todayFocus`, `random`, `finish`, `away`, `meal`, `close`, `resetLog`, `theme`, `system`, `light`, `dark`, `language`, `japanese`, `english`, `milestone`, `sound`, `saveAndClose`, `exportJson`, `exportCsv`, `exportTodoTxt`, `importTodoTxt`, `importTodoTxtEmpty`, `taskFallback`, `taskPlaceholder`, `taskRemove`, `summaryEmpty`, `summaryHero`, `summaryLongest`, `summaryBestSession`, `summaryFirstStart`, `summaryStartCount`, `summaryTaskRanking`, `summaryMorningStart`, `summaryMorningDone`, `summaryMorningMiss`, `unnamedTask`, `recoveryAway`, `recoveryMeal`, `recoveryGeneric`, `resetConfirm`, `needTaskAlert`, `discard`, `resume`, `rouletteStart`, `csvHeader`, `themeGroup`, `languageGroup`, `focusAria`, `awayAria`, `mealAria`, `finishFocusAria`, `taskInputAria`
    - プレースホルダ持ち: `summaryStartCountValue` (`{count}`), `resumeLastTask` (`{task}`), `recoveryBannerActive` (`{task}` + `{elapsed}`), `taskInputAria` (`{index}`), `undoToast` (`{task}`), `importTodoTxtDone` (`{count}`), `exportJsonName` (`{day}`), `exportCsvName` (`{day}`), `exportTodoTxtName` (`{day}`)

  **WHY Each Reference Matters**:
  - 既存テストと完全に同じスタイルで書く（プロジェクトの一貫性）
  - **実在キーを使うこと**: 架空のキー（`start_focus`, `progress` 等）でテストを書くと、フォールバック挙動の検証になってしまい正常系のテストにならない

  **Acceptance Criteria**:

  - [ ] `tests/i18n.test.js` 新規作成
  - [ ] 最低 8 テスト
  - [ ] テストは **すべて実在する翻訳キー** を使用（`start_focus` 等の架空キーは使わない）
  - [ ] `npx vitest run tests/i18n.test.js` で全件緑
  - [ ] 既存 177 tests 緑のまま（合計 185+ tests）

  **QA Scenarios**:

  ```
  Scenario: i18n テスト全件緑
    Tool: Bash
    Preconditions: T17 実施後
    Steps:
      1. npx vitest run tests/i18n.test.js 2>&1 | tee .sisyphus/evidence/task-17-i18n-tests.log
      2. grep -qE "Tests +([89]|[1-9][0-9]+) passed" .sisyphus/evidence/task-17-i18n-tests.log
    Expected Result: 8+ tests passed
    Failure Indicators: テスト数 8 未満、失敗
    Evidence: .sisyphus/evidence/task-17-i18n-tests.log

  Scenario: 全体テスト件数増加 + 既存緑維持
    Tool: Bash
    Preconditions: 上記成功
    Steps:
      1. npm test 2>&1 | tee .sisyphus/evidence/task-17-all-tests.log
      2. grep -qE "Tests +(18[5-9]|19[0-9]) passed" .sisyphus/evidence/task-17-all-tests.log
    Expected Result: 既存177 + 新規8+ = 185+
    Failure Indicators: 既存テスト失敗、合計が想定外
    Evidence: .sisyphus/evidence/task-17-all-tests.log
  ```

  **Evidence to Capture**:
  - [ ] task-17-i18n-tests.log
  - [ ] task-17-all-tests.log

  **Commit**: YES
  - Message: `test(i18n): add unit tests for translation function`
  - Files: `tests/i18n.test.js` (new)
  - Pre-commit: `npm test`

- [x] 18. tests/tasks.test.js 作成（最低 8 テスト）

  **What to do**:
  - `tests/tasks.test.js` 新規作成。最低 8 個のテストケース:
    1. 初期状態で `getTasks()` が空配列 or 既定タスク配列を返す
    2. `addNewTask()` で配列長が +1
    3. `setTaskAt(0, 'New name')` で値が更新される
    4. `removeTaskAt(0)` で配列長が -1
    5. `getValidTasks()` で空文字列が除外される
    6. `MAX_TASKS` 上限到達後、`canAddTask()` が false
    7. `reorderTask(0, 2)` で要素位置が変わる
    8. `setTasks(newArray)` で配列全体置換 + localStorage に保存
  - 各テスト前に `beforeEach(() => { localStorage.clear() })` でクリア
  - 既存パターン踏襲（`describe`/`it` 構造、日本語）
  - `npx vitest run tests/tasks.test.js` で全件緑

  **Must NOT do**:
  - 既存テストファイルを変更しない
  - tasks.js のソースを変更しない
  - vi.mock を使わない（spyOn のみ既存パターン）
  - localStorage を vi.fn() で置換しない（jsdom の localStorage を使う）

  **Recommended Agent Profile**:
  - **Category**: `unspecified-high`
    - Reason: localStorage 連携 + 状態管理のテスト設計
  - **Skills**: なし

  **Parallelization**:
  - **Can Run In Parallel**: YES (T17, T19-T25 と並列可)
  - **Parallel Group**: Wave 5
  - **Blocks**: T26
  - **Blocked By**: T16

  **References**:

  **Pattern References**:
  - `tests/storage.test.js` - localStorage 周りのパターン
  - `tests/stats.test.js` - 日本語 it 名 + ローカルヘルパー

  **API/Type References**:
  - `src/tasks.js` 全 export
  - `src/constants.js:MAX_TASKS` - 上限値
  - `src/storage.js:loadTasks/saveTasks` - 永続化

  **WHY Each Reference Matters**:
  - tasks.js は内部で saveTasks を呼ぶ → localStorage 経由のラウンドトリップを検証
  - MAX_TASKS の値を直接 import せず、`canAddTask()` の動作で検証

  **Acceptance Criteria**:

  - [ ] `tests/tasks.test.js` 新規作成
  - [ ] 最低 8 テスト
  - [ ] `npx vitest run tests/tasks.test.js` で全件緑
  - [ ] localStorage クリア → タスク追加 → 配列確認のラウンドトリップが動作

  **QA Scenarios**:

  ```
  Scenario: tasks テスト全件緑
    Tool: Bash
    Preconditions: T18 実施後
    Steps:
      1. npx vitest run tests/tasks.test.js 2>&1 | tee .sisyphus/evidence/task-18-tasks-tests.log
      2. grep -qE "Tests +([89]|[1-9][0-9]+) passed" .sisyphus/evidence/task-18-tasks-tests.log
    Expected Result: 8+ tests passed
    Failure Indicators: テスト数不足、失敗
    Evidence: .sisyphus/evidence/task-18-tasks-tests.log

  Scenario: 全体合計増加
    Tool: Bash
    Preconditions: T17 + T18 実施後
    Steps:
      1. npm test 2>&1 | tee .sisyphus/evidence/task-18-all-tests.log
      2. grep -qE "Tests +(19[3-9]|20[0-9]) passed" .sisyphus/evidence/task-18-all-tests.log
    Expected Result: 177 + 8 + 8 = 193+
    Failure Indicators: テスト数不一致
    Evidence: .sisyphus/evidence/task-18-all-tests.log
  ```

  **Evidence to Capture**:
  - [ ] task-18-tasks-tests.log
  - [ ] task-18-all-tests.log

  **Commit**: YES
  - Message: `test(tasks): add unit tests for task list management`
  - Files: `tests/tasks.test.js` (new)
  - Pre-commit: `npm test`

- [x] 19. tests/state.test.js 作成（最低 6 テスト）

  **What to do**:
  - `tests/state.test.js` 新規作成。最低 6 個のテストケース:
    1. `initSettings()` 後 `getSettings()` でデフォルト設定が返る
    2. `updateSettings({ language: 'en' })` 後、`getSetting('language') === 'en'`
    3. `setSetting('themeMode', 'dark')` 後、永続化される（localStorage 確認）
    4. `setAppInitialized(true)` 後、`isAppInitialized() === true`
    5. `setLastFocusedElement(el)` + `getLastFocusedElement()` でラウンドトリップ
    6. `setCurrentTrapCleanup(fn)` + `clearTrapCleanup()` で fn 実行 + null クリア
  - 各テスト前 `beforeEach(() => { localStorage.clear() })`
  - state.js のモジュールレベル変数のリセット手段がない場合、テストファイル内でモジュール再 import or 個別の reset 関数（あれば）使用

  **Must NOT do**:
  - 既存テストファイルを変更しない
  - state.js のソースを変更しない
  - state.js のモジュールスコープ変数に直接アクセスしない（API 経由のみ）

  **Recommended Agent Profile**:
  - **Category**: `unspecified-high`
    - Reason: モジュールレベル状態のテストは順序依存に注意
  - **Skills**: なし

  **Parallelization**:
  - **Can Run In Parallel**: YES (T17, T18, T20-T25 と並列可)
  - **Parallel Group**: Wave 5
  - **Blocks**: T26
  - **Blocked By**: T16

  **References**:

  **Pattern References**:
  - `tests/storage.test.js` - localStorage クリア + spyOn
  - `tests/stats.test.js` - ローカルヘルパー（make 系）

  **API/Type References**:
  - `src/state.js` 全 export

  **WHY Each Reference Matters**:
  - state.js の内部状態は永続化トリガー（updateSettings → saveSettings）含む
  - モジュール状態のテスト分離は vitest の isolate モードに依存（デフォルト）

  **Acceptance Criteria**:

  - [ ] `tests/state.test.js` 新規作成
  - [ ] 最低 6 テスト
  - [ ] `npx vitest run tests/state.test.js` で全件緑
  - [ ] テスト並列実行（`--sequence.shuffle`）でも安定

  **QA Scenarios**:

  ```
  Scenario: state テスト全件緑
    Tool: Bash
    Preconditions: T19 実施後
    Steps:
      1. npx vitest run tests/state.test.js 2>&1 | tee .sisyphus/evidence/task-19-state-tests.log
      2. grep -qE "Tests +([6-9]|[1-9][0-9]+) passed" .sisyphus/evidence/task-19-state-tests.log
    Expected Result: 6+ tests passed
    Failure Indicators: テスト失敗、テスト数不足
    Evidence: .sisyphus/evidence/task-19-state-tests.log

  Scenario: シャッフル実行で並列安定
    Tool: Bash
    Preconditions: T19 実施後
    Steps:
      1. npx vitest run --sequence.shuffle=true tests/state.test.js 2>&1 | tee .sisyphus/evidence/task-19-state-shuffle.log
      2. grep -qE "Tests +([6-9]|[1-9][0-9]+) passed" .sisyphus/evidence/task-19-state-shuffle.log
    Expected Result: シャッフルでも緑
    Failure Indicators: 順序依存で失敗
    Evidence: .sisyphus/evidence/task-19-state-shuffle.log
  ```

  **Evidence to Capture**:
  - [ ] task-19-state-tests.log
  - [ ] task-19-state-shuffle.log

  **Commit**: YES
  - Message: `test(state): add unit tests for app-level state management`
  - Files: `tests/state.test.js` (new)
  - Pre-commit: `npm test`

- [x] 20. tests/timer.test.js 作成（最低 8 テスト、fake timers 使用）

  **What to do**:
  - `tests/timer.test.js` 新規作成。最低 8 個のテストケース:
    1. `startFocusTimer('TaskA', startTime, tickFn, midnightFn)` 開始後、`isTimerRunning() === true`
    2. fake timers で 1秒進めた時 `tickFn` が経過秒で呼ばれる
    3. `getFocusElapsed()` が経過秒を返す
    4. `getCurrentTaskName() === 'TaskA'`
    5. `stopFocusTimer()` 後 `isTimerRunning() === false`
    6. 4時境界跨ぎで `midnightFn(beforeSeconds, afterStartTime)` が呼ばれる（時刻モック）
    7. `startPauseTimer(startTime, tickFn, warningFn)` で休憩タイマー動作
    8. `setLastMilestone(15)` + `getLastMilestone() === 15`
  - `vi.useFakeTimers()` + `vi.setSystemTime()` を使用（既存パターン逸脱を許可）
  - 各テスト前 `beforeEach(() => { vi.useFakeTimers(); localStorage.clear() })`
  - 各テスト後 `afterEach(() => { vi.useRealTimers() })`

  **Must NOT do**:
  - 既存テストファイルを変更しない
  - timer.js のソースを変更しない
  - 実時刻を使ったテストを書かない（不安定になる）
  - `setTimeout` を直接使ったテスト（必ず fake timers）

  **Recommended Agent Profile**:
  - **Category**: `deep`
    - Reason: fake timers + 4時境界 + コールバック検証など複雑な統合テスト
  - **Skills**: なし

  **Parallelization**:
  - **Can Run In Parallel**: YES (他テストと並列可)
  - **Parallel Group**: Wave 5
  - **Blocks**: T26
  - **Blocked By**: T16

  **References**:

  **Pattern References**:
  - `tests/stats.test.js` - 日付モック的な検証
  - `tests/date-utils.test.js` - 4時境界判定
  - `tests/storage.test.js` - localStorage 利用パターン

  **API/Type References**:
  - `src/timer.js` 全 export
  - `src/date-utils.js:isAfter4AM` 等 - 4時境界判定

  **External References**:
  - vitest fake timers: https://vitest.dev/api/vi.html#vi-usefaketimers

  **WHY Each Reference Matters**:
  - timer.js は `Date.now()` と `setInterval` 両方使う → fake timers の `vi.advanceTimersByTime` と `vi.setSystemTime` の組合せ必須
  - 4時境界はビジネスロジックの中核 → モック前提でカバー必須

  **Acceptance Criteria**:

  - [ ] `tests/timer.test.js` 新規作成
  - [ ] 最低 8 テスト（fake timers 使用）
  - [ ] `npx vitest run tests/timer.test.js` で全件緑
  - [ ] シャッフル実行でも安定（モジュール状態リセット適切）

  **QA Scenarios**:

  ```
  Scenario: timer テスト全件緑
    Tool: Bash
    Preconditions: T20 実施後
    Steps:
      1. npx vitest run tests/timer.test.js 2>&1 | tee .sisyphus/evidence/task-20-timer-tests.log
      2. grep -qE "Tests +([89]|[1-9][0-9]+) passed" .sisyphus/evidence/task-20-timer-tests.log
    Expected Result: 8+ tests passed
    Failure Indicators: テスト失敗、不安定
    Evidence: .sisyphus/evidence/task-20-timer-tests.log

  Scenario: 4時境界テスト動作確認
    Tool: Bash
    Preconditions: T20 実施後、テストが midnight 関連を含む
    Steps:
      1. npx vitest run tests/timer.test.js -t "4時境界" 2>&1 | tee .sisyphus/evidence/task-20-midnight.log
      2. grep -qE "passed" .sisyphus/evidence/task-20-midnight.log
    Expected Result: 4時境界テストが緑
    Failure Indicators: 失敗
    Evidence: .sisyphus/evidence/task-20-midnight.log
  ```

  **Evidence to Capture**:
  - [ ] task-20-timer-tests.log
  - [ ] task-20-midnight.log

  **Commit**: YES
  - Message: `test(timer): add unit tests for focus and pause timers (with fake timers)`
  - Files: `tests/timer.test.js` (new)
  - Pre-commit: `npm test`

- [x] 21. tests/theme.test.js 作成（最低 4 テスト）

  **What to do**:
  - `tests/theme.test.js` 新規作成。最低 4 個のテストケース:
    1. `applyTheme('light')` で `document.documentElement.dataset.themeMode === 'light'`
    2. `applyTheme('dark')` で dataset 更新
    3. `applyTheme('system')` で dataset.themeMode === 'system' + 内部 data-theme が prefers-color-scheme に応じて変化
    4. `getSystemThemeMedia()` が MediaQueryList オブジェクトを返す（matches プロパティを持つ）
  - tests/setup.js の matchMedia stub を活用
  - `import { applyTheme, getSystemThemeMedia } from '../src/theme.js'`
  - 各テスト前 `beforeEach(() => { document.documentElement.dataset.themeMode = ''; document.documentElement.dataset.theme = '' })`

  **Must NOT do**:
  - 既存テストファイルを変更しない
  - theme.js のソースを変更しない
  - tests/setup.js を変更しない（T16 で完了済み）
  - matchMedia を test 内で再 stub しない（setup.js に集約）

  **Recommended Agent Profile**:
  - **Category**: `unspecified-high`
    - Reason: jsdom DOM 検証 + matchMedia stub 連携
  - **Skills**: なし

  **Parallelization**:
  - **Can Run In Parallel**: YES (他テストと並列可)
  - **Parallel Group**: Wave 5
  - **Blocks**: T26
  - **Blocked By**: T16

  **References**:

  **Pattern References**:
  - `tests/setup.js` - matchMedia stub の構造

  **API/Type References**:
  - `src/theme.js:applyTheme(mode)` - mode は 'system'|'light'|'dark'
  - `src/theme.js:getSystemThemeMedia()` - MediaQueryList を返す

  **WHY Each Reference Matters**:
  - theme.js のトップレベル評価で matchMedia が呼ばれる → setup.js の stub が必須
  - dataset 操作は jsdom で動く

  **Acceptance Criteria**:

  - [ ] `tests/theme.test.js` 新規作成
  - [ ] 最低 4 テスト
  - [ ] `npx vitest run tests/theme.test.js` で全件緑

  **QA Scenarios**:

  ```
  Scenario: theme テスト全件緑
    Tool: Bash
    Preconditions: T21 実施後、setup.js の matchMedia stub あり
    Steps:
      1. npx vitest run tests/theme.test.js 2>&1 | tee .sisyphus/evidence/task-21-theme-tests.log
      2. grep -qE "Tests +([4-9]|[1-9][0-9]+) passed" .sisyphus/evidence/task-21-theme-tests.log
    Expected Result: 4+ tests passed
    Failure Indicators: matchMedia is not defined エラー、テスト失敗
    Evidence: .sisyphus/evidence/task-21-theme-tests.log

  Scenario: dataset 反映の検証
    Tool: Bash
    Preconditions: 上記成功
    Steps:
      1. npx vitest run tests/theme.test.js -t "dataset" 2>&1 | grep -qE "passed"
    Expected Result: dataset 関連テスト緑
    Failure Indicators: 失敗
    Evidence: .sisyphus/evidence/task-21-theme-dataset.log
  ```

  **Evidence to Capture**:
  - [ ] task-21-theme-tests.log
  - [ ] task-21-theme-dataset.log

  **Commit**: YES
  - Message: `test(theme): add unit tests for theme application`
  - Files: `tests/theme.test.js` (new)
  - Pre-commit: `npm test`

- [x] 22. tests/ui.test.js 作成（最低 6 テスト）

  **What to do**:
  - `tests/ui.test.js` 新規作成。最低 6 個のテストケース:
    1. `setText('elem-id', 'Hello')` で `document.getElementById('elem-id').textContent === 'Hello'`
    2. `setText('non-existent-id', 'X')` でエラー出さない（gracefully ignore）
    3. `setAttr('elem-id', 'aria-label', 'desc')` で属性更新
    4. `getFocusableElements(container)` で `tabindex >= 0`, `button:not([disabled])`, `input` 等を返す
    5. `getFocusableElements(container)` で hidden 要素を除外
    6. `trapFocus(modal)` 後 Tab/Shift+Tab で focus 循環、Esc で cleanup function 返却
  - テスト前 `beforeEach(() => { document.body.innerHTML = '...' })` で DOM fixture
  - jsdom 環境で動作

  **Must NOT do**:
  - 既存テストファイルを変更しない
  - ui.js のソースを変更しない
  - 大きすぎる DOM fixture（最低限のみ）

  **Recommended Agent Profile**:
  - **Category**: `unspecified-high`
    - Reason: DOM 操作 + focus trap の挙動検証
  - **Skills**: なし

  **Parallelization**:
  - **Can Run In Parallel**: YES (他テストと並列可)
  - **Parallel Group**: Wave 5
  - **Blocks**: T26
  - **Blocked By**: T16

  **References**:

  **Pattern References**:
  - `tests/storage.test.js:beforeEach/afterEach` - setup/teardown パターン

  **API/Type References**:
  - `src/ui.js:setText(id, text)` - getElementById 経由
  - `src/ui.js:trapFocus(modal)` - cleanup function 返却

  **WHY Each Reference Matters**:
  - ui.js は jsdom で完全動作 → mock 不要
  - trapFocus の cleanup が正しく Tab/Shift+Tab/Esc に反応するか検証

  **Acceptance Criteria**:

  - [ ] `tests/ui.test.js` 新規作成
  - [ ] 最低 6 テスト
  - [ ] `npx vitest run tests/ui.test.js` で全件緑

  **QA Scenarios**:

  ```
  Scenario: ui テスト全件緑
    Tool: Bash
    Preconditions: T22 実施後
    Steps:
      1. npx vitest run tests/ui.test.js 2>&1 | tee .sisyphus/evidence/task-22-ui-tests.log
      2. grep -qE "Tests +([6-9]|[1-9][0-9]+) passed" .sisyphus/evidence/task-22-ui-tests.log
    Expected Result: 6+ tests passed
    Failure Indicators: jsdom エラー、テスト失敗
    Evidence: .sisyphus/evidence/task-22-ui-tests.log

  Scenario: focus trap の cleanup 動作
    Tool: Bash
    Preconditions: T22 実施後
    Steps:
      1. npx vitest run tests/ui.test.js -t "trapFocus" 2>&1 | tee .sisyphus/evidence/task-22-trap.log
      2. grep -qE "passed" .sisyphus/evidence/task-22-trap.log
    Expected Result: trapFocus テスト緑
    Failure Indicators: 失敗
    Evidence: .sisyphus/evidence/task-22-trap.log
  ```

  **Evidence to Capture**:
  - [ ] task-22-ui-tests.log
  - [ ] task-22-trap.log

  **Commit**: YES
  - Message: `test(ui): add unit tests for DOM helpers and focus trap`
  - Files: `tests/ui.test.js` (new)
  - Pre-commit: `npm test`

- [x] 23. tests/audio.test.js 作成（最低 4 テスト、AudioContext mock）

  **What to do**:
  - `tests/audio.test.js` 新規作成。最低 4 個のテストケース:
    1. `initAudio()` 初回呼び出しで `getAudioContext()` が non-null（lazy 生成）
    2. `initAudio()` 多重呼び出しで同一インスタンス（or 例外なし）
    3. `playBeep('start')` で例外なし、Mock の oscillator/gain が生成される
    4. `playBeep('milestone')` で 'start' と異なる動作（周波数/長さ違い）
  - tests/setup.js の AudioContext mock を活用
  - 各テスト前: AudioContext モジュール状態リセット (audio.js が export している reset 関数があれば使用、なければ動的 import re-evaluation)
  - mock の `createOscillator` / `createGain` の呼び出し回数を `expect(mockFn).toHaveBeenCalledTimes(N)` で検証

  **Must NOT do**:
  - 既存テストファイルを変更しない
  - audio.js のソースを変更しない
  - tests/setup.js を変更しない（T16 で完了済み）
  - 実際の音声出力を期待しない（jsdom + mock の制約）

  **Recommended Agent Profile**:
  - **Category**: `deep`
    - Reason: AudioContext mock の精密な振る舞い検証 + モジュール状態リセット
  - **Skills**: なし

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 5
  - **Blocks**: T26
  - **Blocked By**: T16

  **References**:

  **Pattern References**:
  - `tests/setup.js:MockAudioContext` - mock 実装詳細
  - `tests/storage.test.js:vi.spyOn` - mock 検証パターン

  **API/Type References**:
  - `src/audio.js:initAudio/getAudioContext/playBeep`

  **WHY Each Reference Matters**:
  - audio.js は AudioContext を内部で保持（モジュール状態） → テスト間でリセット必須
  - mock の振る舞いと一致するか検証

  **Acceptance Criteria**:

  - [ ] `tests/audio.test.js` 新規作成
  - [ ] 最低 4 テスト
  - [ ] `npx vitest run tests/audio.test.js` で全件緑

  **QA Scenarios**:

  ```
  Scenario: audio テスト全件緑
    Tool: Bash
    Preconditions: T23 実施後、AudioContext mock 動作
    Steps:
      1. npx vitest run tests/audio.test.js 2>&1 | tee .sisyphus/evidence/task-23-audio-tests.log
      2. grep -qE "Tests +([4-9]|[1-9][0-9]+) passed" .sisyphus/evidence/task-23-audio-tests.log
    Expected Result: 4+ tests passed
    Failure Indicators: AudioContext is not a constructor、テスト失敗
    Evidence: .sisyphus/evidence/task-23-audio-tests.log

  Scenario: playBeep の振る舞い検証
    Tool: Bash
    Preconditions: 上記成功
    Steps:
      1. npx vitest run tests/audio.test.js -t "playBeep" 2>&1 | grep -qE "passed"
    Expected Result: playBeep テスト緑
    Failure Indicators: 失敗
    Evidence: .sisyphus/evidence/task-23-playbeep.log
  ```

  **Evidence to Capture**:
  - [ ] task-23-audio-tests.log
  - [ ] task-23-playbeep.log

  **Commit**: YES
  - Message: `test(audio): add unit tests for Web Audio playback`
  - Files: `tests/audio.test.js` (new)
  - Pre-commit: `npm test`

- [x] 24. tests/export.test.js 作成（最低 6 テスト、Blob/URL mock）

  **What to do**:
  - `tests/export.test.js` 新規作成。最低 6 個のテストケース:
    1. `exportAsJSON(tasks, settings)` で URL.createObjectURL が呼ばれる + a.click() トリガー
    2. ダウンロードファイル名が `adhd_focus_log_YYYY-MM-DD.json` 形式（`src/constants.js:EXPORT_JSON_PATTERN` の `'adhd_focus_log_{day}.json'` から `{day}` を `getTodayKey()` で置換した値。例: `adhd_focus_log_2026-04-30.json`）
    3. `exportAsCSV(tasks, settings)` で CSV ヘッダー + データ行が含まれる Blob 生成
    4. `exportAsTodoTxt(tasks)` で todotxt 形式の Blob 生成
    5. `importFromTodoTxt(file)` で `(A) Buy milk\nFinish report` から 2 タスク復元（async 動作）
    6. `importFromTodoTxt(file)` で空ファイル → 空配列を返す
  - tests/setup.js の URL.createObjectURL mock + a.click() vi.spyOn
  - File オブジェクトは `new Blob([...], { type: 'text/plain' })` でモック構築
  - vi.spyOn で `document.createElement` を監視（'a' 要素生成検証）

  **Must NOT do**:
  - 既存テストファイルを変更しない
  - export.js のソースを変更しない
  - 実際のファイルをディスクに書かない

  **Recommended Agent Profile**:
  - **Category**: `deep`
    - Reason: Blob/URL/File API の mock + async テスト
  - **Skills**: なし

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 5
  - **Blocks**: T26
  - **Blocked By**: T16

  **References**:

  **Pattern References**:
  - `tests/setup.js:URL.createObjectURL stub`
  - `tests/storage.test.js:vi.spyOn` パターン

  **API/Type References**:
  - `src/export.js` 全 export
  - `src/todotxt.js:serializeTasksToTodoTxt/extractActiveTasksFromTodoTxt`

  **WHY Each Reference Matters**:
  - export.js は内部で storage.loadLogs を呼ぶ可能性 → localStorage に事前データ投入
  - todotxt のシリアライズ/パースは既存テストでカバー済み → export.test では「export.js の責務」のみ検証

  **Acceptance Criteria**:

  - [ ] `tests/export.test.js` 新規作成
  - [ ] 最低 6 テスト
  - [ ] `npx vitest run tests/export.test.js` で全件緑

  **QA Scenarios**:

  ```
  Scenario: export テスト全件緑
    Tool: Bash
    Preconditions: T24 実施後
    Steps:
      1. npx vitest run tests/export.test.js 2>&1 | tee .sisyphus/evidence/task-24-export-tests.log
      2. grep -qE "Tests +([6-9]|[1-9][0-9]+) passed" .sisyphus/evidence/task-24-export-tests.log
    Expected Result: 6+ tests passed
    Failure Indicators: Blob/URL エラー、テスト失敗
    Evidence: .sisyphus/evidence/task-24-export-tests.log

  Scenario: importFromTodoTxt の async 動作
    Tool: Bash
    Preconditions: 上記成功
    Steps:
      1. npx vitest run tests/export.test.js -t "importFromTodoTxt" 2>&1 | grep -qE "passed"
    Expected Result: async テスト緑
    Failure Indicators: タイムアウト、Promise 解決失敗
    Evidence: .sisyphus/evidence/task-24-import.log
  ```

  **Evidence to Capture**:
  - [ ] task-24-export-tests.log
  - [ ] task-24-import.log

  **Commit**: YES
  - Message: `test(export): add unit tests for file I/O operations`
  - Files: `tests/export.test.js` (new)
  - Pre-commit: `npm test`

- [x] 25. tests/app.test.js 作成（smoke、1-3 テスト）

  **What to do**:
  - `tests/app.test.js` 新規作成。最低 1-3 個のテストケース:
    1. `import { initApp } from '../src/app.js'` で import がエラー出さない
    2. DOM fixture を `document.body.innerHTML` に注入し、`initApp()` が throw しない
    3. `initApp()` 後、`#main-screen` が `document.querySelector` で取得可能（注入した DOM が前提）
  - DOM fixture は `public_html/index.html` の構造を簡略化したもの（または該当ファイルから抽出）
  - localStorage は `beforeEach(() => { localStorage.clear() })` でクリア
  - app.js のテストは smoke レベル（カバレッジ目標を立てない、深堀りしない）

  **Must NOT do**:
  - 既存テストファイルを変更しない
  - app.js のソースを変更しない（このタスクはテスト追加のみ）
  - app.js の内部関数を直接テスト（initApp のみ public API）
  - 過剰な DOM fixture（必要最小限）
  - 動的 import を使ってテスト分離する複雑な仕組み（モジュール状態は受け入れる）

  **Recommended Agent Profile**:
  - **Category**: `deep`
    - Reason: app.js (948 LOC、Wave 3 後はもっと小さくなるが) の初期化が DOM 多数を要求 → 慎重な fixture 設計
  - **Skills**: なし

  **Parallelization**:
  - **Can Run In Parallel**: YES (他テストと並列可)
  - **Parallel Group**: Wave 5
  - **Blocks**: T26
  - **Blocked By**: T16, T5-T12 (app.js が import 経由で依存解決される前提)

  **References**:

  **Pattern References**:
  - `public_html/index.html` - DOM 構造の参照（main-screen, focus-screen 等の ID）

  **API/Type References**:
  - `src/app.js:initApp` - 唯一の public export

  **WHY Each Reference Matters**:
  - app.js は `document.getElementById` を多用 → 必要最低限の DOM fixture で initApp が throw しないこと

  **Acceptance Criteria**:

  - [ ] `tests/app.test.js` 新規作成
  - [ ] 最低 1 テスト（理想は 3）
  - [ ] `npx vitest run tests/app.test.js` で全件緑
  - [ ] initApp が throw しない（pageerror 相当をキャッチ）

  **QA Scenarios**:

  ```
  Scenario: app smoke テスト緑
    Tool: Bash
    Preconditions: T25 実施後、Wave 3 完了済み
    Steps:
      1. npx vitest run tests/app.test.js 2>&1 | tee .sisyphus/evidence/task-25-app-tests.log
      2. grep -qE "Tests +([1-9]|[1-9][0-9]+) passed" .sisyphus/evidence/task-25-app-tests.log
    Expected Result: 1+ tests passed
    Failure Indicators: import エラー、initApp throw、DOM 不足エラー
    Evidence: .sisyphus/evidence/task-25-app-tests.log

  Scenario: 全体テスト合計が 228+
    Tool: Bash
    Preconditions: T17-T25 全て完了
    Steps:
      1. npm test 2>&1 | tee .sisyphus/evidence/task-25-all-tests.log
      2. grep -qE "Tests +(22[8-9]|2[3-9][0-9]|[3-9][0-9][0-9]) passed" .sisyphus/evidence/task-25-all-tests.log
    Expected Result: 228+ tests passed (177 既存 + 51+ 新規)
    Failure Indicators: テスト数不足、既存テスト失敗
    Evidence: .sisyphus/evidence/task-25-all-tests.log
  ```

  **Evidence to Capture**:
  - [ ] task-25-app-tests.log
  - [ ] task-25-all-tests.log

  **Commit**: YES
  - Message: `test(app): add smoke test for initApp`
  - Files: `tests/app.test.js` (new)
  - Pre-commit: `npm test` (228+ passed)

- [x] 26. @vitest/coverage-v8 導入

  **What to do**:
  - `npm install --save-dev @vitest/coverage-v8` 実行
  - `package.json` の devDependencies に `@vitest/coverage-v8` が追加されることを確認
  - `package.json` の scripts に `"test:coverage": "vitest run --coverage"` 追加
  - `npm run test:coverage` 実行 → エラー発生せずカバレッジレポート生成
  - vitest が `coverage-v8` provider を認識することを確認

  **Must NOT do**:
  - 他の coverage provider（c8, istanbul）を導入しない
  - vitest のメジャーバージョンを変更しない（^3.2.4 維持）
  - jsdom などの既存依存を変更しない

  **Recommended Agent Profile**:
  - **Category**: `quick`
    - Reason: パッケージ追加のみ
  - **Skills**: なし

  **Parallelization**:
  - **Can Run In Parallel**: NO (T27, T28 の前提)
  - **Parallel Group**: Wave 6
  - **Blocks**: T27
  - **Blocked By**: T17-T25

  **References**:

  **Pattern References**:
  - `package.json:devDependencies` - 既存パッケージの形式

  **External References**:
  - vitest coverage docs: https://vitest.dev/guide/coverage.html

  **WHY Each Reference Matters**:
  - vitest 3 系は @vitest/coverage-v8 がメジャー provider
  - npm install で package-lock.json も更新される

  **Acceptance Criteria**:

  - [ ] `package.json` の devDependencies に `@vitest/coverage-v8` が追加
  - [ ] `package-lock.json` 更新
  - [ ] `package.json` の scripts に `test:coverage` 追加
  - [ ] `npm run test:coverage` 実行 (このタスク時点では config 未設定なので vitest デフォルト coverage で動作確認)

  **QA Scenarios**:

  ```
  Scenario: パッケージ追加成功
    Tool: Bash
    Preconditions: T26 実施後
    Steps:
      1. cat package.json | jq '.devDependencies."@vitest/coverage-v8"' | tee .sisyphus/evidence/task-26-package.log
      2. test "$(jq -r '.devDependencies."@vitest/coverage-v8"' package.json)" != "null"
    Expected Result: バージョン文字列（例: "^3.2.4"）が表示される
    Failure Indicators: null 表示、jq エラー
    Evidence: .sisyphus/evidence/task-26-package.log

  Scenario: test:coverage script 動作
    Tool: Bash
    Preconditions: 上記成功
    Steps:
      1. npm run test:coverage 2>&1 | tee .sisyphus/evidence/task-26-coverage.log
      2. grep -qE "(All files|Coverage)" .sisyphus/evidence/task-26-coverage.log
    Expected Result: カバレッジレポート出力
    Failure Indicators: provider not found エラー、コマンド失敗
    Evidence: .sisyphus/evidence/task-26-coverage.log
  ```

  **Evidence to Capture**:
  - [ ] task-26-package.log
  - [ ] task-26-coverage.log

  **Commit**: NO（T27, T28 とまとめて Wave 6 末尾でコミット）

- [x] 27. vitest.config.js coverage 設定追加

  **What to do**:
  - `vitest.config.js` の `test` セクションに `coverage` を追加:
    ```js
    test: {
      environment: 'jsdom',
      globals: true,
      include: ['tests/**/*.test.js'],
      setupFiles: ['./tests/setup.js'],
      coverage: {
        provider: 'v8',
        reporter: ['text', 'json-summary', 'html'],
        include: ['src/**/*.js'],
        exclude: ['src/constants.js', 'node_modules/**', 'tests/**'],
        // 閾値設定なし（baseline 記録のみ）
      },
    }
    ```
  - `npm run test:coverage` 実行 → `coverage/coverage-summary.json` + `coverage/index.html` 生成
  - 全体カバレッジ % を `.sisyphus/evidence/task-27-coverage-summary.json` に保存

  **Must NOT do**:
  - 閾値（thresholds）を設定しない（このプランでは baseline 記録のみ）
  - constants.js をカバレッジ対象に含めない（テスト対象外）
  - reporter を text のみに絞らない（HTML レポート必要）

  **Recommended Agent Profile**:
  - **Category**: `quick`
    - Reason: 設定ファイル更新のみ
  - **Skills**: なし

  **Parallelization**:
  - **Can Run In Parallel**: NO (T26 完了後)
  - **Parallel Group**: Wave 6
  - **Blocks**: T28
  - **Blocked By**: T26

  **References**:

  **Pattern References**:
  - `vitest.config.js` (T16 で setupFiles 追加済みの状態) - 既存形式

  **External References**:
  - vitest coverage config: https://vitest.dev/config/#coverage

  **WHY Each Reference Matters**:
  - 既存 environment/globals/include の構造を尊重して coverage 追加

  **Acceptance Criteria**:

  - [ ] `vitest.config.js` に coverage セクション追加
  - [ ] `npm run test:coverage` で `coverage/` ディレクトリ生成
  - [ ] `coverage/coverage-summary.json` 存在
  - [ ] `coverage/index.html` 存在（HTML レポート）

  **QA Scenarios**:

  ```
  Scenario: coverage レポート生成
    Tool: Bash
    Preconditions: T27 実施後
    Steps:
      1. rm -rf coverage
      2. npm run test:coverage 2>&1 | tee .sisyphus/evidence/task-27-coverage.log
      3. test -f coverage/coverage-summary.json
      4. test -f coverage/index.html
      5. cp coverage/coverage-summary.json .sisyphus/evidence/task-27-coverage-summary.json
    Expected Result: ファイル存在
    Failure Indicators: 未生成、エラー
    Evidence: .sisyphus/evidence/task-27-coverage.log + task-27-coverage-summary.json

  Scenario: カバレッジ baseline 記録
    Tool: Bash
    Preconditions: 上記成功
    Steps:
      1. cat coverage/coverage-summary.json | jq '.total' | tee .sisyphus/evidence/task-27-baseline.json
    Expected Result: lines/functions/branches/statements の % 値が出力
    Failure Indicators: jq エラー、空オブジェクト
    Evidence: .sisyphus/evidence/task-27-baseline.json
  ```

  **Evidence to Capture**:
  - [ ] task-27-coverage.log
  - [ ] task-27-coverage-summary.json
  - [ ] task-27-baseline.json

  **Commit**: NO（T28 とまとめてコミット）

- [x] 28. .gitignore 更新 + baseline 確定

  **What to do**:
  - `.gitignore` に以下を追加（既存に含まれていなければ）:
    ```
    # Test coverage
    coverage/
    .nyc_output/
    ```
  - `git status` で `coverage/` が untracked にも appear しないことを確認
  - 最終的なテスト合計とカバレッジ baseline を `.sisyphus/evidence/task-28-final-baseline.md` にまとめて記録:
    ```md
    # Final Baseline (Plan Complete)

    ## Tests
    - Total: 228+ passed
    - Existing: 177 passed (preserved)
    - New: 51+ passed (9 modules + setup)

    ## Coverage (baseline, no thresholds)
    - Lines: X%
    - Functions: X%
    - Branches: X%
    - Statements: X%
    ```

  **Must NOT do**:
  - .gitignore の既存ルールを削除しない
  - coverage 閾値を設定しない（このプランでは baseline 記録のみ）
  - CI に test:coverage を追加しない（別プラン）

  **Recommended Agent Profile**:
  - **Category**: `quick`
    - Reason: gitignore 編集 + ドキュメント記録
  - **Skills**: なし

  **Parallelization**:
  - **Can Run In Parallel**: NO (T27 完了後)
  - **Parallel Group**: Wave 6
  - **Blocks**: F1-F4
  - **Blocked By**: T27

  **References**:

  **Pattern References**:
  - `.gitignore` (現状) - 既存ルール

  **WHY Each Reference Matters**:
  - 既存ルールを尊重し、coverage 関連を追加するのみ

  **Acceptance Criteria**:

  - [ ] `.gitignore` に `coverage/` 追加
  - [ ] `git status` で `coverage/` が untracked にならない
  - [ ] `.sisyphus/evidence/task-28-final-baseline.md` 作成

  **QA Scenarios**:

  ```
  Scenario: gitignore 更新確認
    Tool: Bash
    Preconditions: T28 実施後
    Steps:
      1. grep -qE "^coverage/?$" .gitignore || grep -qE "coverage" .gitignore
      2. npm run test:coverage > /dev/null 2>&1
      3. ! git status --porcelain | grep -E "^\?\? coverage/"
    Expected Result: gitignore に含まれ、git status で untracked にならない
    Failure Indicators: coverage/ が ?? 表示
    Evidence: .sisyphus/evidence/task-28-gitstatus.log

  Scenario: final baseline ドキュメント生成
    Tool: Bash
    Preconditions: 上記成功
    Steps:
      1. test -f .sisyphus/evidence/task-28-final-baseline.md
      2. grep -q "Tests" .sisyphus/evidence/task-28-final-baseline.md
      3. grep -q "Coverage" .sisyphus/evidence/task-28-final-baseline.md
    Expected Result: ドキュメント存在 + 必要セクション含む
    Failure Indicators: 未生成、空ファイル
    Evidence: .sisyphus/evidence/task-28-final-baseline.md
  ```

  **Evidence to Capture**:
  - [ ] task-28-gitstatus.log
  - [ ] task-28-final-baseline.md

  **Commit**: YES (T26-T28 をまとめて Wave 6 末尾で 1 コミット)
  - Message: `chore(test): add @vitest/coverage-v8 with baseline reporting`
  - Files: `package.json`, `package-lock.json`, `vitest.config.js`, `.gitignore`
  - Pre-commit: `npm test` (228+ passed) + `npm run test:coverage` (成功)

---

## Final Verification Wave (MANDATORY — after ALL implementation tasks)

> 4 review agents run in PARALLEL. ALL must APPROVE. Present consolidated results to user and get explicit "okay" before completing.

- [x] F1. **Plan 準拠監査** — `oracle`
  Read this plan end-to-end. For each "Must Have": verify implementation exists. For each "Must NOT Have": search codebase for forbidden patterns. Specifically:
  - `MODULE_ORDER` に `constants/i18n/ui/audio/theme/state/tasks/timer/export` 全て含まれるか
  - `transformModule` が `export async function` を処理できるか
  - `src/app.js` から `function t`, `applyTheme$app`, `function playBeep`, タスク配列管理、タイマー interval、export 関数の重複が削除されたか
  - `tests/storage.test.js` 等の既存7ファイルが1文字も変更されていないか（git diff で確認）
  - `tests/setup.js` が新規作成され `matchMedia`, `AudioContext` stub を含むか
  - 9 モジュールの test file が全て存在し最低テスト数を達成しているか
  - `@vitest/coverage-v8` が package.json devDependencies に含まれるか
  - `vitest.config.js` に `coverage` セクションがあるか
  - `.gitignore` に `coverage/` が含まれるか
  - public_html/index.html, README.md, CI yml の禁止事項違反がないか
  Output: `Must Have [N/N] | Must NOT Have [N/N] | Tasks [28/28] | VERDICT: APPROVE/REJECT`

- [x] F2. **コード品質レビュー** — `unspecified-high`
  Run:
  - `npm test` → expect: Tests 228+ passed
  - `npx vitest run --sequence.shuffle=true` → expect: all green (モジュール状態漏れ検証)
  - `npm run build` → expect: dist/index.html 生成
  Review all changed files for:
  - `as any`/`@ts-ignore`/`@ts-expect-error` パターン (JS だが念のため)
  - empty catch、`console.log` (production)、commented-out code
  - 未使用 import、未使用変数
  - 過剰コメント、過剰抽象化
  - 一般的な変数名 (`data`, `result`, `item`, `temp` の濫用)
  - app.js の重複実装が完全削除されているか
  - 既存テスト 177 が全て緑のままか
  Output: `Build [PASS/FAIL] | Tests [N pass/N fail] | Files [N clean/N issues] | VERDICT`

- [x] F3. **実機 QA** — `unspecified-high` (+ `playwright` skill)
  Start from clean state (`git stash` or fresh checkout想定).
  - `dist/index.html` を `file://` で開く
  - `#main-screen` が表示される
  - タスク追加 → 集中開始 → カウントアップタイマー動作 → 終了 → ログ確認の主要フロー実行
  - 言語切替（日本語 ⇔ English）が機能
  - テーマ切替（light/dark/system）が機能
  - 15分節目通知（フラッシュ/チャイム）が機能（Date モックで 15分進める）
  - エクスポート（JSON/CSV/todo.txt）が機能
  - リセット → localStorage がクリアされる
  - 各シナリオで evidence (.png) を `.sisyphus/evidence/final-qa/` に保存
  Output: `Scenarios [N/N pass] | Integration [N/N] | Edge Cases [N tested] | VERDICT`

- [x] F4. **スコープ整合性チェック** — `deep`
  For each task: read "What to do", read actual diff. Verify 1:1:
  - 計画にあるが実装されていない要素はないか
  - 計画にないが実装された要素はないか（スコープ creep）
  - "Must NOT do" 違反検出
  - cross-task contamination: T5 が T6 のファイルを触っていないか等
  - 既存7テストファイルの不変性: `git diff --stat tests/storage.test.js tests/url-tasks.test.js tests/utils.test.js tests/todotxt.test.js tests/stats.test.js tests/milestone.test.js tests/date-utils.test.js` が空であること
  - `public_html/index.html` の不変性
  - `README.md` の不変性
  - `.github/workflows/*.yml` の不変性
  - 未追跡ファイル（`?? src/state.js` 等）が正規コミット可能な状態（git add 可能）になっているか
  Output: `Tasks [28/28 compliant] | Contamination [CLEAN/N issues] | Unaccounted [CLEAN/N files] | Constraint Violations [0/N] | VERDICT`

---

## Commit Strategy

> Each Wave 完了時に1コミット。Wave内タスク完了で機能まとまりごとに細分化可能。

### Wave 2 (build.js 修復)
- **Commit message**: `refactor(build): extend MODULE_ORDER and support async exports`
- **Files**: `build.js`
- **Pre-commit**: `npm test` (177 passed 維持) + `npm run build` (成功)

### Wave 3 (app.js 重複削除) — 機能ごとに分割可
- **T5 commit**: `refactor(app): use i18n module instead of inline t()`
- **T6 commit**: `refactor(app): use theme module instead of applyTheme$app`
- **T7 commit**: `refactor(app): use audio module instead of inline playBeep`
- **T8 commit**: `refactor(app): use ui module for DOM helpers`
- **T9 commit**: `refactor(app): use state module for app-level state`
- **T10 commit**: `refactor(app): use tasks module for task list management`
- **T11 commit**: `refactor(app): use timer module for focus/pause timers`
- **T12 commit**: `refactor(app): use export module for file I/O`
- **Pre-commit (each)**: `npm test` + `npm run build`

### Wave 4 (検証)
- **No commit** (検証のみ、変更なし)

### Wave 5 (テスト追加) — 機能ごとに分割可
- **T16 commit**: `test(setup): add jsdom stubs for matchMedia and AudioContext`
- **T17-T25 commits**: `test({module}): add unit tests for {module}.js` (9 commits)
- **Pre-commit (each)**: `npm test` で全テスト緑

### Wave 6 (Coverage)
- **Commit message**: `chore(test): add @vitest/coverage-v8 with baseline reporting`
- **Files**: `package.json`, `package-lock.json`, `vitest.config.js`, `.gitignore`
- **Pre-commit**: `npm test -- --coverage` 成功

### Final Commit (after F1-F4 approval + user okay)
- **Commit message**: `chore: mark build-repair-test-coverage plan complete`
- **Files**: `.sisyphus/plans/build-repair-test-coverage.md` (チェックボックス全完了)

---

## Success Criteria

### Verification Commands

```bash
# 1. ベースライン保持
npm test 2>&1 | grep -qE "Tests +(22[8-9]|2[3-9][0-9]|[3-9][0-9][0-9]) passed" || exit 1

# 2. 既存7テストファイル不変
git diff --stat HEAD -- tests/storage.test.js tests/url-tasks.test.js tests/utils.test.js tests/todotxt.test.js tests/stats.test.js tests/milestone.test.js tests/date-utils.test.js | grep -qE "^$" || (echo "FAIL: existing tests modified"; exit 1)

# 3. ビルド成功
npm run build && test -f dist/index.html

# 4. dist 内必要シンボル
grep -q "function applyTheme" dist/index.html
grep -q "function setText" dist/index.html
grep -q "function setAttr" dist/index.html
grep -q "function trapFocus" dist/index.html
grep -q "function initAudio" dist/index.html
grep -q "const TRANSLATIONS" dist/index.html
grep -q "const MAX_TASKS" dist/index.html

# 5. app.js 重複削除確認
! grep -qE "^function applyTheme\\\$app" src/app.js  # 削除済み
! grep -qE "^function playBeep\\(" src/app.js  # 削除済み

# 6. coverage 生成
npm test -- --coverage 2>&1 | grep -q "All files" || exit 1
test -f coverage/coverage-summary.json

# 7. 並列実行でモジュール状態漏れなし
npx vitest run --sequence.shuffle=true 2>&1 | grep -qE "Tests +(22[8-9]|2[3-9][0-9]|[3-9][0-9][0-9]) passed" || exit 1

# 8. 既存 e2e 緑（後方互換性）
npm run test:e2e
```

### Final Checklist
- [ ] All "Must Have" present
- [ ] All "Must NOT Have" absent
- [ ] All 28 tasks completed with evidence
- [ ] F1-F4 全て APPROVE
- [ ] User explicit okay received
- [ ] All commits pushed (Wave 単位)
- [ ] `coverage/` baseline 記録済み
