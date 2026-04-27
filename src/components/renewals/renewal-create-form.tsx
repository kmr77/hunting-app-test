"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import type { FormEvent } from "react";
import { FieldError } from "@/components/field-error";
import { SubmitButton } from "@/components/submit-button";
import { FirearmBarrelFields } from "@/components/renewals/firearm-barrel-fields";
import { RenewalFactFields } from "@/components/renewals/renewal-fact-fields";
import { GunPermitFields } from "@/components/renewals/gun-permit-fields";
import { upsertRenewalAction, type FieldErrors } from "@/app/actions";
import { firearmStatusLabels, firearmTypeLabels } from "@/lib/labels";

const firearmTypeOptions = [
  "RIFLE",
  "SHOTGUN",
  "AIR_RIFLE",
  "OTHER",
] as const;

const firearmStatusOptions = ["ACTIVE", "DISPOSED", "INACTIVE"] as const;

export function RenewalCreateForm() {
  const router = useRouter();
  const formRef = useRef<HTMLFormElement | null>(null);
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFieldErrors({});
    setFormError(null);

    const form = formRef.current;
    if (!form) {
      return;
    }

    setSubmitting(true);
    try {
      const result = await upsertRenewalAction(new FormData(form));

      if (!result.success) {
        if (result.errors) {
          setFieldErrors(result.errors);
        } else {
          setFormError(result.message ?? "更新記録の保存に失敗しました。");
        }
        return;
      }

      router.push(
        "/renewals?status=success&message=%E6%9B%B4%E6%96%B0%E8%A8%98%E9%8C%B2%E3%82%92%E7%99%BB%E9%8C%B2%E3%81%97%E3%81%BE%E3%81%97%E3%81%9F%E3%80%82",
      );
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form ref={formRef} onSubmit={handleSubmit} className="rounded-[30px] border border-emerald-950/10 bg-white/92 p-5 shadow-[0_24px_50px_-36px_rgba(15,23,42,0.38)]">
      <div className="mb-4">
        <p className="text-[11px] font-semibold tracking-[0.22em] text-slate-500 uppercase">新規登録</p>
        <h3 className="mt-1 text-lg font-semibold">免許・許可情報を追加</h3>
        <p className="mt-2 max-w-3xl text-sm leading-7 text-slate-600">
          狩猟免許または銃砲所持許可に記載されている交付日・有効期限日を入力すると、更新予定日や通知開始目安を自動表示します。
        </p>
      </div>

      {formError ? (
        <div className="mb-4 rounded-[24px] border border-rose-200/80 bg-rose-50/95 p-4 text-rose-950">
          <p className="text-sm font-semibold">保存エラー</p>
          <p className="mt-2 text-sm leading-6">{formError}</p>
        </div>
      ) : null}

      <div className="grid grid-cols-1 gap-3 lg:grid-cols-4">
        <input type="hidden" name="jurisdictionCode" value="" />

        <RenewalFactFields gunPermitFields={<GunPermitFields />} gunFields={<GunFields errors={fieldErrors} />} />

        <label className="min-w-0 space-y-1.5 text-sm lg:col-span-4">
          <span className="font-medium text-slate-700">メモ</span>
          <textarea
            name="notes"
            rows={3}
            placeholder="必要書類や持ち物、連絡先などを記録"
            className="w-full rounded-[20px] border border-slate-200 bg-slate-50 px-4 py-3"
          />
        </label>
      </div>

      <SubmitButton className="mt-5 min-h-12 w-full px-5" pending={submitting} pendingChildren="保存中...">
        免許・許可情報を保存
      </SubmitButton>
    </form>
  );
}

