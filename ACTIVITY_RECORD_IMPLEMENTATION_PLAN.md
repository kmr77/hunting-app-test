# ACTIVITY_RECORD_IMPLEMENTATION_PLAN

## 1. 現在の問題点

`/reports` は現在「活動記録」へ文言変更済みだが、内部構造と入力フォームはまだ狩猟記録中心になっている。

現在の主な入力項目:

- 実施日
- 猟法
- 目的
- 都道府県 / 市区町村名
- 対象鳥獣
- 成果数
- 使用道具
- 備考

射撃記録では「猟法」「対象鳥獣」「成果数」が不自然になる。

また、現在の `hunting_events` には狩猟記録と射撃記録を区別するカラムがない。  
このまま射撃記録を混ぜると、未転記件数、報告書転記状態、市区町村候補、一覧表示、集計で狩猟記録と射撃記録が混ざる。

現在の `upsertHuntingEventAction` は `targetSpecies` を必須にしているため、DB上は `targetSpecies` が nullable でも、射撃記録を自然には保存できない。

## 2. 採用候補のDB変更案

MVPでは、既存の `hunting_events` を活動記録テーブルとして拡張する案を第一候補にする。

理由:

- 既存の `/reports` 一覧、編集、削除、転記状態の実装を活かせる。
- `hunting_event_tools` を使用銃・使用道具の保存先として継続利用できる。
- `ammo_records.huntingEventId` の既存リレーションを維持できる。
- 別テーブル新設より実装と移行の影響が小さい。

ただし、テーブル名 `hunting_events` と役割が少しズレる。  
将来的に設計をきれいにするなら `activity_records` 新設も候補に残す。

## 3. 追加するenum案

```prisma
enum ActivityType {
  HUNTING
  SHOOTING
}
```

表示ラベル案:

```ts
export const activityTypeLabels: Record<ActivityType, string> = {
  HUNTING: "狩猟記録",
  SHOOTING: "射撃記録",
};
```

射撃種別は初期実装では `String?` として持つ案を推奨する。  
固定 enum にすると、射撃場練習、標的射撃、技能講習練習、試射などの分類が固まりきる前に硬くなるため。

候補値をUI側定数として持つなら次が候補:

- 標的射撃
- 射撃練習
- 試射
- 技能講習練習
- その他

## 4. hunting_events に追加するカラム案

```prisma
model HuntingEvent {
  activityType           ActivityType @default(HUNTING)
  shootingType           String?
  shootingRangeName      String?
  shotCount              Int?
  isReportTransferTarget Boolean      @default(true)
}
```

index候補:

```prisma
@@index([activityType])
@@index([userId, activityType, deletedAt])
@@index([isReportTransferTarget])
@@index([userId, isReportTransferTarget, importedToReportAt, deletedAt])
```

既存データの扱い:

- 既存 `hunting_events` は `activityType = HUNTING`
- 既存 `hunting_events` は `isReportTransferTarget = true`
- 既存の `shootingType`, `shootingRangeName`, `shotCount` は `null`

射撃記録の保存方針:

- `activityType`: `SHOOTING`
- `huntingMethod`: `null`
- `targetSpecies`: `null`
- `resultCount`: `null`
- `purposeCode`: 必須にしない。必要なら `TRAINING` または `OTHER`
- `shootingType`: 射撃種別
- `shootingRangeName`: 射撃場
- `shotCount`: 使用弾数
- `isReportTransferTarget`: `false`
- `notes`: メモ

## 5. 射撃記録を別テーブルにしない場合の理由

別テーブル案は設計としてはきれいだが、今のMVPでは重い。

別テーブル案の例:

- `activity_records`
- `hunting_events`
- `shooting_events`

別テーブルにした場合の利点:

- 狩猟固有項目と射撃固有項目を明確に分離できる。
- `hunting_events` という名前と射撃記録の意味ズレを避けられる。
- 報告書転記対象を狩猟側に限定しやすい。

別テーブルにした場合の懸念:

- 既存の `/reports` 実装を大きく作り替える必要がある。
- 既存データ移行が必要。
- `ammo_records.huntingEventId` のリレーション設計を見直す必要がある。
- Prisma schema / Server Action / UI / dashboard の変更範囲が広がる。

そのため、初期段階では `hunting_events` を拡張し、後から必要なら `activity_records` へ再設計する方が現実的。

## 6. Server Actionの変更予定箇所

対象:

- `src/app/actions.ts`
  - `upsertHuntingEventAction`
  - `deleteHuntingEventAction`
  - `toggleImportedToReportAction`
  - `requireHuntingEvent`

