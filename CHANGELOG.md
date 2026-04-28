# CHANGELOG

## 2026-04-26

### Changed
- 濃い緑背景の選択中ナビ項目と主要CTAボタンを `!text-white` に固定し、黒文字で読みにくくなる箇所を改善。
- `/reports` 一覧取得を必要項目のみの `select` に変更。
- `/reports` の弾薬紐付け件数を `ammoRecords` ID配列取得から `_count` 取得へ変更。
- `/reports` の「都道府県コード」「市区町村コード」入力を廃止し、都道府県プルダウン + 市区町村名の候補補完入力へ変更。
- 市区町村名候補は、選択した都道府県で過去に使った `areaName` から表示するように変更。
- 狩猟記録保存時に市区町村名の前後空白と連続空白を正規化するように変更。
- 更新チェッカーに銃砲所持許可向けの許可証画像アップロードUIを追加。
- 許可証画像をブラウザ側でWebPへ軽量化し、`file_records` と `renewal_records` を連携して保存するように変更。
- 許可証画像の差し替え時は既存アクティブ画像を論理削除し、1更新記録1枚までに制限。
- 更新記録削除時に紐づく `file_records` も論理削除するように変更。
- ローカルアップロード実体を `/public/uploads/` 配下に保存し、Git管理対象外に変更。
- 許可証画像UI確認用の `scripts/ensure-demo-gun-license.mjs` を追加。
- `/reports` の狩猟記録追加フォームをPCでは4列グリッドに変更し、実施日 / 猟法 / 目的 / 成果数を1行に配置。
- `/reports` の2行目は都道府県 / 市区町村名 / 対象鳥獣の並びに整理。
- 成果数はPCで `88px` 幅に固定し、備考は4列全幅に変更。
- 使用道具セクションはPCで 種別 / 道具名 / 数量 を横並びにし、道具メモは全幅に変更。
- PCフォーム幅を `report-form-grid`, `report-number-field`, `report-tool-grid`, `report-tool-memo` などの専用CSSクラスで直接制御するように変更。
- `/reports` のPCフォーム親gridを `grid grid-cols-1 lg:grid-cols-4` に統一し、5列以上に並ばないよう修正。
- 市区町村名は `lg:col-span-2`、備考と道具メモは `lg:col-span-4`、各入力に `min-w-0` を付けて横はみ出しを抑制。
- 1行目と2行目のフォーム幅を揃えるため、狩猟記録追加フォームの成果数だけに残っていた小幅指定を解除。
- `/ammo` の実包帳簿登録フォームを `grid grid-cols-1 lg:grid-cols-4` に変更し、PCでは取引日 / 記録区分 / 実包種別 / 数量を1行に配置。
- `/ammo` の2行目は口径 / 仕入先 / 伝票番号に整理し、仕入先は `lg:col-span-2`、メモは `lg:col-span-4` に変更。
- `/ammo` の編集フォームも同じ最大4列ルールに揃え、短い項目は4列内、メモは全幅に変更。
- `/renewals` の新規登録フォームと編集フォームを `grid grid-cols-1 lg:grid-cols-4` に変更し、PCで短い項目を最大4列に整理。
- `/renewals` の銃情報同時登録も最大4列に揃え、許可証画像アップロードUIは詰めずに全幅セクションとして維持。
- `/account` のプロフィールフォームを `grid grid-cols-1 lg:grid-cols-3` に変更し、メールアドレスと住所は `lg:col-span-3` で全幅に整理。
- `/renewals` / `/account` の入力欄へ `min-w-0` を追加し、PC幅で横はみ出しにくい構成に変更。
- `/account` の `lastName` / `firstName` 入力を「氏名」ラベル付きのグループに変更し、「狩猟」だけがラベルなしで表示される状態を解消。
- `/account` の住所入力を `addressLine1` の1行入力に統合し、`addressLine2` はUIから外して hidden で空保存するように変更。
- `/account` の `prefectureCode` 入力はUIから外し、住所欄に都道府県から建物名までまとめて入力する方針に変更。
- `/account` のプロフィールフォームの並び順を変更し、PCでは1行目に 姓 / 名 / メールアドレス、2行目に 電話番号 / 生年月日 / 利用状態 を配置。
- `/account` の姓・名をそれぞれ独立したラベル付き入力に変更し、placeholderだけで項目名を表現しないように変更。
- `/renewals` の種別選択肢をMVP向けに狩猟免許と銃砲所持許可の2つだけに変更。
- `/renewals` の「目標日」を「更新予定日」、「期限日」を「有効期限日」に変更し、保存時エラーメッセージも同じ表記に統一。
- `/renewals` の「管轄コード」はUIから外し、内部用 hidden 項目として扱うように変更。
- `/renewals` の銃情報同時登録セクションで、メーカー / 型式 / 口径 / 銃番号に明示ラベルを追加。
- `/renewals` の編集フォームも管理名 / 進捗 / 種別 / 有効期限日 / 通知開始日 / メモをすべてラベル付きに変更。
- `/renewals` の所持銃情報登録を、銃本体と銃身情報に分けたフォームへ変更。
- 銃本体フォームに、銃の管理名 / 銃種 / メーカー / 型式 / 銃番号 / 口径 / 許可日 / 有効期限日 / 状態 / 備考を追加。
- 銃身情報セクションを追加し、銃身種別 / 銃身長 / 口径 / 用途メモ / 備考を入力できるように変更。
- 銃身情報は初期1本分を表示し、「+ 銃身を追加」で複数行を追加、「削除」で追加行を削除できるように変更。
- `firearm_barrel_records` と `FirearmBarrelType` を追加し、替え銃身を `firearm_records` の子情報としてDB管理できるように変更。
- `firearm_records` に `displayName` / `permittedOn` / `expiresOn` / `notes` を追加。
- 所持銃情報の英数字を保存時に全角英数字から半角英数字へ正規化するように変更。
- `/renewals` の管理名入力欄を廃止し、種別から「狩猟免許 更新管理」または「銃砲所持許可 更新管理」を自動生成するように変更。
- `/renewals` の更新予定日と通知開始日を入力欄から外し、自動計算エリアに表示するように変更。
- `/renewals` の通知開始目安はMVP固定で更新予定日の90日前として表示・保存するように変更。
- `/renewals` の入力エリアを、種別 / 進捗 / 交付日 / 有効期限日 / メモ中心に整理。
- `/renewals` の自動計算エリアに、管理名 / 更新予定日 / 通知開始目安 / 期限までの日数 / 次にやることを追加。
- `/renewals` の銃本体・銃身情報入力は、種別で銃砲所持許可を選択した場合だけ表示するように変更。
- 更新記録保存時に、Server Action側でも管理名・更新予定日・通知開始目安を再計算して保存するように変更。
- `/renewals` の銃砲所持許可選択時に、赤太文字で「銃砲許可証に記載されている情報をそのまま記載してください」を表示するように変更。
- `/renewals` に原許可日 / 原許可番号 / 許可番号 / 確認日 / 更新申請期間開始日 / 更新申請期間終了日 / 有効期間の入力と表示を追加。
- 許可番号は数字部分だけ保存し、UIでは「第」「号」を付けて表示するように変更。
- 銃本体に 銃の全長 / 銃身長 / 弾倉形式及び充填可能弾数 / 適合実包 / 銃腔内旋割合 / 特徴 / 用途 を追加。
- 銃身情報に 種類 / 銃腔内旋割合 / 適合実包 / 特徴 を追加。
- `/renewals` の登録済み銃砲所持許可カードに、許可証記載情報、銃本体1丁、銃身情報4本を分けて表示するセクションを追加。
- 表示確認用スクリプト `scripts/ensure-demo-gun-license.mjs` を更新し、レミントン M870 と銃身4本のダミーデータを作成するように変更。
- `/renewals` の進捗ステータス表示と選択肢を、MVP向けに 管理中 / 要確認 / 完了 の3つへ整理。
- 既存DB enumは維持し、`ACTIVE` は「管理中」、`EXPIRED` は「要確認」、`RENEWED` / `ARCHIVED` は「完了」として表示するように変更。
- ダッシュボードの「対応中の更新記録」表記を「管理中の更新記録」に変更。
- `/renewals` の登録済み銃砲所持許可証情報・銃本体情報・銃身情報を、通常時はカード表示、編集ボタン押下時だけ入力フォーム表示に変更。
- `/renewals` の下部に重複していた許可証記載情報・所持銃情報の表示セクションを削除し、カード表示へ集約。
- 許可証情報、銃本体、銃身情報それぞれを更新する専用Server Actionを追加し、保存後に `/renewals` へ戻る構成に変更。
- 銃本体・銃身情報の更新Actionで、固定デモユーザーに紐づくレコードだけ更新できるよう所有確認を追加。
- 銃身情報セクションに `+ 銃身を追加` を追加し、新規銃身は追加フォーム、削除は銃身カード編集時だけ表示するように変更。
- `/renewals` の新規登録フォーム見出しを「免許・許可情報を追加」、保存ボタンを「免許・許可情報を保存」に変更。
- `/renewals` の新規登録フォーム見出し下に、交付日・有効期限日から更新予定日や通知開始目安を自動表示する説明文を追加。
- 銃砲所持許可証情報の表示ラベルを「原許可番号」から「最初の許可番号」、「許可番号」から「今回の許可番号」へ変更。
- 銃砲所持許可証情報に、最初の許可番号と今回の許可番号が同じ場合は同じ番号を入力する補足を追加。
- 全ての `type="date"` 入力を共通の `DateInput` コンポーネントへ統一し、日付入力欄全体クリックでカレンダーが開くよう改善。
- 更新チェッカーの自動計算ルールを `validation_rules` へ寄せる準備を追加し、通知開始日数の固定値を外部ルール経由で参照できるようにした。