function GunFields({ errors }: { errors: FieldErrors }) {
  return (
    <div className="lg:col-span-4 rounded-[24px] bg-emerald-50/70 p-4">
      <div className="mb-3">
        <p className="text-sm font-semibold text-slate-900">所持銃情報を同時登録</p>
        <p className="text-xs leading-6 text-slate-600">
          銃番号を入力した場合のみ、銃本体1丁と銃身情報を登録します。替え銃身は銃の丁数に含めません。
        </p>
      </div>

      <div className="grid grid-cols-1 gap-3 lg:grid-cols-4">
        <label className="min-w-0 space-y-1.5 text-sm lg:col-span-2">
          <span className="font-medium text-slate-700">銃の管理名</span>
          <input
            name="firearmDisplayName"
            placeholder="例: 山用ライフル"
            className={`min-h-12 w-full min-w-0 rounded-[18px] px-4 ${errors.firearmDisplayName ? "border-red-500" : "border-emerald-950/10"} bg-white`}
          />
          <FieldError error={errors.firearmDisplayName} />
        </label>

        <label className="min-w-0 space-y-1.5 text-sm">
          <span className="font-medium text-slate-700">銃種</span>
          <select
            name="firearmType"
            defaultValue="SHOTGUN"
            className={`min-h-12 w-full rounded-[18px] px-4 ${errors.firearmType ? "border-red-500" : "border-emerald-950/10"} bg-white`}
          >
            {firearmTypeOptions.map((option) => (
              <option key={option} value={option}>
                {firearmTypeLabels[option]}
              </option>
            ))}
          </select>
          <FieldError error={errors.firearmType} />
        </label>

        <label className="min-w-0 space-y-1.5 text-sm">
          <span className="font-medium text-slate-700">状態</span>
          <select
            name="firearmStatus"
            defaultValue="ACTIVE"
            className={`min-h-12 w-full rounded-[18px] px-4 ${errors.firearmStatus ? "border-red-500" : "border-emerald-950/10"} bg-white`}
          >
            {firearmStatusOptions.map((option) => (
              <option key={option} value={option}>
                {firearmStatusLabels[option]}
              </option>
            ))}
          </select>
          <FieldError error={errors.firearmStatus} />
        </label>

        <label className="min-w-0 space-y-1.5 text-sm">
          <span className="font-medium text-slate-700">メーカー</span>
          <input
            name="manufacturer"
            placeholder="例: Browning"
            className={`min-h-12 w-full min-w-0 rounded-[18px] px-4 ${errors.manufacturer ? "border-red-500" : "border-emerald-950/10"} bg-white`}
          />
          <FieldError error={errors.manufacturer} />
        </label>

        <label className="min-w-0 space-y-1.5 text-sm">
          <span className="font-medium text-slate-700">型式</span>
          <input
            name="modelName"
            placeholder="例: A5"
            className={`min-h-12 w-full min-w-0 rounded-[18px] px-4 ${errors.modelName ? "border-red-500" : "border-emerald-950/10"} bg-white`}
          />
          <FieldError error={errors.modelName} />
        </label>

        <label className="min-w-0 space-y-1.5 text-sm">
          <span className="font-medium text-slate-700">口径</span>
          <input
            name="caliber"
            placeholder="例: 12番"
            className={`min-h-12 w-full min-w-0 rounded-[18px] px-4 ${errors.caliber ? "border-red-500" : "border-emerald-950/10"} bg-white`}
          />
          <FieldError error={errors.caliber} />
        </label>

        <label className="min-w-0 space-y-1.5 text-sm">
          <span className="font-medium text-slate-700">銃の全長</span>
          <input
            name="firearmTotalLength"
            placeholder="例: 110.0cm"
            className={`min-h-12 w-full min-w-0 rounded-[18px] px-4 ${errors.firearmTotalLength ? "border-red-500" : "border-emerald-950/10"} bg-white`}
          />
          <FieldError error={errors.firearmTotalLength} />
        </label>

        <label className="min-w-0 space-y-1.5 text-sm">
          <span className="font-medium text-slate-700">銃身長</span>
          <input
            name="firearmBarrelLength"
            placeholder="例: 61.3cm"
            className={`min-h-12 w-full min-w-0 rounded-[18px] px-4 ${errors.firearmBarrelLength ? "border-red-500" : "border-emerald-950/10"} bg-white`}
          />
          <FieldError error={errors.firearmBarrelLength} />
        </label>

        <label className="min-w-0 space-y-1.5 text-sm">
          <span className="font-medium text-slate-700">銃腔内旋割合</span>
          <input
            name="firearmRiflingRate"
            placeholder="例: 1/5以上1/2以下"
            className={`min-h-12 w-full min-w-0 rounded-[18px] px-4 ${errors.firearmRiflingRate ? "border-red-500" : "border-emerald-950/10"} bg-white`}
          />
          <FieldError error={errors.firearmRiflingRate} />
        </label>

        <label className="min-w-0 space-y-1.5 text-sm">
          <span className="font-medium text-slate-700">弾倉形式及び充填可能弾数</span>
          <input
            name="firearmMagazineSpec"
            placeholder="例: チューブ型 2発"
            className={`min-h-12 w-full min-w-0 rounded-[18px] px-4 ${errors.firearmMagazineSpec ? "border-red-500" : "border-emerald-950/10"} bg-white`}
          />
          <FieldError error={errors.firearmMagazineSpec} />
        </label>

        <label className="min-w-0 space-y-1.5 text-sm">
          <span className="font-medium text-slate-700">適合実包</span>
          <input
            name="firearmCompatibleAmmo"
            placeholder="例: 12番"
            className={`min-h-12 w-full min-w-0 rounded-[18px] px-4 ${errors.firearmCompatibleAmmo ? "border-red-500" : "border-emerald-950/10"} bg-white`}
          />
          <FieldError error={errors.firearmCompatibleAmmo} />
        </label>

        <label className="min-w-0 space-y-1.5 text-sm">
          <span className="font-medium text-slate-700">特徴</span>
          <input
            name="firearmFeatures"
            placeholder="例: ハーフライフリングあり"
            className={`min-h-12 w-full min-w-0 rounded-[18px] px-4 ${errors.firearmFeatures ? "border-red-500" : "border-emerald-950/10"} bg-white`}
          />
          <FieldError error={errors.firearmFeatures} />
        </label>

        <label className="min-w-0 space-y-1.5 text-sm">
          <span className="font-medium text-slate-700">用途</span>
          <input
            name="firearmPurposeText"
            placeholder="例: 狩猟"
            className={`min-h-12 w-full min-w-0 rounded-[18px] px-4 ${errors.firearmPurposeText ? "border-red-500" : "border-emerald-950/10"} bg-white`}
          />
          <FieldError error={errors.firearmPurposeText} />
        </label>

        <label className="min-w-0 space-y-1.5 text-sm">
          <span className="font-medium text-slate-700">銃番号</span>
          <input
            name="serialNumber"
            placeholder="銃番号を入力すると登録"
            className={`min-h-12 w-full min-w-0 rounded-[18px] px-4 ${errors.serialNumber ? "border-red-500" : "border-emerald-950/10"} bg-white`}
          />
          <FieldError error={errors.serialNumber} />
        </label>

        <label className="min-w-0 space-y-1.5 text-sm">
          <span className="font-medium text-slate-700">許可日</span>
          <input
            type="date"
            name="firearmPermittedOn"
            className={`min-h-12 w-full min-w-0 rounded-[18px] px-4 ${errors.firearmPermittedOn ? "border-red-500" : "border-emerald-950/10"} bg-white`}
          />
          <FieldError error={errors.firearmPermittedOn} />
        </label>

        <label className="min-w-0 space-y-1.5 text-sm">
          <span className="font-medium text-slate-700">有効期限日</span>
          <input
            type="date"
            name="firearmExpiresOn"
            className={`min-h-12 w-full min-w-0 rounded-[18px] px-4 ${errors.firearmExpiresOn ? "border-red-500" : "border-emerald-950/10"} bg-white`}
          />
          <FieldError error={errors.firearmExpiresOn} />
        </label>

        <label className="min-w-0 space-y-1.5 text-sm lg:col-span-4">
          <span className="font-medium text-slate-700">備考</span>
          <textarea
            name="firearmNotes"
            rows={2}
            placeholder="銃本体についての補足を入力"
            className={`w-full min-w-0 rounded-[18px] px-4 py-3 ${errors.firearmNotes ? "border-red-500" : "border-emerald-950/10"} bg-white`}
          />
          <FieldError error={errors.firearmNotes} />
        </label>

        <FirearmBarrelFields />
      </div>
    </div>
  );
}
