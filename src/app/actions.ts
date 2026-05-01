"use server";

import {
  AmmoCategory,
  AmmoRecordType,
  AmmoUnit,
  FileCategory,
  FirearmBarrelType,
  FirearmStatus,
  FirearmType,
  HuntingMethod,
  HuntingPurpose,
  HuntingToolType,
  PlanCode,
  RenewalCategory,
  RenewalStatus,
  UserStatus,
} from "@prisma/client";
import { mkdir, unlink, writeFile } from "node:fs/promises";
import path from "node:path";
import { randomUUID } from "node:crypto";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/app-data";
import { withPrismaRetry } from "@/lib/prisma";
import { resolveRenewalRule } from "@/lib/validation-rules";
import {
  normalizeCaliber,
  normalizeGeneralText,
  normalizeLength,
  normalizePermitNumber,
  normalizeSerialNumber,
  normalizeWhitespace,
  toHalfWidthAlnum,
} from "@/lib/normalize";
import { savePermitImage, deletePermitImage } from "@/lib/permit-storage";

export type FieldErrors = Record<string, string>;
export type RenewalActionResult =
  | { success: true }
  | { success: false; errors?: FieldErrors; message?: string };

const PERMIT_IMAGE_MAX_BYTES = 1_600_000;
const PERMIT_IMAGE_MIME_TYPE = "image/webp";

function getString(formData: FormData, key: string) {
  const value = formData.get(key);
  return typeof value === "string" ? value.trim() : "";
}

function getOptionalString(formData: FormData, key: string) {
  const value = getString(formData, key);
  return value.length > 0 ? value : null;
}

function getOptionalNormalizedText(formData: FormData, key: string) {
  return normalizeGeneralText(getOptionalString(formData, key));
}

function getOptionalNormalizedLength(formData: FormData, key: string) {
  return normalizeLength(getOptionalString(formData, key));
}

function getOptionalNormalizedCaliber(formData: FormData, key: string) {
  return normalizeCaliber(getOptionalString(formData, key));
}

function getOptionalSerialNumber(formData: FormData, key: string) {
  return normalizeSerialNumber(getOptionalString(formData, key));
}

function getOptionalPermitNumber(formData: FormData, key: string) {
  return normalizePermitNumber(getOptionalString(formData, key));
}

function getFormDataStrings(formData: FormData, key: string) {
  return formData
    .getAll(key)
    .map((value) => (typeof value === "string" ? value.trim() : ""));
}

function buildFirearmBarrelInputs(formData: FormData) {
  const barrelTypes = getFormDataStrings(formData, "barrelType[]");
  const firearmKinds = getFormDataStrings(formData, "barrelFirearmKind[]");
  const barrelLengths = getFormDataStrings(formData, "barrelLength[]");
  const calibers = getFormDataStrings(formData, "barrelCaliber[]");
  const purposeMemos = getFormDataStrings(formData, "barrelPurposeMemo[]");
  const riflingRates = getFormDataStrings(formData, "barrelRiflingRate[]");
  const compatibleAmmos = getFormDataStrings(formData, "barrelCompatibleAmmo[]");
  const features = getFormDataStrings(formData, "barrelFeatures[]");
  const notes = getFormDataStrings(formData, "barrelNotes[]");

  return barrelTypes
    .map((barrelType, index) => ({
      barrelType: (barrelType || FirearmBarrelType.RIFLED) as FirearmBarrelType,
      firearmKind: normalizeGeneralText(firearmKinds[index] ?? ""),
      barrelLength: normalizeLength(barrelLengths[index] ?? ""),
      caliber: normalizeCaliber(calibers[index] ?? ""),
      riflingRate: normalizeGeneralText(riflingRates[index] ?? ""),
      compatibleAmmo: normalizeCaliber(compatibleAmmos[index] ?? ""),
      features: normalizeGeneralText(features[index] ?? ""),
      purposeMemo: normalizeGeneralText(purposeMemos[index] ?? ""),
      notes: normalizeGeneralText(notes[index] ?? ""),
    }))
    .filter(
      (barrel) =>
        barrel.barrelLength ||
        barrel.caliber ||
        barrel.firearmKind ||
        barrel.riflingRate ||
        barrel.compatibleAmmo ||
        barrel.features ||
        barrel.purposeMemo ||
        barrel.notes ||
        barrel.barrelType,
    );
}

function normalizeMunicipalityName(value: string | null) {
  if (!value) {
    return null;
  }

  const normalized = value.replace(/[\s\u3000]+/g, " ").trim();
  return normalized.length > 0 ? normalized : null;
}

function getOptionalDate(formData: FormData, key: string) {
  const value = getOptionalString(formData, key);
  return value ? new Date(value) : null;
}

function subtractDays(date: Date, days: number) {
  const result = new Date(date);
  result.setDate(result.getDate() - days);
  return result;
}

function getGeneratedRenewalTitle(category: RenewalCategory) {
  if (category === RenewalCategory.GUN_LICENSE) {
    return "銃砲所持許可 更新管理";
  }

  return "狩猟免許 更新管理";
}

