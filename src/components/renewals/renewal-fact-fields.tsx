"use client";

import { DateInput } from "@/components/date-input";
import { FieldError } from "@/components/field-error";
import { formFieldBase, formFieldLabel, formLabelText, formHelperText } from "@/lib/form-classes";
import {
  calculateGunLicenseExpiresOn,
  calculateHuntingLicenseExpiresOn,
  formatJapaneseEraDate,
} from "@/lib/format";
import { useMemo, useState } from "react";
import type { ReactNode } from "react";
import type { RenewalRuleConfig } from "@/lib/validation-rules";

type RenewalCategoryValue = "HUNTING_LICENSE" | "GUN_LICENSE";

type RenewalFactFieldsProps = {
  defaultCategory?: string;
  defaultIssuedOn?: string;
  userBirthDate?: string;
  errors?: Record<string, string>;
  renewalRuleConfigs: Record<RenewalCategoryValue, RenewalRuleConfig>;
  gunPermitFields?:
    | ReactNode
    | ((props: {
        originalPermittedOn: string;
        onOriginalPermittedOnChange: (value: string) => void;
      }) => ReactNode);
  gunFields?: ReactNode;
};

const categoryOptions: Array<{ value: RenewalCategoryValue; label: string }> = [
  { value: "HUNTING_LICENSE", label: "狩猟免許（狩猟免状）" },
  { value: "GUN_LICENSE", label: "銃砲所持許可" },
];

