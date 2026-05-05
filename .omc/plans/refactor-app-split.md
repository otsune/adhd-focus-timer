# リファクタリング計画: app.js ゴッドオブジェクト分割

**作成日**: 2026-04-30  
**対象**: `src/app.js` (849行 → 目標200行以下)  
**安全基準**: 229テスト全て維持（機能変更なし）

---

## 要件サマリー

- app.js はソースコードの74%を占める849行のゴッドオブジェクト
- 41関数、79DOM参照、37イベントリスナー、9グローバル変数が混在
- 目標: 機能別に5〜6モジュールへ分割し、app.js を薄いオーケストレーターに縮小
- 全フェーズで `npm test` の229テスト全合格を維持する

---

## 受け入れ条件（全て測定可能）

- [ ] `npm test` が229テスト全合格（フェーズ毎に確認）
- [ ] `npm run build` が成功し `dist/index.html` が生成される
- [ ] app.js が200行以下になる
- [ ] 新規モジュールそれぞれにユニットテストが追加される（合計テスト数が増加）
- [ ] 循環インポートが発生しない（`build.js` MODULE_ORDER が正常動作）
- [ ] マジックナンバーが全て `constants.js` に集約される

---

## リスクと対策

| リスク | 対策 |
|--------|------|
| 循環インポート | 新モジュールはTier 3.5に配置し、app.js のみがTier 4。コールバック注入で逆依存を排除 |
| グローバル状態の分散 | 各モジュールが「所有」するグローバルをモジュールスコープ変数として管理。外部からはgetter経由 |
| テスト破壊 | フェーズ毎にテストを実行。失敗時は即座に差し戻し |
| DOM依存の深さ | DOM参照はリファクタリング対象外（将来課題）。ロジックの整理に集中 |

---

## 実装ステップ

### Phase 1: マジックナンバー整理（低リスク）

**変更ファイル**: `src/constants.js`, `src/app.js`

`constants.js` に追加:
```js
export const ADDTASK_FOCUS_DELAY_MS = 50;     // app.js:182 の setTimeout
export const SCREEN_SWITCH_DELAY_MS = 100;    // app.js:326 の setTimeout
```

`app.js` で対応する数値リテラルを定数に置き換え。

**検証**: `npm test` → 229テスト合格

---

### Phase 2: 自己完結モジュールの抽出（中リスク）

以下4モジュールを新規作成。app.js への逆依存なし。

#### 2a. `src/task-ui.js` (新規 Tier 3.5)

**所有グローバル**: `undoTimeout`, `undoData`

**抽出する関数**:
- `renderTaskSlots()` (app.js:142〜197)
- `addTask()` (app.js:171〜183)
- `removeTask()` (app.js:185〜199)
- `showUndoToast()` (app.js:201〜216)
- `undoRemoveTask()` (app.js:218〜231)

**インポート依存**:
```
constants.js, tasks.js, storage.js, i18n.js, state.js, utils.js
```

**エクスポート**:
```js
export { renderTaskSlots, addTask, removeTask, showUndoToast, undoRemoveTask }
```

#### 2b. `src/roulette.js` (新規 Tier 3.5)

**所有グローバル**: `rouletteIntervalId`

**抽出する関数**:
- `startRoulette()` (app.js:287〜328)

**インポート依存**:
```
constants.js, tasks.js
```

#### 2c. `src/summary-ui.js` (新規 Tier 4a)

**抽出する関数**:
- `showSummary()` (app.js:420〜482)
- `closeSummary()` (app.js:484〜499)

**インポート依存**:
```
stats.js, storage.js, state.js, ui.js, i18n.js, utils.js, date-utils.js, constants.js
```

#### 2d. `src/settings-ui.js` (新規 Tier 4a)

**抽出する関数**:
- `showSettings()` (app.js:557〜572)
- `handleSaveSettings()` (app.js:574〜596)
- `applyLanguage()` (app.js:68〜112)
- `applyStaticTranslations()` (app.js:114〜155)
- `updateFocusScreenTranslations()` (app.js:157〜164)
- `handleThemePreview()`, `handleLanguagePreview()` (2行ずつのハンドラ)

**インポート依存**:
```
state.js, theme.js, i18n.js, storage.js, audio.js, utils.js
```

**注意**: `applyLanguage()` が `showSummary()` を呼ぶ場合はコールバック注入で解決:
```js
export function applyLanguage(language, { onSummaryOpen } = {}) { ... }
```

**検証**: `npm test` → 229テスト合格、`npm run build` 成功

---

### Phase 3: 状態依存モジュールの抽出（高リスク）

#### 3a. `src/recovery-ui.js` (新規 Tier 4b)

**所有グローバル**: `isRecoveryMode`, `lastTaskName`, `lastPauseType`, `recoveryPausedAt`

**抽出する関数**:
- `renderRecoverySection()` (app.js:598〜643)
- `exitRecovery()` (app.js:645〜652)
- `checkActiveState()` (app.js:680〜741) ← 62行、複雑な分岐あり

**循環依存の解決**: `checkActiveState()` は `startFocus()` (app.js) を呼ぶ。
コールバック注入で解決:
```js
export function checkActiveState({ onStartFocus, onSwitchScreen }) { ... }
// app.js から呼ぶ時:
checkActiveState({ onStartFocus: startFocus, onSwitchScreen: switchScreen })
```

