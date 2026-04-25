export function formatDateInput(value: Date | string | null | undefined) {
  if (!value) {
    return "";
  }

  const date = typeof value === "string" ? new Date(value) : value;
  return date.toISOString().slice(0, 10);
}

export function formatDateLabel(value: Date | string | null | undefined) {
  if (!value) {
    return "未設定";
  }

  const date = typeof value === "string" ? new Date(value) : value;
  return new Intl.DateTimeFormat("ja-JP", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
}
