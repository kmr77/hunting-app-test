# PROJECT_CONTEXT

## プロジェクト概要

- プロジェクト名: `hunting-app-test`
- 現在フェーズ: ローカル MVP の主要操作確認まで完了
- 目的: 狩猟・銃管理向けの業務アプリの土台をローカルで通すこと
- 将来方針: 完成後に `shuryo-kanri` へ名称変更して運営予定
- 注意: 現在の `/Applications/MAMP/htdocs/shuryo-kanri` は別プロジェクトとして扱い、手を入れない

## 実装済み範囲

- スマホ優先 UI
- 日本語化済みの主要画面
- 下部固定ナビ + PC ナビ
- 固定デモユーザー前提の運用
- 更新管理、実包帳簿、報告書転記支援、利用者設定
- 更新管理では、ユーザーが更新予定日や通知開始日を考えて入力せず、免状・許可証に記載された事実をもとにアプリが自動計算する
- 銃砲所持許可の許可証画像アップロード、差し替え、削除
- 更新管理の新規登録時に、銃本体と銃身情報を分けた所持銃情報登録
- 銃砲所持許可証に記載された許可番号・確認日・更新申請期間・有効期間の記録
- 登録済みの銃砲所持許可証情報・銃本体・銃身情報は通常カード表示し、編集時だけフォームに切り替える
- 報告書転記の都道府県プルダウンと市区町村名の候補補完入力
- Prisma Client を使った CRUD
- 成功 / 失敗バナー
- 送信中表示と二重送信防止

## 画面構成

- `/`
  - ダッシュボード
- `/renewals`
  - 更新管理
- `/ammo`
  - 実包帳簿
- `/reports`
  - 報告書転記
- `/account`
  - 利用者設定

## データ前提

- 認証は未実装
- `demo@local.hunting-app` を固定利用者として利用
- `ensureDemoUser()` でデモユーザーと profile を確保

## DB / Prisma 前提

- Prisma 7
- PostgreSQL
- `schema.prisma` は維持
- Prisma CLI の接続設定は `prisma.config.ts`
- アプリ実行時の接続設定は `.env` の `DATABASE_URL`
- ローカル DB は Mac 上の PostgreSQL 直接接続を前提にする
- ローカル DB 名は `hunting_app_test`
- `shuryo_kanri` DB は別プロジェクト用として扱い、`hunting-app-test` からは使わない

## 既知の技術的制約

- `@prisma/adapter-pg` は継続利用する
- ローカル PostgreSQL 未起動時は Prisma 操作と画面取得が失敗する
- 現時点では `prisma db push` を優先し、migration 運用は本番前に整理する
- Homebrew版 PostgreSQL 16 の通常経路で `prisma:push` と `dev` は確認済み

## 画像保存方針

- 初期版では銃砲所持許可 (`GUN_LICENSE`) の更新記録だけ許可証画像を扱う。
- 許可証画像は1更新記録につきアクティブ1枚まで。
- 画像はブラウザ側でWebPへ軽量化してからServer Actionに送信する。
- ローカル保存先は `public/uploads/renewal-permits/`、DB管理は `file_records`。
- 後から圧縮上限・保存先・形式を差し替えやすいよう、圧縮処理は専用コンポーネントに寄せる。

## 更新管理方針

- ユーザーが入力するのは、免状・許可証に書かれている事実を中心にする。
- `管理名` は種別から自動生成し、ユーザー入力欄としては表示しない。
- `更新予定日` は有効期限日を優先して自動算出する。
- `通知開始目安` はMVPでは更新予定日の90日前として自動算出する。
- 画面では入力エリアと自動計算エリアを分け、次にやることをアプリ側で表示する。
- 登録済み情報は読み取り確認を優先し、通常時はカード表示、編集ボタン押下時だけセクション単位でフォーム表示にする。

## 所持銃情報方針

- 銃本体は `firearm_records` で1丁として管理する。
- 替え銃身は `firearm_barrel_records` で銃本体に紐づく子情報として管理する。
- 銃身の本数は銃の丁数としてカウントしない。
- 初期UIでは `/renewals` の新規登録時に、銃番号を入力した場合のみ銃本体と銃身情報を同時登録する。
- 許可証に記載された銃種、型式、口径、銃身長、適合実包、特徴などは、表記揺れを避けるため原則そのまま入力する。
- 将来、銃検査・実包帳簿・報告書転記で使いやすいよう、銃本体と銃身情報をDB上で分離しておく。

## 主要ファイル

- [src/app/page.tsx](./src/app/page.tsx)
- [src/app/renewals/page.tsx](./src/app/renewals/page.tsx)
- [src/app/ammo/page.tsx](./src/app/ammo/page.tsx)
- [src/app/reports/page.tsx](./src/app/reports/page.tsx)
- [src/app/account/page.tsx](./src/app/account/page.tsx)
- [src/app/actions.ts](./src/app/actions.ts)
- [src/lib/app-data.ts](./src/lib/app-data.ts)
- [src/lib/prisma.ts](./src/lib/prisma.ts)
- [src/lib/labels.ts](./src/lib/labels.ts)
- [src/components/feedback-banner.tsx](./src/components/feedback-banner.tsx)
- [src/components/submit-button.tsx](./src/components/submit-button.tsx)

## 次フェーズの入口

- 安定化の継続
- field 単位バリデーション
- 一覧性能整理
- テスト追加
- 認証設計の準備

## 地域入力方針

- 初期版では全国全市町村マスタは持たない。
- 報告書転記では都道府県だけ固定プルダウンにする。
- 市区町村名は、選択した都道府県で過去に使った値を候補表示しつつ、新規入力も許可する。
- DB上は将来の正式マスタ連携に備えて `prefectureCode` を保持し、市区町村名は現時点では `areaName` に保存する。
- 保存時に市区町村名の前後空白と連続空白を正規化する。
