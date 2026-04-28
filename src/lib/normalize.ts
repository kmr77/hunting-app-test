export function normalizeWhitespace(value: string | null | undefined) {
  if (value == null) {
    return null;
  }

  const normalized = value
    .replace(/[　\s]+/g, " ")
    .trim();

  return normalized.length > 0 ? normalized : null;
}

export function toHalfWidthAlnum(value: string | null | undefined) {
  if (value == null) {
    return null;
  }

  const normalized = value
    .replace(/[Ａ-Ｚａ-ｚ０-９]/g, (char) =>
      String.fromCharCode(char.charCodeAt(0) - 0xfee0),
    )
    .replace(/[　]/g, " ")
    .trim();

  return normalized.length > 0 ? normalized : null;
}

export function normalizePermitNumber(value: string | null | undefined) {
  const cleaned = toHalfWidthAlnum(value);
  if (!cleaned) {
    return null;
  }

  const digits = cleaned.replace(/[^0-9]/g, "");
  return digits.length > 0 ? digits : null;
}

export function normalizeLength(value: string | null | undefined) {
  const cleaned = normalizeWhitespace(value);
  if (!cleaned) {
    return null;
  }

  const half = toHalfWidthAlnum(cleaned) ?? cleaned;
  const result = half
    .replace(/㎝|ｃｍ/gi, "cm")
    .replace(/ｍｍ/gi, "mm")
    .replace(/\s*(cm|mm|CM|MM)\s*$/, (match) => match.toLowerCase())
    .replace(/\s+/g, " ")
    .trim();

  return result.length > 0 ? result : null;
}

export function normalizeCaliber(value: string | null | undefined) {
  const cleaned = normalizeWhitespace(value);
  if (!cleaned) {
    return null;
  }

  const half = toHalfWidthAlnum(cleaned) ?? cleaned;
  const result = half
    .replace(/㎜|ｍｍ/gi, "mm")
    .replace(/㎝|ｃｍ/gi, "cm")
    .replace(/\s+/g, " ")
    .trim();

  return result.length > 0 ? result : null;
}

export function normalizeSerialNumber(value: string | null | undefined) {
  const normalized = toHalfWidthAlnum(value);
  return normalizeWhitespace(normalized);
}

export function normalizeGeneralText(value: string | null | undefined) {
  const cleaned = normalizeWhitespace(value);
  if (!cleaned) {
    return null;
  }

  const result = toHalfWidthAlnum(cleaned) ?? cleaned;
  return normalizeWhitespace(result);
}