`upsertHuntingEventAction` の変更案:

1. `activityType` を `FormData` から取得する。
2. `activityType` が未指定なら `HUNTING` として扱う。
3. `HUNTING` の場合:
   - `targetSpecies` 必須
   - `huntingMethod` 使用
   - `purposeCode` 使用
   - `resultCount` 使用
   - `shootingType`, `shootingRangeName`, `shotCount` は `null`
   - `isReportTransferTarget = true`
4. `SHOOTING` の場合:
   - `targetSpecies` 不要
   - `huntingMethod = null`
   - `resultCount = null`
   - `shootingType` 必須候補
   - `shootingRangeName` 必須候補
   - `shotCount` は0以上の数値
   - `isReportTransferTarget = false`
   - `importedToReportAt = null`
5. `hunting_event_tools` は従来通り1件登録/更新。
   - 狩猟記録: 使用道具
   - 射撃記録: 使用銃

`toggleImportedToReportAction` の変更案:

- `activityType = HUNTING`
- `isReportTransferTarget = true`

の記録だけを転記状態変更の対象にする。

射撃記録に対して呼ばれた場合は、エラーにするか何もしない。

## 7. reports/page.tsx のUI切替案

対象:

- `src/app/reports/page.tsx`

方針:

- ページ名は「活動記録」のまま。
- 新規登録フォームの先頭に記録種別の選択UIを置く。
- スマホは1列、PCは現在の最大4列方針を維持。

記録種別UI:

- 「狩猟記録」
- 「射撃記録」

実装方法:

- client component に切り出す案が有力。
- `activityType` の選択状態に応じて表示項目を切り替える。
- Server Actionへは hidden/input/select で `activityType` を渡す。

狩猟記録フォーム:

- 実施日
- 猟法
- 目的
- 都道府県 / 市区町村名
- 対象鳥獣
- 成果数
- 使用道具
- 備考

射撃記録フォーム:

- 実施日
- 射撃種別
- 射撃場
- 使用銃
- 使用弾数
- メモ

一覧表示:

- `activityType = HUNTING`
  - 現在の狩猟向け表示を維持
  - 転記状態ボタンを表示
- `activityType = SHOOTING`
  - 射撃種別、射撃場、使用銃、使用弾数を表示
  - 転記状態ボタンは表示しない
  - 「対象鳥獣」「成果数」「頭羽」表記を出さない

空状態文言:

- 「活動記録はまだありません。狩猟記録または射撃記録を追加してください。」のように広げる。

## 8. dashboard集計・未転記件数への影響

対象:

- `src/lib/app-data.ts`
  - `getDashboardSummary`
  - `getReportPageData`
  - `getAccountPageData`

現在の `pendingReports` は次の条件で数えている。

```ts
importedToReportAt: null
```

このままだと射撃記録も未転記件数に混ざる。

変更案:

```ts
where: {
  userId: user.id,
  deletedAt: null,
  activityType: ActivityType.HUNTING,
  isReportTransferTarget: true,
  importedToReportAt: null,
}
```

`getReportPageData` の select に追加する項目:

- `activityType`
- `shootingType`
- `shootingRangeName`
- `shotCount`
- `isReportTransferTarget`

一覧件数:

- 活動記録総数: 全 `hunting_events`
- 未転記: 狩猟記録かつ転記対象のみ
- 射撃記録数: 必要なら `activityType = SHOOTING` で別集計

初期MVPでは、ダッシュボードのカード名を「未転記の活動記録」にするより、「未転記の狩猟記録」または「報告書転記待ち」に戻す方が誤解が少ない。

## 9. ammo_records との関係

現状:

- `AmmoRecord.huntingEventId` は nullable。
- 実包消費と `hunting_events` を紐付けられる。
- `/ammo` の消費記録と `/reports` の活動記録は将来的に接続余地がある。

射撃記録との関係:

- 射撃記録の使用弾数は `shotCount` に保存する案を主とする。
- `ammo_records` との自動連携は今すぐ必須にしない。
- 射撃記録を作るたびに実包消費を自動作成すると、帳簿入力起点の既存方針と衝突する可能性がある。

当面の方針:

- 射撃記録は活動ログとして保存。
- 実包帳簿は `/ammo` で別途管理。
- 後で「射撃記録から実包消費を作る」または「実包消費から射撃記録を作る」方針を検討する。

注意点:

- `shotCount` と `ammo_records.quantity` が二重管理になる可能性がある。
- 将来連携する場合は、どちらを正とするか決める必要がある。

## 10. ローカル実装手順

