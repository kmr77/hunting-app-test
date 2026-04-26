"use client";

import { useId, useMemo, useState } from "react";
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
      <label className="report-prefecture-field min-w-0 space-y-1.5 text-sm">
        <span className="font-medium text-slate-700">都道府県</span>
        <select
          name="prefectureCode"
          value={prefectureCode}
          onChange={(event) => setPrefectureCode(event.target.value)}
          className="min-h-12 w-full rounded-[20px] border border-slate-200 bg-slate-50 px-4"
        >
          {prefectureOptions.map((prefecture) => (
            <option key={prefecture.code} value={prefecture.code}>
              {prefecture.name}
            </option>
          ))}
        </select>
      </label>

      <label className="report-area-field min-w-0 space-y-1.5 text-sm lg:col-span-2">
        <span className="font-medium text-slate-700">市区町村名</span>
        <input
          name="areaName"
          defaultValue={defaultMunicipalityName ?? ""}
          list={datalistId}
          placeholder="例: 札幌市"
          className="min-h-12 w-full rounded-[20px] border border-slate-200 bg-slate-50 px-4"
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
