"use client";

import { useState, type ChangeEvent, type ReactNode } from "react";
import { formFieldBase, formFieldCompact, formFieldLabel, formHelperText, formLabelText } from "@/lib/form-classes";

type Option = {
  value: string;
  label: string;
};

type AmmoCategoryFieldsProps = {
  options: Option[];
  defaultAmmoCategory?: string;
  defaultCaliber?: string | null;
  defaultShotSize?: string | null;
  errors?: {
    caliber?: string;
  };
  quantityField?: ReactNode;
  manufacturerField?: ReactNode;
  supplierField?: ReactNode;
  compact?: boolean;
};

function normalizeDigits(value: string) {
  return value
    .replace(/[０-９]/g, (char) =>
      String.fromCharCode(char.charCodeAt(0) - 0xfee0),
    )
    .replace(/\D/g, "");
}

function toCaliberInput(value?: string | null) {
  if (!value) {
    return "";
  }

  return normalizeDigits(value.replace(/番/g, ""));
}

export function AmmoCategoryFields({
  options,
  defaultAmmoCategory = "SHOT_SHELL",
  defaultCaliber,
  defaultShotSize,
  errors,
  quantityField,
  manufacturerField,
  supplierField,
  compact = false,
}: AmmoCategoryFieldsProps) {
  const [ammoCategory, setAmmoCategory] = useState(defaultAmmoCategory);
  const isSlug = ammoCategory === "SLUG";
  const fieldClass = compact ? `${formFieldCompact} w-full` : formFieldBase;

  function handleCaliberChange(event: ChangeEvent<HTMLInputElement>) {
    event.target.value = normalizeDigits(event.target.value);
  }

  return (
    <>
      <label className={formFieldLabel}>
        <span className={formLabelText}>実包種別</span>
        <select
          name="ammoCategory"
          defaultValue={defaultAmmoCategory}
          className={fieldClass}
          onChange={(event) => setAmmoCategory(event.target.value)}
        >
          {options.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </label>

      {quantityField}

      <label className={formFieldLabel}>
        <span className={formLabelText}>口径（12番、20番）</span>
        <div className="flex min-w-0 w-full items-center overflow-hidden rounded-[20px] border border-slate-200 bg-slate-50">
          <input
            name="caliber"
            inputMode="numeric"
            pattern="[0-9]*"
            defaultValue={toCaliberInput(defaultCaliber)}
            placeholder="12"
            onChange={handleCaliberChange}
            className="min-h-12 min-w-0 flex-1 bg-transparent px-4 text-sm"
          />
          <span className="shrink-0 pr-4 text-sm font-semibold text-slate-600">
            番
          </span>
        </div>
        <span className={formHelperText}>数字のみ入力してください。</span>
        {errors?.caliber ? (
          <span className="text-xs font-semibold leading-5 text-rose-600">
            {errors.caliber}
          </span>
        ) : null}
      </label>

      <label className={formFieldLabel}>
        <span className={formLabelText}>号数</span>
        <input
          name="shotSize"
          disabled={isSlug}
          defaultValue={isSlug ? "" : defaultShotSize ?? ""}
          placeholder="例: 7.5、BB"
          className={`${fieldClass} disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-400`}
        />
        {isSlug ? (
          <span className={formHelperText}>
            スラッグでは号数を使用しないため入力不要です。
          </span>
        ) : (
          <span className={formHelperText}>
            BBなどもあるため、数字以外も入力できます。
          </span>
        )}
      </label>

      {manufacturerField}
      {supplierField}
    </>
  );
}