実装に進む場合の順序:

1. `prisma/schema.prisma` に `ActivityType` enum を追加。
2. `HuntingEvent` に活動種別と射撃用カラムを追加。
3. `nodebrew exec v20.20.2 -- npm run prisma:generate` を実行。
4. ローカルDBへ `nodebrew exec v20.20.2 -- npm run prisma:push` を実行。
5. `src/lib/labels.ts` に `activityTypeLabels` を追加。
6. `src/lib/app-data.ts` の import / select / count を更新。
7. `src/app/actions.ts` の `upsertHuntingEventAction` を `activityType` 分岐に変更。
8. `toggleImportedToReportAction` を狩猟記録限定にする。
9. `src/app/reports/page.tsx` の新規登録フォームを記録種別切替UIに変更。
10. 一覧カードを `activityType` で表示分岐。
11. 既存デモデータの表示が狩猟記録として維持されることを確認。

## 11. 検証コマンド

DB変更前:

```bash
nodebrew exec v20.20.2 -- npm run typecheck
nodebrew exec v20.20.2 -- npm run build
```

DB変更後:

```bash
nodebrew exec v20.20.2 -- npm run prisma:generate
nodebrew exec v20.20.2 -- npm run prisma:push
nodebrew exec v20.20.2 -- npm run typecheck
nodebrew exec v20.20.2 -- npm run build
```

ローカル表示確認:

```bash
curl -I http://localhost:3000/
curl -I http://localhost:3000/reports
curl -I http://localhost:3000/ammo
```

手動確認:

- 既存の狩猟記録が表示される。
- 狩猟記録を追加できる。
- 射撃記録を追加できる。
- 射撃記録に転記状態ボタンが出ない。
- 射撃記録がダッシュボードの未転記件数に混ざらない。
- 実包帳簿の残数に勝手な影響が出ない。

## 12. 本番反映手順

Neon本番DBに反映する場合は慎重に行う。

1. ローカルで schema 変更、`prisma:push`、typecheck、build を完了する。
2. Neon のバックアップまたは Restore point を作成する。
3. Vercel の環境変数 `DATABASE_URL` が対象DBを指していることを確認する。
4. 本番DBに対して schema 差分を反映する。
5. 反映後に Vercel deploy を実行する。
6. 本番URLで `/`, `/reports`, `/ammo` を確認する。
7. 既存データが狩猟記録として表示されることを確認する。
8. 未転記件数に射撃記録が混ざらないことを確認する。

注意:

- 本番DBに既存データがある場合、`activityType` の default が `HUNTING` で入ることを確認する。
- `isReportTransferTarget` の default が `true` のため、射撃記録保存時は必ず `false` を明示する。
- `prisma:push` は本番DBに直接反映されるため、実行前にバックアップ必須。

## 13. リスク

- `hunting_events` というテーブル名に射撃記録を含めるため、命名と実態がズレる。
- `shootingType` を `String?` にすると柔軟だが、表記揺れが出る。
- `shootingType` を enum にすると安全だが、初期段階では分類変更が面倒になる。
- `shotCount` と `hunting_event_tools.quantity` の二重管理が起きる可能性がある。
- 射撃記録が `pendingReports` に混ざると、ダッシュボードが誤表示になる。
- `isReportTransferTarget` の保存漏れがあると、射撃記録に転記状態が出る。
- 既存フォームを client component 化する場合、Server Component との責務分離が少し変わる。
- Neon本番DBへ反映する場合、schema変更の影響を戻すにはバックアップが必要。

## 14. 今すぐ実装してよいかの判断材料

実装に進んでよい条件:

- 射撃記録は報告書転記対象に含めない方針で確定している。
- `activityType` を `hunting_events` に追加する方針でよい。
- 射撃種別は初期版では `String?` またはUI候補選択でよい。
- `shotCount` を使用弾数の主カラムにする方針でよい。
- `ammo_records` との自動連携は今すぐ必須にしない。
- Neon本番DB反映前にバックアップを取る運用でよい。

実装前にGPTで確認したい点:

- `shootingType` は `String?` で始めるか、enumにするか。
- `shootingRangeName` と既存 `areaName` の使い分けをどうするか。
- 射撃記録の使用銃を `hunting_event_tools.toolName` に入れる方針でよいか。
- `shotCount` と `hunting_event_tools.quantity` を両方持つか、`shotCount` のみにするか。
- ダッシュボードの表示名を「報告書転記待ち」「未転記の狩猟記録」「未転記」のどれにするか。
- 将来 `activity_records` へ再設計する可能性を許容するか。
