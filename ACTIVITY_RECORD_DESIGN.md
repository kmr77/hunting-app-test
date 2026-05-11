# ACTIVITY_RECORD_DESIGN

## 1. 背景

現在の `/reports` ページは、UI文言を「報告書転記」から「活動記録」へ変更している。

ただし、入力フォームの中心項目はまだ狩猟向けのままになっている。

- 猟法
- 目的
- 対象鳥獣
- 成果数
- 場所
- 使用道具
- 備考

このままだと、射撃練習・標的射撃・射撃場での弾の消費記録を自然に扱いにくい。

射撃記録を含めるなら、活動記録ページ内で「狩猟記録」と「射撃記録」を切り替える形式が必要になる可能性がある。

## 2. 現在の課題

- 「猟法」は射撃記録には合わない。
- 「目的」は `狩猟 / 有害鳥獣捕獲 / 訓練 / その他` で、射撃場練習や標的射撃にはやや狩猟寄り。
- 「対象鳥獣」は射撃記録では不要。
- 「成果数」は射撃記録では捕獲数ではなく、命中数・射撃結果・消費数など別の意味に見える。
- 左メニューやページ名は「活動記録」で問題ないが、入力項目は狩猟寄りのまま。
- 現在のページ説明にも「報告書へ転記したかどうか」が残っており、射撃記録を入れると全件が報告書転記対象に見えてしまう。

## 3. 方針案

活動記録ページ内で、最初に記録種別を選択する。

- 狩猟記録
- 射撃記録

狩猟記録では、現在の項目を基本的に維持する。

- 実施日
- 猟法
- 目的
- 都道府県 / 市区町村名
- 対象鳥獣
- 成果数
- 使用道具
- 備考
- 転記状態

射撃記録では、猟法を使わず、次を中心にする。

- 実施日
- 射撃種別
- 射撃場
- 使用銃
- 使用弾数
- メモ

ただし今回はDB変更しない前提で、既存カラムへ自然にマッピングできるかを確認する。

## 4. 確認観点

確認対象:

- `prisma/schema.prisma`
- `src/app/actions.ts`
- `src/app/reports/page.tsx`
- `src/lib/app-data.ts`
- `src/lib/labels.ts`

確認したい点:

- 射撃種別を既存の `purposeCode` または `notes` に入れるのが自然か。
- 射撃場を `areaName` に入れてよいか。
- 使用銃を `hunting_event_tools.toolName` に入れてよいか。
- 使用弾数を `hunting_event_tools.quantity` に入れてよいか。
- `huntingMethod` を `null` にできるか。
- `targetSpecies` / `resultCount` を `null` にできるか。
- 報告書転記と射撃記録が混乱しないか。
- `ammo_records` の消費記録との関係をどうするか。
- 既存DBだけで保存する場合の無理がどこに出るか。

## 5. 調査結果

### 既存DBで保存できるか

最低限の保存は可能。

`HuntingEvent` は次のカラムが nullable なので、射撃記録でも不要項目を空にできる。

- `prefectureCode`
- `municipalityCode`
- `areaName`
- `huntingMethod`
- `targetSpecies`
- `purposeCode`
- `resultCount`
- `notes`
- `importedToReportAt`

`HuntingEventTool` は次の形で使用銃・使用弾数を入れられる。

- `toolType`: `FIREARM`
- `toolName`: 使用銃
- `quantity`: 使用弾数
- `notes`: 道具メモ

ただし、現在の `upsertHuntingEventAction` は `targetSpecies` を必須としているため、UIだけ変えても射撃記録をそのまま保存することはできない。

DB上は `targetSpecies` を `null` にできるが、Server Action側のバリデーションが狩猟記録前提。

### 既存カラムへのマッピング案

DB変更なしで射撃記録を保存する場合の暫定マッピング案。

| 射撃記録の項目 | 既存カラム | 自然さ | メモ |
| --- | --- | --- | --- |
| 実施日 | `hunting_events.eventDate` | 高 | 狩猟・射撃どちらでも使える |
| 射撃種別 | `hunting_events.purposeCode` または `notes` | 低〜中 | `TRAINING` / `OTHER` では粗すぎる。詳細は `notes` に逃がす必要がある |
| 射撃場 | `hunting_events.areaName` | 中 | 場所名としては使えるが、市区町村名候補補完と混ざる |
| 使用銃 | `hunting_event_tools.toolName` | 高 | 既存の「使用道具」として自然 |
| 使用弾数 | `hunting_event_tools.quantity` | 中 | 数量として保存できるが、弾数なのか道具数なのか意味が変わる |
| メモ | `hunting_events.notes` | 高 | 自由記述として自然 |
| 猟法 | `hunting_events.huntingMethod` | 中 | DBは nullable。射撃記録では `null` が自然 |
| 対象鳥獣 | `hunting_events.targetSpecies` | 低 | DBは nullable。射撃記録では `null` が自然 |
| 成果数 | `hunting_events.resultCount` | 低 | 射撃記録では意味が曖昧。使わない方がよい |
| 報告書転記状態 | `hunting_events.importedToReportAt` | 低 | 射撃記録には基本不要 |

