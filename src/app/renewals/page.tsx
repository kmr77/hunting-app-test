import {
  deleteRenewalAction,
  deleteRenewalPermitImageAction,
  uploadRenewalPermitImageAction,
} from "@/app/actions";
import { FeedbackBanner } from "@/components/feedback-banner";
import { RenewalCreateForm } from "@/components/renewals/renewal-create-form";
import { PermitImageUploader } from "@/components/renewals/permit-image-uploader";
import { RenewalRecordCard } from "@/components/renewals/renewal-record-card";
import { SubmitButton } from "@/components/submit-button";
import { FileCategory, RenewalCategory } from "@prisma/client";
import {
  firearmStatusOptions,
  firearmTypeOptions,
  getDataLoadErrorMessage,
  getRenewalPageData,
  getRenewalPageDataFallback,
} from "@/lib/app-data";
import {
  getFeedbackFromSearchParams,
  type SearchParamsInput,
} from "@/lib/feedback";
import { formatDateInput, formatDateLabel } from "@/lib/format";
import {
  firearmStatusLabels,
  firearmBarrelTypeLabels,
  firearmTypeLabels,
  renewalCategoryLabels,
  renewalStatusLabels,
} from "@/lib/labels";

export const dynamic = "force-dynamic";

export default async function RenewalsPage({
  searchParams,
}: {
  searchParams?: SearchParamsInput;
}) {
  const searchFeedback = await getFeedbackFromSearchParams(searchParams);
  let feedback = searchFeedback;
  let renewals: Awaited<ReturnType<typeof getRenewalPageData>>["renewals"] =
    getRenewalPageDataFallback().renewals as Awaited<
      ReturnType<typeof getRenewalPageData>
    >["renewals"];
  let renewalRuleConfigs: Awaited<ReturnType<typeof getRenewalPageData>>["renewalRuleConfigs"] =
    getRenewalPageDataFallback().renewalRuleConfigs as Awaited<
      ReturnType<typeof getRenewalPageData>
    >["renewalRuleConfigs"];

  try {
    ({ renewals, renewalRuleConfigs } = await getRenewalPageData());
  } catch (error) {
    feedback ??= {
      variant: "error",
      message: getDataLoadErrorMessage(error),
    };
  }

  const nearestRenewal = renewals[0];

  return (
    <main className="flex flex-1 flex-col gap-5">
      <FeedbackBanner feedback={feedback} />

      <section className="rounded-[32px] border border-emerald-950/10 bg-white/92 p-5 shadow-[0_24px_52px_-36px_rgba(15,23,42,0.38)] sm:p-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div className="space-y-2">
            <p className="text-[11px] font-semibold tracking-[0.22em] text-emerald-700 uppercase">
              更新管理
            </p>
            <h2 className="text-2xl font-semibold text-slate-950">
              許可や講習の期限をまとめて管理
            </h2>
            <p className="max-w-2xl text-sm leading-7 text-slate-600">
              MVP では狩猟免許と銃砲所持許可の期限を記録します。
              新規登録時には銃本体と銃身情報を関連付けできます。
            </p>
          </div>

          <div className="grid grid-cols-2 gap-3 sm:min-w-80">
            <div className="rounded-[24px] bg-emerald-50 p-4">
              <p className="text-xs font-semibold tracking-[0.16em] text-emerald-700 uppercase">
                登録件数
              </p>
              <p className="mt-2 text-2xl font-semibold text-emerald-950">
                {renewals.length}
              </p>
            </div>
            <div className="rounded-[24px] bg-slate-100 p-4">
              <p className="text-xs font-semibold tracking-[0.16em] text-slate-500 uppercase">
                直近期限
              </p>
              <p className="mt-2 text-sm font-semibold text-slate-950">
                {nearestRenewal
                  ? formatDateLabel(nearestRenewal.expiresOn)
                  : "未登録"}
              </p>
            </div>
          </div>
        </div>
      </section>

      <section className="grid gap-4">
        <RenewalCreateForm renewalRuleConfigs={renewalRuleConfigs} />

        <section className="grid gap-4">
          {renewals.length === 0 ? (
            <div className="rounded-[30px] border border-dashed border-emerald-950/15 bg-white/72 p-6 text-sm leading-7 text-slate-600">
              登録済みの更新対象はまだありません。左のフォームから最初の1件を追加してください。
            </div>
          ) : (
            renewals.map((renewal) => {
              const permitImage = renewal.fileRecords.find(
                (file) => file.fileCategory === FileCategory.LICENSE_COPY,
              );
              const canAttachPermitImage =
                renewal.category === RenewalCategory.GUN_LICENSE;
              const renewalCardData = {
                id: renewal.id,
                status: renewal.status,
                statusLabel: renewalStatusLabels[renewal.status],
                issuedOn: formatDateInput(renewal.issuedOn),
                expiresOn: formatDateInput(renewal.expiresOn),
                originalPermittedOn: formatDateInput(
                  renewal.originalPermittedOn,
                ),
                originalPermitNumber: renewal.originalPermitNumber,
                permitNumber: renewal.permitNumber,
                confirmedOn: formatDateInput(renewal.confirmedOn),
                applicationStartOn: formatDateInput(renewal.applicationStartOn),
                applicationEndOn: formatDateInput(renewal.applicationEndOn),
                validityDescription: renewal.validityDescription,
                notes: renewal.notes,
                firearmRecords: renewal.firearmRecords.map((firearm) => ({
                  id: firearm.id,
                  displayName: firearm.displayName,
                  firearmType: firearm.firearmType,
                  firearmTypeLabel: firearmTypeLabels[firearm.firearmType],
                  status: firearm.status,
                  statusLabel: firearmStatusLabels[firearm.status],
                  manufacturer: firearm.manufacturer,
                  modelName: firearm.modelName,
                  serialNumber: firearm.serialNumber,
                  caliber: firearm.caliber,
                  totalLength: firearm.totalLength,
                  barrelLength: firearm.barrelLength,
                  riflingRate: firearm.riflingRate,
                  magazineSpec: firearm.magazineSpec,
                  compatibleAmmo: firearm.compatibleAmmo,
                  features: firearm.features,
                  purposeText: firearm.purposeText,
                  permittedOn: formatDateInput(firearm.permittedOn),
                  expiresOn: formatDateInput(firearm.expiresOn),
                  notes: firearm.notes,
                  barrelRecords: firearm.barrelRecords.map((barrel) => ({
                    id: barrel.id,
                    barrelType: barrel.barrelType,
                    barrelTypeLabel: firearmBarrelTypeLabels[barrel.barrelType],
                    firearmKind: barrel.firearmKind,
                    barrelLength: barrel.barrelLength,
                    caliber: barrel.caliber,
                    riflingRate: barrel.riflingRate,
                    compatibleAmmo: barrel.compatibleAmmo,
                    features: barrel.features,
                    purposeMemo: barrel.purposeMemo,
                    notes: barrel.notes,
                  })),
                })),
              };

              return (
                <article
                  key={renewal.id}
                  className="rounded-[30px] border border-emerald-950/10 bg-white/92 p-5 shadow-[0_24px_50px_-36px_rgba(15,23,42,0.38)]"
                >
                  <div className="grid gap-4">
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                      <div className="space-y-1">
                        <p className="text-xs font-semibold tracking-[0.16em] text-slate-500 uppercase">
                          {renewalCategoryLabels[renewal.category]}
                        </p>
                        <h3 className="text-lg font-semibold text-slate-950">
                          {renewal.title}
                        </h3>
                        <p className="text-sm text-slate-600">
                          有効期限日 {formatDateLabel(renewal.expiresOn)}
                        </p>
                      </div>
                      <span className="inline-flex rounded-full bg-emerald-100 px-3 py-1 text-xs font-medium text-emerald-900">
                        {renewalStatusLabels[renewal.status]}
                      </span>
                    </div>

                    <RenewalRecordCard renewal={renewalCardData} />
                  </div>

                {canAttachPermitImage ? (
                  <section className="mt-4 rounded-[24px] bg-emerald-50/70 p-4">
                    <div className="mb-3">
                      <p className="text-sm font-semibold text-slate-900">
                        許可証画像
                      </p>
                      <p className="text-xs leading-6 text-slate-600">
                        銃砲所持許可は1枚まで登録できます。選択した画像は保存前にWebPへ軽量化します。
                      </p>
                    </div>

                    {permitImage ? (
                      <div className="mb-4 grid gap-3">
                        <a
                          href={permitImage.storageKey}
                          target="_blank"
                          rel="noreferrer"
                          className="block overflow-hidden rounded-[22px] border border-emerald-950/10 bg-white"
                        >
                          <img
                            src={permitImage.storageKey}
                            alt={`${renewal.title}の許可証画像`}
                            className="max-h-80 w-full object-contain"
                          />
                        </a>
                        <div className="flex flex-col gap-2 text-xs leading-6 text-slate-600 sm:flex-row sm:items-center sm:justify-between">
                          <span>
                            {permitImage.originalFileName} /{" "}
                            {Math.ceil(permitImage.fileSize / 1024)}KB
                          </span>
                          <form action={deleteRenewalPermitImageAction}>
                            <input
                              type="hidden"
                              name="renewalRecordId"
                              value={renewal.id}
                            />
                            <input
                              type="hidden"
                              name="fileRecordId"
                              value={permitImage.id}
                            />
                            <SubmitButton
                              variant="danger"
                              pendingChildren="削除中..."
                            >
                              画像を削除
                            </SubmitButton>
                          </form>
                        </div>
                      </div>
                    ) : null}

                    <PermitImageUploader
                      action={uploadRenewalPermitImageAction}
                      renewalRecordId={renewal.id}
                    />
                  </section>
                ) : null}

                <form action={deleteRenewalAction} className="mt-3">
                  <input type="hidden" name="id" value={renewal.id} />
                  <SubmitButton variant="danger" pendingChildren="削除中...">
                    この記録を削除
                  </SubmitButton>
                </form>
              </article>
              );
            })
          )}
        </section>
      </section>
    </main>
  );
}
