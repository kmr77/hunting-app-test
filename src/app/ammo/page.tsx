import { deleteAmmoAction, upsertAmmoAction } from "@/app/actions";
import { FeedbackBanner } from "@/components/feedback-banner";
import { DateInput } from "@/components/date-input";
import { SubmitButton } from "@/components/submit-button";
import {
  ammoCategoryOptions,
  ammoRecordTypeOptions,
  getAmmoPageDataFallback,
  getDataLoadErrorMessage,
  getAmmoPageData,
} from "@/lib/app-data";
import {
  getFeedbackFromSearchParams,
  type SearchParamsInput,
} from "@/lib/feedback";
import { formatDateInput, formatDateLabel } from "@/lib/format";
import {
  ammoCategoryLabels,
  ammoRecordTypeLabels,
} from "@/lib/labels";

export const dynamic = "force-dynamic";

export default async function AmmoPage({
  searchParams,
}: {
  searchParams?: SearchParamsInput;
}) {
  const searchFeedback = await getFeedbackFromSearchParams(searchParams);
  let feedback = searchFeedback;
  let ammoRecords: Awaited<ReturnType<typeof getAmmoPageData>>["ammoRecords"] =
    getAmmoPageDataFallback().ammoRecords as Awaited<
      ReturnType<typeof getAmmoPageData>
    >["ammoRecords"];
  let balance: Awaited<ReturnType<typeof getAmmoPageData>>["balance"] =
    getAmmoPageDataFallback().balance;

  try {
    ({ ammoRecords, balance } = await getAmmoPageData());
  } catch (error) {
    feedback ??= {
      variant: "error",
      message: getDataLoadErrorMessage(error),
    };
  }

  return (
    <main className="flex flex-1 flex-col gap-5">
      <FeedbackBanner feedback={feedback} />

      <section className="rounded-[32px] border border-emerald-950/10 bg-white/92 p-5 shadow-[0_24px_52px_-36px_rgba(15,23,42,0.38)] sm:p-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div className="space-y-2">
            <p className="text-[11px] font-semibold tracking-[0.22em] text-emerald-700 uppercase">
              実包帳簿
            </p>
            <h2 className="text-2xl font-semibold text-slate-950">
              実包の購入と消費を日付順に管理
            </h2>
            <p className="max-w-2xl text-sm leading-7 text-slate-600">
              仕入先や伝票番号を残しながら、散弾実包やスラッグの残数を確認できます。
            </p>
          </div>

          <div className="grid grid-cols-2 gap-3 sm:min-w-80">
            <div className="rounded-[24px] bg-lime-100 p-4 text-lime-950">
              <p className="text-xs font-semibold tracking-[0.16em] uppercase">
                現在残数
              </p>
              <p className="mt-2 text-3xl font-semibold">{balance} 発</p>
            </div>
            <div className="rounded-[24px] bg-slate-100 p-4">
              <p className="text-xs font-semibold tracking-[0.16em] text-slate-500 uppercase">
                帳簿記録
              </p>
              <p className="mt-2 text-3xl font-semibold text-slate-950">
                {ammoRecords.length} 件
              </p>
            </div>
          </div>
        </div>
      </section>

      <section className="grid gap-4">
        <form
          action={upsertAmmoAction}
          className="rounded-[30px] border border-emerald-950/10 bg-white/92 p-5 shadow-[0_24px_50px_-36px_rgba(15,23,42,0.38)]"
        >
          <div className="mb-4">
            <p className="text-[11px] font-semibold tracking-[0.22em] text-slate-500 uppercase">
              新規登録
            </p>
            <h3 className="mt-1 text-lg font-semibold">帳簿に記録を追加</h3>
          </div>

          <div className="grid grid-cols-1 gap-3 lg:grid-cols-4">
            <label className="min-w-0 space-y-1.5 text-sm">
              <span className="font-medium text-slate-700">取引日</span>
              <DateInput
                name="transactionDate"
                required
                className="min-h-12 w-full rounded-[20px] border border-slate-200 bg-slate-50 px-4"
              />
            </label>

            <label className="min-w-0 space-y-1.5 text-sm">
              <span className="font-medium text-slate-700">記録区分</span>
              <select
                name="recordType"
                defaultValue="PURCHASE"
                className="min-h-12 w-full rounded-[20px] border border-slate-200 bg-slate-50 px-4"
              >
                {ammoRecordTypeOptions.map((option) => (
                  <option key={option} value={option}>
                    {ammoRecordTypeLabels[option]}
                  </option>
                ))}
              </select>
            </label>

            <label className="min-w-0 space-y-1.5 text-sm">
              <span className="font-medium text-slate-700">実包種別</span>
              <select
                name="ammoCategory"
                defaultValue="SHOT_SHELL"
                className="min-h-12 w-full rounded-[20px] border border-slate-200 bg-slate-50 px-4"
              >
                {ammoCategoryOptions.map((option) => (
                  <option key={option} value={option}>
                    {ammoCategoryLabels[option]}
                  </option>
                ))}
              </select>
            </label>

            <label className="min-w-0 space-y-1.5 text-sm">
              <span className="font-medium text-slate-700">数量</span>
              <input
                type="number"
                name="quantity"
                min={1}
                required
                defaultValue={25}
                className="min-h-12 w-full rounded-[20px] border border-slate-200 bg-slate-50 px-4"
              />
            </label>

            <label className="min-w-0 space-y-1.5 text-sm">
              <span className="font-medium text-slate-700">口径</span>
              <input
                name="caliber"
                placeholder="例: 12番"
                className="min-h-12 w-full rounded-[20px] border border-slate-200 bg-slate-50 px-4"
              />
            </label>

            <label className="min-w-0 space-y-1.5 text-sm lg:col-span-2">
              <span className="font-medium text-slate-700">仕入先</span>
              <input
                name="supplierName"
                placeholder="例: 地元銃砲店"
                className="min-h-12 w-full rounded-[20px] border border-slate-200 bg-slate-50 px-4"
              />
            </label>

            <label className="min-w-0 space-y-1.5 text-sm">
              <span className="font-medium text-slate-700">伝票番号</span>
              <input
                name="slipNumber"
                placeholder="例: 2026-04-001"
                className="min-h-12 w-full rounded-[20px] border border-slate-200 bg-slate-50 px-4"
              />
            </label>

            <label className="min-w-0 space-y-1.5 text-sm lg:col-span-4">
              <span className="font-medium text-slate-700">メモ</span>
              <textarea
                name="memo"
                rows={3}
                placeholder="購入理由、消費の用途など"
                className="w-full rounded-[20px] border border-slate-200 bg-slate-50 px-4 py-3"
              />
            </label>
          </div>

          <SubmitButton
            className="mt-5 min-h-12 w-full px-5"
            pendingChildren="保存中..."
          >
            帳簿に保存
          </SubmitButton>
        </form>

        <section className="grid gap-4">
          {ammoRecords.length === 0 ? (
            <div className="rounded-[30px] border border-dashed border-emerald-950/15 bg-white/72 p-6 text-sm leading-7 text-slate-600">
              実包帳簿はまだ登録されていません。最初に現在の残弾数を繰越として登録すると、購入・消費の流れを管理しやすくなります。
            </div>
          ) : (
            ammoRecords.map((record) => (
              <article
                key={record.id}
                className="rounded-[30px] border border-emerald-950/10 bg-white/92 p-5 shadow-[0_24px_50px_-36px_rgba(15,23,42,0.38)]"
              >
                <form action={upsertAmmoAction} className="grid gap-3">
                  <input type="hidden" name="id" value={record.id} />
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                    <div className="space-y-1">
                      <p className="text-xs font-semibold tracking-[0.16em] text-slate-500 uppercase">
                        {ammoRecordTypeLabels[record.recordType]}
                      </p>
                      <h3 className="text-lg font-semibold text-slate-950">
                        {ammoCategoryLabels[record.ammoCategory]} / {record.quantity} 発
                      </h3>
                      <p className="text-sm text-slate-600">
                        {formatDateLabel(record.transactionDate)}
                      </p>
                    </div>
                    <span className="inline-flex rounded-full bg-lime-100 px-3 py-1 text-xs font-medium text-lime-950">
                      {record.caliber ?? "口径未設定"}
                    </span>
                  </div>

                  <div className="grid grid-cols-1 gap-3 lg:grid-cols-4">
                    <DateInput
                      name="transactionDate"
                      required
                      defaultValue={formatDateInput(record.transactionDate)}
                      className="min-h-12 min-w-0 rounded-[18px] border border-slate-200 bg-slate-50 px-4 text-sm"
                    />
                    <select
                      name="recordType"
                      defaultValue={record.recordType}
                      className="min-h-12 min-w-0 rounded-[18px] border border-slate-200 bg-slate-50 px-4 text-sm"
                    >
                      {ammoRecordTypeOptions.map((option) => (
                        <option key={option} value={option}>
                          {ammoRecordTypeLabels[option]}
                        </option>
                      ))}
                    </select>
                    <select
                      name="ammoCategory"
                      defaultValue={record.ammoCategory}
                      className="min-h-12 min-w-0 rounded-[18px] border border-slate-200 bg-slate-50 px-4 text-sm"
                    >
                      {ammoCategoryOptions.map((option) => (
                        <option key={option} value={option}>
                          {ammoCategoryLabels[option]}
                        </option>
                      ))}
                    </select>
                    <input
                      type="number"
                      min={1}
                      required
                      name="quantity"
                      defaultValue={record.quantity}
                      className="min-h-12 min-w-0 rounded-[18px] border border-slate-200 bg-slate-50 px-4 text-sm"
                    />
                    <input
                      name="caliber"
                      defaultValue={record.caliber ?? ""}
                      placeholder="口径"
                      className="min-h-12 min-w-0 rounded-[18px] border border-slate-200 bg-slate-50 px-4 text-sm"
                    />
                    <input
                      name="supplierName"
                      defaultValue={record.supplierName ?? ""}
                      placeholder="仕入先"
                      className="min-h-12 min-w-0 rounded-[18px] border border-slate-200 bg-slate-50 px-4 text-sm lg:col-span-2"
                    />
                    <input
                      name="slipNumber"
                      defaultValue={record.slipNumber ?? ""}
                      placeholder="伝票番号"
                      className="min-h-12 min-w-0 rounded-[18px] border border-slate-200 bg-slate-50 px-4 text-sm"
                    />
                    <textarea
                      name="memo"
                      rows={2}
                      defaultValue={record.memo ?? ""}
                      placeholder="メモ"
                      className="min-w-0 rounded-[18px] border border-slate-200 bg-slate-50 px-4 py-3 text-sm lg:col-span-4"
                    />
                  </div>

                  <SubmitButton pendingChildren="更新中...">
                    内容を更新
                  </SubmitButton>
                </form>

                <form action={deleteAmmoAction} className="mt-3">
                  <input type="hidden" name="id" value={record.id} />
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
