export function formatDateInput(value: Date | string | null | undefined) {
  if (!value) {
    return "";
  }

  const date =
    typeof value === "string"
      ? (() => {
          const compactMatch = value.match(/^(\d{4})(\d{2})(\d{2})$/);
          const match =
            compactMatch ?? value.match(/^(\d{4})-(\d{2})-(\d{2})/);
          return match
            ? new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]))
            : new Date(value);
        })()
      : value;
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function formatDateLabel(value: Date | string | null | undefined) {
  if (!value) {
    return "未設定";
  }

  const date = parseDateOnly(value);
  if (!date) {
    return "未設定";
  }

  return new Intl.DateTimeFormat("ja-JP", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
}

function isExactDate(year: number, month: number, day: number, date: Date) {
  return (
    date.getFullYear() === year &&
    date.getMonth() + 1 === month &&
    date.getDate() === day
  );
}

function parseDateOnly(value: Date | string | null | undefined) {
  if (!value) {
    return null;
  }

  if (value instanceof Date) {
    return Number.isNaN(value.getTime()) ? null : value;
  }

  const compactMatch = value.match(/^(\d{4})(\d{2})(\d{2})$/);
  const match = compactMatch ?? value.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (!match) {
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? null : date;
  }

  const year = Number(match[1]);
  const month = Number(match[2]) - 1;
  const day = Number(match[3]);
  const date = new Date(year, month, day);
  return Number.isNaN(date.getTime()) || !isExactDate(year, month + 1, day, date)
    ? null
    : date;
}

export function isValidCompactDateInput(value: string) {
  return /^\d{8}$/.test(value) && parseDateOnly(value) !== null;
}

export function formatJapaneseEraDate(value: Date | string | null | undefined) {
  const date = parseDateOnly(value);
  if (!date) {
    return "未設定";
  }

  const eras = [
    { name: "令和", start: new Date(2019, 4, 1), year: 2019 },
    { name: "平成", start: new Date(1989, 0, 8), year: 1989 },
    { name: "昭和", start: new Date(1926, 11, 25), year: 1926 },
    { name: "大正", start: new Date(1912, 6, 30), year: 1912 },
    { name: "明治", start: new Date(1868, 0, 25), year: 1868 },
  ];
  const era = eras.find((candidate) => date >= candidate.start);
  const eraLabel = era
    ? `${era.name}${date.getFullYear() - era.year + 1}年`
    : `${date.getFullYear()}年`;

  return `${eraLabel}${date.getMonth() + 1}月${date.getDate()}日（${formatDateInput(date)}）`;
}

export function calculateGunLicenseExpiresOn(
  birthDateValue: Date | string | null | undefined,
  permittedOnValue: Date | string | null | undefined,
) {
  const birthDate = parseDateOnly(birthDateValue);
  const permittedOn = parseDateOnly(permittedOnValue);
  if (!birthDate || !permittedOn) {
    return "";
  }

  let birthdayCount = 0;
  let year = permittedOn.getFullYear();

  while (birthdayCount < 3) {
    const candidate = new Date(year, birthDate.getMonth(), birthDate.getDate());
    if (candidate >= permittedOn) {
      birthdayCount += 1;
      if (birthdayCount === 3) {
        return formatDateInput(candidate);
      }
    }
    year += 1;
  }

  return "";
}

export function calculateHuntingLicenseExpiresOn(
  issuedOnValue: Date | string | null | undefined,
) {
  const issuedOn = parseDateOnly(issuedOnValue);
  if (!issuedOn) {
    return "";
  }

  return formatDateInput(new Date(issuedOn.getFullYear() + 3, 8, 14));
}