### 危ない点・無理がある点

一番危ないのは、狩猟記録と射撃記録を区別するカラムがないこと。

既存DBには `activityType` や `recordType` のような分類カラムがない。  
そのため、`huntingMethod = null` や `purposeCode = TRAINING` などで射撃記録を推測することになる。

この推測方式には次の問題がある。

- 狩猟側の「訓練」と射撃練習が混ざる。
- `purposeCode=TRAINING` だけでは、射撃場練習・標的射撃・その他練習の区別ができない。
- `areaName` に射撃場名を入れると、市区町村名候補補完と混ざる。
- `hunting_event_tools.quantity` に使用弾数を入れると、狩猟側の「道具数量」と意味が変わる。
- `importedToReportAt` が射撃記録にも表示されると、射撃記録まで報告書転記対象に見える。
- `getDashboardSummary()` の `pendingReports` は `importedToReportAt = null` の `hunting_events` を数えているため、射撃記録を入れると未転記件数に混ざる。
- `/reports` 一覧の「転記用要約」は対象鳥獣・成果数前提なので、射撃記録では不自然になる。
- `upsertHuntingEventAction` が `targetSpecies` 必須のため、Server Action変更なしでは射撃記録を保存できない。

### DB変更なしでの最小実装案

DB変更なしで試すなら、あくまで暫定実装として次の形が最小。

1. UIの先頭に「狩猟記録 / 射撃記録」の切替を追加する。
2. 狩猟記録では現行フォームを維持する。
3. 射撃記録では以下だけ表示する。
   - 実施日
   - 射撃種別
   - 射撃場
   - 使用銃
   - 使用弾数
   - メモ
4. 射撃記録保存時は暫定的に次へ入れる。
   - `eventDate`: 実施日
   - `huntingMethod`: `null`
   - `purposeCode`: `TRAINING` または `OTHER`
   - `targetSpecies`: `null`
   - `resultCount`: `null`
   - `areaName`: 射撃場名
   - `notes`: `射撃種別` とメモをまとめる
   - `hunting_event_tools.toolType`: `FIREARM`
   - `hunting_event_tools.toolName`: 使用銃
   - `hunting_event_tools.quantity`: 使用弾数
5. 一覧表示では、`huntingMethod === null` かつ `targetSpecies === null` などの条件で射撃記録らしく表示を切り替える。

ただし、この方式は判別が推測に依存するため、長期運用には向かない。

### 将来のDB変更案

将来は `hunting_events` を「活動記録」相当に広げるか、別テーブルを作るかを決める必要がある。

案A: `hunting_events` を活動記録テーブルとして拡張する。

- `activityType`: `HUNTING` / `SHOOTING`
- `shootingType`: 射撃種別
- `shootingRangeName`: 射撃場名
- `shotCount`: 使用弾数
- `isReportTransferTarget`: 報告書転記対象かどうか

利点:
- 現在の `/reports` 一覧や `hunting_event_tools` を使い回しやすい。

懸念:
- `hunting_events` という名前と役割が、射撃記録まで含むには狭い。

案B: `activity_records` を新設し、狩猟・射撃を共通管理する。

- `activity_records`
  - `activityType`
  - `eventDate`
  - `locationName`
  - `notes`
- `hunting_events`
  - `activityRecordId`
  - 狩猟固有項目
- `shooting_events`
  - `activityRecordId`
  - 射撃種別、射撃場、使用弾数など

利点:
- 狩猟・射撃の意味を分けられる。
- 報告書転記対象を狩猟側に限定しやすい。

懸念:
- migration と既存データ移行が必要。
- MVPとしてはやや重い。

案C: 射撃記録を `ammo_records` 中心で扱い、活動記録には連携表示だけする。

- 射撃練習は実包消費の一種として `ammo_records` に保存する。
- 射撃場・使用銃・使用弾数・メモを `ammo_records` 側に持たせる。
- 必要に応じて活動記録ページで表示する。

利点:
- 弾の消費管理として自然。

懸念:
- 射撃種別や射撃場を構造化するには、結局 `ammo_records` 側の拡張が必要。

### 今すぐ実装してよいかの判断材料

DB変更なしでの実装は、短期の表示確認やプロトタイプなら可能。

ただし、本番運用前提で射撃記録を扱うなら、最低でも「狩猟記録か射撃記録か」を明示するカラムが欲しい。

今すぐ実装するなら、次をGPT側で確認してからがよい。

- 射撃記録を報告書転記対象に含めない方針でよいか。
- 射撃場名を `areaName` に入れる暫定運用を許容するか。
- 使用弾数を `hunting_event_tools.quantity` に入れる暫定運用を許容するか。
- `purposeCode=TRAINING` を射撃記録として使ってよいか、それとも `notes` に射撃種別を保存するか。
- 早めに `activityType` を追加するか。
- 射撃記録は `/reports` ではなく `/ammo` から作るべきか。

## 6. やらないこと

今回やらないこと:

- DB変更
- `schema.prisma` 変更
- `prisma:push`
- UI実装
- Server Action変更
- データ移行
- 新機能追加
- `DECISIONS.md` への採用判断追記