function dateToInputValue(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function parseDateInput(value: string) {
  if (!value) {
    return null;
  }

  const compactMatch = value.match(/^(\d{4})(\d{2})(\d{2})$/);
  const normalizedValue = compactMatch
    ? `${compactMatch[1]}-${compactMatch[2]}-${compactMatch[3]}`
    : value;
  const date = new Date(`${normalizedValue}T00:00:00`);
  return Number.isNaN(date.getTime()) ? null : date;
}

function subtractDays(value: string, days: number) {
  const date = parseDateInput(value);
  if (!date) {
    return "";
  }

  date.setDate(date.getDate() - days);
  return dateToInputValue(date);
}

function diffDaysFromToday(value: string) {
  const date = parseDateInput(value);
  if (!date) {
    return null;
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return Math.ceil((date.getTime() - today.getTime()) / 86_400_000);
}

function getGeneratedTitle(category: RenewalCategoryValue) {
  return `${categoryOptions.find((option) => option.value === category)?.label ?? "更新対象"} 更新管理`;
}

function normalizeCategory(value: string): RenewalCategoryValue {
  return value === "GUN_LICENSE" ? "GUN_LICENSE" : "HUNTING_LICENSE";
}

function getNextAction(daysUntil: number | null, reminderLeadDays: number) {
  if (daysUntil === null) {
    return "基準日を入力すると、次にやることを表示します。";
  }

  if (daysUntil < 0) {
    return "期限を過ぎています。証明書の状態を確認してください。";
  }

  if (daysUntil <= reminderLeadDays) {
    return "更新手続きの準備を始める時期です。必要書類と窓口を確認してください。";
  }

  return "今は記録しておけば大丈夫です。通知開始目安に近づいたら再確認します。";
}

function getEmptyNextAction(category: RenewalCategoryValue) {
  return category === "GUN_LICENSE"
    ? "許可日と利用者本人の生年月日を入力すると、次にやることを表示します。"
    : "交付日を入力すると、次にやることを表示します。";
}

export function RenewalFactFields({
  defaultCategory = "HUNTING_LICENSE",
  defaultIssuedOn = "",
  userBirthDate = "",
  renewalRuleConfigs,
  errors = {},
  gunPermitFields,
  gunFields,
}: RenewalFactFieldsProps) {
  const [category, setCategory] = useState<RenewalCategoryValue>(
    normalizeCategory(defaultCategory),
  );
  const [issuedOn, setIssuedOn] = useState(defaultIssuedOn);
  const [originalPermittedOn, setOriginalPermittedOn] = useState("");

  const ruleConfig = renewalRuleConfigs[category];
  const reminderLeadDays = ruleConfig.reminderLeadDays;
  const reminderLeadDaysHelp = ruleConfig.reminderLeadDaysHelp;

  const calculatedGunExpiresOn =
    category === "GUN_LICENSE"
      ? calculateGunLicenseExpiresOn(userBirthDate, originalPermittedOn)
      : "";
  const calculatedHuntingExpiresOn =
    category === "HUNTING_LICENSE"
      ? calculateHuntingLicenseExpiresOn(issuedOn)
      : "";
  const gunExpiresMessage = userBirthDate
    ? originalPermittedOn
      ? "許可日を正しく入力すると自動表示されます"
      : "許可日を入力すると自動表示されます"
    : "利用者設定で生年月日を保存してください";
  const huntingExpiresMessage = issuedOn
    ? "交付日を正しく入力すると自動表示されます"
    : "交付日を入力すると自動表示されます";
  const targetDate =
    category === "GUN_LICENSE" ? calculatedGunExpiresOn : calculatedHuntingExpiresOn;
  const reminderStartOn = subtractDays(targetDate, reminderLeadDays);
  const daysUntil = diffDaysFromToday(targetDate);

  const autoItems = useMemo(
    () => [
      {
        label: "管理名",
        value: getGeneratedTitle(category),
        help: "種別から自動生成します。",
      },
      {
        label: "更新予定日",
        value: formatJapaneseEraDate(targetDate),
        help:
          category === "GUN_LICENSE"
            ? "許可日と生年月日から計算した有効期限日をもとに自動表示します。"
            : "交付日から計算した有効期限日をもとに自動表示します。",
      },
      {
        label: "通知開始目安",
        value: formatJapaneseEraDate(reminderStartOn),
        help: reminderLeadDaysHelp,
      },
      {
        label: "期限までの日数",
        value: daysUntil === null ? "未計算" : `${daysUntil}日`,
        help: "今日から更新予定日までの日数です。",
      },
    ],
    [category, daysUntil, reminderStartOn, targetDate],
  );

  function handleCategoryChange(value: RenewalCategoryValue) {
    setCategory(value);
  }

  function handleOriginalPermittedOnChange(value: string) {
    setOriginalPermittedOn(value);
  }

  return (
    <>
      <label className={formFieldLabel}>
        <span className={formLabelText}>種別</span>
        <select
          name="category"
          value={category}
          onChange={(event) =>
            handleCategoryChange(event.target.value as RenewalCategoryValue)
          }
          className={formFieldBase}
        >
          {categoryOptions.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </label>

      {category === "GUN_LICENSE" ? (
        <label className={formFieldLabel}>
          <span className={formLabelText}>許可日</span>
          <DateInput
            name="originalPermittedOn"
            value={originalPermittedOn}
            onChange={(event) =>
              handleOriginalPermittedOnChange(event.target.value)
            }
            className={formFieldBase}
          />
          <span className={formHelperText}>
            銃砲所持許可証に記載されている許可日を入力します。有効期限日はこの日付を基準に自動計算します。
          </span>
          <FieldError error={errors.originalPermittedOn} />
        </label>
      ) : null}

      <label className={formFieldLabel}>
        <span className={formLabelText}>交付日</span>
        <DateInput
          name="issuedOn"
          value={issuedOn}
          onChange={(event) => setIssuedOn(event.target.value)}
          className={formFieldBase}
        />
        <span className={formHelperText}>
          免状・許可証に記載されている交付日を入力します。
        </span>
        <FieldError error={errors.issuedOn} />
      </label>

      <div className="min-w-0 space-y-1.5 rounded-[20px] border border-emerald-950/10 bg-emerald-50/70 p-4 text-sm">
        <span className={formLabelText}>有効期限日</span>
        <p className="font-semibold text-slate-950">
          {category === "GUN_LICENSE"
            ? calculatedGunExpiresOn
              ? formatJapaneseEraDate(calculatedGunExpiresOn)
              : gunExpiresMessage
            : calculatedHuntingExpiresOn
              ? formatJapaneseEraDate(calculatedHuntingExpiresOn)
              : huntingExpiresMessage}
        </p>
        <span className={formHelperText}>
          {category === "GUN_LICENSE"
            ? "銃砲所持許可は、許可日から見て3回目に来る利用者本人の誕生日を自動計算します。"
            : "狩猟免許（狩猟免状）は、交付日の年に3年を足した年の9月14日を自動計算します。"}
        </span>
        <FieldError error={errors.expiresOn} />
      </div>

      <section className="lg:col-span-4 rounded-[24px] border border-emerald-950/10 bg-emerald-50/70 p-4">
        <div className="mb-3">
          <p className="text-sm font-semibold text-slate-900">自動計算</p>
          <p className="text-xs leading-6 text-slate-600">
            入力された事実をもとに、更新予定・通知開始・次にやることをアプリが自動表示します。
          </p>
        </div>
        <div className="grid grid-cols-1 gap-3 lg:grid-cols-4">
          {autoItems.map((item) => (
            <div
              key={item.label}
              className="min-w-0 rounded-[18px] border border-emerald-950/10 bg-white px-4 py-3"
            >
              <p className="text-xs font-semibold text-slate-500">{item.label}</p>
              <p className="mt-1 truncate text-sm font-semibold text-slate-950">
                {item.value}
              </p>
              <p className="mt-1 text-xs leading-5 text-slate-500">{item.help}</p>
            </div>
          ))}
          <div className="min-w-0 rounded-[18px] border border-emerald-950/10 bg-white px-4 py-3 lg:col-span-4">
            <p className="text-xs font-semibold text-slate-500">次にやること</p>
            <p className="mt-1 text-sm font-semibold leading-6 text-slate-950">
            {targetDate
              ? getNextAction(daysUntil, reminderLeadDays)
              : getEmptyNextAction(category)}
            </p>
          </div>
        </div>
      </section>

      {category === "GUN_LICENSE" ? (
        <>
          <p className="lg:col-span-4 text-sm font-bold text-red-600">
            銃砲許可証に記載されている情報をそのまま記載してください
          </p>
          {typeof gunPermitFields === "function"
            ? gunPermitFields({
                originalPermittedOn,
                onOriginalPermittedOnChange: handleOriginalPermittedOnChange,
              })
            : gunPermitFields}
          {gunFields}
        </>
      ) : null}
    </>
  );
}
