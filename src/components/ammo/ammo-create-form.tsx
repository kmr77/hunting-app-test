"use client";

import { useActionState, useState } from "react";
import { useRouter } from "next/navigation";
import { createAmmoAction, type AmmoActionState } from "@/app/actions";
import { DateInput } from "@/components/date-input";
import { SubmitButton } from "@/components/submit-button";
import { AmmoCategoryFields } from "@/components/ammo/ammo-category-fields";
import {
  formFieldBase,
  formFieldLabel,
  formGrid4,
  formLabelText,
  formTextareaBase,
} from "@/lib/form-classes";

type Option = {
  value: string;
  label: string;
};

type AmmoCreateFormProps = {
  recordTypeOptions: Option[];
  ammoCategoryOptions: Option[];
};

type AmmoFormState = AmmoActionState & { resetKey: number };

const initialState: AmmoFormState = {
  resetKey: 0,
  success: false,
  values: {
    transactionDate: "",
    recordType: "PURCHASE",
    ammoCategory: "SHOT_SHELL",
    quantity: "25",
    caliber: "",
    shotSize: "",
    manufacturer: "",
    supplierName: "",
    memo: "",
  },
};

function FieldError({ message }: { message?: string }) {
  if (!message) {
    return null;
  }

  return (
    <span className="text-xs font-semibold leading-5 text-rose-600">
      {message}
    </span>
  );
}

function FormMessage({ state }: { state: AmmoActionState }) {
  if (!state.message) {
    return null;
  }

  const className = state.success
    ? "border-emerald-200 bg-emerald-50 text-emerald-950"
    : "border-rose-200 bg-rose-50 text-rose-950";

  return (
    <div className={`mb-4 rounded-[18px] border p-3 text-sm font-semibold ${className}`}>
      {state.message}
    </div>
  );
}

export function AmmoCreateForm({
  recordTypeOptions,
  ammoCategoryOptions,
}: AmmoCreateFormProps) {
  const router = useRouter();
  const [recordType, setRecordType] = useState(initialState.values.recordType);
  const [state, formAction] = useActionState(async (previous: AmmoFormState, data: FormData): Promise<AmmoFormState> => {
    const result = await createAmmoAction(previous, data);
    if (result.success) {
      setRecordType(initialState.values.recordType);
      router.refresh();
    }
    return { ...result, resetKey: previous.resetKey + (result.success ? 1 : 0) };
  }, initialState);
  const values = state.values;
  const fieldErrors = state.fieldErrors ?? {};

  return (
    <form
      key={state.resetKey}
      id="ammo-new"
      action={formAction}
      noValidate
      className="scroll-mt-24 rounded-[30px] border border-emerald-950/10 bg-white/92 p-5 shadow-[0_24px_50px_-36px_rgba(15,23,42,0.38)]"
    >
      <div className="mb-4">
        <p className="text-[11px] font-semibold tracking-[0.22em] text-slate-500 uppercase">
          新規登録
        </p>
        <h3 className="mt-1 text-lg font-semibold">帳簿に記録を追加</h3>
      </div>

      <FormMessage state={state} />

      <div className={formGrid4}>
        <label className={formFieldLabel}>
          <span className={formLabelText}>日付</span>
          <DateInput
            name="transactionDate"
            defaultValue={values.transactionDate}
            className={formFieldBase}
          />
          <FieldError message={fieldErrors.transactionDate} />
        </label>

        <label className={formFieldLabel}>
          <span className={formLabelText}>記録区分</span>
          <select
            name="recordType"
            defaultValue={values.recordType}
            onChange={(event) => setRecordType(event.target.value)}
            className={formFieldBase}
          >
            {recordTypeOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
          <FieldError message={fieldErrors.recordType} />
        </label>

        <AmmoCategoryFields
          options={ammoCategoryOptions}
          defaultAmmoCategory={values.ammoCategory}
          defaultCaliber={values.caliber}
          defaultShotSize={values.shotSize}
          errors={{ caliber: fieldErrors.caliber }}
          quantityField={
            <label className={formFieldLabel}>
              <span className={formLabelText}>数量</span>
              <input
                type="number"
                name="quantity"
                min={recordType === "ADJUST" ? undefined : 1}
                defaultValue={values.quantity}
                className={formFieldBase}
              />
              {recordType === "ADJUST" ? <span className="text-xs text-slate-500">増やす場合は正数、減らす場合は負数を入力してください。</span> : null}
              <FieldError message={fieldErrors.quantity} />
            </label>
          }
          supplierField={
            <>
              <label className={formFieldLabel}>
                <span className={formLabelText}>実包メーカー</span>
                <input
                  name="manufacturer"
                  defaultValue={values.manufacturer}
                  placeholder="例: ウィンチェスター"
                  className={formFieldBase}
                />
              </label>
              <label className={formFieldLabel}>
                <span className={formLabelText}>仕入先</span>
                <input
                  name="supplierName"
                  defaultValue={values.supplierName}
                  placeholder="例: 地元銃砲店"
                  className={formFieldBase}
                />
              </label>
            </>
          }
        />

        <label className={formFieldLabel + " lg:col-span-4"}>
          <span className={formLabelText}>メモ</span>
          <textarea
            name="memo"
            rows={3}
            defaultValue={values.memo}
            placeholder="商品名、弾薬の詳細、用途メモなど"
            className={formTextareaBase}
          />
        </label>
      </div>

      <SubmitButton
        className="mt-5 min-h-12 w-full px-5"
        pendingChildren="保存中..."
      >
        帳簿に保存
      </SubmitButton>
    </form>
  );
}
