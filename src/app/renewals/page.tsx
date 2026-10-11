import {
  deleteRenewalPermitImageAction,
  uploadRenewalPermitImageAction,
} from "@/app/actions";
import Image from "next/image";
import { FeedbackBanner } from "@/components/feedback-banner";
import { RenewalCreateShortcuts } from "@/components/renewals/renewal-create-shortcuts";
import { RenewalDeleteForm } from "@/components/renewals/renewal-delete-form";
import { PermitImageUploader } from "@/components/renewals/permit-image-uploader";
import { RenewalRecordCard } from "@/components/renewals/renewal-record-card";
import { SubmitButton } from "@/components/submit-button";
import { FileCategory, RenewalCategory } from "@prisma/client";
import {
  getDataLoadErrorMessage,
  getRenewalPageData,
  getRenewalPageDataFallback,
} from "@/lib/app-data";
import {
  getFeedbackFromSearchParams,
  type SearchParamsInput,
} from "@/lib/feedback";
import { formatDateInput, formatDateLabel, formatJapaneseEraDate } from "@/lib/format";
import {
  firearmStatusLabels,
  firearmBarrelTypeLabels,
  firearmInspectionStatusLabels,
  firearmTypeLabels,
  renewalCategoryLabels,
  renewalStatusLabels,
} from "@/lib/labels";

export const dynamic = "force-dynamic";