function getInt(formData: FormData, key: string) {
  const raw = getString(formData, key);
  const parsed = Number.parseInt(raw, 10);
  return Number.isNaN(parsed) ? 0 : parsed;
}

function isValidDate(value: Date | null) {
  return Boolean(value && !Number.isNaN(value.getTime()));
}

function redirectWithMessage(
  pathname: string,
  variant: "success" | "error",
  message: string,
): never {
  const params = new URLSearchParams({
    status: variant,
    message,
  });

  redirect(`${pathname}?${params.toString()}`);
}

function revalidateAppPaths(...paths: string[]) {
  for (const path of paths) {
    revalidatePath(path);
  }
}

async function requireRenewalRecord(id: string, userId: string) {
  const renewal = await withPrismaRetry((prisma) =>
    prisma.renewalRecord.findFirst({
      where: {
        id,
        userId,
        deletedAt: null,
      },
      select: {
        id: true,
        category: true,
      },
    }),
  );

  if (!renewal) {
    throw new Error("対象の更新記録が見つかりません。");
  }

  return renewal;
}

function parseCompressedPermitImage(formData: FormData) {
  const imageData = getString(formData, "compressedImageData");
  const originalFileName = getOptionalString(formData, "originalFileName");

  if (!imageData) {
    throw new Error("許可証画像を選択してください。");
  }

  const match = imageData.match(/^data:image\/webp;base64,([A-Za-z0-9+/=]+)$/);
  if (!match) {
    throw new Error("画像の圧縮形式が正しくありません。");
  }

  const buffer = Buffer.from(match[1], "base64");
  if (buffer.byteLength <= 0) {
    throw new Error("画像データが空です。");
  }

  if (buffer.byteLength > PERMIT_IMAGE_MAX_BYTES) {
    throw new Error("圧縮後の画像サイズが大きすぎます。");
  }

  return {
    buffer,
    originalFileName: originalFileName ?? "permit-image.webp",
  };
}

async function requireAmmoRecord(id: string, userId: string) {
  const record = await withPrismaRetry((prisma) =>
    prisma.ammoRecord.findFirst({
      where: {
        id,
        userId,
        deletedAt: null,
      },
      select: {
        id: true,
      },
    }),
  );

  if (!record) {
    throw new Error("対象の実包記録が見つかりません。");
  }

  return record;
}

async function requireHuntingEvent(id: string, userId: string) {
  const event = await withPrismaRetry((prisma) =>
    prisma.huntingEvent.findFirst({
      where: {
        id,
        userId,
        deletedAt: null,
      },
      select: {
        id: true,
      },
    }),
  );

  if (!event) {
    throw new Error("対象の狩猟記録が見つかりません。");
  }

  return event;
}

