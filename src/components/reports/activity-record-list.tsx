"use client";

import { useState } from "react";
import {
  ActivityType,
  HuntingMethod,
  HuntingPurpose,
} from "@prisma/client";
import {
  deleteHuntingEventAction,
  toggleImportedToReportAction,
  upsertHuntingEventAction,
} from "@/app/actions";
import { DateInput } from "@/components/date-input";
import { ReportLocationFields } from "@/components/reports/report-location-fields";
import { SubmitButton } from "@/components/submit-button";
import type { FirearmToolOption, getReportPageData } from "@/lib/app-data";
import { formatDateInput, formatDateLabel, formatJapaneseEraDate } from "@/lib/format";
import {
  activityTypeLabels,
  huntingMethodLabels,
  huntingPurposeLabels,
  reportTransferStatusLabels,
  toDisplayLabel,
} from "@/lib/labels";
import {
  formFieldCompact,
  formFieldLabel,
  formGrid2,
  formGrid3,
  formGrid4,
  formInfoGrid4,
  formLabelText,
  formTextareaCompact,
} from "@/lib/form-classes";
import { getPrefectureName } from "@/lib/prefectures";

const huntingMethodOptions = [
  HuntingMethod.GUN,
  HuntingMethod.TRAP,
  HuntingMethod.NET,
  HuntingMethod.OTHER,
];

const huntingPurposeOptions = [
  HuntingPurpose.HUNTING,
  HuntingPurpose.PEST_CONTROL,
  HuntingPurpose.TRAINING,
  HuntingPurpose.OTHER,
];

type ReportPageData = Awaited<ReturnType<typeof getReportPageData>>;
type ActivityEvent = ReportPageData["huntingEvents"][number];

type ActivityRecordListProps = {
  huntingEvents: ReportPageData["huntingEvents"];
  municipalitySuggestionsByPrefecture: Record<string, string[]>;
  firearmToolOptions: FirearmToolOption[];
};

function getToolSelectionValue(tool?: {
  firearmRecordId: string | null;
  firearmBarrelRecordId: string | null;
} | null) {
  if (!tool?.firearmRecordId) {
    return "";
  }

  if (tool.firearmBarrelRecordId) {
    return `barrel:${tool.firearmRecordId}:${tool.firearmBarrelRecordId}`;
  }

  return `firearm:${tool.firearmRecordId}`;
}

function formatDateWithEra(value: Date | string | null | undefined) {
  const dateLabel = formatDateLabel(value);
  const eraLabel = formatJapaneseEraDate(value).replace(/（.*）$/, "");
  return eraLabel === "未設定" ? dateLabel : `${dateLabel}（${eraLabel}）`;
}

function getUsageCounts(event: ActivityEvent) {
  return {
    shotShell: event.shotShellUsedCount ?? 0,
    slug: event.slugUsedCount ?? 0,
    airgunPellet: event.airgunPelletUsedCount ?? 0,
  };
}

function getUsageTotal(event: ActivityEvent) {
  const usage = getUsageCounts(event);
  return usage.shotShell + usage.slug + usage.airgunPellet;
}

function getUsedAmmoEntries(event: ActivityEvent) {
  const usage = getUsageCounts(event);

  return [
    usage.shotShell > 0 ? { label: "散弾", count: usage.shotShell } : null,
    usage.slug > 0 ? { label: "単弾", count: usage.slug } : null,
    usage.airgunPellet > 0
      ? { label: "空気銃弾", count: usage.airgunPellet }
      : null,
  ].filter((entry): entry is { label: string; count: number } =>
    Boolean(entry),
  );
}

function getUsageCategoryLabel(event: ActivityEvent) {
  const entries = getUsedAmmoEntries(event);
  return entries.length > 0
    ? entries.map((entry) => entry.label).join("・")
    : "未登録";
}

function getUsageCountLabel(event: ActivityEvent) {
  const entries = getUsedAmmoEntries(event);
  if (entries.length === 0) {
    return `${getUsageTotal(event)}発`;
  }

  return entries
    .map((entry) => `${entry.label} ${entry.count}発`)
    .join(" / ");
}

function getPlaceLabel(event: ActivityEvent) {
  if (event.activityType === ActivityType.SHOOTING) {
    return event.shootingRangeName ?? "射撃場未設定";
  }

  return `${getPrefectureName(event.prefectureCode)} ${event.areaName ?? "場所未設定"}`;
}

