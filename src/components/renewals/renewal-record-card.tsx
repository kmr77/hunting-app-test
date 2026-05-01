"use client";

import { useActionState, useState } from "react";
import {
  createFirearmBarrelRecordAction,
  deleteFirearmBarrelRecordAction,
  deleteFirearmRecordAction,
  updateFirearmBarrelRecordAction,
  updateFirearmRecordAction,
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
  status: string;
  statusLabel: string;
  issuedOn?: string;
  expiresOn?: string;
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

function Actions({ onCancel }: { onCancel: () => void }) {
  return (
    <div className="flex flex-col gap-2 sm:flex-row">
      <button className="min-h-11 rounded-full bg-emerald-950 px-5 text-sm font-semibold !text-white">
        保存
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

export function RenewalRecordCard({ renewal }: { renewal: Renewal }) {
  const [editing, setEditing] = useState<"permit" | "firearm" | string | null>(null);
  const [permitState, permitAction] = useActionState(updateRenewalPermitInfoAction, null);
  const [firearmState, firearmAction] = useActionState(updateFirearmRecordAction, null);
  const [barrelState, barrelAction] = useActionState(updateFirearmBarrelRecordAction, null);
  const firearm = renewal.firearmRecords[0];

  return (
    <div className="grid gap-4">
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
            {permitState && !permitState.success && permitState.errors && (
              <div className="rounded-[18px] border border-red-200 bg-red-50 p-3">
                <p className="text-sm font-semibold text-red-800">入力エラーがあります</p>
                <ul className="mt-2 list-disc list-inside text-sm text-red-700">
                  {Object.entries(permitState.errors).map(([key, message]) => (
                    <li key={key}>{message as string}</li>
                  ))}
                </ul>
              </div>
            )}
            <input type="hidden" name="id" value={renewal.id} />
            <Note />
            <div className="grid grid-cols-1 gap-3 lg:grid-cols-4">
              <label className={formFieldLabel}><span className={formLabelText}>進捗</span><select name="status" defaultValue={renewal.status} className={formFieldCompact}><option value="ACTIVE">管理中</option><option value="EXPIRED">要確認</option><option value="RENEWED">完了</option></select></label>
              <label className={formFieldLabel}><span className={formLabelText}>交付日</span><DateInput name="issuedOn" defaultValue={renewal.issuedOn} className={formFieldCompact} /></label>
              <label className={formFieldLabel}><span className={formLabelText}>有効期限日</span><DateInput name="expiresOn" defaultValue={renewal.expiresOn} required className={formFieldCompact} /></label>
              <label className={formFieldLabel}><span className={formLabelText}>原許可日</span><DateInput name="originalPermittedOn" defaultValue={renewal.originalPermittedOn} className={formFieldCompact} /></label>
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
              { label: "原許可日", value: renewal.originalPermittedOn },
              { label: "最初の許可番号", value: permitNumber(renewal.originalPermitNumber) },
              { label: "今回の許可番号", value: permitNumber(renewal.permitNumber) },
              { label: "確認日", value: renewal.confirmedOn },
              { label: "有効期間", value: renewal.validityDescription },
              { label: "更新申請期間開始日", value: renewal.applicationStartOn },
              { label: "更新申請期間終了日", value: renewal.applicationEndOn },
              { label: "進捗", value: renewal.statusLabel },
            ]}
          />
        )}
      </section>

      {firearm ? (
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
          {editing === "firearm" ? <FirearmForm firearm={firearm} onCancel={() => setEditing(null)} state={firearmState} action={firearmAction} /> : <FirearmView firearm={firearm} />}
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
            <div className="mt-3 grid gap-3">
              {editing === "new-barrel" ? (
                <NewBarrelForm
                  firearmId={firearm.id}
                  onCancel={() => setEditing(null)}
                />
              ) : null}
              {firearm.barrelRecords.map((barrel, index) => (
                <BarrelCard key={barrel.id} barrel={barrel} index={index} editing={editing === barrel.id} onEdit={() => setEditing(barrel.id)} onCancel={() => setEditing(null)} state={barrelState} action={barrelAction} />
              ))}
            </div>
          </div>
        </section>
      ) : null}
    </div>
  );
}

function FirearmView({ firearm }: { firearm: Firearm }) {
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

function BarrelCard({ barrel, index, editing, onEdit, onCancel, state, action }: { barrel: Barrel; index: number; editing: boolean; onEdit: () => void; onCancel: () => void; state: any; action: any }) {
  const items: Item[] = [
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
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <Actions onCancel={onCancel} />
          <button
            formAction={deleteFirearmBarrelRecordAction}
            className="min-h-11 rounded-full border border-red-200 bg-white px-5 text-sm font-semibold text-red-700"
          >
            削除
          </button>
        </div>
      </form>
    );
  }
  return (
    <div className="rounded-[18px] border border-emerald-950/10 bg-white p-3">
      <div className="mb-3 flex items-start justify-between gap-3">
        <p className="text-sm font-semibold text-slate-950">{index === 0 ? "銃身情報" : `替え銃身 ${index}`} / {barrel.barrelTypeLabel}</p>
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
