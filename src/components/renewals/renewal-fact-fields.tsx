"use client";

import { useMemo, useState } from "react";
import type { ReactNode } from "react";

type RenewalCategoryValue = "HUNTING_LICENSE" | "GUN_LICENSE";
type RenewalStatusValue = "ACTIVE" | "EXPIRED" | "RENEWED" | "ARCHIVED";

type RenewalFactFieldsProps = {
  defaultCategory?: string;
  defaultStatus?: string;
  defaultIssuedOn?: string;
  defaultExpiresOn?: string;
  gunPermitFields?: ReactNode;
  gunFields?: ReactNode;
};

const REMINDER_LEAD_DAYS = 90;

const categoryOptions: Array<{ value: RenewalCategoryValue; label: string }> = [
  { value: "HUNTING_LICENSE", label: "狩猟免許" },
  { value: "GUN_LICENSE", label: "銃砲所持許可" },
];

const statusOptions: Array<{ value: RenewalStatusValue; label: string }> = [
  { value: "ACTIVE", label: "管理中" },
  { value: "EXPIRED", label: "要確認" },
  { value: "RENEWED", label: "完了" },
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

  const date = new Date(`${value}T00:00:00`);
  return Number.isNaN(date.getTime()) ? null : date;
}

function formatDateLabel(value: string) {
  const date = parseDateInput(value);
  if (!date) {
    return "未計算";
  }

  return `${date.getFullYear()}/${String(date.getMonth() + 1).padStart(2, "0")}/${String(
    date.getDate(),
  ).padStart(2, "0")}`;
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

function normalizeStatus(value: string): RenewalStatusValue {
  if (value === "ARCHIVED") {
    return "RENEWED";
  }

  return statusOptions.some((option) => option.value === value)
    ? (value as RenewalStatusValue)
    : "ACTIVE";
}

function getNextAction(daysUntil: number | null) {
  if (daysUntil === null) {
    return "交付日または有効期限日を入力すると、次にやることを表示します。";
  }

  if (daysUntil < 0) {
    return "期限を過ぎています。証明書の状態を確認してください。";
  }

  if (daysUntil <= REMINDER_LEAD_DAYS) {
    return "更新手続きの準備を始める時期です。必要書類と窓口を確認してください。";
  }

  return "今は記録しておけば大丈夫です。通知開始目安に近づいたら再確認します。";
}

export function RenewalFactFields({
  defaultCategory = "HUNTING_LICENSE",
  defaultStatus = "ACTIVE",
  defaultIssuedOn = "",
  defaultExpiresOn = "",
  gunPermitFields,
  gunFields,
}: RenewalFactFieldsProps) {
  const [category, setCategory] = useState<RenewalCategoryValue>(
    normalizeCategory(defaultCategory),
  );
  const [issuedOn, setIssuedOn] = useState(defaultIssuedOn);
  const [expiresOn, setExpiresOn] = useState(defaultExpiresOn);

  const targetDate = expiresOn || issuedOn;
  const reminderStartOn = subtractDays(targetDate, REMINDER_LEAD_DAYS);
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
        value: formatDateLabel(targetDate),
        help: "入力された有効期限日を優先して自動表示します。",
      },
      {
        label: "通知開始目安",
        value: formatDateLabel(reminderStartOn),
        help: `${REMINDER_LEAD_DAYS}日前から注意表示する想定です。`,
      },
      {
        label: "期限までの日数",
        value: daysUntil === null ? "未計算" : `${daysUntil}日`,
        help: "今日から更新予定日までの日数です。",
      },
    ],
    [category, daysUntil, reminderStartOn, targetDate],
  );

  return (
    <>
      <label className="min-w-0 space-y-1.5 text-sm">
        <span className="font-medium text-slate-700">種別</span>
        <select
          name="category"
          value={category}
          onChange={(event) => setCategory(event.target.value as RenewalCategoryValue)}
          className="min-h-12 w-full min-w-0 rounded-[20px] border border-slate-200 bg-slate-50 px-4"
        >
          {categoryOptions.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </label>

      <label className="min-w-0 space-y-1.5 text-sm">
        <span className="font-medium text-slate-700">進捗</span>
        <select
          name="status"
          defaultValue={normalizeStatus(defaultStatus)}
          className="min-h-12 w-full min-w-0 rounded-[20px] border border-slate-200 bg-slate-50 px-4"
        >
          {statusOptions.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </label>

      <label className="min-w-0 space-y-1.5 text-sm">
        <span className="font-medium text-slate-700">交付日</span>
        <input
          type="date"
          name="issuedOn"
          value={issuedOn}
          onChange={(event) => setIssuedOn(event.target.value)}
          className="min-h-12 w-full min-w-0 rounded-[20px] border border-slate-200 bg-slate-50 px-4"
        />
        <span className="block text-xs leading-5 text-slate-500">
          免状・許可証に記載されている交付日を入力します。
        </span>
      </label>

      <label className="min-w-0 space-y-1.5 text-sm">
        <span className="font-medium text-slate-700">有効期限日</span>
        <input
          type="date"
          name="expiresOn"
          required
          value={expiresOn}
          onChange={(event) => setExpiresOn(event.target.value)}
          className="min-h-12 w-full min-w-0 rounded-[20px] border border-slate-200 bg-slate-50 px-4"
        />
        <span className="block text-xs leading-5 text-slate-500">
          免状・許可証に記載されている有効期限日を入力します。
        </span>
      </label>

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
              {getNextAction(daysUntil)}
            </p>
          </div>
        </div>
      </section>

      {category === "GUN_LICENSE" ? (
        <>
          <p className="lg:col-span-4 text-sm font-bold text-red-600">
            銃砲許可証に記載されている情報をそのまま記載してください
          </p>
          {gunPermitFields}
          {gunFields}
        </>
      ) : null}
    </>
  );
}
