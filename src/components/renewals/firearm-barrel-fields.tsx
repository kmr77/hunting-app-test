"use client";

import { useState } from "react";

const barrelTypeOptions = [
  { value: "RIFLED", label: "ライフル銃身" },
  { value: "HALF_RIFLED", label: "ハーフライフル銃身" },
  { value: "SMOOTHBORE", label: "平筒" },
  { value: "OTHER", label: "その他" },
];

type BarrelRow = {
  id: number;
};

export function FirearmBarrelFields() {
  const [rows, setRows] = useState<BarrelRow[]>([{ id: 1 }]);

  return (
    <section className="lg:col-span-4 rounded-[22px] border border-emerald-950/10 bg-white/70 p-4">
      <div className="mb-4 space-y-2">
        <p className="text-sm font-semibold text-slate-900">銃身情報</p>
        <p className="text-xs leading-6 text-slate-600">
          替え銃身は銃本体とは分けて登録します。銃本体が1丁の場合、替え銃身が複数あっても銃の登録数は1丁として扱います。
        </p>
        <p className="text-xs leading-6 text-slate-600">
          例: ライフル1丁に、ハーフライフル銃身1本・平筒3本がある場合、銃本体はライフル1丁、銃身情報は4本として登録します。
        </p>
      </div>

      <div className="grid gap-4">
        {rows.map((row, index) => (
          <div
            key={row.id}
            className="grid grid-cols-1 gap-3 rounded-[20px] border border-emerald-950/10 bg-emerald-50/50 p-3 lg:grid-cols-4"
          >
            <label className="min-w-0 space-y-1.5 text-sm">
              <span className="font-medium text-slate-700">銃身種別</span>
              <select
                name="barrelType[]"
                defaultValue={index === 0 ? "RIFLED" : "SMOOTHBORE"}
                className="min-h-12 w-full min-w-0 rounded-[18px] border border-emerald-950/10 bg-white px-4"
              >
                {barrelTypeOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>

            <label className="min-w-0 space-y-1.5 text-sm">
              <span className="font-medium text-slate-700">種類</span>
              <input
                name="barrelFirearmKind[]"
                placeholder="例: 散弾銃"
                className="min-h-12 w-full min-w-0 rounded-[18px] border border-emerald-950/10 bg-white px-4"
              />
            </label>

            <label className="min-w-0 space-y-1.5 text-sm">
              <span className="font-medium text-slate-700">銃身長</span>
              <input
                name="barrelLength[]"
                placeholder="例: 660mm"
                className="min-h-12 w-full min-w-0 rounded-[18px] border border-emerald-950/10 bg-white px-4"
              />
            </label>

            <label className="min-w-0 space-y-1.5 text-sm">
              <span className="font-medium text-slate-700">口径</span>
              <input
                name="barrelCaliber[]"
                placeholder="例: 12"
                className="min-h-12 w-full min-w-0 rounded-[18px] border border-emerald-950/10 bg-white px-4"
              />
            </label>

            <label className="min-w-0 space-y-1.5 text-sm">
              <span className="font-medium text-slate-700">用途メモ</span>
              <input
                name="barrelPurposeMemo[]"
                placeholder="例: 鹿猟用"
                className="min-h-12 w-full min-w-0 rounded-[18px] border border-emerald-950/10 bg-white px-4"
              />
            </label>

            <label className="min-w-0 space-y-1.5 text-sm">
              <span className="font-medium text-slate-700">銃腔内旋割合</span>
              <input
                name="barrelRiflingRate[]"
                placeholder="例: 1/5以上1/2以下"
                className="min-h-12 w-full min-w-0 rounded-[18px] border border-emerald-950/10 bg-white px-4"
              />
            </label>

            <label className="min-w-0 space-y-1.5 text-sm">
              <span className="font-medium text-slate-700">適合実包</span>
              <input
                name="barrelCompatibleAmmo[]"
                placeholder="例: 12番"
                className="min-h-12 w-full min-w-0 rounded-[18px] border border-emerald-950/10 bg-white px-4"
              />
            </label>

            <label className="min-w-0 space-y-1.5 text-sm lg:col-span-2">
              <span className="font-medium text-slate-700">特徴</span>
              <input
                name="barrelFeatures[]"
                placeholder="例: ハーフライフリングあり"
                className="min-h-12 w-full min-w-0 rounded-[18px] border border-emerald-950/10 bg-white px-4"
              />
            </label>

            <label className="min-w-0 space-y-1.5 text-sm lg:col-span-4">
              <span className="font-medium text-slate-700">備考</span>
              <textarea
                name="barrelNotes[]"
                rows={2}
                placeholder="銃身ごとの補足を入力"
                className="w-full min-w-0 rounded-[18px] border border-emerald-950/10 bg-white px-4 py-3"
              />
            </label>

            {index > 0 ? (
              <div className="lg:col-span-4">
                <button
                  type="button"
                  onClick={() =>
                    setRows((currentRows) =>
                      currentRows.filter((currentRow) => currentRow.id !== row.id),
                    )
                  }
                  className="min-h-10 rounded-full border border-rose-200 bg-white px-4 text-sm font-semibold text-rose-700"
                >
                  削除
                </button>
              </div>
            ) : null}
          </div>
        ))}
      </div>

      <button
        type="button"
        onClick={() =>
          setRows((currentRows) => [
            ...currentRows,
            { id: Date.now() + currentRows.length },
          ])
        }
        className="mt-4 min-h-11 rounded-full bg-emerald-950 px-5 text-sm font-semibold !text-white"
      >
        + 銃身を追加
      </button>
    </section>
  );
}