function getTargetLabel(event: ActivityEvent) {
  if (event.activityType === ActivityType.SHOOTING) {
    return event.shootingType ?? "射撃種別未設定";
  }

  return event.targetSpecies ?? "未設定";
}

function ActivityRecordView({ event }: { event: ActivityEvent }) {
  const isShooting = event.activityType === ActivityType.SHOOTING;
  const transferLabel = event.importedToReportAt
    ? reportTransferStatusLabels.imported
    : reportTransferStatusLabels.pending;

  return (
    <div className="grid gap-3">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0 space-y-1">
          <p className="text-xs font-semibold tracking-[0.16em] text-slate-500 uppercase">
            {isShooting
              ? activityTypeLabels.SHOOTING
              : toDisplayLabel(event.huntingMethod, huntingMethodLabels)}
          </p>
          <p className="break-words text-base font-bold text-slate-950">
            {formatDateWithEra(event.eventDate)}
          </p>
        </div>
        {isShooting ? (
          <span className="inline-flex w-fit rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-700">
            {activityTypeLabels.SHOOTING}
          </span>
        ) : (
          <span className="inline-flex w-fit rounded-full bg-emerald-100 px-3 py-1 text-xs font-medium text-emerald-900">
            {transferLabel}
          </span>
        )}
      </div>

      <dl className={`${formInfoGrid4} gap-2 leading-6 text-slate-700`}>
        <div className="min-w-0 rounded-[16px] bg-slate-50 px-3 py-2">
          <dt className="font-semibold text-slate-500">場所</dt>
          <dd className="break-words font-semibold text-slate-950">
            {getPlaceLabel(event)}
          </dd>
        </div>
        <div className="min-w-0 rounded-[16px] bg-slate-50 px-3 py-2">
          <dt className="font-semibold text-slate-500">
            {isShooting ? "射撃種別" : "獲物"}
          </dt>
          <dd className="break-words font-semibold text-slate-950">
            {getTargetLabel(event)}
          </dd>
        </div>
        <div className="min-w-0 rounded-[16px] bg-slate-50 px-3 py-2">
          <dt className="font-semibold text-slate-500">使用弾分類</dt>
          <dd className="break-words font-semibold text-slate-950">
            {getUsageCategoryLabel(event)}
          </dd>
        </div>
        <div className="min-w-0 rounded-[16px] bg-slate-50 px-3 py-2">
          <dt className="font-semibold text-slate-500">使用弾数</dt>
          <dd className="break-words font-semibold text-slate-950">
            {getUsageCountLabel(event)}
          </dd>
        </div>
      </dl>
    </div>
  );
}

