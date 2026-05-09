# Vercel Build Failure Notes

## 作成日
2026-05-09

## 状況
Vercel デプロイで Build Logs が次の位置で停止した。

```txt
Compiled successfully
Running TypeScript ...
```

Deployment Summary は開けない状態。

Vercel 側の `DATABASE_URL` は Production 環境に設定済みという前提。

## ローカル確認結果
ローカルでは Node 20.20.2 指定で以下が成功した。

```bash
nodebrew exec v20.20.2 -- npm run typecheck
nodebrew exec v20.20.2 -- npm run build
```

結果:
- TypeScript typecheck: 成功
- Next.js build: 成功
- build 時に DB 接続は発生していない
- `schema.prisma` の変更なし
- Vercel / Neon / Supabase 接続変更なし
- `prisma:push` や DB 削除は未実行

## 最も疑わしい原因
Vercel が参照する Git 上の内容と、ローカル作業ツリーの内容がズレている可能性が高い。

特に以下の未追跡ファイルが存在していた。

```txt
app/api/reports/municipality-suggestions/
features/reports/municipality.ts
```

このうち `features/reports/municipality.ts` は、既存差分内で import されている。

ローカルにはファイルが存在するため typecheck / build が通るが、Git に追加・コミットされていない状態で Vercel がビルドすると、Vercel 側では module not found / TypeScript 解決エラーになる可能性がある。

## 追加で疑わしい点

### Node.js バージョン固定がない
`package.json` に `engines` がなく、`.nvmrc` / `.node-version` / `vercel.json` も見つからない。

そのため Vercel 側の Node.js バージョンとローカルの Node 20.20.2 が一致している保証がない。

ただし、現時点では Next.js 15.5.15 / Prisma 6.19.3 の範囲上、Node バージョン差分より未追跡ファイル未コミットの方が原因として濃い。

### package.json の差分
`package.json` には `prisma:push` script 追加の差分がある。

これは build 失敗の直接原因ではなさそうだが、コミット対象を整理する時に含めるか判断が必要。

## DATABASE_URL について
Prisma schema では `DATABASE_URL` を参照している。

```prisma
datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}
```

ただし今回のローカル build では DB 接続なしで成功しているため、現時点の症状だけを見る限り、build 時 DB 接続が直接原因とは判断しにくい。

Vercel 側で `DATABASE_URL` が Production に設定済みなら、優先確認対象は Git 内容の不足。

## 最小対応案
コード修正ではなく、まず Git に含めるべきファイルを整理する。

1. `git status` で未追跡ファイルを確認する
2. `features/reports/municipality.ts` と `app/api/reports/municipality-suggestions/route.ts` をコミット対象に含める
3. 既存差分と合わせて commit / push する
4. Vercel で再デプロイする

## 追加で安定化する場合の案
未追跡ファイルを含めても失敗する場合は、次を検討する。

1. `package.json` に Node 20 系の `engines` を明示する
2. Vercel Project Settings の Node.js Version を Node 20 に揃える
3. Vercel の Build Logs で TypeScript エラー本文を再確認する

## 今回やっていないこと
- コード変更
- Vercel 接続変更
- Neon 接続変更
- 環境変数変更
- DB 作成
- `prisma:push`
- `schema.prisma` 変更
- 画像保存実装
- 認証導入
- DB 削除
