"use client";

import { useState } from "react";
import type { AmmoCategory, AmmoRecordType } from "@prisma/client";
import { deleteAmmoAction, upsertAmmoAction } from "@/app/actions";
import { DateInput } from "@/components/date-input";
import { SubmitButton } from "@/components/submit-button";
import { AmmoCategoryFields } from "@/components/ammo/ammo-category-fields";
import {
  formFieldCompact,
  formFieldLabel,
  formGrid4,
  formInfoGrid4,
  formLabelText,
  formTextareaCompact,
} from "@/lib/form-classes";
import { formatDateInput, formatDateLabel, formatJapaneseEraDate } from "@/lib/format";
import {
  ammoCategoryLabels,
  ammoRecordTypeLabels,
} from "@/lib/labels";

export type AmmoRecordView = {
  id: string;
  recordType: AmmoRecordType;
  ammoCategory: AmmoCategory;
  caliber: string | null;
  manufacturer: string | null;
  shotSize: string | null;
  quantity: number;
  transactionDate: string;
  supplierName: string | null;
  memo: string | null;
};

type Option = {
  value: string;
  label: string;
};

type Feedback = {
  variant: "success" | "error";
  message: string;
} | null;

type AmmoRecordListProps = {
  records: AmmoRecordView[];
  recordTypeOptions: Option[];
  ammoCategoryOptions: Option[];
  feedback: Feedback;
  feedbackTarget: string;
};

function display(value?: string | null) {
  return value && value.trim().length > 0 ? value : "未登録";
}

function formatAmmoCaliberLabel(value?: string | null) {
  if (!value) {
    return "口径未設定";
  }

  return value.endsWith("番") ? value : `${value}番`;
}

function formatAmmoRecordDateLabel(value: Date | string | null | undefined) {
  const westernDate = formatDateLabel(value);
  if (westernDate === "未設定") {
    return westernDate;
  }

  const eraDate = formatJapaneseEraDate(value).replace(/（.*?）$/, "");
  if (eraDate === "未設定") {
    return westernDate;
  }

  return `${westernDate}（${eraDate}）`;
}

function LocalFeedback({ feedback }: { feedback: Feedback }) {
  if (!feedback) {
    return null;
  }

  const className =
    feedback.variant === "success"
      ? "border-emerald-200 bg-emerald-50 text-emerald-950"
      : "border-rose-200 bg-rose-50 text-rose-950";

  return (
    <div className={`rounded-[18px] border p-3 text-sm font-semibold ${className}`}>
      {feedback.message}
    </div>
  );
}

function FieldGrid({
  items,
}: {
  items: Array<{ label: string; value: string }>;
}) {
  return (
    <dl className={formInfoGrid4}>
      {items.map((item) => (
        <div key={item.label} className="min-w-0 rounded-[18px] bg-slate-50 p-3">
          <dt className="text-xs font-semibold text-slate-500">{item.label}</dt>
          <dd className="mt-1 break-words font-semibold text-slate-950">
            {item.value}
          </dd>
        </div>
      ))}
    </dl>
  );
}

