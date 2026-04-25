# PROJECT_CONTEXT

## プロジェクト概要

- プロジェクト名: `hunting-app-test`
- 現在フェーズ: ローカル MVP の主要操作確認まで完了
- 目的: 狩猟・銃管理向けの業務アプリの土台をローカルで通すこと
- 将来方針: 完成後に `shuryo-kanri` へ名称変更して運営予定
- 注意: 現在の `/Applications/MAMP/htdocs/shuryo-kanri` は別プロジェクトとして扱い、手を入れない

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
- Prisma CLI の接続設定は `prisma.config.ts`
- アプリ実行時の接続設定は `.env` の `DATABASE_URL`
- ローカル DB は Mac 上の PostgreSQL 直接接続を前提にする
- ローカル DB 名は `hunting_app_test`
- `shuryo_kanri` DB は別プロジェクト用として扱い、`hunting-app-test` からは使わない

## 既知の技術的制約

- `@prisma/adapter-pg` は継続利用する
- ローカル PostgreSQL 未起動時は Prisma 操作と画面取得が失敗する
- 現時点では `prisma db push` を優先し、migration 運用は本番前に整理する
- Homebrew版 PostgreSQL 16 の通常経路で `prisma:push` と `dev` は確認済み

## 主要ファイル

- [src/app/page.tsx](./src/app/page.tsx)
- [src/app/renewals/page.tsx](./src/app/renewals/page.tsx)
- [src/app/ammo/page.tsx](./src/app/ammo/page.tsx)
- [src/app/reports/page.tsx](./src/app/reports/page.tsx)
- [src/app/account/page.tsx](./src/app/account/page.tsx)
- [src/app/actions.ts](./src/app/actions.ts)
- [src/lib/app-data.ts](./src/lib/app-data.ts)
- [src/lib/prisma.ts](./src/lib/prisma.ts)
- [src/lib/labels.ts](./src/lib/labels.ts)
- [src/components/feedback-banner.tsx](./src/components/feedback-banner.tsx)
- [src/components/submit-button.tsx](./src/components/submit-button.tsx)

## 次フェーズの入口

- 安定化の継続
- field 単位バリデーション
- 一覧性能整理
- テスト追加
- 認証設計の準備