同様に `renderRecoverySection()` のボタンハンドラもコールバック注入:
```js
export function renderRecoverySection({ onExitRecovery, onFinish }) { ... }
```

**エクスポート**:
```js
export { renderRecoverySection, exitRecovery, checkActiveState,
         getIsRecoveryMode, getRecoveryPausedAt, getLastPauseType, getLastTaskName }
```

#### 3b. `src/focus-session.js` (新規 Tier 4b)

**抽出する関数**:
- `startFocus()` (app.js:331〜359)
- `handleFocusTimerTick()` (app.js:361〜365)
- `pauseAs()` (app.js:367〜382)
- `finishFocus()` (app.js:384〜395)
- `handleFocusMilestone()` (app.js:397〜410)
- `showMilestoneMessage()` (app.js:412〜419)
- `handlePauseWarning()` (app.js:500〜508)
- `flashScreen()` (app.js:504〜510)
- `getCachedTodayFocusTime()` (app.js:240〜250)

**コールバック注入**:
```js
export function startFocus(taskName, { onSwitchScreen, onRenderTaskSlots }) { ... }
export function pauseAs(type, { onSwitchScreen, onRenderRecovery }) { ... }
```

**検証**: `npm test` → 229テスト合格、`npm run build` 成功

---

### Phase 4: 新規モジュールのユニットテスト追加

各新モジュールにテストファイルを作成:

| テストファイル | 対象 | 最低テスト数 |
|---------------|------|------------|
| `tests/task-ui.test.js` | renderTaskSlots, addTask, removeTask, undo | 15件 |
| `tests/roulette.test.js` | startRoulette のロジック | 5件 |
| `tests/summary-ui.test.js` | showSummary のHTML生成 | 8件 |
| `tests/settings-ui.test.js` | applyLanguage, handleSaveSettings | 8件 |
| `tests/recovery-ui.test.js` | checkActiveState の分岐 | 10件 |
| `tests/focus-session.test.js` | startFocus, pauseAs, finishFocus | 12件 |

**目標**: 合計テスト数 229 + 58 = 287件以上

---

### Phase 5: build.js MODULE_ORDER 更新

新モジュールを依存順に追加:

```js
const MODULE_ORDER = [
  // 第1層（依存なし）
  'src/constants.js',
  'src/utils.js',
  'src/i18n.js',
  'src/ui.js',
  'src/date-utils.js',
  // 第2層
  'src/storage.js',
  'src/audio.js',
  'src/theme.js',
  'src/milestone.js',
  'src/stats.js',
  'src/url-tasks.js',
  'src/todotxt.js',
  // 第3層
  'src/state.js',
  'src/tasks.js',
  'src/timer.js',
  'src/export.js',
  // 第3.5層（新規 - app.jsへの逆依存なし）
  'src/task-ui.js',
  'src/roulette.js',
  // 第4a層（新規 - summaryとsettings）
  'src/summary-ui.js',
  'src/settings-ui.js',
  // 第4b層（新規 - 相互コールバック依存をもつ）
  'src/recovery-ui.js',
  'src/focus-session.js',
  // 第4層（薄いオーケストレーター）
  'src/app.js',
];
```

---

### Phase 6: app.js のスリム化確認

全フェーズ完了後、app.js に残るもの:
- `import` 文（全新モジュールのインポート）
- `initApp()` のみ（イベントリスナー登録とモジュール初期化）
- `switchScreen()` （DOM遷移の中心、複数モジュールが参照するため残す）
- `updateMainAccumulatedDisplay()` 系（スクリーン表示更新）

**目標行数**: 200行以下

---

## 検証手順

各フェーズ終了後に以下を実行:

```bash
npm test                  # 229テスト（+追加分）が全合格
npm run build             # dist/index.html が生成される
wc -l src/app.js          # フェーズ6完了時: 200行以下
```

最終確認: `dist/index.html` をブラウザで開き、集中タイマーの基本フロー（開始→一時停止→再開→終了→サマリー表示）を手動確認。

---

## ADR（アーキテクチャ決定記録）

**決定**: コールバック注入パターンで循環依存を解消する

**ドライバー**:
1. 229テスト維持（機能変更なし）
2. 循環インポート禁止（build.js のインライン化が破綻する）
3. 単一ファイルHTML出力の維持

**検討した代替案**:
- **イベントバス**: `EventTarget` を用いた疎結合。利点: 完全な分離。欠点: 暗黙的な制御フロー、デバッグ困難、現プロジェクト規模には過剰
- **集中状態ストア**: `appState` オブジェクト。利点: 単一真実の源。欠点: 全モジュールが状態を直接変更するため並行書き込みリスクあり、大規模リファクタリングが必要
- **コールバック注入（採用）**: 依存する関数を引数で渡す。利点: 最小変更、テスタブル、明示的な依存。欠点: 関数シグネチャが若干複雑化

**採用理由**: コールバック注入は変更範囲が最小で、229テストを壊すリスクが最も低い。また、将来的により高度なパターン（イベントバス等）への移行ステップとしても機能する。

**影響**:
- app.js → 200行以下の薄いオーケストレーターに変換
- 新規6モジュール追加（計21モジュール）
- build.js MODULE_ORDER に6エントリ追加

**フォローアップ**:
- DOM参照の集中管理（`dom.js` 抽出）は次のリファクタリングサイクルで検討
- TypeScript 型定義の追加（将来検討）
