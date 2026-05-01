"use client";

import { useId, useMemo, useState } from "react";
import { formFieldBase, formFieldLabel, formLabelText } from "@/lib/form-classes";
import { prefectureOptions } from "@/lib/prefectures";

type ReportLocationFieldsProps = {
  defaultPrefectureCode?: string | null;
  defaultMunicipalityName?: string | null;
  municipalitySuggestionsByPrefecture: Record<string, string[]>;
};

export function ReportLocationFields({
  defaultPrefectureCode,
  defaultMunicipalityName,
  municipalitySuggestionsByPrefecture,
}: ReportLocationFieldsProps) {
  const initialPrefectureCode = defaultPrefectureCode || "01";
  const [prefectureCode, setPrefectureCode] = useState(initialPrefectureCode);
  const datalistId = useId();
  const suggestions = useMemo(
    () => municipalitySuggestionsByPrefecture[prefectureCode] ?? [],
    [municipalitySuggestionsByPrefecture, prefectureCode],
  );

  return (
    <>
      <label className={formFieldLabel}>
        <span className={formLabelText}>都道府県</span>
        <select
          name="prefectureCode"
          value={prefectureCode}
          onChange={(event) => setPrefectureCode(event.target.value)}
          className={formFieldBase}
        >
          {prefectureOptions.map((prefecture) => (
            <option key={prefecture.code} value={prefecture.code}>
              {prefecture.name}
            </option>
          ))}
        </select>
      </label>

      <label className={formFieldLabel + " lg:col-span-2"}>
        <span className={formLabelText}>市区町村名</span>
        <input
          name="areaName"
          defaultValue={defaultMunicipalityName ?? ""}
          list={datalistId}
          placeholder="例: 札幌市"
          className={formFieldBase}
        />
        <datalist id={datalistId}>
          {suggestions.map((municipalityName) => (
            <option key={municipalityName} value={municipalityName} />
          ))}
        </datalist>
      </label>

      <input type="hidden" name="municipalityCode" value="" />
    </>
  );
}
