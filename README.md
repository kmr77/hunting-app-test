# 猟務台帳 MVP

狩猟・銃管理向けのローカル業務アプリです。  
Next.js 16 + Prisma 7 + ローカル PostgreSQL 直接接続を前提にした、スマホ優先の MVP です。

## 運用上の注意

- 現在の開発対象は `/Applications/MAMP/htdocs/hunting-app-test` です。
- `/Applications/MAMP/htdocs/shuryo-kanri` は別プロジェクトとして扱い、現時点では手を入れません。
- 将来的に `hunting-app-test` が完成したら、名前を `shuryo-kanri` に変更して運営する予定です。
- ローカルDBも `shuryo_kanri` ではなく、専用の `hunting_app_test` を使います。

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
- ローカル PostgreSQL 直接接続

## Prisma / DB / migration の現在状態

- `schema.prisma` は PostgreSQL 前提
- Prisma 7 のため Prisma CLI の接続 URL は `prisma.config.ts` で管理
- アプリ実行時の接続 URL は `.env` の `DATABASE_URL` を使う
- 初期 migration は [prisma/migrations/20260424000000_init/migration.sql](./prisma/migrations/20260424000000_init/migration.sql)
- 現時点ではローカル開発は `prisma db push` を優先し、本番前に migration 運用を整理する

## ローカル起動手順

Node.js `>=20.9.0` が必要です。

1. 依存が入っていない場合はインストール

```bash
npm install
```

2. ローカル PostgreSQL を起動し、DB を作成

```bash
# PostgreSQL が未起動なら起動
# 例: brew services start postgresql@16

# 初回のみ
/opt/homebrew/opt/postgresql@16/bin/createdb hunting_app_test

# 疎通確認
npm run db:check
```

3. Prisma Client と DB を同期

```bash
npm run prisma:generate
npm run prisma:push
```

4. Next.js 開発サーバーを起動

```bash
npm run dev
```

5. 確認 URL

- [http://localhost:3000](http://localhost:3000)
- [http://localhost:3000/renewals](http://localhost:3000/renewals)
- [http://localhost:3000/ammo](http://localhost:3000/ammo)
- [http://localhost:3000/reports](http://localhost:3000/reports)
- [http://localhost:3000/account](http://localhost:3000/account)

## 検証コマンド

```bash
npm run lint
npm run typecheck
npm run env:check
npm run db:check
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
- `env:check`
- `db:check`
- `prisma:push`
- `dev` (`http://localhost:3000`)

## 残課題

- Prisma adapter / prisma dev の根本安定化
- `/reports` 一覧取得のさらなる軽量化
- フィールド単位のエラーメッセージ強化
- 自動テスト追加
- 認証導入前提の整理

## 関連ドキュメント

- [PROJECT_CONTEXT.md](./PROJECT_CONTEXT.md)
- [TODO.md](./TODO.md)
- [DECISIONS.md](./DECISIONS.md)
- [CHANGELOG.md](./CHANGELOG.md)

## 作業開始時に読む順番

1. `PROJECT_CONTEXT.md`
2. `TODO.md`
3. `DECISIONS.md`
4. `CHANGELOG.md`
5. `README.md`

## 作業完了時の更新ルール

- 少なくとも `TODO.md` と `CHANGELOG.md` は毎回更新する。
- 仕様変更や重要判断があれば `PROJECT_CONTEXT.md` と `DECISIONS.md` も更新する。
- 起動手順や運用ルールに変更があれば `README.md` も更新する。
