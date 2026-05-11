"use client";

import { useState } from "react";
import {
  ActivityType,
  HuntingMethod,
  HuntingPurpose,
  HuntingToolType,
} from "@prisma/client";
import { upsertHuntingEventAction } from "@/app/actions";
import { DateInput } from "@/components/date-input";
import { ReportLocationFields } from "@/components/reports/report-location-fields";
import { SubmitButton } from "@/components/submit-button";
import {
  activityTypeLabels,
  huntingMethodLabels,
  huntingPurposeLabels,
  huntingToolTypeLabels,
} from "@/lib/labels";
import {
  formFieldBase,
  formFieldCompact,
  formFieldLabel,
  formLabelText,
  formTextareaBase,
} from "@/lib/form-classes";

const activityTypeOptions = [ActivityType.HUNTING, ActivityType.SHOOTING];
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
const huntingToolTypeOptions = [
  HuntingToolType.FIREARM,
  HuntingToolType.TRAP,
  HuntingToolType.DOG,
  HuntingToolType.VEHICLE,
  HuntingToolType.OTHER,
];
const shootingTypeOptions = [
  "標的射撃",
  "射撃練習",
  "試射",
  "技能講習練習",
  "その他",
];

type ActivityRecordFormProps = {
  municipalitySuggestionsByPrefecture: Record<string, string[]>;
};

export function ActivityRecordForm({
  municipalitySuggestionsByPrefecture,
}: ActivityRecordFormProps) {
  const [activityType, setActivityType] = useState<ActivityType>(
    ActivityType.HUNTING,
  );
  const isHunting = activityType === ActivityType.HUNTING;

  return (
    <form
      action={upsertHuntingEventAction}
      className="rounded-[30px] border border-emerald-950/10 bg-white/92 p-5 shadow-[0_24px_50px_-36px_rgba(15,23,42,0.38)]"
    >
      <div className="mb-4">
        <p className="text-[11px] font-semibold tracking-[0.22em] text-slate-500 uppercase">
          新規登録
        </p>
        <h3 className="mt-1 text-lg font-semibold">活動記録を追加</h3>
      </div>

      <div className="mb-4 grid gap-2 sm:grid-cols-2">
        {activityTypeOptions.map((option) => (
          <label
            key={option}
            className={`flex cursor-pointer items-center justify-between rounded-[22px] border px-4 py-3 text-sm font-semibold transition-colors ${
              activityType === option
                ? "border-emerald-900 bg-emerald-950 !text-white"
                : "border-slate-200 bg-slate-50 text-slate-700"
            }`}
          >
            <span>{activityTypeLabels[option]}</span>
            <input
              type="radio"
              name="activityType"
              value={option}
              checked={activityType === option}
              onChange={() => setActivityType(option)}
              className="h-4 w-4"
            />
          </label>
        ))}
      </div>

      {isHunting ? (
        <>
          <div className="report-form-grid grid grid-cols-1 gap-3 lg:grid-cols-4">
            <label className={formFieldLabel}>
              <span className={formLabelText}>実施日</span>
              <DateInput
                name="eventDate"
                required
                className={formFieldBase}
              />
            </label>

            <label className={formFieldLabel}>
              <span className={formLabelText}>猟法</span>
              <select
                name="huntingMethod"
                defaultValue="GUN"
                className={formFieldBase}
              >
                {huntingMethodOptions.map((option) => (
                  <option key={option} value={option}>
                    {huntingMethodLabels[option]}
                  </option>
                ))}
              </select>
            </label>

            <label className={formFieldLabel}>
              <span className={formLabelText}>目的</span>
              <select
                name="purposeCode"
                defaultValue="HUNTING"
                className={formFieldBase}
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
                defaultValue={0}
                className={formFieldBase}
              />
            </label>

            <ReportLocationFields
              municipalitySuggestionsByPrefecture={
                municipalitySuggestionsByPrefecture
              }
            />

            <label className={formFieldLabel}>
              <span className={formLabelText}>対象鳥獣</span>
              <input
                name="targetSpecies"
                required
                placeholder="例: シカ"
                className={formFieldBase}
              />
            </label>

            <label className={formFieldLabel + " lg:col-span-4"}>
              <span className={formLabelText}>備考</span>
              <textarea
                name="notes"
                rows={3}
                placeholder="報告書に残したい補足"
                className={formTextareaBase}
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
                placeholder="例: 12番散弾銃"
                className={formFieldCompact}
              />
              <input
                type="number"
                min={0}
                name="toolQuantity"
                defaultValue={1}
                className={formFieldCompact}
              />
              <input
                name="toolNotes"
                placeholder="道具メモ"
                className={formFieldCompact}
              />
            </div>
          </div>
        </>
      ) : (
        <div className="report-form-grid grid grid-cols-1 gap-3 lg:grid-cols-4">
          <label className={formFieldLabel}>
            <span className={formLabelText}>実施日</span>
            <DateInput name="eventDate" required className={formFieldBase} />
          </label>

          <label className={formFieldLabel}>
            <span className={formLabelText}>射撃種別</span>
            <input
              name="shootingType"
              required
              list="shooting-type-options"
              placeholder="例: 標的射撃"
              className={formFieldBase}
            />
            <datalist id="shooting-type-options">
              {shootingTypeOptions.map((option) => (
                <option key={option} value={option} />
              ))}
            </datalist>
          </label>

          <label className={formFieldLabel + " lg:col-span-2"}>
            <span className={formLabelText}>射撃場</span>
            <input
              name="shootingRangeName"
              required
              placeholder="例: 北海道射撃場"
              className={formFieldBase}
            />
          </label>

          <label className={formFieldLabel + " lg:col-span-2"}>
            <span className={formLabelText}>使用銃</span>
            <input
              name="toolName"
              required
              placeholder="例: レミントン M870"
              className={formFieldBase}
            />
          </label>

          <label className={formFieldLabel}>
            <span className={formLabelText}>使用弾数</span>
            <input
              type="number"
              min={0}
              name="shotCount"
              required
              defaultValue={0}
              className={formFieldBase}
            />
          </label>

          <label className={formFieldLabel + " lg:col-span-4"}>
            <span className={formLabelText}>メモ</span>
            <textarea
              name="notes"
              rows={3}
              placeholder="射撃内容や確認事項"
              className={formTextareaBase}
            />
          </label>
        </div>
      )}

      <SubmitButton
        className="mt-5 min-h-12 w-full px-5"
        pendingChildren="保存中..."
      >
        記録を保存
      </SubmitButton>
    </form>
  );
}