function FirearmToolEditField({
  firearmToolOptions,
  initialValue,
}: {
  firearmToolOptions: FirearmToolOption[];
  initialValue: string;
}) {
  const [selectedValue, setSelectedValue] = useState(initialValue);
  const selectedTool = firearmToolOptions.find(
    (option) => option.value === selectedValue,
  );

  return (
    <div className={`${formGrid2} rounded-[22px] bg-emerald-50/70 p-4`}>
      <label className="grid gap-1 text-sm lg:col-span-2">
        <span className="font-medium text-slate-700">使用道具</span>
        <select
          name="firearmToolSelection"
          required
          value={selectedValue}
          onChange={(event) => setSelectedValue(event.target.value)}
          className={formFieldCompact}
        >
          <option value="">登録済み銃・銃身を選択</option>
          {firearmToolOptions.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </label>
      {selectedTool ? (
        <div className={`${formGrid3} rounded-[18px] bg-white/80 p-3 text-sm leading-7 text-slate-700 lg:col-span-2`}>
          <p>
            <span className="font-semibold text-slate-500">口径：</span>
            <span className="font-semibold text-slate-950">
              {selectedTool.caliberLabel}
            </span>
          </p>
          <p>
            <span className="font-semibold text-slate-500">使用弾分類：</span>
            <span className="font-semibold text-slate-950">
              {selectedTool.ammoUsageLabel}
            </span>
          </p>
          <p className="md:col-span-2 lg:col-span-3">
            推奨：{selectedTool.ammoUsageLabel}使用数に入力してください。
          </p>
        </div>
      ) : null}
      <input type="hidden" name="toolType" value="FIREARM" />
      <input
        type="hidden"
        name="firearmRecordId"
        value={selectedTool?.firearmRecordId ?? ""}
      />
      <input
        type="hidden"
        name="firearmBarrelRecordId"
        value={selectedTool?.firearmBarrelRecordId ?? ""}
      />
      <input type="hidden" name="toolName" value={selectedTool?.label ?? ""} />
      <input
        type="hidden"
        name="toolNotes"
        value={selectedTool ? `使用弾分類: ${selectedTool.ammoUsageLabel}` : ""}
      />
    </div>
  );
}

function ActivityRecordEditForm({
  event,
  municipalitySuggestionsByPrefecture,
  firearmToolOptions,
  onCancel,
}: {
  event: ActivityEvent;
  municipalitySuggestionsByPrefecture: Record<string, string[]>;
  firearmToolOptions: FirearmToolOption[];
  onCancel: () => void;
}) {
  const primaryTool = event.huntingEventTools[0];
  const selectedToolValue = getToolSelectionValue(primaryTool);
  const isShooting = event.activityType === ActivityType.SHOOTING;
  const [huntingMethod, setHuntingMethod] = useState(event.huntingMethod ?? HuntingMethod.GUN);

  return (
    <form action={upsertHuntingEventAction} className="grid gap-3">
      <input type="hidden" name="id" value={event.id} />
      <input type="hidden" name="activityType" value={event.activityType} />

      {isShooting ? (
        <div className={formGrid3}>
          <label className={formFieldLabel}>
            <span className={formLabelText}>実施日</span>
            <DateInput
              name="eventDate"
              required
              defaultValue={formatDateInput(event.eventDate)}
              className={formFieldCompact}
            />
          </label>
          <label className={formFieldLabel}>
            <span className={formLabelText}>射撃種別</span>
            <input
              name="shootingType"
              required
              defaultValue={event.shootingType ?? ""}
              placeholder="射撃種別"
              className={formFieldCompact}
            />
          </label>
          <label className={formFieldLabel}>
            <span className={formLabelText}>射撃場</span>
            <input
              name="shootingRangeName"
              required
              defaultValue={event.shootingRangeName ?? ""}
              placeholder="射撃場"
              className={formFieldCompact}
            />
          </label>
          <label className={formFieldLabel}>
            <span className={formLabelText}>散弾使用数</span>
            <input
              type="number"
              min={0}
              name="shotShellUsedCount"
              defaultValue={event.shotShellUsedCount ?? 0}
              className={formFieldCompact}
            />
          </label>
          <label className={formFieldLabel}>
            <span className={formLabelText}>単弾使用数</span>
            <input
              type="number"
              min={0}
              name="slugUsedCount"
              defaultValue={event.slugUsedCount ?? 0}
              className={formFieldCompact}
            />
          </label>
          <label className={formFieldLabel}>
            <span className={formLabelText}>空気銃弾使用数</span>
            <input
              type="number"
              min={0}
              name="airgunPelletUsedCount"
              defaultValue={event.airgunPelletUsedCount ?? 0}
              className={formFieldCompact}
            />
          </label>
          <div className="md:col-span-2 lg:col-span-3">
            <FirearmToolEditField
              firearmToolOptions={firearmToolOptions}
              initialValue={selectedToolValue}
            />
          </div>
        </div>
      ) : (
        <>
          <div className={formGrid4}>
            <label className={formFieldLabel}>
              <span className={formLabelText}>実施日</span>
              <DateInput
                name="eventDate"
                required
                defaultValue={formatDateInput(event.eventDate)}
                className={formFieldCompact}
              />
            </label>
            <label className={formFieldLabel}>
              <span className={formLabelText}>猟法</span>
              <select
                name="huntingMethod"
                value={huntingMethod}
                onChange={(event) => setHuntingMethod(event.target.value as HuntingMethod)}
                className={formFieldCompact}
              >
                {huntingMethodOptions.map((option) => (
                  <option key={option} value={option}>
                    {huntingMethodLabels[option]}
                  </option>
                ))}
              </select>
            </label>
            <label className={formFieldLabel}>
              <span className={formLabelText}>対象鳥獣</span>
              <input
                name="targetSpecies"
                required
                defaultValue={event.targetSpecies ?? ""}
                placeholder="対象鳥獣"
                className={formFieldCompact}
              />
            </label>
            <ReportLocationFields
              defaultPrefectureCode={event.prefectureCode}
              defaultMunicipalityName={event.areaName}
              municipalitySuggestionsByPrefecture={
                municipalitySuggestionsByPrefecture
              }
            />
            <label className={formFieldLabel}>
              <span className={formLabelText}>目的</span>
              <select
                name="purposeCode"
                defaultValue={event.purposeCode ?? HuntingPurpose.HUNTING}
                className={formFieldCompact}
              >
                {huntingPurposeOptions.map((option) => (
                  <option key={option} value={option}>
                    {huntingPurposeLabels[option]}
                  </option>
                ))}
              </select>
            </label>
            <label className={formFieldLabel}>
              <span className={formLabelText}>成果数</span>
              <input
                type="number"
                min={0}
                name="resultCount"
                defaultValue={event.resultCount ?? 0}
                className={formFieldCompact}
              />
            </label>
            <label className={formFieldLabel}>
              <span className={formLabelText}>散弾使用数</span>
              <input
                type="number"
                min={0}
                name="shotShellUsedCount"
                defaultValue={event.shotShellUsedCount ?? 0}
                className={formFieldCompact}
              />
            </label>
            <label className={formFieldLabel}>
              <span className={formLabelText}>単弾使用数</span>
              <input
                type="number"
                min={0}
                name="slugUsedCount"
                defaultValue={event.slugUsedCount ?? 0}
                className={formFieldCompact}
              />
            </label>
            <label className={formFieldLabel}>
              <span className={formLabelText}>空気銃弾使用数</span>
              <input
                type="number"
                min={0}
                name="airgunPelletUsedCount"
                defaultValue={event.airgunPelletUsedCount ?? 0}
                className={formFieldCompact}
              />
            </label>
          </div>
          {huntingMethod === HuntingMethod.GUN ? <FirearmToolEditField
            firearmToolOptions={firearmToolOptions}
            initialValue={selectedToolValue}
          /> : null}
        </>
      )}

      <label className={formFieldLabel}>
        <span className={formLabelText}>備考</span>
        <textarea
          name="notes"
          rows={2}
          defaultValue={event.notes ?? ""}
          placeholder="備考"
          className={formTextareaCompact}
        />
      </label>

      <div className="flex flex-col gap-2 sm:flex-row">
        <SubmitButton pendingChildren="更新中...">内容を更新</SubmitButton>
        <button
          type="button"
          onClick={onCancel}
          className="min-h-12 rounded-[18px] border border-slate-200 bg-white px-5 text-sm font-semibold text-slate-700"
        >
          キャンセル
        </button>
      </div>
    </form>
  );
}

export function ActivityRecordList({
  huntingEvents,
  municipalitySuggestionsByPrefecture,
  firearmToolOptions,
}: ActivityRecordListProps) {
  const [editingId, setEditingId] = useState<string | null>(null);

  if (huntingEvents.length === 0) {
    return (
      <div className="rounded-[30px] border border-dashed border-emerald-950/15 bg-white/72 p-6 text-sm leading-7 text-slate-600">
        活動記録はまだありません。狩猟記録または射撃記録を追加してください。
      </div>
    );
  }

  return (
    <section className="grid gap-4">
      {huntingEvents.map((event) => {
        const isShooting = event.activityType === ActivityType.SHOOTING;
        const isEditing = editingId === event.id;

        return (
          <article
            key={event.id}
            id={`activity-record-${event.id}`}
            className="rounded-[24px] border border-emerald-950/10 bg-white/92 p-4 shadow-[0_20px_42px_-34px_rgba(15,23,42,0.34)]"
          >
            {isEditing ? (
              <ActivityRecordEditForm
                event={event}
                municipalitySuggestionsByPrefecture={
                  municipalitySuggestionsByPrefecture
                }
                firearmToolOptions={firearmToolOptions}
                onCancel={() => setEditingId(null)}
              />
            ) : (
              <>
                <ActivityRecordView event={event} />

                <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:flex-wrap">
                  <button
                    type="button"
                    onClick={() => setEditingId(event.id)}
                    className="min-h-12 rounded-[18px] border border-slate-200 bg-white px-5 text-sm font-semibold text-slate-700"
                  >
                    編集
                  </button>

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
                          ? "報告書未記入に戻す"
                          : "報告書に記入済みにする"}
                      </SubmitButton>
                    </form>
                  ) : null}

                  <form action={deleteHuntingEventAction}>
                    <input type="hidden" name="id" value={event.id} />
                    <SubmitButton variant="danger" pendingChildren="削除中...">
                      この記録を削除
                    </SubmitButton>
                  </form>
                </div>
              </>
            )}
          </article>
        );
      })}
    </section>
  );
}
