# CHANGELOG

## 2026-04-25

### Added
- 作業引き継ぎ用の変更履歴ファイルを追加。
- `hunting-app-test` 専用DB `hunting_app_test` を作成。
- `scripts/check-local-env.mjs` が Homebrew版 PostgreSQL 16 の `postgres` / `psql` を検出できるように更新。

### Checked
- 現在の作業対象候補として `/Applications/MAMP/htdocs/hunting-app-test` を確認。
- `README.md`, `PROJECT_CONTEXT.md`, `TODO.md` を確認。
- `CHANGELOG.md` と `DECISIONS.md` が未作成だったため、引き継ぎ運用に合わせて追加。
- ローカル PostgreSQL 直接接続に向けて Homebrew / PostgreSQL / `DATABASE_URL` 周辺を確認。

### Changed
- Prisma dev server 前提をやめ、ローカル PostgreSQL 直接接続へ設定を変更。
- `.env.example` とローカル `.env` を `postgresql://postgres:postgres@localhost:5432/shuryo_kanri?schema=public` に更新。
- `.env.example` とローカル `.env` を `postgresql://postgres:postgres@localhost:5432/hunting_app_test?schema=public` に更新し、既存 `shuryo-kanri` とDBを分離。
- `src/lib/prisma.ts` の接続先を `DIRECT_DATABASE_URL` から `DATABASE_URL` に変更。
- 選択中ナビ項目の見出し・説明テキストを白に変更し、濃い背景上で読みやすくした。
- `package.json` から `db:server` を削除し、`prisma:generate`, `prisma:push`, `prisma:migrate` を追加。
- 未使用になった `scripts/start-prisma-dev.mjs` を削除。
- README / PROJECT_CONTEXT / TODO をローカル PostgreSQL 直接接続方針に更新。
- `tsconfig.json` を追加し、`typecheck` が実行できる状態にした。
- `.gitignore` を調整し、`.env.example` はGit追跡対象にした。
- `scripts/check-db.mjs` と `npm run db:check` を追加し、`DATABASE_URL` のTCP疎通を確認できるようにした。
- `scripts/check-local-env.mjs` と `npm run env:check` を追加し、Node/Homebrew/PostgreSQL/DATABASE_URL の状態を確認できるようにした。

### Verified
- `npm install` 成功。
- `npm run prisma:generate` 成功。
- `npm run typecheck` 成功。
- `npm run build` 成功。
- `npm run env:check` は Apple Silicon Homebrew と PostgreSQL server binary の不足を検出。
- `npm run db:check` は `localhost:5432` 未起動を検出。
- `npm run prisma:push` は `localhost:5432` 未起動のため未通過。
- `npm run env:check` 成功。
- `npm run db:check` 成功。
- `npm run prisma:generate` 成功。
- `npm run typecheck` 成功。
- `npm run prisma:push` 成功 (`hunting_app_test`)。
- `npm run dev` 成功 (`http://localhost:3000`)。
- `/`, `/renewals`, `/ammo`, `/reports` はHTTP 200で表示確認。

### Notes
- Docker は使わない方針。
- Prisma dev server 前提の構成は撤廃済み。
- `localhost:5432` の通常DB経路は確認済み。
- 公式 Homebrew インストールは `sudo` パスワード要求で未通過。
- 既存 `/usr/local/Homebrew` の更新は `github.com` 名前解決不可で未通過。
- 現在の `/Applications/MAMP/htdocs/shuryo-kanri` は触らず、`hunting-app-test` を完成後に `shuryo-kanri` へ名称変更して運営する方針。
