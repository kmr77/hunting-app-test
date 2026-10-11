import { AmmoCreateForm } from "@/components/ammo/ammo-create-form";
import { AmmoRecordList } from "@/components/ammo/ammo-record-list";
import { FeedbackBanner } from "@/components/feedback-banner";
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
import {
  ammoCategoryLabels,
  ammoRecordTypeLabels,
  toDisplayLabel,
} from "@/lib/labels";
import { formatDateInput } from "@/lib/format";

export const dynamic = "force-dynamic";

function getFirstSearchParam(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] ?? "" : value ?? "";
}

export default async function AmmoPage({
  searchParams,
}: {
  searchParams?: Promise<SearchParamsInput>;
}) {
  const resolvedSearchParams = await searchParams;
  const searchFeedback = await getFeedbackFromSearchParams(resolvedSearchParams);
  const feedbackTarget = getFirstSearchParam(resolvedSearchParams?.target);
  let feedback = searchFeedback;
  let ammoRecords: Awaited<ReturnType<typeof getAmmoPageData>>["ammoRecords"] =
    getAmmoPageDataFallback().ammoRecords as Awaited<
      ReturnType<typeof getAmmoPageData>
    >["ammoRecords"];
  let registeredCount: Awaited<ReturnType<typeof getAmmoPageData>>["registeredCount"] =
    getAmmoPageDataFallback().registeredCount;

  try {
    ({ ammoRecords, registeredCount } = await getAmmoPageData());
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
              実包の購入・譲受を日付順に管理
            </h2>
            <p className="max-w-2xl text-sm leading-7 text-slate-600">
              仕入先や弾薬の特徴を残しながら、活動記録で使う弾薬情報を整理できます。
            </p>
            <p className="max-w-2xl rounded-[18px] bg-emerald-50/80 px-4 py-3 text-sm leading-7 text-emerald-950">
              活動記録での入力を楽にするため、メーカー・口径・号数・弾種などはできるだけ詳しく登録しておくことをおすすめします。
            </p>
          </div>

          <div className="grid grid-cols-2 gap-3 sm:min-w-80">
            <div className="rounded-[24px] bg-lime-100 p-4 text-lime-950">
              <p className="text-xs font-semibold tracking-[0.16em] uppercase">
                登録弾数
              </p>
              <p className="mt-2 text-3xl font-semibold">{registeredCount} 発</p>
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
        <AmmoCreateForm
          recordTypeOptions={ammoRecordTypeOptions.map((option) => ({
            value: option,
            label: toDisplayLabel(option, ammoRecordTypeLabels),
          }))}
          ammoCategoryOptions={ammoCategoryOptions.map((option) => ({
            value: option,
            label: ammoCategoryLabels[option],
          }))}
        />

        <AmmoRecordList
          records={ammoRecords.map((record) => ({
            id: record.id,
            recordType: record.recordType,
            ammoCategory: record.ammoCategory,
            caliber: record.caliber,
            manufacturer: record.manufacturer,
            shotSize: record.slipNumber,
            quantity: record.quantity,
            transactionDate: formatDateInput(record.transactionDate),
            supplierName: record.supplierName,
            memo: record.memo,
          }))}
          recordTypeOptions={ammoRecordTypeOptions.map((option) => ({
            value: option,
            label: toDisplayLabel(option, ammoRecordTypeLabels),
          }))}
          ammoCategoryOptions={ammoCategoryOptions.map((option) => ({
            value: option,
            label: ammoCategoryLabels[option],
          }))}
          feedback={feedback}
          feedbackTarget={feedbackTarget}
        />
      </section>
    </main>
  );
}