export async function upsertRenewalAction(
  formData: FormData,
): Promise<RenewalActionResult> {
  const id = getOptionalString(formData, "id");
  const category = getString(formData, "category") as RenewalCategory;
  const expiresOn = getOptionalDate(formData, "expiresOn");

  const errors: FieldErrors = {};
  if (!category) {
    errors.category = "種別を選択してください。";
  }

  if (!isValidDate(expiresOn)) {
    errors.expiresOn = "有効期限日を入力してください。";
  }

  const originalPermitRaw = getOptionalString(formData, "originalPermitNumber");
  const permitRaw = getOptionalString(formData, "permitNumber");
  const originalPermitNumber = normalizePermitNumber(originalPermitRaw);
  const permitNumber = normalizePermitNumber(permitRaw);

  if (originalPermitRaw && !originalPermitNumber) {
    errors.originalPermitNumber = "最初の許可番号を数字で入力してください。";
  }

  if (permitRaw && !permitNumber) {
    errors.permitNumber = "今回の許可番号を数字で入力してください。";
  }

  if (Object.keys(errors).length > 0) {
    return { success: false, errors };
  }

  const renewalRuleConfig = await resolveRenewalRule("COMMON", category);
  const targetDate = expiresOn;
  const reminderStartOn = targetDate
    ? subtractDays(targetDate, renewalRuleConfig.reminderLeadDays)
    : null;

  const payload = {
    category,
    title: getGeneratedRenewalTitle(category),
    jurisdictionCode: getOptionalString(formData, "jurisdictionCode"),
    targetDate,
    issuedOn: getOptionalDate(formData, "issuedOn"),
    expiresOn,
    reminderStartOn,
    originalPermittedOn: getOptionalDate(formData, "originalPermittedOn"),
    originalPermitNumber: getOptionalPermitNumber(formData, "originalPermitNumber"),
    permitNumber: getOptionalPermitNumber(formData, "permitNumber"),
    confirmedOn: getOptionalDate(formData, "confirmedOn"),
    applicationStartOn: getOptionalDate(formData, "applicationStartOn"),
    applicationEndOn: getOptionalDate(formData, "applicationEndOn"),
    validityDescription: getOptionalNormalizedText(formData, "validityDescription"),
    status: getString(formData, "status") as RenewalStatus,
    notes: getOptionalNormalizedText(formData, "notes"),
  };

  try {
    const user = await getCurrentUser();
    if (id) {
      await requireRenewalRecord(id, user.id);
      await withPrismaRetry((prisma) =>
        prisma.renewalRecord.update({
          where: { id },
          data: payload,
        }),
      );
    } else {
      const renewal = await withPrismaRetry((prisma) =>
        prisma.renewalRecord.create({
          data: {
            userId: user.id,
            ...payload,
          },
        }),
      );

      const serialNumber = getOptionalSerialNumber(formData, "serialNumber");
      if (serialNumber) {
        await withPrismaRetry((prisma) =>
          prisma.firearmRecord.create({
            data: {
              renewalRecordId: renewal.id,
              displayName: getOptionalNormalizedText(formData, "firearmDisplayName") || undefined,
              firearmType:
                (getOptionalString(formData, "firearmType") as FirearmType) ??
                FirearmType.SHOTGUN,
              serialNumber,
              manufacturer: getOptionalNormalizedText(formData, "manufacturer"),
              modelName: getOptionalNormalizedText(formData, "modelName"),
              caliber: getOptionalNormalizedCaliber(formData, "caliber"),
              totalLength: getOptionalNormalizedLength(formData, "firearmTotalLength"),
              barrelLength: getOptionalNormalizedLength(formData, "firearmBarrelLength"),
              riflingRate: getOptionalNormalizedText(formData, "firearmRiflingRate"),
              magazineSpec: getOptionalNormalizedText(formData, "firearmMagazineSpec"),
              compatibleAmmo: getOptionalNormalizedCaliber(formData, "firearmCompatibleAmmo"),
              features: getOptionalNormalizedText(formData, "firearmFeatures"),
              purposeText: getOptionalNormalizedText(formData, "firearmPurposeText"),
              permittedOn: getOptionalDate(formData, "firearmPermittedOn"),
              expiresOn: getOptionalDate(formData, "firearmExpiresOn"),
              notes: getOptionalNormalizedText(formData, "firearmNotes"),
              status:
                (getOptionalString(formData, "firearmStatus") as FirearmStatus) ??
                FirearmStatus.ACTIVE,
              barrelRecords: {
                create: buildFirearmBarrelInputs(formData),
              },
            },
          }),
        );
      }
    }
  } catch (error) {
    return {
      success: false,
      message:
        error instanceof Error
          ? error.message
          : "更新記録の保存に失敗しました。",
    };
  }

  revalidateAppPaths("/", "/renewals", "/account");
  return { success: true };
}

export async function deleteRenewalAction(formData: FormData) {
  const pathname = "/renewals";
  const id = getString(formData, "id");

  if (!id) {
    redirectWithMessage(pathname, "error", "削除に失敗しました。");
  }

  try {
    const user = await getCurrentUser();
    await requireRenewalRecord(id, user.id);

    await withPrismaRetry((prisma) =>
      prisma.firearmRecord.updateMany({
        where: { renewalRecordId: id, deletedAt: null },
        data: { deletedAt: new Date() },
      }),
    );

    await withPrismaRetry((prisma) =>
      prisma.fileRecord.updateMany({
        where: { renewalRecordId: id, deletedAt: null },
        data: { deletedAt: new Date() },
      }),
    );

    await withPrismaRetry((prisma) =>
      prisma.renewalRecord.update({
        where: { id },
        data: { deletedAt: new Date() },
      }),
    );
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "更新記録の削除に失敗しました。";
    redirectWithMessage(pathname, "error", message);
  }

  revalidateAppPaths("/", "/renewals", "/account");
  redirectWithMessage(pathname, "success", "削除しました。");
}

