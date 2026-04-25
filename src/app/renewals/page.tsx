import { deleteRenewalAction, upsertRenewalAction } from "@/app/actions";
import { FeedbackBanner } from "@/components/feedback-banner";
import { SubmitButton } from "@/components/submit-button";
import {
  firearmStatusOptions,
  firearmTypeOptions,
  getDataLoadErrorMessage,
  getRenewalPageData,
  getRenewalPageDataFallback,
  renewalCategoryOptions,
  renewalStatusOptions,
} from "@/lib/app-data";
import {
  getFeedbackFromSearchParams,
  type SearchParamsInput,
} from "@/lib/feedback";
import { formatDateInput, formatDateLabel } from "@/lib/format";
import {
  firearmStatusLabels,
  firearmTypeLabels,
  renewalCategoryLabels,
  renewalStatusLabels,
} from "@/lib/labels";

export const dynamic = "force-dynamic";

export default async function RenewalsPage({
  searchParams,
}: {
  searchParams?: SearchParamsInput;
}) {
  const searchFeedback = await getFeedbackFromSearchParams(searchParams);
  let feedback = searchFeedback;
  let renewals: Awaited<ReturnType<typeof getRenewalPageData>>["renewals"] =
    getRenewalPageDataFallback().renewals as Awaited<
      ReturnType<typeof getRenewalPageData>
    >["renewals"];

  try {
    ({ renewals } = await getRenewalPageData());
  } catch (error) {
    feedback ??= {
      variant: "error",
      message: getDataLoadErrorMessage(error),
    };
  }

  const nearestRenewal = renewals[0];

  return (
    <main className="flex flex-1 flex-col gap-5">
      <FeedbackBanner feedback={feedback} />

      <section className="rounded-[32px] border border-emerald-950/10 bg-white/92 p-5 shadow-[0_24px_52px_-36px_rgba(15,23,42,0.38)] sm:p-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div className="space-y-2">
            <p className="text-[11px] font-semibold tracking-[0.22em] text-emerald-700 uppercase">
              更新管理
            </p>
            <h2 className="text-2xl font-semibold text-slate-950">
              許可や講習の期限をまとめて管理
            </h2>
            <p className="max-w-2xl text-sm leading-7 text-slate-600">
              狩猟免許、銃砲所持許可、技能講習などの期限を記録します。
              新規登録時には銃情報を1件だけ関連付けできます。
            </p>
          </div>

          <div className="grid grid-cols-2 gap-3 sm:min-w-80">
            <div className="rounded-[24px] bg-emerald-50 p-4">
              <p className="text-xs font-semibold tracking-[0.16em] text-emerald-700 uppercase">
                登録件数
              </p>
              <p className="mt-2 text-2xl font-semibold text-emerald-950">
                {renewals.length}
              </p>
            </div>
            <div className="rounded-[24px] bg-slate-100 p-4">
              <p className="text-xs font-semibold tracking-[0.16em] text-slate-500 uppercase">
                直近期限
              </p>
              <p className="mt-2 text-sm font-semibold text-slate-950">
                {nearestRenewal
                  ? formatDateLabel(nearestRenewal.expiresOn)
                  : "未登録"}
              </p>
            </div>
          </div>
        </div>
      </section>

      <section className="grid gap-4 xl:grid-cols-[0.95fr,1.05fr]">
        <form
          action={upsertRenewalAction}
          className="rounded-[30px] border border-emerald-950/10 bg-white/92 p-5 shadow-[0_24px_50px_-36px_rgba(15,23,42,0.38)]"
        >
          <div className="mb-4">
            <p className="text-[11px] font-semibold tracking-[0.22em] text-slate-500 uppercase">
              新規登録
            </p>
            <h3 className="mt-1 text-lg font-semibold">更新対象を追加</h3>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <label className="space-y-1.5 text-sm">
              <span className="font-medium text-slate-700">種別</span>
              <select
                name="category"
                defaultValue="HUNTING_LICENSE"
                className="min-h-12 w-full rounded-[20px] border border-slate-200 bg-slate-50 px-4"
              >
                {renewalCategoryOptions.map((option) => (
                  <option key={option} value={option}>
                    {renewalCategoryLabels[option]}
                  </option>
                ))}
              </select>
            </label>

            <label className="space-y-1.5 text-sm">
              <span className="font-medium text-slate-700">進捗</span>
              <select
                name="status"
                defaultValue="ACTIVE"
                className="min-h-12 w-full rounded-[20px] border border-slate-200 bg-slate-50 px-4"
              >
                {renewalStatusOptions.map((option) => (
                  <option key={option} value={option}>
                    {renewalStatusLabels[option]}
                  </option>
                ))}
              </select>
            </label>

            <label className="space-y-1.5 text-sm sm:col-span-2">
              <span className="font-medium text-slate-700">管理名</span>
              <input
                name="title"
                required
                placeholder="例: 令和8年度 狩猟免許更新"
                className="min-h-12 w-full rounded-[20px] border border-slate-200 bg-slate-50 px-4"
              />
            </label>

            <label className="space-y-1.5 text-sm">
              <span className="font-medium text-slate-700">管轄コード</span>
              <input
                name="jurisdictionCode"
                placeholder="例: 23"
                className="min-h-12 w-full rounded-[20px] border border-slate-200 bg-slate-50 px-4"
              />
            </label>

            <label className="space-y-1.5 text-sm">
              <span className="font-medium text-slate-700">目標日</span>
              <input
                type="date"
                name="targetDate"
                className="min-h-12 w-full rounded-[20px] border border-slate-200 bg-slate-50 px-4"
              />
            </label>

            <label className="space-y-1.5 text-sm">
              <span className="font-medium text-slate-700">交付日</span>
              <input
                type="date"
                name="issuedOn"
                className="min-h-12 w-full rounded-[20px] border border-slate-200 bg-slate-50 px-4"
              />
            </label>

            <label className="space-y-1.5 text-sm">
              <span className="font-medium text-slate-700">期限日</span>
              <input
                type="date"
                name="expiresOn"
                required
                className="min-h-12 w-full rounded-[20px] border border-slate-200 bg-slate-50 px-4"
              />
            </label>

            <label className="space-y-1.5 text-sm sm:col-span-2">
              <span className="font-medium text-slate-700">通知開始日</span>
              <input
                type="date"
                name="reminderStartOn"
                className="min-h-12 w-full rounded-[20px] border border-slate-200 bg-slate-50 px-4"
              />
            </label>

            <label className="space-y-1.5 text-sm sm:col-span-2">
              <span className="font-medium text-slate-700">メモ</span>
              <textarea
                name="notes"
                rows={3}
                placeholder="必要書類や持ち物、連絡先などを記録"
                className="w-full rounded-[20px] border border-slate-200 bg-slate-50 px-4 py-3"
              />
            </label>
          </div>

          <div className="mt-5 rounded-[24px] bg-emerald-50/70 p-4">
            <div className="mb-3">
              <p className="text-sm font-semibold text-slate-900">
                銃情報を同時登録
              </p>
              <p className="text-xs leading-6 text-slate-600">
                銃番号を入力した場合のみ銃情報レコードを追加します。
              </p>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <label className="space-y-1.5 text-sm">
                <span className="font-medium text-slate-700">銃種</span>
                <select
                  name="firearmType"
                  defaultValue="SHOTGUN"
                  className="min-h-12 w-full rounded-[18px] border border-emerald-950/10 bg-white px-4"
                >
                  {firearmTypeOptions.map((option) => (
                    <option key={option} value={option}>
                      {firearmTypeLabels[option]}
                    </option>
                  ))}
                </select>
              </label>

              <label className="space-y-1.5 text-sm">
                <span className="font-medium text-slate-700">状態</span>
                <select
                  name="firearmStatus"
                  defaultValue="ACTIVE"
                  className="min-h-12 w-full rounded-[18px] border border-emerald-950/10 bg-white px-4"
                >
                  {firearmStatusOptions.map((option) => (
                    <option key={option} value={option}>
                      {firearmStatusLabels[option]}
                    </option>
                  ))}
                </select>
              </label>

              <input
                name="manufacturer"
                placeholder="メーカー"
                className="min-h-12 rounded-[18px] border border-emerald-950/10 bg-white px-4"
              />
              <input
                name="modelName"
                placeholder="型式"
                className="min-h-12 rounded-[18px] border border-emerald-950/10 bg-white px-4"
              />
              <input
                name="caliber"
                placeholder="口径"
                className="min-h-12 rounded-[18px] border border-emerald-950/10 bg-white px-4"
              />
              <input
                name="serialNumber"
                placeholder="銃番号を入力すると登録"
                className="min-h-12 rounded-[18px] border border-emerald-950/10 bg-white px-4"
              />
            </div>
          </div>

          <SubmitButton
            className="mt-5 min-h-12 w-full px-5"
            pendingChildren="保存中..."
          >
            更新対象を保存
          </SubmitButton>
        </form>

        <section className="grid gap-4">
          {renewals.length === 0 ? (
            <div className="rounded-[30px] border border-dashed border-emerald-950/15 bg-white/72 p-6 text-sm leading-7 text-slate-600">
              登録済みの更新対象はまだありません。左のフォームから最初の1件を追加してください。
            </div>
          ) : (
            renewals.map((renewal) => (
              <article
                key={renewal.id}
                className="rounded-[30px] border border-emerald-950/10 bg-white/92 p-5 shadow-[0_24px_50px_-36px_rgba(15,23,42,0.38)]"
              >
                <form action={upsertRenewalAction} className="grid gap-3">
                  <input type="hidden" name="id" value={renewal.id} />
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                    <div className="space-y-1">
                      <p className="text-xs font-semibold tracking-[0.16em] text-slate-500 uppercase">
                        {renewalCategoryLabels[renewal.category]}
                      </p>
                      <h3 className="text-lg font-semibold text-slate-950">
                        {renewal.title}
                      </h3>
                      <p className="text-sm text-slate-600">
                        期限日 {formatDateLabel(renewal.expiresOn)}
                      </p>
                    </div>
                    <span className="inline-flex rounded-full bg-emerald-100 px-3 py-1 text-xs font-medium text-emerald-900">
                      {renewalStatusLabels[renewal.status]}
                    </span>
                  </div>

                  <div className="grid gap-3 sm:grid-cols-2">
                    <input
                      name="title"
                      required
                      defaultValue={renewal.title}
                      className="min-h-12 rounded-[18px] border border-slate-200 bg-slate-50 px-4 text-sm"
                    />
                    <select
                      name="status"
                      defaultValue={renewal.status}
                      className="min-h-12 rounded-[18px] border border-slate-200 bg-slate-50 px-4 text-sm"
                    >
                      {renewalStatusOptions.map((option) => (
                        <option key={option} value={option}>
                          {renewalStatusLabels[option]}
                        </option>
                      ))}
                    </select>
                    <select
                      name="category"
                      defaultValue={renewal.category}
                      className="min-h-12 rounded-[18px] border border-slate-200 bg-slate-50 px-4 text-sm"
                    >
                      {renewalCategoryOptions.map((option) => (
                        <option key={option} value={option}>
                          {renewalCategoryLabels[option]}
                        </option>
                      ))}
                    </select>
                    <input
                      name="jurisdictionCode"
                      defaultValue={renewal.jurisdictionCode ?? ""}
                      placeholder="管轄コード"
                      className="min-h-12 rounded-[18px] border border-slate-200 bg-slate-50 px-4 text-sm"
                    />
                    <input
                      type="date"
                      name="expiresOn"
                      required
                      defaultValue={formatDateInput(renewal.expiresOn)}
                      className="min-h-12 rounded-[18px] border border-slate-200 bg-slate-50 px-4 text-sm"
                    />
                    <input
                      type="date"
                      name="reminderStartOn"
                      defaultValue={formatDateInput(renewal.reminderStartOn)}
                      className="min-h-12 rounded-[18px] border border-slate-200 bg-slate-50 px-4 text-sm"
                    />
                  </div>

                  <textarea
                    name="notes"
                    rows={2}
                    defaultValue={renewal.notes ?? ""}
                    placeholder="メモ"
                    className="w-full rounded-[18px] border border-slate-200 bg-slate-50 px-4 py-3 text-sm"
                  />

                  <div className="flex flex-col gap-2 sm:flex-row">
                    <SubmitButton pendingChildren="更新中...">
                      内容を更新
                    </SubmitButton>
                  </div>
                </form>

                <form action={deleteRenewalAction} className="mt-3">
                  <input type="hidden" name="id" value={renewal.id} />
                  <SubmitButton variant="danger" pendingChildren="削除中...">
                    この記録を削除
                  </SubmitButton>
                </form>
              </article>
            ))
          )}
        </section>
      </section>
    </main>
  );
}
