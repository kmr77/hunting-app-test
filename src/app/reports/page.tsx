import { ActivityType } from "@prisma/client";
import { ActivityRecordForm } from "@/components/reports/activity-record-form";
import { ActivityRecordList } from "@/components/reports/activity-record-list";
import { FeedbackBanner } from "@/components/feedback-banner";
import {
  getDataLoadErrorMessage,
  getReportPageData,
  getReportPageDataFallback,
} from "@/lib/app-data";
import type { FirearmToolOption } from "@/lib/app-data";
import {
  getFeedbackFromSearchParams,
  type SearchParamsInput,
} from "@/lib/feedback";
import { reportTransferStatusLabels } from "@/lib/labels";

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
  let firearmToolOptions: FirearmToolOption[] =
    getReportPageDataFallback().firearmToolOptions;
  let ammoBalance = getReportPageDataFallback().ammoBalance;

  try {
    ({ huntingEvents, municipalitySuggestionsByPrefecture, firearmToolOptions, ammoBalance } =
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
                {reportTransferStatusLabels.pending}
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
          firearmToolOptions={firearmToolOptions}
          ammoBalance={ammoBalance}
        />

        <ActivityRecordList
          huntingEvents={huntingEvents}
          municipalitySuggestionsByPrefecture={
            municipalitySuggestionsByPrefecture
          }
          firearmToolOptions={firearmToolOptions}
        />
      </section>
    </main>
  );
}