### Verified
- `npm run typecheck` 成功。
- `/reports` はHTTP 200で表示確認。
- `/reports` の保存Actionで `札幌市　　南区` が `札幌市 南区` に正規化されることを確認。
- `npm run build` 成功。
- `/renewals` はHTTP 200で表示確認。
- 銃砲所持許可のデモレコードで許可証画像UIの描画を確認。
- Server Action経由で許可証画像アップロード成功、`file_records` 作成とローカルファイル保存を確認。
- Server Action経由で許可証画像削除成功、`file_records` 論理削除とローカルファイル削除を確認。
- `nodebrew exec v20.20.2 -- npm run typecheck` 成功。
- `nodebrew exec v20.20.2 -- npm run build` 成功。
- `nodebrew exec v20.20.2 -- npm run dev` で `http://localhost:3000` を再起動し、`/reports` のHTTP 200を確認。
- `curl -I http://localhost:3000/reports` でHTTP 200を確認。
- `curl -I http://localhost:3000/ammo` でHTTP 200を確認。
- `/ammo` のHTMLに `grid grid-cols-1 gap-3 lg:grid-cols-4` と `lg:col-span-2` / `lg:col-span-4` が出力されることを確認。
- `curl -I http://localhost:3000/renewals` でHTTP 200を確認。
- `curl -I http://localhost:3000/account` でHTTP 200を確認。
- `/renewals` のHTMLに `grid grid-cols-1 gap-3 lg:grid-cols-4` と画像アップロードの `grid min-w-0 gap-3` が出力されることを確認。
- `/account` のHTMLに `grid grid-cols-1 gap-3 lg:grid-cols-3` と住所欄の `lg:col-span-3` が出力されることを確認。
- `/account` のHTMLに「氏名」「生年月日」「電話番号」「住所」ラベルが出力され、住所欄が1つだけ表示されることを確認。
- `/account` のHTMLに「姓」「名」「メールアドレス」がこの順で出力され、各入力欄に明示ラベルがあることを確認。
- `/renewals` のHTMLで種別選択肢が狩猟免許と銃砲所持許可だけになっていることを確認。
- `/renewals` のHTMLで更新予定日 / 有効期限日 / メーカー / 型式 / 口径 / 銃番号の各ラベルが出力されることを確認。
- `nodebrew exec v20.20.2 -- npm run prisma:generate` 成功。
- `nodebrew exec v20.20.2 -- npm run prisma:push` 成功。
- `/renewals` のHTTP 200を確認。
- `/renewals` のHTMLで所持銃情報 / 銃身情報 / + 銃身を追加 / ライフル銃身 / ハーフライフル銃身 / 平筒 が出力されることを確認。
- `/renewals` のHTMLで管理名が入力欄ではなく自動計算カードとして出力されることを確認。
- `/renewals` のHTMLで更新予定日 / 通知開始目安 / 期限までの日数 / 次にやることが自動計算エリアに出力されることを確認。
- `nodebrew exec v20.20.2 -- npm run typecheck` 成功。
- `nodebrew exec v20.20.2 -- npm run build` 成功。
- `nodebrew exec v20.20.2 -- npm run prisma:generate` 成功。
- `nodebrew exec v20.20.2 -- npm run prisma:push` 成功。
- `nodebrew exec v20.20.2 -- node --env-file=.env scripts/ensure-demo-gun-license.mjs` 成功。
- `/renewals` のHTMLで 第127070058号 / レミントン / M870 / 銃本体 1丁 / 銃身情報 4本 / 替え銃身 3 が表示されることを確認。
- DB上で `firearm_records` が1件、紐づく `firearm_barrel_records` が4件であることを確認。
- ソース上から「対応中」「更新済み」「期限切れ」「保管済み」の旧ステータス表示文言がなくなったことを確認。
- `nodebrew exec v20.20.2 -- npm run typecheck` 成功。
- `nodebrew exec v20.20.2 -- npm run build` 成功。
- `curl -I http://localhost:3000/renewals` でHTTP 200を確認。
- `/renewals` のHTML/RSC出力で `RenewalRecordCard` に許可証・銃本体・銃身情報が渡され、旧重複表示セクションがページ側から消えていることを確認。
- `nodebrew exec v20.20.2 -- npm run typecheck` 成功。
- `nodebrew exec v20.20.2 -- npm run build` 成功。
- `nodebrew exec v20.20.2 -- npm run typecheck` 成功。
- `nodebrew exec v20.20.2 -- npm run build` 成功。
- ソース上で旧文言「更新対象を追加」「更新対象を保存」「原許可番号」「許可番号」単独ラベルが残っていないことを確認。

