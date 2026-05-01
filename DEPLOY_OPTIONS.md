# DEPLOY_OPTIONS

Vercel で本番化する場合の構成案比較。  
作成日: 2026-05-01

今回は実装・接続・環境変数設定・DB作成・画像保存実装は行わず、方針整理のみ。

## 現在の前提

- アプリ: Next.js 16.2.4 / React 19.2.4
- DB: PostgreSQL + Prisma 7.8.0 + `@prisma/adapter-pg`
- 実行: Server Actions を使った CRUD
- 認証: 未実装。現在は固定デモユーザー
- 画像: 許可証画像をブラウザ側で WebP 圧縮し、現在は `public/uploads/renewal-permits/` にローカル保存
- DB 管理: `file_records` に画像メタデータ、`renewal_records` に紐づけ
- 本番化の優先: まず自分専用テスト。一般公開 MVP はその後

## 比較する3案

1. Vercel + Neon
2. Vercel + Supabase
3. Vercel + Vercel Blob

注意: `Vercel + Vercel Blob` は画像保存の案であり、PostgreSQL DB の代替にはならない。Prisma 7 / PostgreSQL を維持するには、別途 Neon / Supabase / 他PostgreSQL が必要。

## 比較表

| 観点 | Vercel + Neon | Vercel + Supabase | Vercel + Vercel Blob |
|---|---|---|---|
| Next.js 16 / Server Actions | ◎ Vercel と最も自然 | ◎ Vercel と自然 | ◎ Vercel と自然 |
| Prisma 7 / PostgreSQL | ◎ Neon PostgreSQL と相性良い | ○ Supabase PostgreSQL と相性良いが接続方式に注意 | × Blob はDBではない |
| Serverless接続 | ◎ Neon pooler を使う前提 | ○ Supabase pooler を使う前提。transaction mode は prepared statements 注意 | 対象外 |
| 画像アップロード | △ 別途 Blob / S3 / R2 等が必要 | ◎ Supabase Storage を選べる | ◎ 画像保存には最適 |
| 認証導入 | ○ NextAuth/Auth.js 等を別途導入 | ◎ Supabase Auth を使いやすい | × 認証機能ではない |
| 無料枠で自分専用テスト | ◎ 可能性高い | ◎ 可能性高い | ○ 画像だけなら可能性高い |
| 一般公開MVP | ○ DBとして堅い。認証/画像は別設計 | ◎ DB/Auth/Storageをまとめやすい | △ DB/Authが別途必要 |
| 実装変更量 | ○ DB接続変更中心 | ○ DB接続 + 将来Auth/Storage導入 | △ `permit-storage.ts` のBlob対応が必要、DBは別途必要 |
| ロックイン | ○ PostgreSQL標準寄り | △ Auth/Storageまで使うとSupabase依存増 | △ Vercel Blob API依存 |
| 推奨度 | ◎ 自分専用テスト最短 | ◎ 一般公開MVPまで見据えるなら最有力 | ○ 画像保存部品として有力 |

## 1. Vercel + Neon

### 向いている用途

- まず最短で Vercel に載せて、自分専用テストを始めたい
- Prisma + PostgreSQL を素直に本番へ移したい
- 認証や画像ストレージは後から分けて考えたい

### 相性

- Vercel は Next.js のデプロイ先として相性がよい。
- Neon は serverless PostgreSQL で、Prisma との接続例や pooler 前提の説明がある。
- Prisma CLI 用の direct 接続と、アプリ実行時の pooled 接続を分ける方針が取りやすい。

### 画像アップロード

- Neon はDBなので画像本体の保存先ではない。
- 現在の `public/uploads/` ローカル保存は Vercel 本番では前提にしない方がよい。
- 許可証画像は Vercel Blob / Supabase Storage / S3 / R2 のいずれかへ移す必要がある。

### 認証

- Neon自体は認証サービスではない。
- Auth.js / NextAuth / Clerk / Supabase Auth などを別途選ぶ。
- 現在 `getCurrentUser()` wrapper に寄せているため、アプリ側の差し替え余地はある。

### 無料枠テスト

- 自分専用の小規模テストなら無料枠内で開始できる可能性が高い。
- ただし Neon の compute cold start、接続数、保存容量、バックアップ範囲は開始時に最新プランで確認する。

### 一般公開MVPへの課題

- 認証を別途導入する必要がある。
- 画像保存を別途外部ストレージへ移す必要がある。
- DB migration 方針を `db push` から migration ベースへ整理する必要がある。

### 評価

自分専用テストを最短で始めるなら最も軽い。  
ただし、画像と認証は別途設計が必要。

## 2. Vercel + Supabase

### 向いている用途

- 自分専用テストだけでなく、一般公開MVPまで見据えたい
- PostgreSQL、認証、画像保存を同じサービス群でまとめたい
- 将来の複数ユーザー化を早めに意識したい

### 相性

- Supabase は PostgreSQL を提供するため、Prisma のDBとして使える。
- Vercel の Server Actions / Serverless 実行では、Supabase の pooler 利用を前提に考える。
- Supabase の transaction pooler は serverless 向けだが prepared statements 非対応の注意があるため、Prisma 7 + adapter 構成で実際に検証が必要。

### 画像アップロード

