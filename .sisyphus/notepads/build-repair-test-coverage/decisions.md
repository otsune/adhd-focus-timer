# Decisions

## [2026-04-30] Session Start
- Source of Truth: モジュール化を完成させる
- Dead Modules: MODULE_ORDER に追加して生かす
- Test Expansion: 同一プランで build修復 → テスト拡充
- Source Modification: 許可
- Test Depth: 標準（Happy path + 主要エッジケース）
- Coverage Tool: @vitest/coverage-v8 導入
- UI Test Strategy: unit + jsdom
- constants.js テスト: 作成しない
- カバレッジ閾値: 設定しない（baseline 記録のみ）

## [2026-04-30] T16 Decision
- Vitest のグローバル前提があるテストを壊さないため、共通 stub は `tests/setup.js` に集約する

## [2026-04-30] T17 Decision
- i18n の検証は実装変更を避け、公開 API と翻訳テーブルの振る舞いだけを unit test で固定する