export async function updateRenewalPermitInfoAction(
  prevState: RenewalActionResult | null,
  formData: FormData,
): Promise<RenewalActionResult> {
  const pathname = "/renewals";
  const id = getString(formData, "id");
  const expiresOn = getOptionalDate(formData, "expiresOn");
  const errors: FieldErrors = {};

  if (!id) {
    redirectWithMessage(pathname, "error", "更新に失敗しました。");
  }

  if (!isValidDate(expiresOn)) {
    errors.expiresOn = "有効期限日を入力してください。";
  }

  const originalPermitRaw = getOptionalString(formData, "originalPermitNumber");
  const permitRaw = getOptionalString(formData, "permitNumber");
  const originalPermitNumber = normalizePermitNumber(originalPermitRaw);
  const permitNumber = normalizePermitNumber(permitRaw);

  if (originalPermitRaw && !originalPermitNumber) {
    errors.originalPermitNumber = "最初の許可番号を数字で入力してください。";
  }

  if (permitRaw && !permitNumber) {
    errors.permitNumber = "今回の許可番号を数字で入力してください。";
  }

  if (Object.keys(errors).length > 0) {
    return { success: false, errors };
  }

  try {
    const user = await getCurrentUser();
    const renewal = await requireRenewalRecord(id, user.id);
    const category = renewal.category;
    const renewalRuleConfig = await resolveRenewalRule("COMMON", category);
    const reminderStartOn = expiresOn
      ? subtractDays(expiresOn, renewalRuleConfig.reminderLeadDays)
      : null;

    await withPrismaRetry((prisma) =>
      prisma.renewalRecord.update({
        where: { id },
        data: {
          category,
          title: getGeneratedRenewalTitle(category),
          issuedOn: getOptionalDate(formData, "issuedOn"),
          expiresOn,
          targetDate: expiresOn,
          reminderStartOn,
          originalPermittedOn: getOptionalDate(formData, "originalPermittedOn"),
          originalPermitNumber,
          permitNumber,
          confirmedOn: getOptionalDate(formData, "confirmedOn"),
          applicationStartOn: getOptionalDate(formData, "applicationStartOn"),
          applicationEndOn: getOptionalDate(formData, "applicationEndOn"),
          validityDescription: getOptionalNormalizedText(formData, "validityDescription"),
          status: getString(formData, "status") as RenewalStatus,
          notes: getOptionalNormalizedText(formData, "notes"),
        },
      }),
    );
  } catch (error) {
    return {
      success: false,
      message:
        error instanceof Error
          ? error.message
          : "許可証情報の更新に失敗しました。",
    };
  }

  revalidateAppPaths("/", "/renewals");
  return { success: true };
}

export async function updateFirearmRecordAction(
  prevState: RenewalActionResult | null,
  formData: FormData,
): Promise<RenewalActionResult> {
  const pathname = "/renewals";
  const id = getString(formData, "id");
  const errors: FieldErrors = {};

  if (!id) {
    redirectWithMessage(pathname, "error", "更新に失敗しました。");
  }

  const serialNumberRaw = getOptionalString(formData, "serialNumber");
  const serialNumber = normalizeSerialNumber(serialNumberRaw);
  if (serialNumberRaw && !serialNumber) {
    errors.serialNumber = "銃番号を正しく入力してください。";
  }

  const permittedOnRaw = getOptionalString(formData, "firearmPermittedOn");
  const expiresOnRaw = getOptionalString(formData, "firearmExpiresOn");
  const permittedOn = permittedOnRaw ? new Date(permittedOnRaw) : null;
  const expiresOn = expiresOnRaw ? new Date(expiresOnRaw) : null;

  if (permittedOnRaw && !isValidDate(permittedOn)) {
    errors.firearmPermittedOn = "許可日を正しく入力してください。";
  }

  if (expiresOnRaw && !isValidDate(expiresOn)) {
    errors.firearmExpiresOn = "有効期限日を正しく入力してください。";
  }

  if (Object.keys(errors).length > 0) {
    return { success: false, errors };
  }

  try {
    const user = await getCurrentUser();
    const firearm = await withPrismaRetry((prisma) =>
      prisma.firearmRecord.findFirst({
        where: {
          id,
          deletedAt: null,
          renewalRecord: {
            userId: user.id,
            deletedAt: null,
          },
        },
        select: { id: true },
      }),
    );

    if (!firearm) {
      throw new Error("所持銃情報が見つかりません。");
    }

    await withPrismaRetry((prisma) =>
      prisma.firearmRecord.update({
        where: { id: firearm.id },
        data: {
          displayName: getOptionalNormalizedText(formData, "firearmDisplayName") || undefined,
          firearmType:
            (getOptionalString(formData, "firearmType") as FirearmType) ??
            FirearmType.SHOTGUN,
          manufacturer: getOptionalNormalizedText(formData, "manufacturer"),
          modelName: getOptionalNormalizedText(formData, "modelName"),
          serialNumber: serialNumber ?? "",
          caliber: getOptionalNormalizedCaliber(formData, "caliber"),
          totalLength: getOptionalNormalizedLength(formData, "firearmTotalLength"),
          barrelLength: getOptionalNormalizedLength(formData, "firearmBarrelLength"),
          riflingRate: getOptionalNormalizedText(formData, "firearmRiflingRate"),
          magazineSpec: getOptionalNormalizedText(formData, "firearmMagazineSpec"),
          compatibleAmmo: getOptionalNormalizedCaliber(formData, "firearmCompatibleAmmo"),
          features: getOptionalNormalizedText(formData, "firearmFeatures"),
          purposeText: getOptionalNormalizedText(formData, "firearmPurposeText"),
          permittedOn,
          expiresOn,
          notes: getOptionalNormalizedText(formData, "firearmNotes"),
          status:
            (getOptionalString(formData, "firearmStatus") as FirearmStatus) ??
            FirearmStatus.ACTIVE,
        },
      }),
    );
  } catch (error) {
    return {
      success: false,
      message:
        error instanceof Error
          ? error.message
          : "所持銃情報の更新に失敗しました。",
    };
  }

  revalidateAppPaths("/renewals");
  return { success: true };
}

