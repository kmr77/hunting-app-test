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
- [x] `/reports` の取得処理を必要最小限の select に寄せる
- [x] 更新チェッカー向けの許可証画像アップロード + 自動圧縮 + `file_records` 連携
- [x] `/reports` の都道府県プルダウン、市区町村名の候補補完入力、保存時正規化
- [x] `/reports` の狩猟記録追加フォームをPC専用4列グリッドに変更し、実施日/猟法/目的/成果数を1行に配置
- [x] `/reports` の使用道具セクションをPC専用グリッドに変更し、数量は小幅、メモは全幅に整理
- [x] `/reports` のPCフォーム幅指定を専用CSSクラスへ整理し、1列表示に戻らないよう固定
- [x] `/reports` のPCフォーム親gridを `grid grid-cols-1 lg:grid-cols-4` に統一し、5列以上とはみ出しを防止
- [x] `/reports` の1行目フォーム幅を2行目と揃え、成果数も4列グリッドの列幅いっぱいに調整
- [x] `/ammo` の実包帳簿登録フォームをPC最大4列グリッドに変更し、取引日/記録区分/実包種別/数量を1行に配置
- [x] `/ammo` の実包帳簿編集フォームもPC最大4列グリッドに変更し、メモは全幅、仕入先は2列幅に整理
- [x] `/renewals` の新規・編集フォームをPC最大4列グリッドに変更し、画像アップロードとメモは全幅扱いに整理
- [x] `/renewals` の種別選択肢をMVP向けに狩猟免許/銃砲所持許可へ限定
- [x] `/renewals` の管轄コードをUIから外し、目標日/期限日を更新予定日/有効期限日に変更
- [x] `/renewals` の銃情報同時登録セクションと編集フォームのラベルなし入力を解消
- [x] `/renewals` の所持銃情報を銃本体と複数銃身の分離登録フォームへ変更
- [x] `firearm_barrel_records` を追加し、替え銃身を銃本体の子情報として保存できるDB構造へ変更
- [x] `/renewals` の管理名・更新予定日・通知開始日をユーザー入力から外し、自動生成/自動計算表示へ変更
- [x] `/renewals` のServer Actionでも管理名・更新予定日・通知開始目安を保存時に再計算するように変更
- [x] `/renewals` に銃砲所持許可証の原許可番号・許可番号・確認日・更新申請期間・有効期間の入力/表示を追加
- [x] `/renewals` に銃本体と銃身情報の許可証記載詳細項目を追加
- [x] レミントン M870 + 銃身4本の表示確認用ダミーデータを作成
- [x] `/renewals` の進捗ステータスを 管理中 / 要確認 / 完了 の3つに整理し、「対応中」をUIから削除
- [x] `/renewals` の登録済み銃砲所持許可・銃本体・銃身情報を通常カード表示にし、編集時だけフォームへ切り替える構成へ変更
- [x] `/renewals` の銃身情報に、表示モードからの追加導線と編集時のみの削除導線を追加
- [x] `/renewals` の新規登録フォーム文言を「免許・許可情報」に揃え、許可番号ラベルと補足説明を改善
- [x] `/account` のプロフィールフォームをPC最大3列グリッドに変更し、メールと住所は全幅扱いに整理
- [x] `/account` のラベルなし氏名入力を「氏名」ラベル付きに修正し、住所入力を1行に統合
- [x] `/account` のプロフィールフォームを 姓 / 名 / メールアドレス がPCで横並びになる順序へ変更
- [x] `http://localhost:3000/reports` が開ける状態へdev serverを再起動
- [ ] フォームの field 単位エラー表示を追加する
- [ ] 登録済み所持銃情報の銃本体削除導線を追加する
- [ ] 更新チェッカーの自動計算ルールを北海道/全国展開向けに `validation_rules` へ寄せる
- [ ] 許可証記載項目のフォーム単位バリデーションと全角/半角正規化ルールを拡張する
- [ ] CRUD の自動テスト方針を決める

## 優先度: 中

- [ ] デモユーザー前提を本番認証導入へ移行しやすい形に整理する
- [ ] 共通フォーム UI を整理する
- [ ] 成功 / 失敗メッセージの表示ルールをさらに揃える
- [ ] 一覧の空状態、件数表示、補助文言を微調整する
- [ ] 許可証画像の本番保存先を検討する

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
