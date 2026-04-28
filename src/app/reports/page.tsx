import {
  deleteHuntingEventAction,
  toggleImportedToReportAction,
  upsertHuntingEventAction,
} from "@/app/actions";
import { FeedbackBanner } from "@/components/feedback-banner";
import { DateInput } from "@/components/date-input";
import { ReportLocationFields } from "@/components/reports/report-location-fields";
import { SubmitButton } from "@/components/submit-button";
import {
  getDataLoadErrorMessage,
  getReportPageData,
  getReportPageDataFallback,
  huntingMethodOptions,
  huntingPurposeOptions,
  huntingToolTypeOptions,
} from "@/lib/app-data";
import {
  getFeedbackFromSearchParams,
  type SearchParamsInput,
} from "@/lib/feedback";
import { formatDateInput, formatDateLabel } from "@/lib/format";
import { getPrefectureName } from "@/lib/prefectures";
import {
  huntingMethodLabels,
  huntingPurposeLabels,
  huntingToolTypeLabels,
  reportTransferStatusLabels,
  toDisplayLabel,
} from "@/lib/labels";

export const dynamic = "force-dynamic";

export default async function ReportsPage({
  searchParams,
}: {
  searchParams?: SearchParamsInput;
}) {
  const searchFeedback = await getFeedbackFromSearchParams(searchParams);
  let feedback = searchFeedback;
  let huntingEvents: Awaited<ReturnType<typeof getReportPageData>>["huntingEvents"] =
    getReportPageDataFallback().huntingEvents as Awaited<
      ReturnType<typeof getReportPageData>
    >["huntingEvents"];
  let municipalitySuggestionsByPrefecture =
    getReportPageDataFallback().municipalitySuggestionsByPrefecture;

  try {
    ({ huntingEvents, municipalitySuggestionsByPrefecture } =
      await getReportPageData());
  } catch (error) {
    feedback ??= {
      variant: "error",
      message: getDataLoadErrorMessage(error),
    };
  }

  const pendingCount = huntingEvents.filter(
    (event) => event.importedToReportAt === null,
  ).length;

  return (
    <main className="flex flex-1 flex-col gap-5">
      <FeedbackBanner feedback={feedback} />

      <section className="rounded-[32px] border border-emerald-950/10 bg-white/92 p-5 shadow-[0_24px_52px_-36px_rgba(15,23,42,0.38)] sm:p-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div className="space-y-2">
            <p className="text-[11px] font-semibold tracking-[0.22em] text-emerald-700 uppercase">
              報告書転記
            </p>
            <h2 className="text-2xl font-semibold text-slate-950">
              狩猟記録をそのまま転記用データに整理
            </h2>
            <p className="max-w-2xl text-sm leading-7 text-slate-600">
              日付、猟法、対象鳥獣、道具をまとめて記録し、報告書へ転記したかどうかを
              状態で管理します。
            </p>
          </div>

          <div className="grid grid-cols-2 gap-3 sm:min-w-80">
            <div className="rounded-[24px] bg-emerald-50 p-4">
              <p className="text-xs font-semibold tracking-[0.16em] text-emerald-700 uppercase">
                未転記
              </p>
              <p className="mt-2 text-3xl font-semibold text-emerald-950">
                {pendingCount}
              </p>
            </div>
            <div className="rounded-[24px] bg-slate-100 p-4">
              <p className="text-xs font-semibold tracking-[0.16em] text-slate-500 uppercase">
                記録件数
              </p>
              <p className="mt-2 text-3xl font-semibold text-slate-950">
                {huntingEvents.length}
              </p>
            </div>
          </div>
        </div>
      </section>

      <section className="grid gap-4">
        <form
          action={upsertHuntingEventAction}
          className="rounded-[30px] border border-emerald-950/10 bg-white/92 p-5 shadow-[0_24px_50px_-36px_rgba(15,23,42,0.38)]"
        >
          <div className="mb-4">
            <p className="text-[11px] font-semibold tracking-[0.22em] text-slate-500 uppercase">
              新規登録
            </p>
            <h3 className="mt-1 text-lg font-semibold">狩猟記録を追加</h3>
          </div>

          <div className="report-form-grid grid grid-cols-1 gap-3 lg:grid-cols-4">
            <label className="report-date-field min-w-0 space-y-1.5 text-sm">
              <span className="font-medium text-slate-700">実施日</span>
              <DateInput
                name="eventDate"
                required
                className="min-h-12 w-full rounded-[20px] border border-slate-200 bg-slate-50 px-4"
              />
            </label>

            <label className="report-select-field min-w-0 space-y-1.5 text-sm">
              <span className="font-medium text-slate-700">猟法</span>
              <select
                name="huntingMethod"
                defaultValue="GUN"
                className="min-h-12 w-full rounded-[20px] border border-slate-200 bg-slate-50 px-4"
              >
                {huntingMethodOptions.map((option) => (
                  <option key={option} value={option}>
                    {huntingMethodLabels[option]}
                  </option>
                ))}
              </select>
            </label>

            <label className="report-select-field min-w-0 space-y-1.5 text-sm">
              <span className="font-medium text-slate-700">目的</span>
              <select
                name="purposeCode"
                defaultValue="HUNTING"
                className="min-h-12 w-full rounded-[20px] border border-slate-200 bg-slate-50 px-4"
              >
                {huntingPurposeOptions.map((option) => (
                  <option key={option} value={option}>
                    {huntingPurposeLabels[option]}
                  </option>
                ))}
              </select>
            </label>

            <label className="report-number-field min-w-0 space-y-1.5 text-sm">
              <span className="font-medium text-slate-700">成果数</span>
              <input
                type="number"
                min={0}
                name="resultCount"
                defaultValue={0}
                className="min-h-12 w-full rounded-[20px] border border-slate-200 bg-slate-50 px-4"
              />
            </label>

            <ReportLocationFields
              municipalitySuggestionsByPrefecture={
                municipalitySuggestionsByPrefecture
              }
            />

            <label className="report-species-field min-w-0 space-y-1.5 text-sm">
              <span className="font-medium text-slate-700">対象鳥獣</span>
              <input
                name="targetSpecies"
                required
                placeholder="例: シカ"
                className="min-h-12 w-full rounded-[20px] border border-slate-200 bg-slate-50 px-4"
              />
            </label>

            <label className="report-memo-field min-w-0 space-y-1.5 text-sm lg:col-span-4">
              <span className="font-medium text-slate-700">備考</span>
              <textarea
                name="notes"
                rows={3}
                placeholder="報告書に残したい補足"
                className="w-full rounded-[20px] border border-slate-200 bg-slate-50 px-4 py-3"
              />
            </label>
          </div>

          <div className="mt-5 rounded-[24px] bg-emerald-50/70 p-4">
            <div className="mb-3">
              <p className="text-sm font-semibold text-slate-900">
                使用道具 1件
              </p>
              <p className="text-xs leading-6 text-slate-600">
                MVP では最初の1件だけを登録・更新します。
              </p>
            </div>
            <div className="report-tool-grid grid grid-cols-1 gap-3 lg:grid-cols-4">
              <select
                name="toolType"
                defaultValue="FIREARM"
                className="report-tool-type min-h-12 min-w-0 rounded-[18px] border border-emerald-950/10 bg-white px-4 text-sm"
              >
                {huntingToolTypeOptions.map((option) => (
                  <option key={option} value={option}>
                    {huntingToolTypeLabels[option]}
                  </option>
                ))}
              </select>
              <input
                name="toolName"
                placeholder="例: 12番散弾銃"
                className="report-tool-name min-h-12 min-w-0 rounded-[18px] border border-emerald-950/10 bg-white px-4 text-sm"
              />
              <input
                type="number"
                min={0}
                name="toolQuantity"
                defaultValue={1}
                className="report-tool-number min-h-12 min-w-0 rounded-[18px] border border-emerald-950/10 bg-white px-4 text-sm"
              />
              <input
                name="toolNotes"
                placeholder="道具メモ"
                className="report-tool-memo min-h-12 min-w-0 rounded-[18px] border border-emerald-950/10 bg-white px-4 text-sm lg:col-span-4"
              />
            </div>
          </div>

          <SubmitButton
            className="mt-5 min-h-12 w-full px-5"
            pendingChildren="保存中..."
          >
            記録を保存
          </SubmitButton>
        </form>

        <section className="grid gap-4">
          {huntingEvents.length === 0 ? (
            <div className="rounded-[30px] border border-dashed border-emerald-950/15 bg-white/72 p-6 text-sm leading-7 text-slate-600">
              狩猟記録はまだありません。最初の1件を登録して転記運用を始めてください。
            </div>
          ) : (
            huntingEvents.map((event) => {
              const primaryTool = event.huntingEventTools[0];
              const transferLabel = event.importedToReportAt
                ? reportTransferStatusLabels.imported
                : reportTransferStatusLabels.pending;

              return (
                <article
                  key={event.id}
                  className="rounded-[30px] border border-emerald-950/10 bg-white/92 p-5 shadow-[0_24px_50px_-36px_rgba(15,23,42,0.38)]"
                >
                  <form action={upsertHuntingEventAction} className="grid gap-3">
                    <input type="hidden" name="id" value={event.id} />
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                      <div className="space-y-1">
                        <p className="text-xs font-semibold tracking-[0.16em] text-slate-500 uppercase">
                          {toDisplayLabel(event.huntingMethod, huntingMethodLabels)}
                        </p>
                        <h3 className="text-lg font-semibold text-slate-950">
                          {event.targetSpecies ?? "対象未設定"}
                        </h3>
                        <p className="text-sm text-slate-600">
                          {formatDateLabel(event.eventDate)} /{" "}
                          {getPrefectureName(event.prefectureCode)} /{" "}
                          {event.areaName ?? "場所未設定"}
                        </p>
                      </div>
                      <span className="inline-flex rounded-full bg-emerald-100 px-3 py-1 text-xs font-medium text-emerald-900">
                        {transferLabel}
                      </span>
                    </div>

                    <div className="grid gap-3 sm:grid-cols-2">
                      <DateInput
                        name="eventDate"
                        required
                        defaultValue={formatDateInput(event.eventDate)}
                        className="min-h-12 rounded-[18px] border border-slate-200 bg-slate-50 px-4 text-sm"
                      />
                      <select
                        name="huntingMethod"
                        defaultValue={event.huntingMethod ?? "GUN"}
                        className="min-h-12 rounded-[18px] border border-slate-200 bg-slate-50 px-4 text-sm"
                      >
                        {huntingMethodOptions.map((option) => (
                          <option key={option} value={option}>
                            {huntingMethodLabels[option]}
                          </option>
                        ))}
                      </select>
                      <input
                        name="targetSpecies"
                        required
                        defaultValue={event.targetSpecies ?? ""}
                        placeholder="対象鳥獣"
                        className="min-h-12 rounded-[18px] border border-slate-200 bg-slate-50 px-4 text-sm"
                      />
                      <ReportLocationFields
                        defaultPrefectureCode={event.prefectureCode}
                        defaultMunicipalityName={event.areaName}
                        municipalitySuggestionsByPrefecture={
                          municipalitySuggestionsByPrefecture
                        }
                      />
                      <select
                        name="purposeCode"
                        defaultValue={event.purposeCode ?? "HUNTING"}
                        className="min-h-12 rounded-[18px] border border-slate-200 bg-slate-50 px-4 text-sm"
                      >
                        {huntingPurposeOptions.map((option) => (
                          <option key={option} value={option}>
                            {huntingPurposeLabels[option]}
                          </option>
                        ))}
                      </select>
                      <input
                        type="number"
                        min={0}
                        name="resultCount"
                        defaultValue={event.resultCount ?? 0}
                        className="min-h-12 rounded-[18px] border border-slate-200 bg-slate-50 px-4 text-sm"
                      />
                    </div>

                    <div className="rounded-[22px] bg-slate-50 p-4 text-sm leading-7 text-slate-700">
                      <p>
                        道具:{" "}
                        {primaryTool
                          ? `${huntingToolTypeLabels[primaryTool.toolType]} / ${primaryTool.toolName}`
                          : "未登録"}
                      </p>
                      <p>弾薬記録の紐付け: {event._count.ammoRecords} 件</p>
                      <p>
                        転記用要約: {formatDateLabel(event.eventDate)} /{" "}
                        {getPrefectureName(event.prefectureCode)} /{" "}
                        {event.targetSpecies ?? "未設定"} /{" "}
                        {event.resultCount ?? 0} 頭羽
                      </p>
                    </div>

                    <div className="grid gap-3 rounded-[22px] bg-emerald-50/70 p-4 sm:grid-cols-2">
                      <select
                        name="toolType"
                        defaultValue={primaryTool?.toolType ?? "FIREARM"}
                        className="min-h-12 rounded-[18px] border border-emerald-950/10 bg-white px-4 text-sm"
                      >
                        {huntingToolTypeOptions.map((option) => (
                          <option key={option} value={option}>
                            {huntingToolTypeLabels[option]}
                          </option>
                        ))}
                      </select>
                      <input
                        name="toolName"
                        defaultValue={primaryTool?.toolName ?? ""}
                        placeholder="道具名"
                        className="min-h-12 rounded-[18px] border border-emerald-950/10 bg-white px-4 text-sm"
                      />
                      <input
                        type="number"
                        min={0}
                        name="toolQuantity"
                        defaultValue={primaryTool?.quantity ?? 1}
                        className="min-h-12 rounded-[18px] border border-emerald-950/10 bg-white px-4 text-sm"
                      />
                      <input
                        name="toolNotes"
                        defaultValue={primaryTool?.notes ?? ""}
                        placeholder="道具メモ"
                        className="min-h-12 rounded-[18px] border border-emerald-950/10 bg-white px-4 text-sm"
                      />
                    </div>

                    <textarea
                      name="notes"
                      rows={2}
                      defaultValue={event.notes ?? ""}
                      placeholder="備考"
                      className="w-full rounded-[18px] border border-slate-200 bg-slate-50 px-4 py-3 text-sm"
                    />

                    <SubmitButton pendingChildren="更新中...">
                      内容を更新
                    </SubmitButton>
                  </form>

                  <div className="mt-3 flex flex-col gap-2 sm:flex-row">
                    <form action={toggleImportedToReportAction}>
                      <input type="hidden" name="id" value={event.id} />
                      <input
                        type="hidden"
                        name="imported"
                        value={String(Boolean(event.importedToReportAt))}
                      />
                      <SubmitButton
                        variant="secondary"
                        pendingChildren="切替中..."
                      >
                        {event.importedToReportAt
                          ? "未転記に戻す"
                          : "転記済みにする"}
                      </SubmitButton>
                    </form>

                    <form action={deleteHuntingEventAction}>
                      <input type="hidden" name="id" value={event.id} />
                      <SubmitButton
                        variant="danger"
                        pendingChildren="削除中..."
                      >
                        この記録を削除
                      </SubmitButton>
                    </form>
                  </div>
                </article>
              );
            })
          )}
        </section>
      </section>
    </main>
  );
}