export async function updateFirearmBarrelRecordAction(
  prevState: RenewalActionResult | null,
  formData: FormData,
): Promise<RenewalActionResult> {
  const pathname = "/renewals";
  const id = getString(formData, "id");
  const errors: FieldErrors = {};

  if (!id) {
    redirectWithMessage(pathname, "error", "更新に失敗しました。");
  }

  const barrelLengthRaw = getOptionalString(formData, "barrelLength");
  const barrelLength = normalizeLength(barrelLengthRaw);
  if (barrelLengthRaw && !barrelLength) {
    errors.barrelLength = "銃身長を正しく入力してください。";
  }

  const caliberRaw = getOptionalString(formData, "barrelCaliber");
  const caliber = normalizeCaliber(caliberRaw);
  if (caliberRaw && !caliber) {
    errors.barrelCaliber = "口径を正しく入力してください。";
  }

  if (Object.keys(errors).length > 0) {
    return { success: false, errors };
  }

  try {
    const user = await getCurrentUser();
    const barrel = await withPrismaRetry((prisma) =>
      prisma.firearmBarrelRecord.findFirst({
        where: {
          id,
          deletedAt: null,
          firearmRecord: {
            deletedAt: null,
            renewalRecord: {
              userId: user.id,
              deletedAt: null,
            },
          },
        },
        select: { id: true },
      }),
    );

    if (!barrel) {
      throw new Error("銃身情報が見つかりません。");
    }

    await withPrismaRetry((prisma) =>
      prisma.firearmBarrelRecord.update({
        where: { id: barrel.id },
        data: {
          barrelType:
            (getOptionalString(formData, "barrelType") as FirearmBarrelType) ??
            FirearmBarrelType.RIFLED,
          firearmKind: getOptionalNormalizedText(formData, "barrelFirearmKind"),
          barrelLength,
          caliber,
          riflingRate: getOptionalNormalizedText(formData, "barrelRiflingRate"),
          compatibleAmmo: normalizeCaliber(getOptionalString(formData, "barrelCompatibleAmmo")),
          features: getOptionalNormalizedText(formData, "barrelFeatures"),
          purposeMemo: getOptionalNormalizedText(formData, "barrelPurposeMemo"),
          notes: getOptionalNormalizedText(formData, "barrelNotes"),
        },
      }),
    );
  } catch (error) {
    return {
      success: false,
      message:
        error instanceof Error
          ? error.message
          : "銃身情報の更新に失敗しました。",
    };
  }

  revalidateAppPaths("/renewals");
  return { success: true };
}

export async function createFirearmBarrelRecordAction(formData: FormData) {
  const pathname = "/renewals";
  const firearmRecordId = getString(formData, "firearmRecordId");

  if (!firearmRecordId) {
    redirectWithMessage(pathname, "error", "更新に失敗しました。");
  }

  try {
    const user = await getCurrentUser();
    const firearm = await withPrismaRetry((prisma) =>
      prisma.firearmRecord.findFirst({
        where: {
          id: firearmRecordId,
          deletedAt: null,
          renewalRecord: {
            userId: user.id,
            deletedAt: null,
          },
        },
        select: { id: true },
      }),
    );

    if (!firearm) {
      throw new Error("所持銃情報が見つかりません。");
    }

    await withPrismaRetry((prisma) =>
      prisma.firearmBarrelRecord.create({
        data: {
          firearmRecordId: firearm.id,
          barrelType:
            (getOptionalString(formData, "barrelType") as FirearmBarrelType) ??
            FirearmBarrelType.RIFLED,
          firearmKind: getOptionalNormalizedText(formData, "barrelFirearmKind"),
          barrelLength: getOptionalNormalizedLength(formData, "barrelLength"),
          caliber: getOptionalNormalizedCaliber(formData, "barrelCaliber"),
          riflingRate: getOptionalNormalizedText(formData, "barrelRiflingRate"),
          compatibleAmmo: normalizeCaliber(getOptionalString(formData, "barrelCompatibleAmmo")),
          features: getOptionalNormalizedText(formData, "barrelFeatures"),
          purposeMemo: getOptionalNormalizedText(formData, "barrelPurposeMemo"),
          notes: getOptionalNormalizedText(formData, "barrelNotes"),
        },
      }),
    );
  } catch (error) {
    redirectWithMessage(
      pathname,
      "error",
      error instanceof Error ? error.message : "銃身情報の追加に失敗しました。",
    );
  }

  revalidateAppPaths("/renewals");
  redirectWithMessage(pathname, "success", "追加しました。");
}

