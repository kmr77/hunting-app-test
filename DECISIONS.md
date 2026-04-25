# DECISIONS

設計判断の記録。  
方針変更時は「変更内容」「理由」「影響」を追記する。

## 2026-04-25: Dockerは使わず、ローカルPostgreSQL直接接続を優先する
- 理由:
  - ローカル開発を軽く保つため。
  - 現時点では再現性より、自分のMacで安定して動くことを優先するため。
- 影響:
  - `docker-compose` は前提にしない。
  - `DATABASE_URL` はローカルPostgreSQLの実接続先に合わせる。
  - 現在残っている Prisma dev server 前提の構成は、通常DB経路へ整理する。

## 2026-04-25: まず通常DB経路を通してから機能実装へ進む
- 理由:
  - 許可証画像アップロードや所持銃CRUDはDB保存確認が必要なため。
- 影響:
  - 次の優先作業は Homebrew/PostgreSQL の整理、`DATABASE_URL` 特定、`prisma:push` 確認。

## 2026-04-25: Prisma dev server をやめ、DATABASE_URL 直結に統一する
- 理由:
  - ローカル開発の軽さと挙動の分かりやすさを優先するため。
  - Prisma dev server 起動に依存すると、通常DB経路の確認が遅れるため。
- 影響:
  - Prisma CLI とアプリ実行時の両方で `.env` の `DATABASE_URL` を使う。
  - `db:server` スクリプトと `scripts/start-prisma-dev.mjs` は廃止。
  - PostgreSQL サーバ本体が未導入/未起動の場合は `prisma:push` が失敗する。

## 2026-04-25: hunting-app-test を現在の開発対象にし、既存 shuryo-kanri には手を入れない
- 理由:
  - `hunting-app-test` を完成させてから `shuryo-kanri` として名称変更・運営する予定のため。
  - 現在の `/Applications/MAMP/htdocs/shuryo-kanri` は別プロジェクトであり、混ぜるとUI/DB/履歴が不明瞭になるため。
- 影響:
  - 作業対象は `/Applications/MAMP/htdocs/hunting-app-test` に固定する。
  - 現在の `/Applications/MAMP/htdocs/shuryo-kanri` は触らない。
  - ローカルDBは `shuryo_kanri` ではなく `hunting_app_test` を使う。
  - `prisma db push --accept-data-loss` で既存 `shuryo_kanri` DBへ合わせる運用はしない。
