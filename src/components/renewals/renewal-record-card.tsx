"use client";

import { useActionState, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  calculateGunLicenseExpiresOn,
  calculateHuntingLicenseExpiresOn,
  formatJapaneseEraDate,
} from "@/lib/format";
import {
  createFirearmBarrelRecordAction,
  deleteSelectedFirearmBarrelRecordsAction,
  deleteFirearmRecordAction,
  setPrimaryFirearmBarrelRecordAction,
  updateFirearmBarrelRecordAction,
  updateFirearmRecordAction,
  updateHuntingLicenseInfoAction,
  updateRenewalPermitInfoAction,
} from "@/app/actions";
import { DateInput } from "@/components/date-input";
import { formFieldCompact, formTextareaCompact, formFieldLabel, formLabelText } from "@/lib/form-classes";

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

function FieldGrid({ items }: { items: Item[] }) {
  return (
    <dl className="grid grid-cols-1 gap-3 text-sm lg:grid-cols-4">
      {items.map((item) => (
        <div key={item.label} className="min-w-0 rounded-[18px] bg-slate-50 p-3">
          <dt className="text-xs font-semibold text-slate-500">{item.label}</dt>
          <dd className="mt-1 font-semibold text-slate-950">{display(item.value)}</dd>
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
      <button className="min-h-11 rounded-full bg-[#34C759] px-5 text-sm font-bold !text-white transition-colors hover:bg-[#28A745]">
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

export function RenewalRecordCard({
  renewal,
  userBirthDate,
}: {
  renewal: Renewal;
  userBirthDate: string;
}) {
  const router = useRouter();
  const firearm = renewal.firearmRecords[0];
  const actualPrimaryBarrelId =
    firearm?.barrelRecords.find((barrel) => barrel.isPrimary)?.id ?? "";
  const [editing, setEditing] = useState<"permit" | "firearm" | string | null>(null);
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

  return (
    <div className="grid gap-4">
      {renewal.category === "HUNTING_LICENSE" ? (
        <section className="rounded-[24px] border border-emerald-950/10 bg-white/80 p-4">
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
              <div className="grid grid-cols-1 gap-3 lg:grid-cols-4">
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
                <label className={formFieldLabel + " lg:col-span-4"}>
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
      <section className="rounded-[24px] border border-emerald-950/10 bg-white/80 p-4">
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
            <div className="grid grid-cols-1 gap-3 lg:grid-cols-4">
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

      {renewal.category === "GUN_LICENSE" && firearm ? (
        <section className="rounded-[24px] bg-emerald-50/70 p-4">
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
              <p className="mt-2 rounded-[18px] border border-amber-200 bg-amber-50 px-3 py-2 text-sm font-semibold text-amber-900">
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
    <div className="rounded-[22px] border border-emerald-950/10 bg-white p-4">
      <h4 className="text-base font-semibold text-slate-950">{display(firearm.manufacturer)} {display(firearm.modelName)}</h4>
      <p className="mt-1 text-sm text-slate-600">{firearm.firearmTypeLabel} / 銃番号 {firearm.serialNumber}</p>
      <FieldGrid items={items} />
    </div>
  );
}

function FirearmForm({ firearm, onCancel, state, action }: { firearm: Firearm; onCancel: () => void; state: any; action: any }) {
  return (
    <>
      <form action={action} className="grid gap-3 rounded-[22px] border border-emerald-950/10 bg-white p-4">
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
        <div className="grid grid-cols-1 gap-3 lg:grid-cols-4">
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
      <form action={action} className="grid gap-3 rounded-[18px] border border-emerald-950/10 bg-white p-3">
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
        <div className="grid grid-cols-1 gap-3 lg:grid-cols-4">
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
    <div className={`rounded-[18px] border p-3 ${isPrimary ? "border-emerald-300 bg-emerald-50/80" : "border-emerald-950/10 bg-white"}`}>
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
      className="grid gap-3 rounded-[18px] border border-emerald-950/10 bg-white p-3"
    >
      <input type="hidden" name="firearmRecordId" value={firearmId} />
      <Note />
      <div className="grid grid-cols-1 gap-3 lg:grid-cols-4">
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