export async function deleteFirearmBarrelRecordAction(formData: FormData) {
  const pathname = "/renewals";
  const id = getString(formData, "id");

  if (!id) {
    redirectWithMessage(pathname, "error", "更新に失敗しました。");
  }

  try {
    const user = await getCurrentUser();
    const barrel = await withPrismaRetry((prisma) =>
      prisma.firearmBarrelRecord.findFirst({
        where: {
          id,
          deletedAt: null,
          firearmRecord: {
            deletedAt: null,
            renewalRecord: {
              userId: user.id,
              deletedAt: null,
            },
          },
        },
        select: { id: true },
      }),
    );

    if (!barrel) {
      throw new Error("銃身情報が見つかりません。");
    }

    await withPrismaRetry((prisma) =>
      prisma.firearmBarrelRecord.update({
        where: { id: barrel.id },
        data: { deletedAt: new Date() },
      }),
    );
  } catch (error) {
    redirectWithMessage(
      pathname,
      "error",
      error instanceof Error ? error.message : "銃身情報の削除に失敗しました。",
    );
  }

  revalidateAppPaths("/renewals");
  redirectWithMessage(pathname, "success", "削除しました。");
}

export async function deleteFirearmRecordAction(formData: FormData) {
  const pathname = "/renewals";
  const id = getString(formData, "id");

  if (!id) {
    redirectWithMessage(pathname, "error", "更新に失敗しました。");
  }

  try {
    const user = await getCurrentUser();
    const firearm = await withPrismaRetry((prisma) =>
      prisma.firearmRecord.findFirst({
        where: {
          id,
          deletedAt: null,
          renewalRecord: {
            userId: user.id,
            deletedAt: null,
          },
        },
        select: { id: true },
      }),
    );

    if (!firearm) {
      throw new Error("所持銃情報が見つかりません。");
    }

    await withPrismaRetry((prisma) =>
      prisma.firearmBarrelRecord.updateMany({
        where: {
          firearmRecordId: firearm.id,
          deletedAt: null,
        },
        data: { deletedAt: new Date() },
      }),
    );

    await withPrismaRetry((prisma) =>
      prisma.firearmRecord.update({
        where: { id: firearm.id },
        data: { deletedAt: new Date() },
      }),
    );
  } catch (error) {
    redirectWithMessage(
      pathname,
      "error",
      error instanceof Error ? error.message : "所持銃情報の削除に失敗しました。",
    );
  }

  revalidateAppPaths("/renewals");
  redirectWithMessage(pathname, "success", "削除しました。");
}

export async function uploadRenewalPermitImageAction(formData: FormData) {
  const pathname = "/renewals";
  const renewalRecordId = getString(formData, "renewalRecordId");

  if (!renewalRecordId) {
    redirectWithMessage(pathname, "error", "更新に失敗しました。");
  }

  try {
    const user = await getCurrentUser();
    const renewal = await requireRenewalRecord(renewalRecordId, user.id);

    if (renewal.category !== RenewalCategory.GUN_LICENSE) {
      throw new Error("許可証画像は銃砲所持許可にのみ登録できます。");
    }

    const previousFiles = await prisma.fileRecord.findMany({
      where: {
        userId: user.id,
        renewalRecordId,
        fileCategory: FileCategory.LICENSE_COPY,
        deletedAt: null,
      },
      select: { storageKey: true },
    });

    const { buffer, originalFileName } = parseCompressedPermitImage(formData);

    const fileName = `${renewalRecordId}-${randomUUID()}.webp`;
    const { storageKey } = await savePermitImage(buffer, fileName);

    await withPrismaRetry((prisma) =>
      prisma.$transaction([
        prisma.fileRecord.updateMany({
          where: {
            userId: user.id,
            renewalRecordId,
            fileCategory: FileCategory.LICENSE_COPY,
            deletedAt: null,
          },
          data: { deletedAt: new Date() },
        }),
        prisma.fileRecord.create({
          data: {
            userId: user.id,
            renewalRecordId,
            fileCategory: FileCategory.LICENSE_COPY,
            storageKey,
            originalFileName,
            mimeType: PERMIT_IMAGE_MIME_TYPE,
            fileSize: buffer.byteLength,
          },
        }),
      ]),
    );

    await Promise.allSettled(
      previousFiles.map((file) => deletePermitImage(file.storageKey)),
    );
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "許可証画像の保存に失敗しました。";
    redirectWithMessage(pathname, "error", message);
  }

  revalidateAppPaths("/", "/renewals", "/account");
  redirectWithMessage(pathname, "success", "画像を登録しました。");
}

export async function deleteRenewalPermitImageAction(formData: FormData) {
  const pathname = "/renewals";
  const renewalRecordId = getString(formData, "renewalRecordId");
  const fileRecordId = getString(formData, "fileRecordId");

  if (!renewalRecordId || !fileRecordId) {
    redirectWithMessage(pathname, "error", "画像の削除に失敗しました。");
  }

  try {
    const user = await getCurrentUser();
    await requireRenewalRecord(renewalRecordId, user.id);

    const file = await withPrismaRetry((prisma) =>
      prisma.fileRecord.findFirst({
        where: {
          id: fileRecordId,
          userId: user.id,
          renewalRecordId,
          fileCategory: FileCategory.LICENSE_COPY,
          deletedAt: null,
        },
        select: {
          id: true,
          storageKey: true,
        },
      }),
    );

    if (!file) {
      throw new Error("削除対象の画像が見つかりません。");
    }

    await withPrismaRetry((prisma) =>
      prisma.fileRecord.update({
        where: { id: file.id },
        data: { deletedAt: new Date() },
      }),
    );

    await deletePermitImage(file.storageKey);
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "許可証画像の削除に失敗しました。";
    redirectWithMessage(pathname, "error", message);
  }

  revalidateAppPaths("/", "/renewals", "/account");
  redirectWithMessage(pathname, "success", "画像を削除しました。");
}