export function AmmoRecordList({
  records,
  recordTypeOptions,
  ammoCategoryOptions,
  feedback,
  feedbackTarget,
}: AmmoRecordListProps) {
  const [editingId, setEditingId] = useState<string | null>(null);

  if (records.length === 0) {
    return (
      <div className="rounded-[30px] border border-dashed border-emerald-950/15 bg-white/72 p-6 text-sm leading-7 text-slate-600">
        実包帳簿はまだ登録されていません。購入・譲受などで入手した弾薬情報を登録すると、活動記録で使う弾薬情報を参照しやすくなります。
      </div>
    );
  }

  return (
    <section id="ammo-records" className="grid scroll-mt-24 gap-4">
      {feedbackTarget === "ammo-records" ? <LocalFeedback feedback={feedback} /> : null}
      {records.map((record) => {
        const isEditing = editingId === record.id;
        const localFeedback =
          feedbackTarget === record.id || feedbackTarget === `ammo-record-${record.id}`
            ? feedback
            : null;

        return (
          <article
            id={`ammo-record-${record.id}`}
            key={record.id}
            className="scroll-mt-24 rounded-[30px] border border-emerald-950/10 bg-white/92 p-5 shadow-[0_24px_50px_-36px_rgba(15,23,42,0.38)]"
          >
            <div className="grid gap-3">
              <LocalFeedback feedback={localFeedback} />

              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div className="space-y-1">
                  <p className="text-xs font-semibold tracking-[0.16em] text-slate-500 uppercase">
                    {ammoRecordTypeLabels[record.recordType]}
                  </p>
                  <h3 className="text-lg font-semibold text-slate-950">
                    {ammoCategoryLabels[record.ammoCategory]} / 購入した弾数 {record.quantity} 発
                  </h3>
                  <p className="text-sm text-slate-600">
                    {formatAmmoRecordDateLabel(record.transactionDate)}
                  </p>
                </div>

                {!isEditing ? (
                  <button
                    type="button"
                    onClick={() => setEditingId(record.id)}
                    className="min-h-10 rounded-full border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700"
                  >
                    編集
                  </button>
                ) : null}
              </div>

              {isEditing ? (
                <form action={upsertAmmoAction} className="grid gap-3">
                  <input type="hidden" name="id" value={record.id} />
                  <div className={formGrid4}>
                    <label className={formFieldLabel}>
                      <span className={formLabelText}>日付</span>
                      <DateInput
                        name="transactionDate"
                        required
                        defaultValue={formatDateInput(record.transactionDate)}
                        className={formFieldCompact + " w-full"}
                      />
                    </label>
                    <label className={formFieldLabel}>
                      <span className={formLabelText}>記録区分</span>
                      <select
                        name="recordType"
                        defaultValue={record.recordType}
                        className={formFieldCompact + " w-full"}
                      >
                        {recordTypeOptions.map((option) => (
                          <option key={option.value} value={option.value}>
                            {option.label}
                          </option>
                        ))}
                      </select>
                    </label>
                    <AmmoCategoryFields
                      options={ammoCategoryOptions}
                      defaultAmmoCategory={record.ammoCategory}
                      defaultCaliber={record.caliber}
                      defaultShotSize={record.shotSize}
                      compact
                      quantityField={
                        <label className={formFieldLabel}>
                          <span className={formLabelText}>数量</span>
                          <input
                            type="number"
                            min={1}
                            required
                            name="quantity"
                            defaultValue={record.quantity}
                            className={formFieldCompact + " w-full"}
                          />
                        </label>
                      }
                      manufacturerField={
                        <label className={formFieldLabel}>
                          <span className={formLabelText}>実包メーカー</span>
                          <input
                            name="manufacturer"
                            defaultValue={record.manufacturer ?? ""}
                            placeholder="例: ウィンチェスター"
                            className={formFieldCompact + " w-full"}
                          />
                        </label>
                      }
                      supplierField={
                        <label className={formFieldLabel}>
                          <span className={formLabelText}>仕入先</span>
                          <input
                            name="supplierName"
                            defaultValue={record.supplierName ?? ""}
                            placeholder="仕入先"
                            className={formFieldCompact + " w-full"}
                          />
                        </label>
                      }
                    />
                    <label className={formFieldLabel + " lg:col-span-4"}>
                      <span className={formLabelText}>メモ</span>
                      <textarea
                        name="memo"
                        rows={2}
                        defaultValue={record.memo ?? ""}
                        placeholder="メモ"
                        className={formTextareaCompact + " w-full"}
                      />
                    </label>
                  </div>

                  <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                    <SubmitButton pendingChildren="更新中...">
                      内容を更新
                    </SubmitButton>
                    <button
                      type="button"
                      onClick={() => setEditingId(null)}
                      className="min-h-11 rounded-full border border-slate-200 bg-white px-5 text-sm font-semibold text-slate-700"
                    >
                      キャンセル
                    </button>
                  </div>
                </form>
              ) : (
                <>
                  <FieldGrid
                    items={[
                      { label: "口径", value: formatAmmoCaliberLabel(record.caliber) },
                      { label: "号数", value: display(record.shotSize) },
                      { label: "実包メーカー", value: display(record.manufacturer) },
                      { label: "仕入先", value: display(record.supplierName) },
                      { label: "購入した弾数", value: `${record.quantity}発` },
                    ]}
                  />
                  {record.memo ? (
                    <div className="rounded-[18px] bg-slate-50 p-3 text-sm">
                      <p className="text-xs font-semibold text-slate-500">メモ</p>
                      <p className="mt-1 whitespace-pre-wrap break-words font-semibold text-slate-950">
                        {record.memo}
                      </p>
                    </div>
                  ) : null}
                </>
              )}

              <form action={deleteAmmoAction} className={isEditing ? "mt-2" : ""}>
                <input type="hidden" name="id" value={record.id} />
                <SubmitButton variant="danger" pendingChildren="削除中...">
                  この記録を削除
                </SubmitButton>
              </form>
            </div>
          </article>
        );
      })}
    </section>
  );
}
