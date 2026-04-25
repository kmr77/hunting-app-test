# 猟務台帳 MVP

狩猟・銃管理向けのローカル業務アプリです。  
Next.js 16 + Prisma 7 + ローカル Prisma dev server を前提にした、スマホ優先の MVP です。

## 現在できること

- トップ画面でサマリー確認
- `/renewals` で更新記録の作成・更新・削除
- `/ammo` で実包帳簿の作成・更新・削除
- `/reports` で狩猟記録の作成・更新・転記切替・削除
- `/account` で固定利用者プロフィールの更新
- 成功 / 失敗メッセージ表示
- 送信中表示と二重送信防止
- enum 値の日本語表示

## まだできないこと

- 本番認証
- 複数ユーザー運用
- メール送信
- ファイルアップロード
- 課金
- 本番 DB 接続
- テストコード
- 詳細な field 単位バリデーション

## 主要画面

- `/`
  - ダッシュボード
  - 更新件数、実包残数、未転記件数、利用者情報を表示
- `/renewals`
  - 更新チェッカー
  - 更新記録 CRUD
  - 新規登録時の銃情報 1 件同時登録
- `/ammo`
  - 実包帳簿
  - 実包記録 CRUD
  - 残数表示
- `/reports`
  - 報告書転記支援
  - 狩猟記録 CRUD
  - 転記済み / 未転記 切替
- `/account`
  - アカウント管理
  - 固定利用者の基本情報更新

## 技術構成

- Next.js `16.2.4`
- React `19.2.4`
- Prisma `7.8.0`
- `@prisma/adapter-pg`
- ローカル Prisma dev server

## Prisma / DB / migration の現在状態

- `schema.prisma` は PostgreSQL 前提
- Prisma 7 のため接続 URL は `prisma.config.ts` で管理
- ローカル DB は `npm run db:server` で起動する Prisma dev server を使う
- 初期 migration は [prisma/migrations/20260424000000_init/migration.sql](/Users/spdt0008/Desktop/hunting-app-test/prisma/migrations/20260424000000_init/migration.sql)
- `prisma migrate dev` はこの構成で不安定なため、現時点では通常運用の migration フローは未整理
- `Prisma 7 + @prisma/adapter-pg + prisma dev` には断続的な不安定さがあり、アプリ側で再試行とフォールバック表示を入れている

## ローカル起動手順

Node.js `>=20.9.0` が必要です。

1. 依存が入っていない場合はインストール

```bash
npm install
```

2. ローカル Prisma dev server を起動

```bash
npm run db:server
```

3. 別ターミナルで Next.js 開発サーバーを起動

```bash
npm run dev
```

4. 確認 URL

- [http://localhost:3000](http://localhost:3000)
- [http://localhost:3000/renewals](http://localhost:3000/renewals)
- [http://localhost:3000/ammo](http://localhost:3000/ammo)
- [http://localhost:3000/reports](http://localhost:3000/reports)
- [http://localhost:3000/account](http://localhost:3000/account)

## 検証コマンド

```bash
npm run lint
npm run typecheck
npm run build
```

## 動作確認済み

- `/` の表示
- `/renewals` の再読み込みと CRUD
- `/ammo` の CRUD
- `/reports` の CRUD と転記切替
- `/account` の update
- トップページのサマリー表示反映
- `lint`
- `typecheck`
- `build`

## 残課題

- Prisma adapter / prisma dev の根本安定化
- `/reports` 一覧取得のさらなる軽量化
- フィールド単位のエラーメッセージ強化
- 自動テスト追加
- 認証導入前提の整理

## 関連ドキュメント

- [PROJECT_CONTEXT.md](/Users/spdt0008/Desktop/hunting-app-test/PROJECT_CONTEXT.md)
- [TODO.md](/Users/spdt0008/Desktop/hunting-app-test/TODO.md)
