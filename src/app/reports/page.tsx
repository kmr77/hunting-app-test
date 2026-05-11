import {
  deleteHuntingEventAction,
  toggleImportedToReportAction,
  upsertHuntingEventAction,
} from "@/app/actions";
import { ActivityType } from "@prisma/client";
import { ActivityRecordForm } from "@/components/reports/activity-record-form";
import { FeedbackBanner } from "@/components/feedback-banner";
import { DateInput } from "@/components/date-input";
import { ReportLocationFields } from "@/components/reports/report-location-fields";
import { formFieldCompact, formTextareaCompact } from "@/lib/form-classes";
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
  activityTypeLabels,
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
  searchParams?: Promise<SearchParamsInput>;
}) {
  const searchFeedback = await getFeedbackFromSearchParams(await searchParams);
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
    (event) =>
      event.activityType === ActivityType.HUNTING &&
      event.isReportTransferTarget &&
      event.importedToReportAt === null,
  ).length;

  return (
    <main className="flex flex-1 flex-col gap-5">
      <FeedbackBanner feedback={feedback} />

      <section className="rounded-[32px] border border-emerald-950/10 bg-white/92 p-5 shadow-[0_24px_52px_-36px_rgba(15,23,42,0.38)] sm:p-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div className="space-y-2">
            <p className="text-[11px] font-semibold tracking-[0.22em] text-emerald-700 uppercase">
              活動記録
            </p>
            <h2 className="text-2xl font-semibold text-slate-950">
              狩猟・射撃の記録を活動別に整理
            </h2>
            <p className="max-w-2xl text-sm leading-7 text-slate-600">
              狩猟記録は報告書への転記状態まで管理し、射撃記録は射撃場・使用銃・使用弾数を中心に残します。
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
                活動記録
              </p>
              <p className="mt-2 text-3xl font-semibold text-slate-950">
                {huntingEvents.length} 件
              </p>
            </div>
          </div>
        </div>
      </section>

      <section className="grid gap-4">
        <ActivityRecordForm
          municipalitySuggestionsByPrefecture={
            municipalitySuggestionsByPrefecture
          }
        />

        <section className="grid gap-4">
          {huntingEvents.length === 0 ? (
            <div className="rounded-[30px] border border-dashed border-emerald-950/15 bg-white/72 p-6 text-sm leading-7 text-slate-600">
              活動記録はまだありません。狩猟記録または射撃記録を追加してください。
            </div>
          ) : (
            huntingEvents.map((event) => {
              const primaryTool = event.huntingEventTools[0];
              const isShooting = event.activityType === ActivityType.SHOOTING;
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
                    <input type="hidden" name="activityType" value={event.activityType} />
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                      <div className="space-y-1">
                        <p className="text-xs font-semibold tracking-[0.16em] text-slate-500 uppercase">
                          {isShooting
                            ? activityTypeLabels.SHOOTING
                            : toDisplayLabel(event.huntingMethod, huntingMethodLabels)}
                        </p>
                        <h3 className="text-lg font-semibold text-slate-950">
                          {isShooting
                            ? event.shootingType ?? "射撃種別未設定"
                            : event.targetSpecies ?? "対象未設定"}
                        </h3>
                        <p className="text-sm text-slate-600">
                          {isShooting ? (
                            <>
                              {formatDateLabel(event.eventDate)} /{" "}
                              {event.shootingRangeName ?? "射撃場未設定"} /{" "}
                              {event.shotCount ?? 0} 発
                            </>
                          ) : (
                            <>
                              {formatDateLabel(event.eventDate)} /{" "}
                              {getPrefectureName(event.prefectureCode)} /{" "}
                              {event.areaName ?? "場所未設定"}
                            </>
                          )}
                        </p>
                      </div>
                      {isShooting ? (
                        <span className="inline-flex rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-700">
                          {activityTypeLabels.SHOOTING}
                        </span>
                      ) : (
                        <span className="inline-flex rounded-full bg-emerald-100 px-3 py-1 text-xs font-medium text-emerald-900">
                          {transferLabel}
                        </span>
                      )}
                    </div>

                    {isShooting ? (
                      <div className="grid gap-3 sm:grid-cols-2">
                        <DateInput
                          name="eventDate"
                          required
                          defaultValue={formatDateInput(event.eventDate)}
                          className={formFieldCompact}
                        />
                        <input
                          name="shootingType"
                          required
                          defaultValue={event.shootingType ?? ""}
                          placeholder="射撃種別"
                          className={formFieldCompact}
                        />
                        <input
                          name="shootingRangeName"
                          required
                          defaultValue={event.shootingRangeName ?? ""}
                          placeholder="射撃場"
                          className={formFieldCompact}
                        />
                        <input
                          name="toolName"
                          required
                          defaultValue={primaryTool?.toolName ?? ""}
                          placeholder="使用銃"
                          className={formFieldCompact}
                        />
                        <input
                          type="number"
                          min={0}
                          name="shotCount"
                          required
                          defaultValue={event.shotCount ?? 0}
                          className={formFieldCompact}
                        />
                      </div>
                    ) : (
                      <div className="grid gap-3 sm:grid-cols-2">
                        <DateInput
                          name="eventDate"
                          required
                          defaultValue={formatDateInput(event.eventDate)}
                          className={formFieldCompact}
                        />
                        <select
                          name="huntingMethod"
                          defaultValue={event.huntingMethod ?? "GUN"}
                          className={formFieldCompact}
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
                          className={formFieldCompact}
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
                          className={formFieldCompact}
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
                          className={formFieldCompact}
                        />
                      </div>
                    )}

                    <div className="rounded-[22px] bg-slate-50 p-4 text-sm leading-7 text-slate-700">
                      {isShooting ? (
                        <>
                          <p>使用銃: {primaryTool?.toolName ?? "未登録"}</p>
                          <p>使用弾数: {event.shotCount ?? 0} 発</p>
                          <p>射撃場: {event.shootingRangeName ?? "未設定"}</p>
                        </>
                      ) : (
                        <>
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
                        </>
                      )}
                    </div>

                    {!isShooting ? (
                      <div className="grid gap-3 rounded-[22px] bg-emerald-50/70 p-4 sm:grid-cols-2">
                        <select
                          name="toolType"
                          defaultValue={primaryTool?.toolType ?? "FIREARM"}
                          className={formFieldCompact}
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
                          className={formFieldCompact}
                        />
                        <input
                          type="number"
                          min={0}
                          name="toolQuantity"
                          defaultValue={primaryTool?.quantity ?? 1}
                          className={formFieldCompact}
                        />
                        <input
                          name="toolNotes"
                          defaultValue={primaryTool?.notes ?? ""}
                          placeholder="道具メモ"
                          className={formFieldCompact}
                        />
                      </div>
                    ) : null}

                    <textarea
                      name="notes"
                      rows={2}
                      defaultValue={event.notes ?? ""}
                      placeholder="備考"
                      className={formTextareaCompact}
                    />

                    <SubmitButton pendingChildren="更新中...">
                      内容を更新
                    </SubmitButton>
                  </form>

                  <div className="mt-3 flex flex-col gap-2 sm:flex-row">
                    {!isShooting && event.isReportTransferTarget ? (
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
                    ) : null}

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
