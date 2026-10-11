"use client";

import { useState } from "react";
import {
  ActivityType,
  HuntingMethod,
  HuntingPurpose,
} from "@prisma/client";
import { upsertHuntingEventAction } from "@/app/actions";
import type { FirearmToolOption } from "@/lib/app-data";
import { DateInput } from "@/components/date-input";
import { ReportLocationFields } from "@/components/reports/report-location-fields";
import { SubmitButton } from "@/components/submit-button";
import {
  activityTypeLabels,
  huntingMethodLabels,
  huntingPurposeLabels,
} from "@/lib/labels";
import {
  formFieldBase,
  formFieldLabel,
  formGrid3,
  formGrid4,
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
const shootingTypeOptions = [
  "標的射撃",
  "射撃練習",
  "試射",
  "技能講習練習",
  "その他",
];

type ActivityRecordFormProps = {
  municipalitySuggestionsByPrefecture: Record<string, string[]>;
  ammoBalance: AmmoBalance;
  firearmToolOptions: FirearmToolOption[];
};

type AmmoBalance = {
  shotShell: number;
  slug: number;
  airgunPellet: number;
};

type AmmoUsageInput = {
  shotShellUsedCount: number;
  slugUsedCount: number;
  airgunPelletUsedCount: number;
};

function toSafeCount(value: string) {
  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 0;
}

function formatBalance(balance: AmmoBalance) {
  return `散弾 ${balance.shotShell}発　単弾 ${balance.slug}発　空気銃弾 ${balance.airgunPellet}発`;
}

function AmmoBalancePanel({
  balance,
  usage,
}: {
  balance: AmmoBalance;
  usage: AmmoUsageInput;
}) {
  const projected = {
    shotShell: balance.shotShell - usage.shotShellUsedCount,
    slug: balance.slug - usage.slugUsedCount,
    airgunPellet: balance.airgunPellet - usage.airgunPelletUsedCount,
  };
  const warnings = [
    projected.shotShell < 0
      ? "散弾の使用数が記録上の残弾数を超えています。入力内容を確認してください。"
      : null,
    projected.slug < 0
      ? "単弾の使用数が記録上の残弾数を超えています。入力内容を確認してください。"
      : null,
    projected.airgunPellet < 0
      ? "空気銃弾の使用数が記録上の残弾数を超えています。入力内容を確認してください。"
      : null,
  ].filter(Boolean);

  return (
    <div className="mb-5 rounded-[24px] border border-emerald-950/10 bg-white/82 p-4 text-sm leading-7 text-slate-700">
      <p className="font-semibold text-slate-950">
        残弾数：{formatBalance(balance)}
      </p>
      <p className="mt-1 text-slate-600">
        保存後見込み：{formatBalance(projected)}
      </p>
      {warnings.length > 0 ? (
        <div className="mt-3 rounded-[18px] border border-amber-200 bg-amber-50 p-3 text-amber-900">
          {warnings.map((warning) => (
            <p key={warning}>{warning}</p>
          ))}
        </div>
      ) : null}
    </div>
  );
}

function AmmoUsageFields({
  usage,
  onUsageChange,
}: {
  usage: AmmoUsageInput;
  onUsageChange: (key: keyof AmmoUsageInput, value: string) => void;
}) {
  return (
    <>
      <label className={formFieldLabel}>
        <span className={formLabelText}>散弾使用数</span>
        <input
          type="number"
          min={0}
          name="shotShellUsedCount"
          value={usage.shotShellUsedCount}
          onChange={(event) =>
            onUsageChange("shotShellUsedCount", event.target.value)
          }
          className={formFieldBase}
        />
      </label>
      <label className={formFieldLabel}>
        <span className={formLabelText}>単弾使用数</span>
        <input
          type="number"
          min={0}
          name="slugUsedCount"
          value={usage.slugUsedCount}
          onChange={(event) => onUsageChange("slugUsedCount", event.target.value)}
          className={formFieldBase}
        />
      </label>
      <label className={formFieldLabel}>
        <span className={formLabelText}>空気銃弾使用数</span>
        <input
          type="number"
          min={0}
          name="airgunPelletUsedCount"
          value={usage.airgunPelletUsedCount}
          onChange={(event) =>
            onUsageChange("airgunPelletUsedCount", event.target.value)
          }
          className={formFieldBase}
        />
      </label>
    </>
  );
}

function FirearmToolSelector({
  options,
  selectedValue,
  onSelect,
}: {
  options: FirearmToolOption[];
  selectedValue: string;
  onSelect: (value: string) => void;
}) {
  const selectedTool = options.find((option) => option.value === selectedValue);

  if (options.length === 0) {
    return (
      <div className="rounded-[22px] border border-amber-200 bg-amber-50 p-4 text-sm leading-7 text-amber-900">
        使用できる登録済み銃・銃身がありません。先に更新管理で銃本体と銃身情報を登録してください。
      </div>
    );
  }

  return (
    <div className="grid gap-3 rounded-[22px] border border-emerald-950/10 bg-white/82 p-4">
      <label className={formFieldLabel}>
        <span className={formLabelText}>使用道具</span>
        <select
          name="firearmToolSelection"
          required
          value={selectedValue}
          onChange={(event) => onSelect(event.target.value)}
          className={formFieldBase}
        >
          {options.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </label>

      {selectedTool ? (
        <div className={`${formGrid3} rounded-[18px] bg-slate-50 p-3 text-sm leading-7 text-slate-700`}>
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
            {selectedTool.detailLabel ? ` ${selectedTool.detailLabel}` : ""}
          </p>
        </div>
      ) : null}

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
      <input type="hidden" name="toolType" value="FIREARM" />
      <input type="hidden" name="toolName" value={selectedTool?.label ?? ""} />
      <input
        type="hidden"
        name="toolNotes"
        value={selectedTool ? `使用弾分類: ${selectedTool.ammoUsageLabel}` : ""}
      />
    </div>
  );
}

export function ActivityRecordForm({
  municipalitySuggestionsByPrefecture,
  ammoBalance,
  firearmToolOptions,
}: ActivityRecordFormProps) {
  const [activityType, setActivityType] = useState<ActivityType>(
    ActivityType.HUNTING,
  );
  const [usage, setUsage] = useState<AmmoUsageInput>({
    shotShellUsedCount: 0,
    slugUsedCount: 0,
    airgunPelletUsedCount: 0,
  });
  const [selectedToolValue, setSelectedToolValue] = useState(
    firearmToolOptions[0]?.value ?? "",
  );
  const handleUsageChange = (key: keyof AmmoUsageInput, value: string) => {
    setUsage((current) => ({
      ...current,
      [key]: toSafeCount(value),
    }));
  };
  const isHunting = activityType === ActivityType.HUNTING;
  const [huntingMethod, setHuntingMethod] = useState("GUN");
  const formToneClass = isHunting
    ? "border-emerald-900/15 bg-emerald-50/80"
    : "border-sky-900/15 bg-sky-50/85";
  const innerToneClass = isHunting
    ? "border-emerald-950/10 bg-white/88"
    : "border-sky-950/10 bg-white/88";

  return (
    <form
      action={upsertHuntingEventAction}
      className={`rounded-[30px] border p-5 shadow-[0_24px_50px_-36px_rgba(15,23,42,0.38)] transition-colors ${formToneClass}`}
    >
      <div className="mb-4">
        <p className="text-[11px] font-semibold tracking-[0.22em] text-slate-500 uppercase">
          新規登録
        </p>
        <h3 className="mt-1 text-lg font-semibold">活動記録を追加</h3>
      </div>

      <div
        role="tablist"
        aria-label="活動記録の種別"
        className="mb-5 grid rounded-[24px] border border-white/80 bg-white/70 p-1.5 shadow-inner sm:grid-cols-2"
      >
        {activityTypeOptions.map((option) => (
          <button
            key={option}
            type="button"
            role="tab"
            aria-selected={activityType === option}
            onClick={() => setActivityType(option)}
            className={`min-h-12 rounded-[20px] px-4 py-3 text-center text-sm font-semibold transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 ${
              activityType === option
                ? option === ActivityType.HUNTING
                  ? "bg-emerald-950 !text-white shadow-[0_14px_28px_-22px_rgba(6,78,59,0.9)] focus-visible:outline-emerald-950"
                  : "bg-sky-900 !text-white shadow-[0_14px_28px_-22px_rgba(12,74,110,0.9)] focus-visible:outline-sky-900"
                : "text-slate-600 hover:bg-white hover:text-slate-950"
            }`}
          >
          {activityTypeLabels[option]}
          </button>
        ))}
      </div>
      <AmmoBalancePanel balance={ammoBalance} usage={usage} />
      <input type="hidden" name="activityType" value={activityType} />

      {isHunting ? (
        <>
          <div
            className={`report-form-grid ${formGrid4} rounded-[26px] border p-4 ${innerToneClass}`}
          >
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
                value={huntingMethod}
                onChange={(event) => setHuntingMethod(event.target.value)}
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

            <AmmoUsageFields
              usage={usage}
              onUsageChange={handleUsageChange}
            />
          </div>

          {huntingMethod === "GUN" ? <div className="mt-5 rounded-[24px] border border-emerald-950/10 bg-white/78 p-4">
            <div className="mb-3">
              <p className="text-sm font-semibold text-slate-900">
                使用道具 1件
              </p>
              <p className="text-xs leading-6 text-slate-600">
                更新管理に登録した銃本体・銃身情報から選択します。口径は選択内容から自動表示します。
              </p>
            </div>
            <FirearmToolSelector
              options={firearmToolOptions}
              selectedValue={selectedToolValue}
              onSelect={setSelectedToolValue}
            />
          </div> : null}
        </>
      ) : (
        <div
          className={`report-form-grid ${formGrid4} rounded-[26px] border p-4 ${innerToneClass}`}
        >
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

          <div className="lg:col-span-4">
            <FirearmToolSelector
              options={firearmToolOptions}
              selectedValue={selectedToolValue}
              onSelect={setSelectedToolValue}
            />
          </div>

          <label className={formFieldLabel}>
            <span className={formLabelText}>使用弾数合計</span>
            <input
              type="number"
              min={0}
              value={
                usage.shotShellUsedCount +
                usage.slugUsedCount +
                usage.airgunPelletUsedCount
              }
              readOnly
              className={formFieldBase}
            />
          </label>

          <AmmoUsageFields
            usage={usage}
            onUsageChange={handleUsageChange}
          />

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
