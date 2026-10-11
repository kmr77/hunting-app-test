"use client";

import { useActionState, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import type { ReactNode } from "react";
import {
  calculateGunLicenseExpiresOn,
  calculateHuntingLicenseExpiresOn,
  formatDateInput,
  formatDateLabel,
  formatJapaneseEraDate,
} from "@/lib/format";
import {
  completeFirearmInspectionAction,
  createFirearmBarrelRecordAction,
  deleteSelectedFirearmBarrelRecordsAction,
  deleteFirearmRecordAction,
  reopenFirearmInspectionAction,
  setPrimaryFirearmBarrelRecordAction,
  updateCompletedFirearmInspectionAction,
  updateFirearmBarrelRecordAction,
  updateFirearmRecordAction,
  updateHuntingLicenseInfoAction,
  updateRenewalPermitInfoAction,
  upsertFirearmInspectionScheduleAction,
} from "@/app/actions";
import { DateInput } from "@/components/date-input";
import {
  formFieldCompact,
  formFieldLabel,
  formGrid2,
  formGrid4,
  formLabelText,
  formTextareaCompact,
} from "@/lib/form-classes";

type Item = { label: string; value: string | null | undefined };
type Barrel = {
  id: string;
  barrelType: string;
  barrelTypeLabel: string;
  firearmKind?: string | null;
  barrelLength?: string | null;
  caliber?: string | null;
  riflingRate?: string | null;
  compatibleAmmo?: string | null;
  features?: string | null;
  purposeMemo?: string | null;
  notes?: string | null;
  isPrimary: boolean;
};
type Firearm = {
  id: string;
  displayName: string;
  firearmType: string;
  firearmTypeLabel: string;
  status: string;
  statusLabel: string;
  manufacturer?: string | null;
  modelName?: string | null;
  serialNumber: string;
  caliber?: string | null;
  totalLength?: string | null;
  barrelLength?: string | null;
  riflingRate?: string | null;
  magazineSpec?: string | null;
  compatibleAmmo?: string | null;
  features?: string | null;
  purposeText?: string | null;
  permittedOn?: string;
  expiresOn?: string;
  notes?: string | null;
  barrelRecords: Barrel[];
};
type FirearmInspection = {
  id: string;
  scheduledOn: string;
  status: "SCHEDULED" | "COMPLETED";
  statusLabel: string;
  inspectedOn?: string;
  notes?: string | null;
  completedAt?: string;
};
type Renewal = {
  id: string;
  category: string;
  status: string;
  statusLabel: string;
  issuedOn?: string;
  expiresOn?: string;
  targetDate?: string;
  reminderStartOn?: string;
  originalPermittedOn?: string;
  originalPermitNumber?: string | null;
  permitNumber?: string | null;
  confirmedOn?: string;
  applicationStartOn?: string;
  applicationEndOn?: string;
  validityDescription?: string | null;
  notes?: string | null;
  firearmRecords: Firearm[];
  firearmInspectionRecords: FirearmInspection[];
};

function display(value: string | null | undefined) {
  return value && value.length > 0 ? value : "未登録";
}

function permitNumber(value: string | null | undefined) {
  return value ? `第${value}号` : "未登録";
}

function displayDate(value: string | null | undefined) {
  return value ? formatJapaneseEraDate(value) : "未登録";
}

function displayDateWithEra(value: string | null | undefined) {
  return value
    ? `${formatDateLabel(value)}（${formatJapaneseEraDate(value).replace(/（.*）$/, "")}）`
    : "未登録";
}

function todayInputValue() {
  return formatDateInput(new Date());
}

const firearmInspectionDateInputHelp =
  "例: 2026年1月1日の場合は 20260101 と入力してください。";

function daysUntil(value: string) {
  const target = new Date(`${value}T00:00:00`);
  if (Number.isNaN(target.getTime())) {
    return null;
  }
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return Math.ceil((target.getTime() - today.getTime()) / 86_400_000);
}

function isOverdueInspection(value: string) {
  const remainingDays = daysUntil(value);
  return remainingDays !== null && remainingDays < 0;
}

function FieldGrid({ items }: { items: Item[] }) {
  return (
    <dl className="grid grid-cols-1 gap-x-8 gap-y-4 text-sm md:grid-cols-2 xl:grid-cols-3">
      {items.map((item) => (
        <div key={item.label} className="min-w-0 border-b border-slate-100 pb-3">
          <dt className="text-xs font-semibold leading-5 text-slate-500">
            {item.label}
          </dt>
          <dd className="mt-1 break-words font-semibold leading-6 text-slate-950">
            {display(item.value)}
          </dd>
        </div>
      ))}
    </dl>
  );
}

function getBarrelDisplayName(index: number, barrel: Barrel) {
  return `${index === 0 ? "銃身情報" : `替え銃身 ${index}`} / ${barrel.barrelTypeLabel}`;
}

function Actions({ onCancel }: { onCancel: () => void }) {
  return (
    <div className="flex flex-col gap-2 sm:flex-row">
      <button className="positive-cta min-h-11 rounded-full bg-[#2e7d32] px-5 text-sm font-extrabold !text-white transition-colors hover:bg-[#256528]">
        更新する
      </button>
      <button
        type="button"
        onClick={onCancel}
        className="min-h-11 rounded-full border border-slate-200 bg-white px-5 text-sm font-semibold text-slate-700"
      >
        キャンセル
      </button>
    </div>
  );
}

function Note() {
  return (
    <p className="text-sm font-bold text-red-600">
      銃砲許可証に記載されている情報をそのまま記載してください
    </p>
  );
}

const softSectionClass =
  "border-t border-slate-200 pt-6 first:border-t-0 first:pt-0";
const inlinePanelClass = "border-t border-slate-200 pt-4";

function ActionFeedback({
  state,
  successMessage,
}: {
  state: { success: boolean; errors?: Record<string, string>; message?: string } | null;
  successMessage: string;
}) {
  if (!state) {
    return null;
  }

  if (state.success) {
    return (
      <div className="max-w-full overflow-hidden break-words rounded-[18px] border border-emerald-200 bg-emerald-50 p-3 text-sm font-semibold text-emerald-950">
        {successMessage}
      </div>
    );
  }

  if (state.errors) {
    return (
      <div className="max-w-full overflow-hidden break-words rounded-[18px] border border-red-200 bg-red-50 p-3">
        <p className="text-sm font-semibold text-red-800">入力エラーがあります</p>
        <ul className="mt-2 list-disc list-inside text-sm text-red-700">
          {Object.entries(state.errors).map(([key, message]) => (
            <li key={key} className="break-words">{message as string}</li>
          ))}
        </ul>
      </div>
    );
  }

  return (
    <div className="max-w-full overflow-hidden whitespace-pre-wrap break-words rounded-[18px] border border-red-200 bg-red-50 p-3 text-sm font-semibold text-red-800">
      {state.message ?? "更新に失敗しました。"}
    </div>
  );
}

function getRenewalTitle(renewal: Renewal) {
  return renewal.category === "GUN_LICENSE"
    ? "銃砲所持許可 更新管理"
    : "狩猟免許（狩猟免状） 更新管理";
}

function getRenewalCategoryLabel(renewal: Renewal) {
  return renewal.category === "GUN_LICENSE"
    ? "銃砲所持許可"
    : "狩猟免許（狩猟免状）";
}

export function RenewalRecordCard({
  renewal,
  userBirthDate,
  children,
}: {
  renewal: Renewal;
  userBirthDate: string;
  children?: ReactNode;
}) {
  const router = useRouter();
  const firearm = renewal.firearmRecords[0];
  const actualPrimaryBarrelId =
    firearm?.barrelRecords.find((barrel) => barrel.isPrimary)?.id ?? "";
  const [editing, setEditing] = useState<"permit" | "firearm" | string | null>(null);
  const [expanded, setExpanded] = useState(false);
  const [selectedBarrelIds, setSelectedBarrelIds] = useState<string[]>([]);
  const [primaryBarrelId, setPrimaryBarrelId] = useState(actualPrimaryBarrelId);
  const [permitOriginalPermittedOn, setPermitOriginalPermittedOn] = useState(
    renewal.originalPermittedOn ?? "",
  );
  const [huntingIssuedOn, setHuntingIssuedOn] = useState(renewal.issuedOn ?? "");
  const [huntingState, huntingAction] = useActionState(
    updateHuntingLicenseInfoAction,
    null,
  );
  const [permitState, permitAction] = useActionState(updateRenewalPermitInfoAction, null);
  const [firearmState, firearmAction] = useActionState(updateFirearmRecordAction, null);
  const [barrelState, barrelAction] = useActionState(updateFirearmBarrelRecordAction, null);
  const [deleteBarrelsState, deleteBarrelsAction] = useActionState(
    deleteSelectedFirearmBarrelRecordsAction,
    null,
  );
  const [primaryBarrelState, primaryBarrelAction] = useActionState(
    setPrimaryFirearmBarrelRecordAction,
    null,
  );
  const calculatedPermitExpiresOn = calculateGunLicenseExpiresOn(
    userBirthDate,
    permitOriginalPermittedOn,
  );
  const calculatedHuntingExpiresOn =
    calculateHuntingLicenseExpiresOn(huntingIssuedOn);

  function handlePermitOriginalPermittedOnChange(value: string) {
    setPermitOriginalPermittedOn(value);
  }

  function toggleBarrelSelection(id: string, checked: boolean) {
    setSelectedBarrelIds((current) =>
      checked
        ? Array.from(new Set([...current, id]))
        : current.filter((item) => item !== id),
    );
  }

  useEffect(() => {
    setPrimaryBarrelId(actualPrimaryBarrelId);
  }, [actualPrimaryBarrelId]);

  useEffect(() => {
    if (!primaryBarrelState) {
      return;
    }

    if (primaryBarrelState.success) {
      router.refresh();
      return;
    }

    setPrimaryBarrelId(actualPrimaryBarrelId);
  }, [actualPrimaryBarrelId, primaryBarrelState, router]);

  const accordionPanelId = `renewal-details-${renewal.id}`;
  const isGunLicense = renewal.category === "GUN_LICENSE";
  const nextInspection = isGunLicense
    ? renewal.firearmInspectionRecords
        .filter((inspection) => inspection.status === "SCHEDULED")
        .sort((a, b) => a.scheduledOn.localeCompare(b.scheduledOn))[0] ?? null
    : null;
  const summaryItems = [
    { label: "種別", value: getRenewalCategoryLabel(renewal) },
    { label: "有効期限", value: displayDate(renewal.expiresOn) },
    { label: "状態", value: renewal.statusLabel },
    ...(isGunLicense
      ? [
          { label: "銃本体", value: `${renewal.firearmRecords.length}丁` },
          {
            label: "銃検",
            value: nextInspection
              ? `${displayDate(nextInspection.scheduledOn)} / ${nextInspection.statusLabel}`
              : "未登録",
          },
        ]
      : []),
  ];

  return (
    <article className="overflow-hidden rounded-[30px] border border-emerald-950/10 bg-white/92 shadow-[0_20px_46px_-36px_rgba(15,23,42,0.36)]">
      <button
        type="button"
        aria-expanded={expanded}
        aria-controls={accordionPanelId}
        onClick={() => setExpanded((current) => !current)}
        className="flex w-full flex-col gap-3 px-4 py-4 text-left transition-colors hover:bg-emerald-50/70 sm:px-5"
      >
        <span className="flex min-w-0 items-start justify-between gap-4">
          <span className="min-w-0">
            <span className="text-xs font-semibold tracking-[0.16em] text-emerald-700 uppercase">
              登録済み
            </span>
            <span className="mt-1 block break-words text-base font-bold text-slate-950">
              {expanded ? "－" : "＋"} {getRenewalTitle(renewal)}
            </span>
          </span>
          <span className="shrink-0 rounded-full border border-emerald-950/10 bg-white px-3 py-1 text-xs font-bold text-emerald-800">
            {expanded ? "閉じる" : "開く"}
          </span>
        </span>
        <span className="grid w-full min-w-0 grid-cols-1 gap-2 text-sm sm:grid-cols-2 lg:grid-cols-5">
          {summaryItems.map((item) => (
            <span
              key={item.label}
              className="min-w-0 rounded-[16px] bg-slate-50 px-3 py-2"
            >
              <span className="block text-xs font-semibold text-slate-500">
                {item.label}
              </span>
              <span className="mt-1 block break-words font-semibold text-slate-950">
                {item.value}
              </span>
            </span>
          ))}
        </span>
      </button>

      {expanded ? (
        <div id={accordionPanelId} className="border-t border-emerald-950/10 p-4 sm:p-5">
          <div className="grid gap-6">
      {renewal.category === "HUNTING_LICENSE" ? (
        <section className={softSectionClass}>
          <div className="mb-3 flex items-start justify-between gap-3">
            <div>
              <p className="text-sm font-semibold text-slate-900">
                狩猟免許（狩猟免状）情報
              </p>
              <p className="text-xs leading-6 text-slate-600">
                交付日から有効期限日を自動計算します。
              </p>
            </div>
            {editing !== "hunting" ? (
              <button
                type="button"
                onClick={() => setEditing("hunting")}
                className="rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700"
              >
                編集
              </button>
            ) : null}
          </div>
          {editing === "hunting" ? (
            <form action={huntingAction} className="grid gap-3">
              <ActionFeedback
                state={huntingState}
                successMessage="免許・許可情報を更新しました。"
              />
              <input type="hidden" name="id" value={renewal.id} />
              <input type="hidden" name="status" value={renewal.status} />
              <div className={formGrid2}>
                <label className={formFieldLabel}>
                  <span className={formLabelText}>交付日</span>
                  <DateInput
                    name="issuedOn"
                    value={huntingIssuedOn}
                    onChange={(event) => setHuntingIssuedOn(event.target.value)}
                    className={formFieldCompact}
                  />
                </label>
                <div className="min-w-0 space-y-1.5 rounded-[18px] border border-emerald-950/10 bg-emerald-50/70 p-3 text-sm">
                  <span className={formLabelText}>有効期限日</span>
                  <p className="font-semibold text-slate-950">
                    {calculatedHuntingExpiresOn
                      ? formatJapaneseEraDate(calculatedHuntingExpiresOn)
                      : "交付日を入力すると自動表示されます"}
                  </p>
                  <p className="text-xs leading-5 text-slate-500">
                    保存時に交付日の年 + 3年の9月14日として再計算します。
                  </p>
                </div>
                <label className={formFieldLabel + " lg:col-span-2"}>
                  <span className={formLabelText}>メモ</span>
                  <textarea
                    name="notes"
                    rows={2}
                    defaultValue={renewal.notes ?? ""}
                    className={formTextareaCompact}
                  />
                </label>
              </div>
              <Actions onCancel={() => setEditing(null)} />
            </form>
          ) : (
            <FieldGrid
              items={[
                { label: "交付日", value: displayDate(renewal.issuedOn) },
                { label: "有効期限日", value: displayDate(renewal.expiresOn) },
                { label: "更新予定日", value: displayDate(renewal.targetDate) },
                { label: "通知開始目安", value: displayDate(renewal.reminderStartOn) },
                { label: "メモ", value: renewal.notes },
              ]}
            />
          )}
        </section>
      ) : (
      <section className={softSectionClass}>
        <div className="mb-3 flex items-start justify-between gap-3">
          <div>
            <p className="text-sm font-semibold text-slate-900">銃砲所持許可証情報</p>
            <p className="text-xs leading-6 text-slate-600">
              許可番号は表示時に「第」「号」を付けています。
            </p>
          </div>
          {editing !== "permit" ? (
            <button
              type="button"
              onClick={() => setEditing("permit")}
              className="rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700"
            >
              編集
            </button>
          ) : null}
        </div>
        {editing === "permit" ? (
          <form action={permitAction} className="grid gap-3">
            <ActionFeedback
              state={permitState}
              successMessage="免許・許可情報を更新しました。"
            />
            <input type="hidden" name="id" value={renewal.id} />
            <input type="hidden" name="status" value={renewal.status} />
            <Note />
            <div className={formGrid4}>
              <label className={formFieldLabel}><span className={formLabelText}>許可日</span><DateInput name="originalPermittedOn" value={permitOriginalPermittedOn} onChange={(event) => handlePermitOriginalPermittedOnChange(event.target.value)} className={formFieldCompact} /></label>
              <label className={formFieldLabel}><span className={formLabelText}>交付日</span><DateInput name="issuedOn" defaultValue={renewal.issuedOn} className={formFieldCompact} /></label>
              <div className="min-w-0 space-y-1.5 rounded-[18px] border border-emerald-950/10 bg-emerald-50/70 p-3 text-sm"><span className={formLabelText}>有効期限日</span><p className="font-semibold text-slate-950">{calculatedPermitExpiresOn ? formatJapaneseEraDate(calculatedPermitExpiresOn) : "許可日と生年月日を入力すると自動表示されます"}</p><p className="text-xs leading-5 text-slate-500">保存時に許可日と利用者本人の生年月日から再計算します。</p></div>
              <label className={formFieldLabel}><span className={formLabelText}>最初の許可番号</span><input name="originalPermitNumber" defaultValue={renewal.originalPermitNumber ?? ""} className={formFieldCompact} /></label>
              <label className={formFieldLabel}><span className={formLabelText}>今回の許可番号</span><input name="permitNumber" defaultValue={renewal.permitNumber ?? ""} className={formFieldCompact} /></label>
              <label className={formFieldLabel}><span className={formLabelText}>確認日</span><DateInput name="confirmedOn" defaultValue={renewal.confirmedOn} className={formFieldCompact} /></label>
              <label className={formFieldLabel}><span className={formLabelText}>更新申請期間開始日</span><DateInput name="applicationStartOn" defaultValue={renewal.applicationStartOn} className={formFieldCompact} /></label>
              <label className={formFieldLabel}><span className={formLabelText}>更新申請期間終了日</span><DateInput name="applicationEndOn" defaultValue={renewal.applicationEndOn} className={formFieldCompact} /></label>
              <label className={formFieldLabel + " lg:col-span-2"}><span className={formLabelText}>有効期間</span><input name="validityDescription" defaultValue={renewal.validityDescription ?? ""} className={formFieldCompact} /></label>
              <label className={formFieldLabel + " lg:col-span-4"}><span className={formLabelText}>メモ</span><textarea name="notes" rows={2} defaultValue={renewal.notes ?? ""} className={formTextareaCompact} /></label>
            </div>
            <Actions onCancel={() => setEditing(null)} />
          </form>
        ) : (
          <FieldGrid
            items={[
              { label: "許可日", value: displayDate(renewal.originalPermittedOn) },
              { label: "最初の許可番号", value: permitNumber(renewal.originalPermitNumber) },
              { label: "今回の許可番号", value: permitNumber(renewal.permitNumber) },
              { label: "交付日", value: displayDate(renewal.issuedOn) },
              { label: "有効期限日", value: displayDate(renewal.expiresOn) },
              { label: "更新予定日", value: displayDate(renewal.targetDate) },
              { label: "通知開始目安", value: displayDate(renewal.reminderStartOn) },
              { label: "確認日", value: displayDate(renewal.confirmedOn) },
              { label: "有効期間", value: renewal.validityDescription },
              { label: "更新申請期間開始日", value: displayDate(renewal.applicationStartOn) },
              { label: "更新申請期間終了日", value: displayDate(renewal.applicationEndOn) },
            ]}
          />
        )}
      </section>
      )}

      {renewal.category === "GUN_LICENSE" ? (
        <FirearmInspectionSection
          renewalRecordId={renewal.id}
          inspections={renewal.firearmInspectionRecords}
        />
      ) : null}

      {renewal.category === "GUN_LICENSE" && firearm ? (
        <section className={softSectionClass}>
          <div className="mb-3 flex items-start justify-between gap-3">
            <div>
              <p className="text-sm font-semibold text-slate-900">銃本体 1丁</p>
              <p className="text-xs leading-6 text-slate-600">
                替え銃身が複数あっても、銃本体が1丁なら銃の登録数は1丁です。
              </p>
            </div>
            {editing !== "firearm" ? <button type="button" onClick={() => setEditing("firearm")} className="rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700">編集</button> : null}
          </div>
          {editing === "firearm" ? (
            <FirearmForm
              firearm={firearm}
              onCancel={() => setEditing(null)}
              state={firearmState}
              action={firearmAction}
            />
          ) : (
            <FirearmView firearm={firearm} primaryBarrelId={primaryBarrelId} />
          )}
          <div className="mt-4">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-sm font-semibold text-slate-900">
                銃身情報 {firearm.barrelRecords.length}本
              </p>
              {editing === null ? (
                <button
                  type="button"
                  onClick={() => setEditing("new-barrel")}
                  className="rounded-full border border-emerald-950/10 bg-white px-4 py-2 text-sm font-semibold text-emerald-900"
                >
                  + 銃身を追加
                </button>
              ) : null}
            </div>
            {firearm.barrelRecords.length > 0 &&
            !primaryBarrelId ? (
              <p className="mt-2 border-l-4 border-amber-300 bg-amber-50 px-3 py-2 text-sm font-semibold text-amber-900">
                本銃身が未設定です。銃身カードの「本銃身にする」から1本選択してください。
              </p>
            ) : null}
            <div className="mt-3 grid gap-2">
              <ActionFeedback
                state={primaryBarrelState}
                successMessage="本銃身を設定しました。"
              />
              <ActionFeedback
                state={deleteBarrelsState}
                successMessage="選択した銃身を削除しました。"
              />
            </div>
            <div className="mt-3 grid gap-3">
              {editing === "new-barrel" ? (
                <NewBarrelForm
                  firearmId={firearm.id}
                  onCancel={() => setEditing(null)}
                />
              ) : null}
              {firearm.barrelRecords.map((barrel, index) => (
                <BarrelCard
                  key={barrel.id}
                  barrel={barrel}
                  index={index}
                  editing={editing === barrel.id}
                  selected={selectedBarrelIds.includes(barrel.id)}
                  isPrimary={primaryBarrelId === barrel.id}
                  onSelect={(checked) => toggleBarrelSelection(barrel.id, checked)}
                  onPrimarySelect={() => setPrimaryBarrelId(barrel.id)}
                  onEdit={() => setEditing(barrel.id)}
                  onCancel={() => setEditing(null)}
                  state={barrelState}
                  action={barrelAction}
                  primaryAction={primaryBarrelAction}
                />
              ))}
            </div>
            <form
              action={deleteBarrelsAction}
              className="mt-3 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between"
              onSubmit={(event) => {
                if (selectedBarrelIds.length === 0) {
                  event.preventDefault();
                  return;
                }
                if (!confirm("選択した銃身を削除します。よろしいですか？")) {
                  event.preventDefault();
                }
              }}
            >
              {selectedBarrelIds.map((id) => (
                <input key={id} type="hidden" name="barrelIds" value={id} />
              ))}
              <p className="text-xs leading-6 text-slate-600">
                本銃身は削除できません。先に別の銃身を本銃身に設定してください。
              </p>
              <button
                disabled={selectedBarrelIds.length === 0}
                className="min-h-11 rounded-full border border-red-200 bg-white px-5 text-sm font-semibold text-red-700 disabled:cursor-not-allowed disabled:opacity-45"
              >
                選択した銃身を削除
              </button>
            </form>
          </div>
        </section>
      ) : null}
      {children ? (
        <div className="border-t border-slate-200 pt-6">{children}</div>
      ) : null}
          </div>
        </div>
      ) : null}
    </article>
  );
}

function FirearmInspectionSection({
  renewalRecordId,
  inspections,
}: {
  renewalRecordId: string;
  inspections: FirearmInspection[];
}) {
  const [scheduleState, scheduleAction] = useActionState(
    upsertFirearmInspectionScheduleAction,
    null,
  );
  const [completeState, completeAction] = useActionState(
    completeFirearmInspectionAction,
    null,
  );
  const [completedUpdateState, completedUpdateAction] = useActionState(
    updateCompletedFirearmInspectionAction,
    null,
  );
  const [reopenState, reopenAction] = useActionState(
    reopenFirearmInspectionAction,
    null,
  );
  const [mode, setMode] = useState<
    | { type: "new" }
    | { type: "edit-scheduled"; id: string }
    | { type: "complete"; id: string }
    | { type: "edit-completed"; id: string }
    | null
  >(null);
  const [feedbackTarget, setFeedbackTarget] = useState<
    "schedule" | "complete" | "completed-update" | "reopen" | "keep" | null
  >(null);

  const scheduledInspections = inspections
    .filter((inspection) => inspection.status === "SCHEDULED")
    .sort((a, b) => a.scheduledOn.localeCompare(b.scheduledOn));
  const nextInspection = scheduledInspections[0] ?? null;
  const completedInspections = inspections
    .filter((inspection) => inspection.status === "COMPLETED")
    .sort((a, b) => b.scheduledOn.localeCompare(a.scheduledOn));

  useEffect(() => {
    if (
      scheduleState?.success ||
      completeState?.success ||
      completedUpdateState?.success ||
      reopenState?.success
    ) {
      setMode(null);
    }
  }, [
    scheduleState,
    completeState,
    completedUpdateState,
    reopenState,
  ]);

  return (
    <section
      id={`inspection-${renewalRecordId}`}
      className={softSectionClass}
    >
      <div className="mb-3 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-sm font-semibold text-slate-900">銃検管理</p>
          <p className="text-xs leading-6 text-slate-600">
            銃検予定と完了履歴を銃砲所持許可ごとに残します。
          </p>
        </div>
        {!nextInspection && mode?.type !== "new" ? (
          <button
            type="button"
            onClick={() => setMode({ type: "new" })}
            className="rounded-full border border-emerald-950/10 bg-white px-4 py-2 text-sm font-semibold text-emerald-900"
          >
            銃検予定日を登録
          </button>
        ) : null}
      </div>

      <div className="grid gap-3">
        {feedbackTarget === "schedule" ? (
          <ActionFeedback
            state={scheduleState}
            successMessage="銃検予定を保存しました。"
          />
        ) : null}
        {feedbackTarget === "complete" ? (
          <ActionFeedback
            state={completeState}
            successMessage="銃検済みに変更しました。"
          />
        ) : null}
        {feedbackTarget === "completed-update" ? (
          <ActionFeedback
            state={completedUpdateState}
            successMessage="銃検記録を更新しました。"
          />
        ) : null}
        {feedbackTarget === "reopen" ? (
          <ActionFeedback
            state={reopenState}
            successMessage="銃検済みを取り消しました。"
          />
        ) : null}
        {feedbackTarget === "keep" ? (
          <div className="max-w-full overflow-hidden break-words rounded-[18px] border border-emerald-200 bg-emerald-50 p-3 text-sm font-semibold text-emerald-950">
            未実施のまま保持しました。
          </div>
        ) : null}

        {nextInspection ? (
          <InspectionSummary
            inspection={nextInspection}
            editing={mode?.type === "edit-scheduled" && mode.id === nextInspection.id}
            completing={mode?.type === "complete" && mode.id === nextInspection.id}
            scheduleAction={scheduleAction}
            completeAction={completeAction}
            onScheduleSubmit={() => setFeedbackTarget("schedule")}
            onCompleteSubmit={() => setFeedbackTarget("complete")}
            onEdit={() =>
              setMode({ type: "edit-scheduled", id: nextInspection.id })
            }
            onComplete={() => {
              setMode({ type: "complete", id: nextInspection.id });
            }}
            onKeepScheduled={() => {
              setFeedbackTarget("keep");
              setMode(null);
            }}
            onCancel={() => setMode(null)}
          />
        ) : mode?.type === "new" ? (
          <InspectionScheduleForm
            renewalRecordId={renewalRecordId}
            action={scheduleAction}
            onSubmit={() => setFeedbackTarget("schedule")}
            onCancel={() => setMode(null)}
          />
        ) : (
          <p className="border-t border-dashed border-slate-200 pt-3 text-sm leading-6 text-slate-600">
            未実施の銃検予定はありません。次回予定が決まったら登録してください。
          </p>
        )}

        <div className="grid gap-2">
          <p className="text-sm font-semibold text-slate-900">銃検履歴</p>
          {completedInspections.length === 0 ? (
            <p className="border-t border-slate-200 pt-3 text-sm text-slate-600">
              銃検済みの履歴はまだありません。
            </p>
          ) : (
            completedInspections.map((inspection) => (
              <CompletedInspectionCard
                key={inspection.id}
                inspection={inspection}
                editing={
                  mode?.type === "edit-completed" && mode.id === inspection.id
                }
                action={completedUpdateAction}
                reopenAction={reopenAction}
                onUpdateSubmit={() => setFeedbackTarget("completed-update")}
                onReopenSubmit={() => setFeedbackTarget("reopen")}
                onEdit={() => {
                  if (
                    confirm("銃検済みの記録を修正します。よろしいですか？")
                  ) {
                    setMode({ type: "edit-completed", id: inspection.id });
                  }
                }}
                onCancel={() => setMode(null)}
              />
            ))
          )}
        </div>
      </div>
    </section>
  );
}

function InspectionStatusLine({ inspection }: { inspection: FirearmInspection }) {
  const remainingDays = daysUntil(inspection.scheduledOn);
  if (remainingDays === null) {
    return null;
  }

  if (remainingDays < 0) {
    return (
      <p className="mt-2 border-l-4 border-red-300 bg-red-50 px-3 py-2 text-sm font-semibold text-red-800">
        銃検予定日を過ぎています
      </p>
    );
  }

  return (
    <p className="mt-2 text-sm font-semibold text-emerald-900">
      {remainingDays === 0 ? "本日が銃検予定日です" : `あと${remainingDays}日`}
    </p>
  );
}

function InspectionSummary({
  inspection,
  editing,
  completing,
  scheduleAction,
  completeAction,
  onScheduleSubmit,
  onCompleteSubmit,
  onEdit,
  onComplete,
  onKeepScheduled,
  onCancel,
}: {
  inspection: FirearmInspection;
  editing: boolean;
  completing: boolean;
  scheduleAction: (formData: FormData) => void;
  completeAction: (formData: FormData) => void;
  onScheduleSubmit: () => void;
  onCompleteSubmit: () => void;
  onEdit: () => void;
  onComplete: () => void;
  onKeepScheduled: () => void;
  onCancel: () => void;
}) {
  if (editing) {
    return (
      <InspectionScheduleForm
        inspection={inspection}
        action={scheduleAction}
        onSubmit={onScheduleSubmit}
        onCancel={onCancel}
      />
    );
  }

  if (completing) {
    return (
      <form
        action={completeAction}
        onSubmit={(event) => {
          if (
            !confirm(
              "この銃検を「銃検済み」に変更します。よろしいですか？",
            )
          ) {
            event.preventDefault();
            return;
          }
          onCompleteSubmit();
        }}
        className="grid gap-3 border-t border-slate-200 pt-4"
      >
        <input type="hidden" name="id" value={inspection.id} />
        <div className={formGrid2}>
          <label className={formFieldLabel}>
            <span className={formLabelText}>銃検実施日</span>
            <DateInput
              name="inspectedOn"
              defaultValue={inspection.scheduledOn || todayInputValue()}
              exampleText={firearmInspectionDateInputHelp}
              placeholderText="例: 20260101"
              className={formFieldCompact}
            />
          </label>
          <label className={formFieldLabel + " lg:col-span-2"}>
            <span className={formLabelText}>メモ</span>
            <textarea
              name="notes"
              rows={2}
              defaultValue={inspection.notes ?? ""}
              className={formTextareaCompact}
            />
          </label>
        </div>
        <div className="flex flex-col gap-2 sm:flex-row">
          <button className="positive-cta min-h-11 rounded-full bg-[#2e7d32] px-5 text-sm font-extrabold !text-white transition-colors hover:bg-[#256528]">
            銃検終了
          </button>
          <button
            type="button"
            onClick={onCancel}
            className="min-h-11 rounded-full border border-slate-200 bg-white px-5 text-sm font-semibold text-slate-700"
          >
            キャンセル
          </button>
        </div>
      </form>
    );
  }

  const isOverdue = isOverdueInspection(inspection.scheduledOn);

  return (
    <div className={inlinePanelClass}>
      <dl className={`${formGrid2} gap-2 text-sm`}>
        <div>
          <dt className="text-xs font-semibold text-slate-500">次回銃検予定日</dt>
          <dd className="font-semibold text-slate-950">
            {displayDateWithEra(inspection.scheduledOn)}
          </dd>
        </div>
        <div>
          <dt className="text-xs font-semibold text-slate-500">状態</dt>
          <dd className="font-semibold text-slate-950">{inspection.statusLabel}</dd>
        </div>
        <div className="sm:col-span-2">
          <dt className="text-xs font-semibold text-slate-500">メモ</dt>
          <dd className="font-semibold text-slate-950">
            {display(inspection.notes)}
          </dd>
        </div>
      </dl>
      {isOverdue ? (
        <div className="mt-3 border-l-4 border-red-300 bg-red-50 px-3 py-2 text-sm text-red-800">
          <p className="font-semibold">銃検予定日を過ぎています。</p>
          <p className="mt-1 font-semibold">銃検は完了しましたか？</p>
          <div className="mt-3 flex flex-col gap-2 sm:flex-row">
            <button
              type="button"
              onClick={onComplete}
              className="positive-cta min-h-10 rounded-full bg-[#2e7d32] px-4 text-sm font-extrabold !text-white transition-colors hover:bg-[#256528]"
            >
              銃検済みにする
            </button>
            <button
              type="button"
              onClick={onKeepScheduled}
              className="min-h-10 rounded-full border border-red-200 bg-white px-4 text-sm font-semibold text-red-800"
            >
              未実施のままにする
            </button>
          </div>
        </div>
      ) : (
        <InspectionStatusLine inspection={inspection} />
      )}
      <div className="mt-3 flex flex-col gap-2 sm:flex-row">
        <button
          type="button"
          onClick={onEdit}
          className="rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700"
        >
          銃検予定を編集
        </button>
        {!isOverdue ? (
          <button
            type="button"
            onClick={onComplete}
            className="positive-cta min-h-10 rounded-full bg-[#2e7d32] px-4 text-sm font-extrabold !text-white transition-colors hover:bg-[#256528]"
          >
            銃検終了
          </button>
        ) : null}
      </div>
    </div>
  );
}

function InspectionScheduleForm({
  renewalRecordId,
  inspection,
  action,
  onSubmit,
  onCancel,
}: {
  renewalRecordId?: string;
  inspection?: FirearmInspection;
  action: (formData: FormData) => void;
  onSubmit: () => void;
  onCancel: () => void;
}) {
  return (
    <form
      action={action}
      onSubmit={onSubmit}
      className="grid gap-3 border-t border-slate-200 pt-4"
    >
      {inspection ? (
        <input type="hidden" name="id" value={inspection.id} />
      ) : (
        <input type="hidden" name="renewalRecordId" value={renewalRecordId} />
      )}
      <div className={formGrid2}>
        <label className={formFieldLabel}>
          <span className={formLabelText}>銃検予定日</span>
          <DateInput
            name="scheduledOn"
            defaultValue={inspection?.scheduledOn ?? ""}
            exampleText={firearmInspectionDateInputHelp}
            placeholderText="例: 20260101"
            className={formFieldCompact}
          />
        </label>
        <label className={formFieldLabel + " lg:col-span-2"}>
          <span className={formLabelText}>メモ</span>
          <textarea
            name="notes"
            rows={2}
            defaultValue={inspection?.notes ?? ""}
            className={formTextareaCompact}
          />
        </label>
      </div>
      <div className="flex flex-col gap-2 sm:flex-row">
        <button className="positive-cta min-h-11 rounded-full bg-[#2e7d32] px-5 text-sm font-extrabold !text-white transition-colors hover:bg-[#256528]">
          銃検予定を保存
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="min-h-11 rounded-full border border-slate-200 bg-white px-5 text-sm font-semibold text-slate-700"
        >
          キャンセル
        </button>
      </div>
    </form>
  );
}

function CompletedInspectionCard({
  inspection,
  editing,
  action,
  reopenAction,
  onUpdateSubmit,
  onReopenSubmit,
  onEdit,
  onCancel,
}: {
  inspection: FirearmInspection;
  editing: boolean;
  action: (formData: FormData) => void;
  reopenAction: (formData: FormData) => void;
  onUpdateSubmit: () => void;
  onReopenSubmit: () => void;
  onEdit: () => void;
  onCancel: () => void;
}) {
  if (editing) {
    return (
      <form
        action={action}
        onSubmit={onUpdateSubmit}
        className="grid gap-3 border-t border-slate-200 pt-4"
      >
        <input type="hidden" name="id" value={inspection.id} />
        <div className={formGrid2}>
          <label className={formFieldLabel}>
            <span className={formLabelText}>銃検予定日</span>
            <DateInput
              name="scheduledOn"
              defaultValue={inspection.scheduledOn}
              exampleText={firearmInspectionDateInputHelp}
              placeholderText="例: 20260101"
              className={formFieldCompact}
            />
          </label>
          <label className={formFieldLabel}>
            <span className={formLabelText}>銃検実施日</span>
            <DateInput
              name="inspectedOn"
              defaultValue={inspection.inspectedOn ?? ""}
              exampleText={firearmInspectionDateInputHelp}
              placeholderText="例: 20260101"
              className={formFieldCompact}
            />
          </label>
          <label className={formFieldLabel + " lg:col-span-2"}>
            <span className={formLabelText}>メモ</span>
            <textarea
              name="notes"
              rows={2}
              defaultValue={inspection.notes ?? ""}
              className={formTextareaCompact}
            />
          </label>
        </div>
        <div className="flex flex-col gap-2 sm:flex-row">
          <button className="positive-cta min-h-11 rounded-full bg-[#2e7d32] px-5 text-sm font-extrabold !text-white transition-colors hover:bg-[#256528]">
            銃検記録を更新
          </button>
          <button
            type="button"
            onClick={onCancel}
            className="min-h-11 rounded-full border border-slate-200 bg-white px-5 text-sm font-semibold text-slate-700"
          >
            キャンセル
          </button>
        </div>
      </form>
    );
  }

  return (
    <div className={inlinePanelClass}>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-sm font-semibold text-slate-950">銃検済み</p>
          <p className="mt-1 text-sm text-slate-700">
            予定日：{displayDateWithEra(inspection.scheduledOn)}
          </p>
          <p className="mt-1 text-sm text-slate-700">
            実施日：{displayDateWithEra(inspection.inspectedOn)}
          </p>
          <p className="mt-1 text-sm text-slate-700">
            メモ：{display(inspection.notes)}
          </p>
        </div>
        <div className="flex flex-col gap-2 sm:items-end">
          <button
            type="button"
            onClick={onEdit}
            className="rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700"
          >
            修正する
          </button>
          <form
            action={reopenAction}
            onSubmit={(event) => {
              if (
                !confirm(
                  "銃検済みの状態を取り消し、未実施へ戻します。よろしいですか？",
                )
              ) {
                event.preventDefault();
                return;
              }
              onReopenSubmit();
            }}
          >
            <input type="hidden" name="id" value={inspection.id} />
            <button className="rounded-full border border-amber-200 bg-amber-50 px-4 py-2 text-sm font-semibold text-amber-900">
              未実施に戻す
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}

function FirearmView({
  firearm,
  primaryBarrelId,
}: {
  firearm: Firearm;
  primaryBarrelId: string;
}) {
  const primaryBarrelIndex = firearm.barrelRecords.findIndex(
    (barrel) => barrel.id === primaryBarrelId,
  );
  const primaryBarrel =
    primaryBarrelIndex >= 0 ? firearm.barrelRecords[primaryBarrelIndex] : null;
  const items: Item[] = [
    { label: "銃の全長", value: firearm.totalLength },
    { label: "銃身長", value: firearm.barrelLength },
    { label: "口径", value: firearm.caliber },
    { label: "銃腔内旋割合", value: firearm.riflingRate },
    { label: "弾倉形式及び充填可能弾数", value: firearm.magazineSpec },
    { label: "適合実包", value: firearm.compatibleAmmo },
    { label: "特徴", value: firearm.features },
    { label: "用途", value: firearm.purposeText },
    { label: "状態", value: firearm.statusLabel },
    { label: "備考", value: firearm.notes },
    {
      label: "本銃身",
      value: primaryBarrel
        ? getBarrelDisplayName(primaryBarrelIndex, primaryBarrel)
        : "未設定",
    },
  ];

  return (
    <div>
      <h4 className="text-base font-semibold text-slate-950">{display(firearm.manufacturer)} {display(firearm.modelName)}</h4>
      <p className="mt-1 text-sm text-slate-600">{firearm.firearmTypeLabel} / 銃番号 {firearm.serialNumber}</p>
      <FieldGrid items={items} />
    </div>
  );
}

function FirearmForm({ firearm, onCancel, state, action }: { firearm: Firearm; onCancel: () => void; state: any; action: any }) {
  return (
    <>
      <form action={action} className="grid gap-3 border-t border-slate-200 pt-4">
        {state && !state.success && state.errors && (
          <div className="rounded-[18px] border border-red-200 bg-red-50 p-3">
            <p className="text-sm font-semibold text-red-800">入力エラーがあります</p>
            <ul className="mt-2 list-disc list-inside text-sm text-red-700">
              {Object.entries(state.errors).map(([key, message]) => (
                <li key={key}>{message as string}</li>
              ))}
            </ul>
          </div>
        )}
        <input type="hidden" name="id" value={firearm.id} />
        <Note />
        <div className={formGrid4}>
        {[
          ["銃の管理名", "firearmDisplayName", firearm.displayName],
          ["メーカー", "manufacturer", firearm.manufacturer],
          ["型式", "modelName", firearm.modelName],
          ["銃番号", "serialNumber", firearm.serialNumber],
          ["口径", "caliber", firearm.caliber],
          ["銃の全長", "firearmTotalLength", firearm.totalLength],
          ["銃身長", "firearmBarrelLength", firearm.barrelLength],
          ["銃腔内旋割合", "firearmRiflingRate", firearm.riflingRate],
          ["弾倉形式及び充填可能弾数", "firearmMagazineSpec", firearm.magazineSpec],
          ["適合実包", "firearmCompatibleAmmo", firearm.compatibleAmmo],
          ["特徴", "firearmFeatures", firearm.features],
          ["用途", "firearmPurposeText", firearm.purposeText],
        ].map(([label, name, value]) => <label key={name} className={formFieldLabel}><span className={formLabelText}>{label}</span><input name={name ?? ""} defaultValue={value ?? ""} className={formFieldCompact} /></label>)}
        <label className={formFieldLabel}><span className={formLabelText}>許可日</span><DateInput name="firearmPermittedOn" defaultValue={firearm.permittedOn ?? ""} className={formFieldCompact} /></label>
        <label className={formFieldLabel}><span className={formLabelText}>有効期限日</span><DateInput name="firearmExpiresOn" defaultValue={firearm.expiresOn ?? ""} className={formFieldCompact} /></label>
        <label className={formFieldLabel}><span className={formLabelText}>銃種</span><select name="firearmType" defaultValue={firearm.firearmType} className={formFieldCompact}><option value="RIFLE">ライフル銃</option><option value="SHOTGUN">散弾銃</option><option value="AIR_RIFLE">空気銃</option></select></label>
        <label className={formFieldLabel}><span className={formLabelText}>状態</span><select name="firearmStatus" defaultValue={firearm.status} className={formFieldCompact}><option value="ACTIVE">使用中</option><option value="INACTIVE">休止中</option><option value="DISPOSED">処分済み</option></select></label>
        <label className={formFieldLabel + " lg:col-span-4"}><span className={formLabelText}>備考</span><textarea name="firearmNotes" rows={2} defaultValue={firearm.notes ?? ""} className={formTextareaCompact} /></label>
      </div>
      <Actions onCancel={onCancel} />
    </form>
    <form action={deleteFirearmRecordAction} className="mt-3 flex justify-end">
      <input type="hidden" name="id" value={firearm.id} />
      <button
        type="submit"
        onClick={(event) => {
          if (
            !confirm(
              "この銃本体を削除すると、紐づく銃身情報もすべて削除されます。よろしいですか？",
            )
          ) {
            event.preventDefault();
          }
        }}
        className="min-h-11 rounded-full border border-slate-200 bg-white px-5 text-sm font-semibold text-red-700"
      >
        銃本体を削除
      </button>
    </form>
  </>
  );
}

function BarrelCard({
  barrel,
  index,
  editing,
  selected,
  isPrimary,
  onSelect,
  onPrimarySelect,
  onEdit,
  onCancel,
  state,
  action,
  primaryAction,
}: {
  barrel: Barrel;
  index: number;
  editing: boolean;
  selected: boolean;
  isPrimary: boolean;
  onSelect: (checked: boolean) => void;
  onPrimarySelect: () => void;
  onEdit: () => void;
  onCancel: () => void;
  state: any;
  action: any;
  primaryAction: any;
}) {
  const items: Item[] = [
    { label: "本銃身", value: isPrimary ? "現在の本銃身" : "いいえ" },
    { label: "種類", value: barrel.firearmKind },
    { label: "口径", value: barrel.caliber },
    { label: "銃身長", value: barrel.barrelLength },
    { label: "銃腔内旋割合", value: barrel.riflingRate },
    { label: "適合実包", value: barrel.compatibleAmmo },
    { label: "特徴", value: barrel.features },
    { label: "用途メモ", value: barrel.purposeMemo },
    { label: "備考", value: barrel.notes },
  ];

  if (editing) {
    return (
      <form action={action} className="grid gap-3 border-t border-slate-200 pt-4">
        {state && !state.success && state.errors && (
          <div className="rounded-[18px] border border-red-200 bg-red-50 p-3">
            <p className="text-sm font-semibold text-red-800">入力エラーがあります</p>
            <ul className="mt-2 list-disc list-inside text-sm text-red-700">
              {Object.entries(state.errors).map(([key, message]) => (
                <li key={key}>{message as string}</li>
              ))}
            </ul>
          </div>
        )}
        <input type="hidden" name="id" value={barrel.id} />
        <Note />
        <div className={formGrid4}>
          <label className={formFieldLabel}><span className={formLabelText}>銃身種別</span><select name="barrelType" defaultValue={barrel.barrelType} className={formFieldCompact}><option value="RIFLED">ライフル銃身</option><option value="HALF_RIFLED">ハーフライフル銃身</option><option value="SMOOTHBORE">平筒</option><option value="OTHER">その他</option></select></label>
          {[
            ["種類", "barrelFirearmKind", barrel.firearmKind],
            ["口径", "barrelCaliber", barrel.caliber],
            ["銃身長", "barrelLength", barrel.barrelLength],
            ["銃腔内旋割合", "barrelRiflingRate", barrel.riflingRate],
            ["適合実包", "barrelCompatibleAmmo", barrel.compatibleAmmo],
            ["特徴", "barrelFeatures", barrel.features],
          ].map(([label, name, value]) => <label key={name} className={formFieldLabel}><span className={formLabelText}>{label}</span><input name={name ?? ""} defaultValue={value ?? ""} className={formFieldCompact} /></label>)}
          <label className={formFieldLabel + " lg:col-span-2"}><span className={formLabelText}>用途メモ</span><input name="barrelPurposeMemo" defaultValue={barrel.purposeMemo ?? ""} className={formFieldCompact} /></label>
          <label className={formFieldLabel + " lg:col-span-2"}><span className={formLabelText}>備考</span><input name="barrelNotes" defaultValue={barrel.notes ?? ""} className={formFieldCompact} /></label>
        </div>
        <Actions onCancel={onCancel} />
      </form>
    );
  }
  return (
    <div className={`${inlinePanelClass} ${isPrimary ? "border-emerald-300" : ""}`}>
      <div className="mb-3 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="space-y-2">
          <div className="flex flex-wrap items-center gap-2">
            <p className="text-sm font-semibold text-slate-950">
              {getBarrelDisplayName(index, barrel)}
            </p>
            {isPrimary ? (
              <span className="rounded-full bg-emerald-700 px-3 py-1 text-xs font-bold text-white">
                本銃身
              </span>
            ) : null}
          </div>
          <div className="flex flex-col gap-2 text-sm sm:flex-row sm:items-center">
            <label className="inline-flex items-center gap-2 font-semibold text-slate-700">
              <input
                type="checkbox"
                checked={selected}
                onChange={(event) => onSelect(event.target.checked)}
                className="size-4 accent-red-600"
              />
              この銃身を削除対象にする
            </label>
            <form action={primaryAction}>
              <input type="hidden" name="barrelId" value={barrel.id} />
              <label className="inline-flex cursor-pointer items-center gap-2 font-semibold text-slate-700">
                <input
                  type="radio"
                  name="primaryBarrel"
                  checked={isPrimary}
                  onChange={(event) => {
                    onPrimarySelect();
                    event.currentTarget.form?.requestSubmit();
                  }}
                  className="size-4 accent-emerald-700"
                />
                本銃身にする
              </label>
            </form>
          </div>
        </div>
        <button type="button" onClick={onEdit} className="rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700">編集</button>
      </div>
      <FieldGrid items={items} />
    </div>
  );
}

function NewBarrelForm({
  firearmId,
  onCancel,
}: {
  firearmId: string;
  onCancel: () => void;
}) {
  return (
    <form
      action={createFirearmBarrelRecordAction}
      className="grid gap-3 border-t border-slate-200 pt-4"
    >
      <input type="hidden" name="firearmRecordId" value={firearmId} />
      <Note />
      <div className={formGrid4}>
        <label className={formFieldLabel}>
          <span className={formLabelText}>銃身種別</span>
          <select
            name="barrelType"
            defaultValue="SMOOTHBORE"
            className={formFieldCompact}
          >
            <option value="RIFLED">ライフル銃身</option>
            <option value="HALF_RIFLED">ハーフライフル銃身</option>
            <option value="SMOOTHBORE">平筒</option>
            <option value="OTHER">その他</option>
          </select>
        </label>
        {[
          ["種類", "barrelFirearmKind"],
          ["口径", "barrelCaliber"],
          ["銃身長", "barrelLength"],
          ["銃腔内旋割合", "barrelRiflingRate"],
          ["適合実包", "barrelCompatibleAmmo"],
          ["特徴", "barrelFeatures"],
        ].map(([label, name]) => (
          <label key={name} className={formFieldLabel}>
            <span className={formLabelText}>{label}</span>
            <input
              name={name}
              className={formFieldCompact}
            />
          </label>
        ))}
        <label className={formFieldLabel + " lg:col-span-2"}>
          <span className={formLabelText}>用途メモ</span>
          <input
            name="barrelPurposeMemo"
            className={formFieldCompact}
          />
        </label>
        <label className={formFieldLabel + " lg:col-span-2"}>
          <span className={formLabelText}>備考</span>
          <input
            name="barrelNotes"
            className={formFieldCompact}
          />
        </label>
      </div>
      <Actions onCancel={onCancel} />
    </form>
  );
}