export async function upsertAmmoAction(formData: FormData) {
  const pathname = "/ammo";
  const id = getOptionalString(formData, "id");
  const quantity = getInt(formData, "quantity");
  const transactionDate = getOptionalDate(formData, "transactionDate");

  if (quantity <= 0) {
    redirectWithMessage(pathname, "error", "保存に失敗しました。");
  }

  if (!isValidDate(transactionDate)) {
    redirectWithMessage(pathname, "error", "保存に失敗しました。");
  }

  const safeTransactionDate = transactionDate as Date;

  const payload = {
    recordType: getString(formData, "recordType") as AmmoRecordType,
    ammoCategory: getString(formData, "ammoCategory") as AmmoCategory,
    caliber: getOptionalString(formData, "caliber"),
    quantity,
    unit: AmmoUnit.ROUND,
    transactionDate: safeTransactionDate,
    supplierName: getOptionalString(formData, "supplierName"),
    slipNumber: getOptionalString(formData, "slipNumber"),
    memo: getOptionalString(formData, "memo"),
  };

  try {
    const user = await getCurrentUser();
    if (id) {
      await requireAmmoRecord(id, user.id);
      await withPrismaRetry((prisma) =>
        prisma.ammoRecord.update({
          where: { id },
          data: payload,
        }),
      );
    } else {
      await withPrismaRetry((prisma) =>
        prisma.ammoRecord.create({
          data: {
            userId: user.id,
            ...payload,
          },
        }),
      );
    }
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "実包記録の保存に失敗しました。";
    redirectWithMessage(pathname, "error", message);
  }

  revalidateAppPaths("/", "/ammo", "/account");
  redirectWithMessage(
    pathname,
    "success",
    id ? "実包記録を更新しました。" : "実包記録を登録しました。",
  );
}

export async function deleteAmmoAction(formData: FormData) {
  const pathname = "/ammo";
  const id = getString(formData, "id");

  if (!id) {
    redirectWithMessage(pathname, "error", "削除に失敗しました。");
  }

  try {
    const user = await getCurrentUser();
    await requireAmmoRecord(id, user.id);

    await withPrismaRetry((prisma) =>
      prisma.ammoRecord.update({
        where: { id },
        data: { deletedAt: new Date() },
      }),
    );
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "実包記録の削除に失敗しました。";
    redirectWithMessage(pathname, "error", message);
  }

  revalidateAppPaths("/", "/ammo", "/account");
  redirectWithMessage(pathname, "success", "削除しました。");
}

export async function upsertHuntingEventAction(formData: FormData) {
  const pathname = "/reports";
  const id = getOptionalString(formData, "id");
  const eventDate = getOptionalDate(formData, "eventDate");
  const targetSpecies = getString(formData, "targetSpecies");
  const resultCountValue = getOptionalString(formData, "resultCount");
  const resultCount = resultCountValue ? getInt(formData, "resultCount") : null;
  const toolQuantityValue = getOptionalString(formData, "toolQuantity");
  const toolQuantity = toolQuantityValue ? getInt(formData, "toolQuantity") : null;

  if (!isValidDate(eventDate)) {
    redirectWithMessage(pathname, "error", "保存に失敗しました。");
  }

  const safeEventDate = eventDate as Date;

  if (!targetSpecies) {
    redirectWithMessage(pathname, "error", "保存に失敗しました。");
  }

  if (resultCount !== null && resultCount < 0) {
    redirectWithMessage(pathname, "error", "保存に失敗しました。");
  }

  if (toolQuantity !== null && toolQuantity < 0) {
    redirectWithMessage(pathname, "error", "保存に失敗しました。");
  }

  const payload = {
    eventDate: safeEventDate,
    prefectureCode: getOptionalString(formData, "prefectureCode"),
    municipalityCode: null,
    areaName: normalizeMunicipalityName(getOptionalString(formData, "areaName")),
    huntingMethod: getOptionalString(formData, "huntingMethod") as
      | HuntingMethod
      | null,
    targetSpecies,
    purposeCode: getOptionalString(formData, "purposeCode") as
      | HuntingPurpose
      | null,
    resultCount,
    notes: getOptionalString(formData, "notes"),
  };

  const toolName = getOptionalString(formData, "toolName");

  try {
    const user = await getCurrentUser();
    if (id) {
      await requireHuntingEvent(id, user.id);

      await withPrismaRetry((prisma) =>
        prisma.huntingEvent.update({
          where: { id },
          data: payload,
        }),
      );

      await withPrismaRetry((prisma) =>
        prisma.huntingEventTool.updateMany({
          where: {
            huntingEventId: id,
            deletedAt: null,
          },
          data: {
            deletedAt: new Date(),
          },
        }),
      );

      if (toolName) {
        await withPrismaRetry((prisma) =>
          prisma.huntingEventTool.create({
            data: {
              huntingEventId: id,
              toolType:
                (getOptionalString(formData, "toolType") as HuntingToolType) ??
                HuntingToolType.FIREARM,
              toolName,
              quantity: toolQuantity,
              notes: getOptionalString(formData, "toolNotes"),
            },
          }),
        );
      }
    } else {
      const event = await withPrismaRetry((prisma) =>
        prisma.huntingEvent.create({
          data: {
            userId: user.id,
            ...payload,
          },
        }),
      );

      if (toolName) {
        await withPrismaRetry((prisma) =>
          prisma.huntingEventTool.create({
            data: {
              huntingEventId: event.id,
              toolType:
                (getOptionalString(formData, "toolType") as HuntingToolType) ??
                HuntingToolType.FIREARM,
              toolName,
              quantity: toolQuantity,
              notes: getOptionalString(formData, "toolNotes"),
            },
          }),
        );
      }
    }
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "狩猟記録の保存に失敗しました。";
    redirectWithMessage(pathname, "error", message);
  }

  revalidateAppPaths("/", "/reports", "/account");
  redirectWithMessage(
    pathname,
    "success",
    id ? "狩猟記録を更新しました。" : "狩猟記録を登録しました。",
  );
}