- Supabase Storage を選べるため、許可証画像の保存先として自然。
- 現在の `src/lib/permit-storage.ts` wrapper を Supabase Storage 実装へ差し替える方針と相性がよい。
- `file_records` はそのままメタデータ管理に使える。

### 認証

- Supabase Auth を使える。
- メール+パスワード、確認メール、パスワード再設定という将来要件と相性がよい。
- RLS を使う場合は Prisma 経由の設計と整合を取る必要がある。

### 無料枠テスト

- 自分専用の小規模テストなら無料枠内で始められる可能性が高い。
- Free Plan のプロジェクト数や停止条件、Storage容量、Authメール制限は開始時に最新プランで確認する。

### 一般公開MVPへの課題

- Supabase Auth / Storage / RLS をどこまで使うかを先に決める必要がある。
- Prisma を主に使う場合、Supabaseクライアントとの責務分担を曖昧にしない。
- RLSを使うなら、Server Actions からのDB接続とユーザー権限分離の設計が必要。

### 評価

一般公開MVPまで考えるなら最有力。  
DB/Auth/Storage がまとまる一方、設計判断は Neon より少し増える。

## 3. Vercel + Vercel Blob

### 向いている用途

- Vercel 上で許可証画像を保存したい
- 既存のローカルファイル保存を、Vercel向けの外部オブジェクトストレージへ差し替えたい
- DBは Neon / Supabase など別の PostgreSQL を使う前提

### 相性

- Vercel Blob は Vercel のオブジェクトストレージ。
- Server Actions からアップロード処理を呼ぶ構成と相性がよい。
- 現在の `permit-storage.ts` wrapper を Blob 実装に差し替える形が自然。

### Prisma 7 / PostgreSQL

- Vercel Blob は PostgreSQL ではない。
- `renewal_records`, `file_records`, `ammo_records` などのDBは別途必要。
- したがって単独では本アプリの本番構成にならない。

### 画像アップロード

- 許可証画像保存にはかなり有力。
- Public Blob はURLを知っている人がアクセスできるため、許可証画像には private Blob またはアクセス制御付きURLを検討する。
- 現在の可読性優先WebP圧縮方針は維持できる。

### 認証

- Vercel Blob 自体は認証ではない。
- 画像の閲覧制御をするには、アプリ側認証と private Blob の組み合わせが必要。

### 無料枠テスト

- Vercel Blob は Hobby でも制限内で使える。
- 自分専用の少量画像なら試せる可能性が高いが、保存容量・操作回数・転送量を確認する。

### 一般公開MVPへの課題

- Blob URL の公開範囲を決める。
- 許可証画像は個人情報性が高いので、public store のまま一般公開MVPへ進めない。
- DB、認証、画像アクセス制御を別途組み合わせる必要がある。

### 評価

DB候補ではなく、画像保存候補。  
Neon または Supabase と組み合わせる部品として有力。

## 推奨構成

### 自分専用テストを最短で始める場合

推奨: **Vercel + Neon + Vercel Blob**

- DB: Neon PostgreSQL
- 画像: Vercel Blob
- 認証: まずは Vercel Deployment Protection 等で限定公開。アプリ認証は次段階
- 理由:
  - Prisma + PostgreSQL の移行が素直
  - Vercel Blob で `public/uploads/` 問題を避けられる
  - 構成が軽く、役割が分かりやすい

### 一般公開MVPまで見据える場合

推奨: **Vercel + Supabase**

- DB: Supabase PostgreSQL
- 画像: Supabase Storage
- 認証: Supabase Auth
- 理由:
  - メール+パスワード、確認メール、パスワード再設定の将来要件と近い
  - DB/Auth/Storage をまとめやすい
  - 複数ユーザー化の設計を進めやすい

### 現時点の総合推奨

**Vercel + Supabase を第一候補、Vercel + Neon + Vercel Blob を最短テスト候補**にする。

理由:
- このアプリは将来、メール認証、画像保存、ユーザー別データ分離が必須になる。
- Supabase は一般公開MVPへの道筋が短い。
- ただし、いま最短で一人テストしたいだけなら Neon + Blob の方がシンプル。

## 接続作業へ進む前の確認事項

- [ ] 自分専用テストだけを先にやるか、一般公開MVPを見据えて Supabase に寄せるか決める
- [ ] 本番URLを誰にも触らせない暫定保護方式を決める
- [ ] 許可証画像を public / private のどちらで保存するか決める
- [ ] 本番DBは `db push` で始めるか、migration適用に切り替えるか決める
- [ ] `DATABASE_URL` と Prisma CLI 用 direct URL を分けるか決める
- [ ] `getCurrentUser()` を固定デモユーザーのまま本番テストするか、先に認証を入れるか決める
- [ ] `file_records.storageKey` に保存する値を、URL / storage path / provider key のどれにするか決める
- [ ] バックアップ方針を決める

## 参考公式ドキュメント

- Vercel: Next.js on Vercel  
  https://vercel.com/docs/frameworks/full-stack/nextjs
- Prisma: Neon with Prisma ORM  
  https://docs.prisma.io/docs/v6/orm/overview/databases/neon
- Supabase: Connecting to Postgres  
  https://supabase.com/docs/guides/database/connecting-to-postgres
- Vercel Blob  
  https://vercel.com/docs/vercel-blob
- Vercel Blob pricing  
  https://vercel.com/docs/storage/vercel-blob/usage-and-pricing
