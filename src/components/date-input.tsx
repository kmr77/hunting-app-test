"use client";

import { useMemo, useState, type ChangeEvent, type InputHTMLAttributes } from "react";
import { formatJapaneseEraDate, isValidCompactDateInput } from "@/lib/format";

type DateInputProps = Omit<InputHTMLAttributes<HTMLInputElement>, "type">;

function normalizeCompactDateText(value: string) {
  return value
    .replace(/[０-９]/g, (char) =>
      String.fromCharCode(char.charCodeAt(0) - 0xfee0),
    )
    .replace(/\D/g, "")
    .slice(0, 8);
}

function toEightDigitDate(value: InputHTMLAttributes<HTMLInputElement>["value"]) {
  if (value === null || value === undefined) {
    return "";
  }

  if (typeof value !== "string") {
    return String(value);
  }

  const match = value.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  return normalizeCompactDateText(match ? `${match[1]}${match[2]}${match[3]}` : value);
}

export function DateInput({
  className,
  defaultValue,
  value,
  onChange,
  ...rest
}: DateInputProps) {
  const [inputValue, setInputValue] = useState(() => toEightDigitDate(defaultValue));
  const isControlled = value !== undefined;
  const currentValue = isControlled ? toEightDigitDate(value) : inputValue;
  const confirmationText = useMemo(
    () =>
      isValidCompactDateInput(currentValue)
        ? `入力内容：${formatJapaneseEraDate(currentValue)}`
        : "",
    [currentValue],
  );

  function handleChange(event: ChangeEvent<HTMLInputElement>) {
    const normalizedValue = normalizeCompactDateText(event.target.value);
    event.target.value = normalizedValue;

    if (!isControlled) {
      setInputValue(normalizedValue);
    }

    onChange?.(event);
  }

  return (
    <>
      <input
        type="text"
        inputMode="numeric"
        maxLength={8}
        pattern="[0-9]{8}"
        placeholder="例: 19800101"
        className={className}
        value={currentValue}
        onChange={handleChange}
        {...rest}
      />
      <span className="text-xs leading-5 text-slate-500">
        例: 1980年1月1日の場合は 19800101 と入力してください。
      </span>
      {confirmationText ? (
        <span className="text-xs leading-5 text-slate-600">
          {confirmationText}
        </span>
      ) : null}
    </>
  );
}
