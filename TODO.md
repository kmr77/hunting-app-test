# TODO

## 優先度: 高

- [x] ローカル PostgreSQL 直接接続へ切り替える
- [x] `DATABASE_URL` をローカル PostgreSQL 接続文字列へ更新する
- [x] `npm run prisma:generate` を通常DB向け設定で確認する
- [x] `npm run typecheck` を通す
- [x] `npm run db:check` を追加する
- [x] `npm run env:check` を追加する
- [x] `npm run build` を通す
- [x] `npm run prisma:push` と `npm run dev` を通常DB経路で確認する
- [x] `hunting-app-test` 専用DB `hunting_app_test` へ切り替える
- [x] `/`, `/renewals`, `/ammo`, `/reports` のHTTP 200表示確認
- [x] 濃い緑背景のナビ/主要CTAボタンを `!text-white` に固定して視認性を改善
- [ ] `/reports` の取得処理を必要最小限の select に寄せる
- [ ] フォームの field 単位エラー表示を追加する
- [ ] CRUD の自動テスト方針を決める

## 優先度: 中

- [ ] デモユーザー前提を本番認証導入へ移行しやすい形に整理する
- [ ] 共通フォーム UI を整理する
- [ ] 成功 / 失敗メッセージの表示ルールをさらに揃える
- [ ] 一覧の空状態、件数表示、補助文言を微調整する

## 優先度: 低

- [ ] UI の細部調整
- [ ] ソートや検索などの操作性改善
- [ ] 利用履歴や監査ログの検討

## やらないこと

- [ ] 本番接続
- [ ] 本番メール送信
- [ ] 課金
- [ ] 外部サービス連携
- [ ] `schema.prisma` の大幅変更
- [ ] DB 削除

## 現在のDB詰まり

- Docker は使わない方針。
- `hunting-app-test` は Prisma dev server 前提の `.env.example` / `db:server` 構成からローカル PostgreSQL 直接接続へ切り替え済み。
- Homebrew版 PostgreSQL 16 を使用。
- `localhost:5432` は疎通済み。
- 専用DBは `hunting_app_test`。
- `prisma:generate` / `typecheck` / `env:check` / `db:check` / `prisma:push` は通過済み。
- `npm run dev` で `http://localhost:3000` 起動確認済み。
- `/`, `/renewals`, `/ammo`, `/reports` はHTTP 200確認済み。

## プロジェクト分離

- `/Applications/MAMP/htdocs/hunting-app-test` を現在の開発対象にする。
- `/Applications/MAMP/htdocs/shuryo-kanri` は現時点では手を入れない。
- 完成後に `hunting-app-test` を `shuryo-kanri` として名称変更して運営する予定。
- DBも `shuryo_kanri` ではなく `hunting_app_test` を使い、既存プロジェクトと混ぜない。