## 2026-04-28

### Changed
- `/renewals` の新規登録フォームにフィールド単位のエラー表示を追加。
- `/renewals` の編集フォーム（許可証情報、所持銃情報、銃身情報）にもフィールド単位のエラー表示を追加。
- 許可番号・銃番号の入力チェックを強化し、不正な数字入力時にエラーメッセージを表示するように変更。
- 所持銃情報・銃身情報の口径・長さ・番号などの英数字を保存時に全角から半角へ正規化するように変更。
- `/renewals` のServer Actionを `useActionState` と統合し、クライアント側でエラー状態を管理するように変更。
- `/renewals` の編集フォームをクライアントコンポーネント化し、Server Actionの戻り値からエラーを表示するように変更。

### Verified
- `npm run typecheck` 成功。
- `npm run build` 成功。
- `/renewals` はHTTP 200で表示確認。

## 2026-04-27

### Changed
- `/renewals` の免許・許可情報追加フォームを `RenewalCreateForm` として client component に切り出し、`upsertRenewalAction` の field 単位エラー表示を追加。
- `src/app/actions.ts` の `upsertRenewalAction` を field error オブジェクトを返す形式に変更し、クライアント側で入力欄直下にエラーメッセージを表示できるようにした。
- `src/components/field-error.tsx` を追加し、該当入力欄の下に日本語エラーメッセージを表示する仕組みを導入。
- `src/components/submit-button.tsx` に `pending` prop を追加し、手動送信時でも送信中状態を反映できるようにした。
- `src/components/renewals/gun-permit-fields.tsx` をクライアントコンポーネント化し、新規登録フォームでの再利用を可能にした。

## 2026-04-29

### Changed
- 日付入力UIを見直し、全フォームの日付入力欄を `type="date"` に統一してブラウザ標準のカレンダー入力可能にした。
- `/renewals` の銃本体編集フォームに許可日と有効期限日の日付入力欄を追加。
- 日付保存値を `YYYY-MM-DD` 形式に統一し、不正な日付入力時にフィールド単位エラーを表示するようにした。
- placeholder「年 / 月 / 日」を削除し、カレンダー入力に頼らないUIにした。
- `/renewals` の銃本体編集フォームに「銃本体を削除」導線を追加し、削除時に紐づく銃身情報を論理削除するようにした。
- 銃本体削除時は確認ダイアログを入れて誤操作防止を強化した。

### Verified
- `npm run typecheck` 成功。
- `npm run build` 成功。
- `/renewals` / `/ammo` / `/reports` / `/account` はHTTP 200で表示確認。

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
