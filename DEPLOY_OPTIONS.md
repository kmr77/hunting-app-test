# DEPLOY_OPTIONS

Vercel で本番化する場合の構成案比較。  
作成日: 2026-05-01

今回は実装・接続・環境変数設定・DB作成・画像保存実装は行わず、方針整理のみ。

## 1. 現在の前提

- アプリ: Next.js 16.2.4 / React 19.2.4
- DB: PostgreSQL + Prisma 7.8.0 + `@prisma/adapter-pg`
- 実行: Server Actions を使った CRUD
- 認証: 未実装。現在は固定デモユーザー
- 画像: 許可証画像をブラウザ側で WebP 圧縮し、現在は `public/uploads/renewal-permits/` にローカル保存
- DB 管理: `file_records` に画像メタデータ、`renewal_records` に紐づけ
- 本番化の優先: まずは自分専用テスト。一般公開 MVP はその後

## 2. 比較する3案

1. Vercel + Neon
2. Vercel + Supabase
3. Vercel + Vercel Blob

注意: `Vercel + Vercel Blob` は画像保存用のストレージ案であり、PostgreSQL DB の代替ではない。Prisma 7 / PostgreSQL を維持するには別途 Neon / Supabase / 他PostgreSQL が必要。

## 3. 第1段階のテスト構成

第1段階の自分専用本番テストは **Vercel + Neon 無料枠** で進める。

- 目的:
  - 画像アップロードを除いた主要機能が、本番相当環境で動くか確認する。
  - Next.js 16 / Server Actions / Prisma 7 / PostgreSQL の組み合わせを Vercel + Neon 上で確認する。
- 確認対象:
  - Vercel 上で Next.js が起動するか
  - Neon PostgreSQL へ接続できるか
  - Prisma 経由で主要データが取得できるか
  - `/` / `/renewals` / `/ammo` / `/reports` / `/account` が表示されるか
  - 画像アップロード以外の CRUD が動くか
- 対象外:
  - 許可証画像アップロード
  - 画像保存実装
  - 認証導入
  - 一般公開MVPの正式構成決定
- 画像アップロードを対象外にする理由:
  - Vercel 本番では `public/uploads` のローカル保存を前提にしないため。
  - 画像保存は、第1段階のDB接続・CRUD確認後に Vercel Blob / Supabase Storage / R2 などから改めて決める。
- アクセス制限:
  - 認証はまだ導入しない。
  - 固定デモユーザー前提を維持する。
  - 外部公開時は Vercel 側の Deployment Protection 等で自分専用に制限する前提にする。

一般公開MVPの正式構成は、現時点では未確定のままにする。

## 4. 比較表

| 観点 | Vercel + Neon | Vercel + Supabase | Vercel + Vercel Blob |
|---|---|---|---|
| Next.js 16 / Server Actions | 公式ホスト。Next.js との相性が良い | 公式ホスト。相性良好 | Vercel 環境のストレージとして相性良い |
| Prisma 7 / PostgreSQL | Neon は PostgreSQL 専用。Prisma 7 との相性が良い | Supabase PostgreSQL に Prisma で接続可 | DB ではない。PostgreSQL は別途必要 |
| 画像アップロード | 画像保存先は別途必要 | Supabase Storage を使えば自然 | Vercel Blob は画像保存用に使える |
| 認証導入 | 別途 NextAuth / Auth.js / Clerk が必要 | Supabase Auth を利用可能 | 認証機能は含まれない。アプリ側認証が必要 |
| 無料枠でのテスト | 可能性が高い | 可能性が高い | 少量なら無料枠で試せる場合がある |
| 一般公開MVPの整理 | 認証・画像・DB migration を別途設計する必要がある | Auth / Storage / RLS の方針を検討する必要がある | 画像アクセス制御・URL公開範囲の設計が必要 |

## 5. Vercel + Neon の特徴

- Vercel 上でホストする Next.js アプリと PostgreSQL DB を分離する構成。
- Neon は PostgreSQL 専用で、Prisma 7 との接続が基本的な形。
- 画像保存は Vercel Blob や S3 / R2 などの別サービスが必要。
- 認証機能は含まれないため、別途認証を追加する必要がある。
- 接続管理では pooler や direct connection の検討が必要。
- 第1段階の自分専用本番テストでは、この構成を使って画像アップロードを除いた本体・DB接続テストを行う。

## 6. Vercel + Supabase の特徴

- DB・Auth・Storage を同じ Supabase エコシステム内で揃える構成。
- Supabase PostgreSQL に Prisma で接続できる。
- Supabase Storage で画像保存を扱う場合は自然な連携が想定される。
- Supabase Auth を利用すれば認証機能の導入経路が用意される。
- Serverless DB の運用方針として pooler の検討が必要。

## 7. Vercel + Vercel Blob の特徴

- 画像保存を Vercel Blob で扱う形。
- Vercel Blob は DB ではないため、PostgreSQL は別途用意する必要がある。
- `public/uploads/` のローカル保存を置き換える手段として検討できる。
- 認証やアクセス制御は Blob 側ではなくアプリ側で設計する必要がある。
- private Blob や署名付き URL の利用を検討する必要がある。

## 8. 各案のメリット・デメリット

### Vercel + Neon

- メリット:
  - PostgreSQL を維持しやすい
  - Prisma 7 との接続が想定しやすい
- デメリット:
  - 画像保存先を別に用意する必要がある
  - 認証を別途追加する必要がある

### Vercel + Supabase

- メリット:
  - DB / Storage / Auth をまとめやすい
  - 画像保存と認証の連携が整えやすい
- デメリット:
  - Supabase の運用方針を別途検討する必要がある
  - Prisma との組み合わせで細部の調整が必要な場合がある

### Vercel + Vercel Blob

- メリット:
  - 画像保存を Vercel 内で完結させやすい
  - `public/uploads/` の問題を回避できる
- デメリット:
  - DB は別途必要
  - 認証 / アクセス制御をアプリ側で設計する必要がある

## 9. 未決定事項

- 一般公開MVPでどの DB プロバイダを使うか
- 画像保存を Vercel Blob にするか Supabase Storage にするか
- 認証をいつ導入するか
- `file_records.storageKey` の保存形式をどうするか（URL / provider key / storage path）
- バックアップと運用方針をどうするか

> 第1段階の自分専用本番テストは Vercel + Neon 無料枠で進める。  
> 一般公開MVPの正式構成は未確定。

## 10. 次にこのチャットで決めること

- 第1段階のVercel + Neon接続作業へ進むタイミング
- 画像保存のストレージ構成をどうするか
- 認証の導入タイミングをどうするか
- `file_records.storageKey` の扱いをどう設計するか

## 11. 参考公式ドキュメント

- Vercel: Next.js on Vercel  
  https://vercel.com/docs/frameworks/full-stack/nextjs
- Supabase: Connecting to Postgres  
  https://supabase.com/docs/guides/database/connecting-to-postgres
- Vercel Blob:  
  https://vercel.com/docs/vercel-blob
