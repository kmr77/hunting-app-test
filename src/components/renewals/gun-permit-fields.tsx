"use client";

import { DateInput } from "@/components/date-input";

type GunPermitFieldsProps = {
  defaultOriginalPermittedOn?: string;
  defaultOriginalPermitNumber?: string | null;
  defaultPermitNumber?: string | null;
  defaultConfirmedOn?: string;
  defaultApplicationStartOn?: string;
  defaultApplicationEndOn?: string;
  defaultValidityDescription?: string | null;
};

export function GunPermitFields({
  defaultOriginalPermittedOn = "",
  defaultOriginalPermitNumber = "",
  defaultPermitNumber = "",
  defaultConfirmedOn = "",
  defaultApplicationStartOn = "",
  defaultApplicationEndOn = "",
  defaultValidityDescription = "",
}: GunPermitFieldsProps) {
  return (
    <section className="lg:col-span-4 rounded-[24px] border border-emerald-950/10 bg-white/80 p-4">
      <div className="mb-3">
        <p className="text-sm font-semibold text-slate-900">銃砲所持許可証情報</p>
        <p className="text-xs leading-6 text-slate-600">
          許可番号は数字部分だけ入力します。画面表示では「第」と「号」を付けて表示します。
          最初の許可番号と今回の許可番号が同じ場合は、同じ番号を入力してください。許可証に記載されている内容をそのまま記録します。
        </p>
      </div>

      <div className="grid grid-cols-1 gap-3 lg:grid-cols-4">
        <label className="min-w-0 space-y-1.5 text-sm">
          <span className="font-medium text-slate-700">原許可日</span>
          <DateInput
            name="originalPermittedOn"
            defaultValue={defaultOriginalPermittedOn}
            className="min-h-12 w-full min-w-0 rounded-[18px] border border-emerald-950/10 bg-slate-50 px-4"
          />
        </label>

        <label className="min-w-0 space-y-1.5 text-sm">
          <span className="font-medium text-slate-700">最初の許可番号</span>
          <span className="flex min-w-0 items-center rounded-[18px] border border-emerald-950/10 bg-slate-50">
            <span className="pl-4 text-sm font-semibold text-slate-600">第</span>
            <input
              name="originalPermitNumber"
              defaultValue={defaultOriginalPermitNumber ?? ""}
              inputMode="numeric"
              className="min-h-12 min-w-0 flex-1 bg-transparent px-2 outline-none"
            />
            <span className="pr-4 text-sm font-semibold text-slate-600">号</span>
          </span>
        </label>

        <label className="min-w-0 space-y-1.5 text-sm">
          <span className="font-medium text-slate-700">今回の許可番号</span>
          <span className="flex min-w-0 items-center rounded-[18px] border border-emerald-950/10 bg-slate-50">
            <span className="pl-4 text-sm font-semibold text-slate-600">第</span>
            <input
              name="permitNumber"
              defaultValue={defaultPermitNumber ?? ""}
              inputMode="numeric"
              className="min-h-12 min-w-0 flex-1 bg-transparent px-2 outline-none"
            />
            <span className="pr-4 text-sm font-semibold text-slate-600">号</span>
          </span>
        </label>

        <label className="min-w-0 space-y-1.5 text-sm">
          <span className="font-medium text-slate-700">確認日</span>
          <DateInput
            name="confirmedOn"
            defaultValue={defaultConfirmedOn}
            className="min-h-12 w-full min-w-0 rounded-[18px] border border-emerald-950/10 bg-slate-50 px-4"
          />
        </label>

        <label className="min-w-0 space-y-1.5 text-sm">
          <span className="font-medium text-slate-700">更新申請期間開始日</span>
          <DateInput
            name="applicationStartOn"
            defaultValue={defaultApplicationStartOn}
            className="min-h-12 w-full min-w-0 rounded-[18px] border border-emerald-950/10 bg-slate-50 px-4"
          />
        </label>

        <label className="min-w-0 space-y-1.5 text-sm">
          <span className="font-medium text-slate-700">更新申請期間終了日</span>
          <DateInput
            name="applicationEndOn"
            defaultValue={defaultApplicationEndOn}
            className="min-h-12 w-full min-w-0 rounded-[18px] border border-emerald-950/10 bg-slate-50 px-4"
          />
        </label>

        <label className="min-w-0 space-y-1.5 text-sm lg:col-span-2">
          <span className="font-medium text-slate-700">有効期間</span>
          <input
            name="validityDescription"
            defaultValue={defaultValidityDescription ?? ""}
            placeholder="例: 令和9年の誕生日まで"
            className="min-h-12 w-full min-w-0 rounded-[18px] border border-emerald-950/10 bg-slate-50 px-4"
          />
        </label>
      </div>
    </section>
  );
}
