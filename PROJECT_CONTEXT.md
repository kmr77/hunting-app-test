# PROJECT_CONTEXT

## プロジェクト概要

- プロジェクト名: `hunting-app-test`
- 現在フェーズ: ローカル MVP の主要操作確認まで完了
- 目的: 狩猟・銃管理向けの業務アプリの土台をローカルで通すこと

## 実装済み範囲

- スマホ優先 UI
- 日本語化済みの主要画面
- 下部固定ナビ + PC ナビ
- 固定デモユーザー前提の運用
- 更新管理、実包帳簿、報告書転記支援、利用者設定
- Prisma Client を使った CRUD
- 成功 / 失敗バナー
- 送信中表示と二重送信防止

## 画面構成

- `/`
  - ダッシュボード
- `/renewals`
  - 更新管理
- `/ammo`
  - 実包帳簿
- `/reports`
  - 報告書転記
- `/account`
  - 利用者設定

## データ前提

- 認証は未実装
- `demo@local.hunting-app` を固定利用者として利用
- `ensureDemoUser()` でデモユーザーと profile を確保

## DB / Prisma 前提

- Prisma 7
- PostgreSQL
- `schema.prisma` は維持
- 接続設定は `prisma.config.ts`
- `.env` は `scripts/start-prisma-dev.mjs` が上書き生成
- ローカル DB は Prisma dev server に依存

## 既知の技術的制約

- `@prisma/adapter-pg` と Prisma dev server の組み合わせで断続的な接続不安定がある
- アプリ側で Prisma Client 再生成リトライと画面フォールバックを入れている
- `prisma migrate dev` は安定運用前提にしていない

## 主要ファイル

- [src/app/page.tsx](/Users/spdt0008/Desktop/hunting-app-test/src/app/page.tsx)
- [src/app/renewals/page.tsx](/Users/spdt0008/Desktop/hunting-app-test/src/app/renewals/page.tsx)
- [src/app/ammo/page.tsx](/Users/spdt0008/Desktop/hunting-app-test/src/app/ammo/page.tsx)
- [src/app/reports/page.tsx](/Users/spdt0008/Desktop/hunting-app-test/src/app/reports/page.tsx)
- [src/app/account/page.tsx](/Users/spdt0008/Desktop/hunting-app-test/src/app/account/page.tsx)
- [src/app/actions.ts](/Users/spdt0008/Desktop/hunting-app-test/src/app/actions.ts)
- [src/lib/app-data.ts](/Users/spdt0008/Desktop/hunting-app-test/src/lib/app-data.ts)
- [src/lib/prisma.ts](/Users/spdt0008/Desktop/hunting-app-test/src/lib/prisma.ts)
- [src/lib/labels.ts](/Users/spdt0008/Desktop/hunting-app-test/src/lib/labels.ts)
- [src/components/feedback-banner.tsx](/Users/spdt0008/Desktop/hunting-app-test/src/components/feedback-banner.tsx)
- [src/components/submit-button.tsx](/Users/spdt0008/Desktop/hunting-app-test/src/components/submit-button.tsx)

## 次フェーズの入口

- 安定化の継続
- field 単位バリデーション
- 一覧性能整理
- テスト追加
- 認証設計の準備