export async function deleteHuntingEventAction(formData: FormData) {
  const pathname = "/reports";
  const id = getString(formData, "id");

  if (!id) {
    redirectWithMessage(pathname, "error", "削除に失敗しました。");
  }

  try {
    const user = await getCurrentUser();
    await requireHuntingEvent(id, user.id);

    await withPrismaRetry((prisma) =>
      prisma.huntingEventTool.updateMany({
        where: { huntingEventId: id, deletedAt: null },
        data: { deletedAt: new Date() },
      }),
    );

    await withPrismaRetry((prisma) =>
      prisma.huntingEvent.update({
        where: { id },
        data: { deletedAt: new Date() },
      }),
    );
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "狩猟記録の削除に失敗しました。";
    redirectWithMessage(pathname, "error", message);
  }

  revalidateAppPaths("/", "/reports", "/account");
  redirectWithMessage(pathname, "success", "削除しました。");
}

export async function toggleImportedToReportAction(formData: FormData) {
  const pathname = "/reports";
  const id = getString(formData, "id");
  const imported = getString(formData, "imported") === "true";

  if (!id) {
    redirectWithMessage(pathname, "error", "対象の狩猟記録が見つかりません。");
  }

  try {
    const user = await getCurrentUser();
    await requireHuntingEvent(id, user.id);

    await withPrismaRetry((prisma) =>
      prisma.huntingEvent.update({
        where: { id },
        data: {
          importedToReportAt: imported ? null : new Date(),
        },
      }),
    );
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "転記状態の更新に失敗しました。";
    redirectWithMessage(pathname, "error", message);
  }

  revalidateAppPaths("/", "/reports");
  redirectWithMessage(
    pathname,
    "success",
    imported ? "未転記に戻しました。" : "転記済みにしました。",
  );
}

export async function updateAccountAction(formData: FormData) {
  const pathname = "/account";
  const email = getString(formData, "email");
  const lastName = getString(formData, "lastName");
  const firstName = getString(formData, "firstName");

  if (!email.includes("@")) {
    redirectWithMessage(
      pathname,
      "error",
      "メールアドレスを正しい形式で入力してください。",
    );
  }

  if (!lastName || !firstName) {
    redirectWithMessage(pathname, "error", "姓名を入力してください。");
  }

  try {
    const user = await getCurrentUser();
    const profile = user.profile;

    await withPrismaRetry((prisma) =>
      prisma.user.update({
        where: { id: user.id },
        data: {
          email,
          status: getString(formData, "status") as UserStatus,
          planCode: getString(formData, "planCode") as PlanCode,
        },
      }),
    );

    if (profile) {
      await withPrismaRetry((prisma) =>
        prisma.userProfile.update({
          where: { id: profile.id },
          data: {
            lastName,
            firstName,
            birthDate:
              getOptionalDate(formData, "birthDate") ?? profile.birthDate,
            phoneNumber: getOptionalString(formData, "phoneNumber"),
            prefectureCode: getOptionalString(formData, "prefectureCode"),
            addressLine1: getOptionalString(formData, "addressLine1"),
            addressLine2: getOptionalString(formData, "addressLine2"),
          },
        }),
      );
    }
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "アカウント更新に失敗しました。";
    redirectWithMessage(pathname, "error", message);
  }

  revalidateAppPaths("/", "/account");
  redirectWithMessage(pathname, "success", "更新しました。");
}