export default async function RenewalsPage({
  searchParams,
}: {
  searchParams?: Promise<SearchParamsInput>;
}) {
  const searchFeedback = await getFeedbackFromSearchParams(await searchParams);
  let feedback = searchFeedback;
  let renewals: Awaited<ReturnType<typeof getRenewalPageData>>["renewals"] =
    getRenewalPageDataFallback().renewals as Awaited<
      ReturnType<typeof getRenewalPageData>
    >["renewals"];
  let renewalRuleConfigs: Awaited<ReturnType<typeof getRenewalPageData>>["renewalRuleConfigs"] =
    getRenewalPageDataFallback().renewalRuleConfigs as Awaited<
      ReturnType<typeof getRenewalPageData>
    >["renewalRuleConfigs"];
  let userBirthDate = "";

  try {
    const data = await getRenewalPageData();
    renewals = data.renewals;
    renewalRuleConfigs = data.renewalRuleConfigs;
    userBirthDate = formatDateInput(data.user.profile?.birthDate);
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
              MVP では狩猟免許（狩猟免状）と銃砲所持許可の期限を記録します。
              新規登録時には銃本体と銃身情報を関連付けできます。
            </p>
          </div>

          <div className="grid grid-cols-2 gap-3 sm:min-w-80">
            <div className="rounded-[24px] bg-emerald-50 p-4">
              <p className="text-xs font-semibold tracking-[0.16em] text-emerald-700 uppercase">
                登録済み
              </p>
              <p className="mt-2 text-2xl font-semibold text-emerald-950">
                {renewals.length} 件
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
        <RenewalCreateShortcuts
          renewalRuleConfigs={renewalRuleConfigs}
          userBirthDate={userBirthDate}
        />

        <section className="grid gap-4">
          {renewals.length === 0 ? (
            <div className="rounded-[30px] border border-dashed border-emerald-950/15 bg-white/72 p-6 text-sm leading-7 text-slate-600">
              免許・許可情報はまだ登録されていません。狩猟免許（狩猟免状）は交付日、銃砲所持許可は許可日を登録すると、更新予定日や通知開始目安を確認できます。
            </div>
          ) : (
            renewals.map((renewal) => {
              const permitImage = renewal.fileRecords.find(
                (file) => file.fileCategory === FileCategory.LICENSE_COPY,
              );
              const canAttachPermitImage =
                renewal.category === RenewalCategory.GUN_LICENSE;
              const isGunLicense =
                renewal.category === RenewalCategory.GUN_LICENSE;
              const unavailableLabel = "未登録";
              const issuedOnLabel = renewal.issuedOn
                ? formatJapaneseEraDate(renewal.issuedOn)
                : unavailableLabel;
              const permittedOnLabel = renewal.originalPermittedOn
                ? formatJapaneseEraDate(renewal.originalPermittedOn)
                : unavailableLabel;
              const expiresOnLabel = renewal.expiresOn
                ? formatJapaneseEraDate(renewal.expiresOn)
                : unavailableLabel;
              const permitNumberLabel = renewal.permitNumber
                ? `第${renewal.permitNumber}号`
                : unavailableLabel;
              const permitImageCount = renewal.fileRecords.filter(
                (file) => file.fileCategory === FileCategory.LICENSE_COPY,
              ).length;
              const renewalCardData = {
                id: renewal.id,
                category: renewal.category,
                status: renewal.status,
                statusLabel: renewalStatusLabels[renewal.status],
                issuedOn: formatDateInput(renewal.issuedOn),
                expiresOn: formatDateInput(renewal.expiresOn),
                targetDate: formatDateInput(renewal.targetDate),
                reminderStartOn: formatDateInput(renewal.reminderStartOn),
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
                    isPrimary: barrel.isPrimary,
                  })),
                })),
                firearmInspectionRecords:
                  renewal.firearmInspectionRecords.map((inspection) => ({
                    id: inspection.id,
                    scheduledOn: formatDateInput(inspection.scheduledOn),
                    status: inspection.status,
                    statusLabel:
                      firearmInspectionStatusLabels[inspection.status],
                    inspectedOn: formatDateInput(inspection.inspectedOn),
                    notes: inspection.notes,
                    completedAt: formatDateInput(inspection.completedAt),
                  })),
              };

              return (
                <div key={renewal.id}>
                    <RenewalRecordCard
                      renewal={renewalCardData}
                      userBirthDate={userBirthDate}
                    >
                      {canAttachPermitImage ? (
                        <section>
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
                                className="block overflow-hidden rounded-[18px] border border-slate-200 bg-white"
                              >
                                <Image
                                  src={permitImage.storageKey}
                                  width={1200}
                                  height={900}
                                  unoptimized
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

                      <div className={canAttachPermitImage ? "mt-6 border-t border-slate-200 pt-6" : ""}>
                        <RenewalDeleteForm
                          renewalId={renewal.id}
                          triggerLabel={
                            isGunLicense
                              ? "この銃砲所持許可情報を削除"
                              : "この狩猟免許情報を削除"
                          }
                          modalTitle={
                            isGunLicense
                              ? "この銃砲所持許可情報を削除しますか？"
                              : "この狩猟免許情報を削除しますか？"
                          }
                          title={renewal.title}
                          categoryLabel={renewalCategoryLabels[renewal.category]}
                          issuedOnLabel={isGunLicense ? null : issuedOnLabel}
                          permittedOnLabel={isGunLicense ? permittedOnLabel : null}
                          expiresOnLabel={expiresOnLabel}
                          permitNumberLabel={isGunLicense ? permitNumberLabel : null}
                          warningText={
                            isGunLicense
                              ? "削除すると、この銃砲所持許可に紐づく銃本体・銃身情報・銃検履歴なども利用できなくなります。"
                              : "削除すると、この狩猟免許の更新情報を確認できなくなります。"
                          }
                          relatedItemsTitle={
                            isGunLicense
                              ? "この銃砲所持許可には以下が紐づいています。"
                              : null
                          }
                          imageCount={isGunLicense ? permitImageCount : 0}
                          firearmCount={renewal.firearmRecords.length}
                          barrelCount={renewal.firearmRecords.reduce(
                            (total, firearm) => total + firearm.barrelRecords.length,
                            0,
                          )}
                          inspectionCount={renewal.firearmInspectionRecords.length}
                          confirmLabel={
                            isGunLicense
                              ? "銃砲所持許可情報を削除"
                              : "狩猟免許情報を削除"
                          }
                          successMessage={
                            isGunLicense
                              ? "銃砲所持許可情報を削除しました。"
                              : "狩猟免許情報を削除しました。"
                          }
                          errorMessage={
                            isGunLicense
                              ? "銃砲所持許可情報の削除に失敗しました。もう一度お試しください。"
                              : "狩猟免許情報の削除に失敗しました。もう一度お試しください。"
                          }
                        />
                      </div>
                    </RenewalRecordCard>
                </div>
              );
            })
          )}
        </section>
      </section>
    </main>
  );
}
