"use server";

import {
  AmmoCategory,
  AmmoRecordType,
  AmmoUnit,
  ActivityType,
  FileCategory,
  FirearmBarrelType,
  FirearmInspectionStatus,
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
import {
  calculateGunLicenseExpiresOn,
  calculateHuntingLicenseExpiresOn,
} from "@/lib/format";
import {
  firearmBarrelTypeLabels,
  firearmTypeLabels,
} from "@/lib/labels";

export type FieldErrors = Record<string, string>;
export type RenewalActionResult =
  | { success: true }
  | { success: false; errors?: FieldErrors; message?: string };
export type AmmoActionValues = {
  transactionDate: string;
  recordType: string;
  ammoCategory: string;
  quantity: string;
  caliber: string;
  shotSize: string;
  manufacturer: string;
  supplierName: string;
  memo: string;
};
export type AmmoActionState = {
  success: boolean;
  message?: string;
  fieldErrors?: FieldErrors;
  values: AmmoActionValues;
};

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

function getFormDataStringSet(formData: FormData, key: string) {
  return new Set(getFormDataStrings(formData, key).filter(Boolean));
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
      isPrimary: index === 0,
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
  return value ? parseDateInputValue(value) : null;
}

function parseDateInputValue(value: string | null) {
  if (!value) {
    return null;
  }

  const match = value.match(/^(\d{4})(\d{2})(\d{2})$/) ??
    value.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) {
    return null;
  }

  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const date = new Date(year, month - 1, day);
  if (
    date.getFullYear() !== year ||
    date.getMonth() !== month - 1 ||
    date.getDate() !== day
  ) {
    return null;
  }

  return date;
}

function getDateInputError(
  formData: FormData,
  key: string,
  label: string,
  required = false,
) {
  const value = getOptionalString(formData, key);
  if (!value) {
    return required ? `${label}を半角数字8桁で入力してください。` : null;
  }

  if (!/^\d{8}$/.test(value) && !/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return `${label}は半角数字8桁で入力してください。`;
  }

  if (!parseDateInputValue(value)) {
    return `${label}は存在する日付を入力してください。`;
  }

  return null;
}

function normalizePhoneNumber(value: string | null) {
  if (!value) {
    return null;
  }

  const normalized = value
    .replace(/[０-９]/g, (char) =>
      String.fromCharCode(char.charCodeAt(0) - 0xfee0),
    )
    .replace(/[\s\u3000-]/g, "")
    .trim();

  return normalized.length > 0 ? normalized : null;
}

function normalizeAmmoCaliberInput(value: string | null) {
  if (!value) {
    return null;
  }

  const normalized = toHalfWidthAlnum(value)?.replace(/番/g, "").trim();
  if (!normalized) {
    return null;
  }

  return /^\d+$/.test(normalized) ? normalized : "";
}

const emptyAmmoActionValues: AmmoActionValues = {
  transactionDate: "",
  recordType: "PURCHASE",
  ammoCategory: "SHOT_SHELL",
  quantity: "25",
  caliber: "",
  shotSize: "",
  manufacturer: "",
  supplierName: "",
  memo: "",
};

function getAmmoActionValues(formData: FormData): AmmoActionValues {
  return {
    transactionDate: getString(formData, "transactionDate"),
    recordType: getString(formData, "recordType") || emptyAmmoActionValues.recordType,
    ammoCategory: getString(formData, "ammoCategory") || emptyAmmoActionValues.ammoCategory,
    quantity: getString(formData, "quantity"),
    caliber: getString(formData, "caliber"),
    shotSize: getString(formData, "shotSize"),
    manufacturer: getString(formData, "manufacturer"),
    supplierName: getString(formData, "supplierName"),
    memo: getString(formData, "memo"),
  };
}

function validateAmmoFormData(formData: FormData) {
  const errors: FieldErrors = {};
  const rawQuantity = getString(formData, "quantity");
  const rawTransactionDate = getString(formData, "transactionDate");
  const rawCaliber = getOptionalString(formData, "caliber");
  const quantity = getInt(formData, "quantity");
  const transactionDate = getOptionalDate(formData, "transactionDate");
  const caliber = normalizeAmmoCaliberInput(rawCaliber);

  if (!rawTransactionDate) {
    errors.transactionDate = "日付を入力してください。";
  } else if (!isValidDate(transactionDate)) {
    errors.transactionDate = "日付はYYYYMMDDの半角数字8桁で入力してください。";
  }

  if (!rawQuantity) {
    errors.quantity = "数量を入力してください。";
  } else if (quantity <= 0) {
    errors.quantity = "数量は1以上で入力してください。";
  }

  if (!rawCaliber) {
    errors.caliber = "口径を入力してください。";
  } else if (caliber === "") {
    errors.caliber = "口径は数字のみで入力してください。";
  }

  return {
    errors,
    quantity,
    transactionDate,
    caliber,
  };
}

function buildAmmoPayload(formData: FormData) {
  const ammoCategory = getString(formData, "ammoCategory") as AmmoCategory;
  const shotSize =
    ammoCategory === AmmoCategory.SLUG
      ? null
      : normalizeGeneralText(getOptionalString(formData, "shotSize"));
  const { quantity, transactionDate, caliber } = validateAmmoFormData(formData);

  return {
    recordType: getString(formData, "recordType") as AmmoRecordType,
    ammoCategory,
    caliber,
    manufacturer: getOptionalNormalizedText(formData, "manufacturer"),
    quantity,
    unit: AmmoUnit.ROUND,
    transactionDate: transactionDate as Date,
    supplierName: getOptionalString(formData, "supplierName"),
    slipNumber: shotSize,
    memo: getOptionalString(formData, "memo"),
  };
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

  return "狩猟免許（狩猟免状） 更新管理";
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
  target?: string,
): never {
  const params = new URLSearchParams({
    status: variant,
    message,
  });
  if (target) {
    params.set("target", target);
  }

  redirect(`${pathname}?${params.toString()}${target ? `#${target}` : ""}`);
}

function redirectWithFieldMessage(
  pathname: string,
  variant: "success" | "error",
  message: string,
  field: string,
  target?: string,
): never {
  const params = new URLSearchParams({
    status: variant,
    message,
    field,
  });
  if (target) {
    params.set("target", target);
  }

  redirect(`${pathname}?${params.toString()}${target ? `#${target}` : ""}`);
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

async function requireGunLicenseRenewalRecord(id: string, userId: string) {
  const renewal = await requireRenewalRecord(id, userId);
  if (renewal.category !== RenewalCategory.GUN_LICENSE) {
    throw new Error("銃砲所持許可の記録が見つかりません。");
  }

  return renewal;
}

async function requireFirearmInspectionRecord(id: string, userId: string) {
  const inspection = await withPrismaRetry((prisma) =>
    prisma.firearmInspectionRecord.findFirst({
      where: {
        id,
        userId,
        deletedAt: null,
        renewalRecord: {
          userId,
          category: RenewalCategory.GUN_LICENSE,
          deletedAt: null,
        },
      },
      select: {
        id: true,
        renewalRecordId: true,
        status: true,
      },
    }),
  );

  if (!inspection) {
    throw new Error("銃検記録が見つかりません。");
  }

  return inspection;
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
    throw new Error("対象の活動記録が見つかりません。");
  }

  return event;
}

function formatToolCaliber(value: string | null | undefined) {
  if (!value) {
    return "口径未登録";
  }

  return /[^0-9.]/.test(value) ? value : `${value}番`;
}

function getReportFirearmBaseName(firearm: {
  displayName: string;
  manufacturer: string | null;
  modelName: string | null;
  firearmType: FirearmType;
}) {
  const parts = [
    firearm.displayName,
    firearm.manufacturer,
    firearm.modelName,
  ].filter((part) => part && part.trim().length > 0);

  return parts.length > 0 ? parts.join(" ") : firearmTypeLabels[firearm.firearmType];
}

async function requireReportFirearmTool(
  userId: string,
  firearmRecordId: string | null,
  firearmBarrelRecordId: string | null,
) {
  if (!firearmRecordId) {
    return null;
  }

  const firearm = await withPrismaRetry((prisma) =>
    prisma.firearmRecord.findFirst({
      where: {
        id: firearmRecordId,
        deletedAt: null,
        renewalRecord: {
          userId,
          deletedAt: null,
        },
      },
      select: {
        id: true,
        displayName: true,
        firearmType: true,
        manufacturer: true,
        modelName: true,
        caliber: true,
        barrelRecords: {
          where: {
            deletedAt: null,
          },
          select: {
            id: true,
            barrelType: true,
            caliber: true,
            features: true,
            purposeMemo: true,
          },
          orderBy: [{ createdAt: "asc" }, { id: "asc" }],
        },
      },
    }),
  );

  if (!firearm) {
    throw new Error("使用道具に選択した銃が見つかりません。");
  }

  const firearmName = getReportFirearmBaseName(firearm);

  if (!firearmBarrelRecordId) {
    return {
      firearmRecordId: firearm.id,
      firearmBarrelRecordId: null,
      toolName: `${firearmName} / 銃本体 / ${formatToolCaliber(firearm.caliber)}`,
      notes: null,
    };
  }

  const barrelIndex = firearm.barrelRecords.findIndex(
    (barrel) => barrel.id === firearmBarrelRecordId,
  );
  const barrel = barrelIndex >= 0 ? firearm.barrelRecords[barrelIndex] : null;

  if (!barrel) {
    throw new Error("使用道具に選択した銃身が見つかりません。");
  }

  const barrelName = `${barrelIndex === 0 ? "銃身情報" : `替え銃身 ${barrelIndex}`} / ${firearmBarrelTypeLabels[barrel.barrelType]}`;
  const notes = [barrel.features, barrel.purposeMemo]
    .filter((value) => value && value.trim().length > 0)
    .join(" / ");

  return {
    firearmRecordId: firearm.id,
    firearmBarrelRecordId: barrel.id,
    toolName: `${firearmName} / ${barrelName} / ${formatToolCaliber(barrel.caliber ?? firearm.caliber)}`,
    notes: notes || null,
  };
}

export async function upsertRenewalAction(
  formData: FormData,
): Promise<RenewalActionResult> {
  const id = getOptionalString(formData, "id");
  const category = getString(formData, "category") as RenewalCategory;
  const issuedOn = getOptionalDate(formData, "issuedOn");
  const originalPermittedOn = getOptionalDate(formData, "originalPermittedOn");

  const errors: FieldErrors = {};
  if (!category) {
    errors.category = "種別を選択してください。";
  }

  const dateErrors = [
    ["issuedOn", "交付日", true],
    ["originalPermittedOn", "許可日", category === RenewalCategory.GUN_LICENSE],
    ["confirmedOn", "確認日", false],
    ["applicationStartOn", "更新申請期間開始日", false],
    ["applicationEndOn", "更新申請期間終了日", false],
    ["firearmPermittedOn", "銃本体の許可日", false],
    ["firearmExpiresOn", "銃本体の有効期限日", false],
  ] as const;

  for (const [key, label, required] of dateErrors) {
    const error = getDateInputError(formData, key, label, required);
    if (error) {
      errors[key] = error;
    }
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

  let user;
  try {
    user = await getCurrentUser();
  } catch (error) {
    return {
      success: false,
      message:
        error instanceof Error
          ? error.message
          : "利用者情報の取得に失敗しました。",
    };
  }

  let expiresOn: Date | null = null;
  if (category === RenewalCategory.GUN_LICENSE) {
    if (!user.profile?.birthDate) {
      errors.expiresOn =
        "銃砲所持許可の有効期限日を計算するため、利用者設定で生年月日を入力してください。";
    }

    if (!originalPermittedOn) {
      errors.originalPermittedOn =
        errors.originalPermittedOn ?? "許可日を半角数字8桁で入力してください。";
    }

    const calculatedExpiresOn = calculateGunLicenseExpiresOn(
      user.profile?.birthDate,
      originalPermittedOn,
    );
    expiresOn = calculatedExpiresOn
      ? parseDateInputValue(calculatedExpiresOn)
      : null;

    if (!expiresOn) {
      errors.expiresOn =
        errors.expiresOn ??
        "許可日と生年月日から有効期限日を計算できませんでした。";
    }
  } else if (category === RenewalCategory.HUNTING_LICENSE) {
    const calculatedExpiresOn = calculateHuntingLicenseExpiresOn(issuedOn);
    expiresOn = calculatedExpiresOn
      ? parseDateInputValue(calculatedExpiresOn)
      : null;

    if (!expiresOn) {
      errors.expiresOn =
        "交付日から狩猟免許（狩猟免状）の有効期限日を計算できませんでした。";
    }
  }

  if (Object.keys(errors).length > 0) {
    return { success: false, errors };
  }

  const duplicate = await withPrismaRetry((prisma) =>
    prisma.renewalRecord.findFirst({
      where: {
        userId: user.id,
        deletedAt: null,
        ...(id ? { id: { not: id } } : {}),
        ...(category === RenewalCategory.GUN_LICENSE
          ? {
              category: RenewalCategory.GUN_LICENSE,
              originalPermittedOn,
              issuedOn,
            }
          : {
              category: RenewalCategory.HUNTING_LICENSE,
              issuedOn,
            }),
      },
      select: { id: true },
    }),
  );

  if (duplicate) {
    return {
      success: false,
      errors:
        category === RenewalCategory.GUN_LICENSE
          ? {
              originalPermittedOn:
                "同じ許可日・交付日の銃砲所持許可はすでに登録されています。",
            }
          : {
              issuedOn:
                "同じ交付日の狩猟免許（狩猟免状）はすでに登録されています。",
            },
    };
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
    issuedOn,
    expiresOn,
    reminderStartOn,
    originalPermittedOn,
    originalPermitNumber: getOptionalPermitNumber(formData, "originalPermitNumber"),
    permitNumber: getOptionalPermitNumber(formData, "permitNumber"),
    confirmedOn: getOptionalDate(formData, "confirmedOn"),
    applicationStartOn: getOptionalDate(formData, "applicationStartOn"),
    applicationEndOn: getOptionalDate(formData, "applicationEndOn"),
    validityDescription: getOptionalNormalizedText(formData, "validityDescription"),
    status: (getOptionalString(formData, "status") as RenewalStatus) ?? RenewalStatus.ACTIVE,
    notes: getOptionalNormalizedText(formData, "notes"),
  };

  try {
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

export async function deleteRenewalAction(
  formData: FormData,
): Promise<RenewalActionResult> {
  const id = getString(formData, "id");

  if (!id) {
    return { success: false, message: "削除に失敗しました。" };
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
    return { success: false, message };
  }

  revalidateAppPaths("/", "/renewals", "/account");
  return { success: true };
}

export async function updateRenewalPermitInfoAction(
  prevState: RenewalActionResult | null,
  formData: FormData,
): Promise<RenewalActionResult> {
  const pathname = "/renewals";
  const id = getString(formData, "id");
  const originalPermittedOn = getOptionalDate(formData, "originalPermittedOn");
  const errors: FieldErrors = {};

  if (!id) {
    redirectWithMessage(pathname, "error", "更新に失敗しました。");
  }

  const dateErrors = [
    ["issuedOn", "交付日", false],
    ["originalPermittedOn", "許可日", true],
    ["confirmedOn", "確認日", false],
    ["applicationStartOn", "更新申請期間開始日", false],
    ["applicationEndOn", "更新申請期間終了日", false],
  ] as const;

  for (const [key, label, required] of dateErrors) {
    const error = getDateInputError(formData, key, label, required);
    if (error) {
      errors[key] = error;
    }
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
    if (category !== RenewalCategory.GUN_LICENSE) {
      throw new Error("銃砲所持許可の記録ではありません。");
    }

    const duplicate = await withPrismaRetry((prisma) =>
      prisma.renewalRecord.findFirst({
        where: {
          id: { not: id },
          userId: user.id,
          deletedAt: null,
          category: RenewalCategory.GUN_LICENSE,
          originalPermittedOn,
          issuedOn: getOptionalDate(formData, "issuedOn"),
        },
        select: { id: true },
      }),
    );

    if (duplicate) {
      return {
        success: false,
        errors: {
          originalPermittedOn:
            "同じ許可日・交付日の銃砲所持許可はすでに登録されています。",
        },
      };
    }

    if (!user.profile?.birthDate) {
      return {
        success: false,
        errors: {
          expiresOn:
            "銃砲所持許可の有効期限日を計算するため、利用者設定で生年月日を入力してください。",
        },
      };
    }

    const calculatedExpiresOn = calculateGunLicenseExpiresOn(
      user.profile.birthDate,
      originalPermittedOn,
    );
    const expiresOn = calculatedExpiresOn
      ? parseDateInputValue(calculatedExpiresOn)
      : null;

    if (!expiresOn) {
      return {
        success: false,
        errors: {
          originalPermittedOn:
            "許可日と生年月日から有効期限日を計算できませんでした。",
        },
      };
    }

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
          status:
            (getOptionalString(formData, "status") as RenewalStatus) ??
            RenewalStatus.ACTIVE,
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

export async function updateHuntingLicenseInfoAction(
  prevState: RenewalActionResult | null,
  formData: FormData,
): Promise<RenewalActionResult> {
  const pathname = "/renewals";
  const id = getString(formData, "id");
  const issuedOn = getOptionalDate(formData, "issuedOn");
  const errors: FieldErrors = {};

  if (!id) {
    redirectWithMessage(pathname, "error", "更新に失敗しました。");
  }

  const issuedOnError = getDateInputError(formData, "issuedOn", "交付日", true);
  if (issuedOnError) {
    errors.issuedOn = issuedOnError;
  }

  const calculatedExpiresOn = calculateHuntingLicenseExpiresOn(issuedOn);
  const expiresOn = calculatedExpiresOn
    ? parseDateInputValue(calculatedExpiresOn)
    : null;

  if (!expiresOn) {
    errors.expiresOn =
      "交付日から狩猟免許（狩猟免状）の有効期限日を計算できませんでした。";
  }

  if (Object.keys(errors).length > 0) {
    return { success: false, errors };
  }

  const safeExpiresOn = expiresOn as Date;

  try {
    const user = await getCurrentUser();
    const renewal = await requireRenewalRecord(id, user.id);
    if (renewal.category !== RenewalCategory.HUNTING_LICENSE) {
      throw new Error("狩猟免許（狩猟免状）の記録ではありません。");
    }

    const duplicate = await withPrismaRetry((prisma) =>
      prisma.renewalRecord.findFirst({
        where: {
          id: { not: id },
          userId: user.id,
          deletedAt: null,
          category: RenewalCategory.HUNTING_LICENSE,
          issuedOn,
        },
        select: { id: true },
      }),
    );

    if (duplicate) {
      return {
        success: false,
        errors: {
          issuedOn:
            "同じ交付日の狩猟免許（狩猟免状）はすでに登録されています。",
        },
      };
    }

    const renewalRuleConfig = await resolveRenewalRule(
      "COMMON",
      RenewalCategory.HUNTING_LICENSE,
    );
    const reminderStartOn = subtractDays(
      safeExpiresOn,
      renewalRuleConfig.reminderLeadDays,
    );

    await withPrismaRetry((prisma) =>
      prisma.renewalRecord.update({
        where: { id },
        data: {
          category: RenewalCategory.HUNTING_LICENSE,
          title: getGeneratedRenewalTitle(RenewalCategory.HUNTING_LICENSE),
          issuedOn,
          expiresOn: safeExpiresOn,
          targetDate: safeExpiresOn,
          reminderStartOn,
          status:
            (getOptionalString(formData, "status") as RenewalStatus) ??
            RenewalStatus.ACTIVE,
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
          : "狩猟免許（狩猟免状）の更新に失敗しました。",
    };
  }

  revalidateAppPaths("/", "/renewals", "/account");
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

  const permittedOn = getOptionalDate(formData, "firearmPermittedOn");
  const expiresOn = getOptionalDate(formData, "firearmExpiresOn");
  const permittedOnError = getDateInputError(formData, "firearmPermittedOn", "許可日");
  const expiresOnError = getDateInputError(formData, "firearmExpiresOn", "有効期限日");
  if (permittedOnError) {
    errors.firearmPermittedOn = permittedOnError;
  }
  if (expiresOnError) {
    errors.firearmExpiresOn = expiresOnError;
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
        select: {
          id: true,
          barrelRecords: {
            where: { deletedAt: null },
            select: { id: true },
            take: 1,
          },
        },
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
          isPrimary: firearm.barrelRecords.length === 0,
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
        select: { id: true, isPrimary: true },
      }),
    );

    if (!barrel) {
      throw new Error("銃身情報が見つかりません。");
    }

    if (barrel.isPrimary) {
      throw new Error("本銃身は削除できません。先に別の銃身を本銃身に設定してください。");
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

export async function deleteSelectedFirearmBarrelRecordsAction(
  prevState: RenewalActionResult | null,
  formData: FormData,
): Promise<RenewalActionResult> {
  const ids = Array.from(getFormDataStringSet(formData, "barrelIds"));

  if (ids.length === 0) {
    return {
      success: false,
      message: "削除する銃身を選択してください。",
    };
  }

  try {
    const user = await getCurrentUser();
    const barrels = await withPrismaRetry((prisma) =>
      prisma.firearmBarrelRecord.findMany({
        where: {
          id: { in: ids },
          deletedAt: null,
          firearmRecord: {
            deletedAt: null,
            renewalRecord: {
              userId: user.id,
              deletedAt: null,
            },
          },
        },
        select: { id: true, isPrimary: true },
      }),
    );

    if (barrels.length !== ids.length) {
      throw new Error("削除対象の銃身情報が見つかりません。");
    }

    if (barrels.some((barrel) => barrel.isPrimary)) {
      return {
        success: false,
        message:
          "本銃身は削除できません。先に別の銃身を本銃身に設定してください。",
      };
    }

    await withPrismaRetry((prisma) =>
      prisma.firearmBarrelRecord.updateMany({
        where: { id: { in: ids } },
        data: { deletedAt: new Date() },
      }),
    );
  } catch (error) {
    console.error("Failed to delete selected firearm barrels", error);
    return {
      success: false,
      message: "選択した銃身情報の削除に失敗しました。",
    };
  }

  revalidateAppPaths("/renewals");
  return { success: true };
}

export async function setPrimaryFirearmBarrelRecordAction(
  prevState: RenewalActionResult | null,
  formData: FormData,
): Promise<RenewalActionResult> {
  const id = getString(formData, "barrelId");

  if (!id) {
    return {
      success: false,
      message: "本銃身にする銃身を選択してください。",
    };
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
        select: { id: true, firearmRecordId: true },
      }),
    );

    if (!barrel) {
      throw new Error("銃身情報が見つかりません。");
    }

    await withPrismaRetry((prisma) =>
      prisma.$transaction([
        prisma.firearmBarrelRecord.updateMany({
          where: {
            firearmRecordId: barrel.firearmRecordId,
            deletedAt: null,
          },
          data: { isPrimary: false },
        }),
        prisma.firearmBarrelRecord.update({
          where: { id: barrel.id },
          data: { isPrimary: true },
        }),
      ]),
    );
  } catch (error) {
    console.error("Failed to set primary firearm barrel", error);
    return {
      success: false,
      message: "本銃身の設定に失敗しました。",
    };
  }

  revalidateAppPaths("/renewals");
  return { success: true };
}

export async function upsertFirearmInspectionScheduleAction(
  prevState: RenewalActionResult | null,
  formData: FormData,
): Promise<RenewalActionResult> {
  const id = getString(formData, "id");
  const renewalRecordId = getString(formData, "renewalRecordId");
  const scheduledOn = getOptionalDate(formData, "scheduledOn");
  const errors: FieldErrors = {};

  const scheduledOnError = getDateInputError(
    formData,
    "scheduledOn",
    "銃検予定日",
    true,
  );
  if (scheduledOnError) {
    errors.scheduledOn = scheduledOnError;
  }
  if (!renewalRecordId && !id) {
    errors.renewalRecordId = "銃砲所持許可の記録を確認できません。";
  }

  if (Object.keys(errors).length > 0) {
    return { success: false, errors };
  }

  try {
    const user = await getCurrentUser();
    const notes = getOptionalNormalizedText(formData, "notes");
    const safeScheduledOn = scheduledOn as Date;

    if (id) {
      const inspection = await requireFirearmInspectionRecord(id, user.id);

      await withPrismaRetry((prisma) =>
        prisma.firearmInspectionRecord.update({
          where: { id: inspection.id },
          data: {
            scheduledOn: safeScheduledOn,
            notes,
          },
        }),
      );
    } else {
      await requireGunLicenseRenewalRecord(renewalRecordId, user.id);

      const existingScheduled = await withPrismaRetry((prisma) =>
        prisma.firearmInspectionRecord.findFirst({
          where: {
            userId: user.id,
            renewalRecordId,
            status: FirearmInspectionStatus.SCHEDULED,
            deletedAt: null,
          },
          select: { id: true },
        }),
      );

      if (existingScheduled) {
        return {
          success: false,
          message:
            "未実施の銃検予定がすでにあります。既存の予定を編集してください。",
        };
      }

      await withPrismaRetry((prisma) =>
        prisma.firearmInspectionRecord.create({
          data: {
            userId: user.id,
            renewalRecordId,
            scheduledOn: safeScheduledOn,
            notes,
          },
        }),
      );
    }
  } catch (error) {
    console.error("Failed to save firearm inspection schedule", error);
    return {
      success: false,
      message: "銃検情報の保存に失敗しました。入力内容を確認してください。",
    };
  }

  revalidateAppPaths("/", "/renewals");
  return { success: true };
}

export async function completeFirearmInspectionAction(
  prevState: RenewalActionResult | null,
  formData: FormData,
): Promise<RenewalActionResult> {
  const id = getString(formData, "id");
  const inspectedOn = getOptionalDate(formData, "inspectedOn");
  const errors: FieldErrors = {};

  if (!id) {
    errors.id = "銃検記録を確認できません。";
  }
  const inspectedOnError = getDateInputError(
    formData,
    "inspectedOn",
    "銃検実施日",
    true,
  );
  if (inspectedOnError) {
    errors.inspectedOn = inspectedOnError;
  }

  if (Object.keys(errors).length > 0) {
    return { success: false, errors };
  }

  try {
    const user = await getCurrentUser();
    const inspection = await requireFirearmInspectionRecord(id, user.id);
    if (inspection.status !== FirearmInspectionStatus.SCHEDULED) {
      return {
        success: false,
        message: "未実施の銃検予定ではありません。",
      };
    }

    await withPrismaRetry((prisma) =>
      prisma.firearmInspectionRecord.update({
        where: { id: inspection.id },
        data: {
          status: FirearmInspectionStatus.COMPLETED,
          inspectedOn: inspectedOn as Date,
          completedAt: new Date(),
          notes: getOptionalNormalizedText(formData, "notes"),
        },
      }),
    );
  } catch (error) {
    console.error("Failed to complete firearm inspection", error);
    return {
      success: false,
      message: "銃検済みへの変更に失敗しました。",
    };
  }

  revalidateAppPaths("/", "/renewals");
  return { success: true };
}

export async function updateCompletedFirearmInspectionAction(
  prevState: RenewalActionResult | null,
  formData: FormData,
): Promise<RenewalActionResult> {
  const id = getString(formData, "id");
  const scheduledOn = getOptionalDate(formData, "scheduledOn");
  const inspectedOn = getOptionalDate(formData, "inspectedOn");
  const errors: FieldErrors = {};

  if (!id) {
    errors.id = "銃検記録を確認できません。";
  }
  const scheduledOnError = getDateInputError(
    formData,
    "scheduledOn",
    "銃検予定日",
    true,
  );
  if (scheduledOnError) {
    errors.scheduledOn = scheduledOnError;
  }
  const inspectedOnError = getDateInputError(
    formData,
    "inspectedOn",
    "銃検実施日",
    true,
  );
  if (inspectedOnError) {
    errors.inspectedOn = inspectedOnError;
  }

  if (Object.keys(errors).length > 0) {
    return { success: false, errors };
  }

  try {
    const user = await getCurrentUser();
    const inspection = await requireFirearmInspectionRecord(id, user.id);

    await withPrismaRetry((prisma) =>
      prisma.firearmInspectionRecord.update({
        where: { id: inspection.id },
        data: {
          scheduledOn: scheduledOn as Date,
          status: FirearmInspectionStatus.COMPLETED,
          inspectedOn: inspectedOn as Date,
          completedAt: new Date(),
          notes: getOptionalNormalizedText(formData, "notes"),
        },
      }),
    );
  } catch (error) {
    console.error("Failed to update completed firearm inspection", error);
    return {
      success: false,
      message: "銃検記録の更新に失敗しました。",
    };
  }

  revalidateAppPaths("/", "/renewals");
  return { success: true };
}

export async function reopenFirearmInspectionAction(
  prevState: RenewalActionResult | null,
  formData: FormData,
): Promise<RenewalActionResult> {
  const id = getString(formData, "id");
  if (!id) {
    return { success: false, message: "銃検記録を確認できません。" };
  }

  try {
    const user = await getCurrentUser();
    const inspection = await requireFirearmInspectionRecord(id, user.id);

    await withPrismaRetry((prisma) =>
      prisma.firearmInspectionRecord.update({
        where: { id: inspection.id },
        data: {
          status: FirearmInspectionStatus.SCHEDULED,
          inspectedOn: null,
          completedAt: null,
        },
      }),
    );
  } catch (error) {
    console.error("Failed to reopen firearm inspection", error);
    return {
      success: false,
      message: "銃検済みの取り消しに失敗しました。",
    };
  }

  revalidateAppPaths("/", "/renewals");
  return { success: true };
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

    const previousFiles = await withPrismaRetry((prisma) =>
      prisma.fileRecord.findMany({
        where: {
          userId: user.id,
          renewalRecordId,
          fileCategory: FileCategory.LICENSE_COPY,
          deletedAt: null,
        },
        select: { storageKey: true },
      }),
    );

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
  const target = id ? `ammo-record-${id}` : "ammo-new";
  const validation = validateAmmoFormData(formData);

  if (validation.errors.transactionDate) {
    redirectWithFieldMessage(
      pathname,
      "error",
      validation.errors.transactionDate,
      "transactionDate",
      target,
    );
  }

  if (validation.errors.quantity) {
    redirectWithFieldMessage(
      pathname,
      "error",
      validation.errors.quantity,
      "quantity",
      target,
    );
  }

  if (validation.errors.caliber) {
    redirectWithFieldMessage(
      pathname,
      "error",
      validation.errors.caliber,
      "caliber",
      target,
    );
  }

  const payload = buildAmmoPayload(formData);

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
    console.error("Failed to save ammo record", error);
    redirectWithMessage(pathname, "error", "実包記録の保存に失敗しました。", target);
  }

  revalidateAppPaths("/", "/ammo", "/account");
  redirectWithMessage(
    pathname,
    "success",
    id ? "実包記録を更新しました。" : "実包記録を登録しました。",
    target,
  );
}

export async function createAmmoAction(
  _previousState: AmmoActionState,
  formData: FormData,
): Promise<AmmoActionState> {
  const values = getAmmoActionValues(formData);
  const validation = validateAmmoFormData(formData);

  if (Object.keys(validation.errors).length > 0) {
    return {
      success: false,
      fieldErrors: validation.errors,
      values,
    };
  }

  try {
    const user = await getCurrentUser();
    await withPrismaRetry((prisma) =>
      prisma.ammoRecord.create({
        data: {
          userId: user.id,
          ...buildAmmoPayload(formData),
        },
      }),
    );
  } catch (error) {
    console.error("Failed to create ammo record", error);
    return {
      success: false,
      message: "実包記録の保存に失敗しました。入力内容を確認してください。",
      values,
    };
  }

  revalidateAppPaths("/", "/ammo", "/account");
  return {
    success: true,
    message: "実包記録を登録しました。",
    values: emptyAmmoActionValues,
  };
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
  redirectWithMessage(pathname, "success", "削除しました。", "ammo-records");
}

export async function upsertHuntingEventAction(formData: FormData) {
  const pathname = "/reports";
  const id = getOptionalString(formData, "id");
  const activityTypeInput = getOptionalString(formData, "activityType") as
    | ActivityType
    | null;
  const activityType =
    activityTypeInput === ActivityType.SHOOTING
      ? ActivityType.SHOOTING
      : ActivityType.HUNTING;
  const eventDate = getOptionalDate(formData, "eventDate");
  const targetSpecies = getOptionalString(formData, "targetSpecies");
  const resultCountValue = getOptionalString(formData, "resultCount");
  const resultCount = resultCountValue ? getInt(formData, "resultCount") : null;
  const toolQuantityValue = getOptionalString(formData, "toolQuantity");
  const toolQuantity = toolQuantityValue ? getInt(formData, "toolQuantity") : null;
  const shootingType = getOptionalString(formData, "shootingType");
  const shootingRangeName = getOptionalNormalizedText(
    formData,
    "shootingRangeName",
  );
  const shotCountValue = getOptionalString(formData, "shotCount");
  const shotCount = shotCountValue ? getInt(formData, "shotCount") : null;
  const shotShellUsedCount = getInt(formData, "shotShellUsedCount");
  const slugUsedCount = getInt(formData, "slugUsedCount");
  const airgunPelletUsedCount = getInt(formData, "airgunPelletUsedCount");
  const totalAmmoUsed =
    shotShellUsedCount + slugUsedCount + airgunPelletUsedCount;
  const toolName = getOptionalString(formData, "toolName");
  const firearmToolSelection = getOptionalString(formData, "firearmToolSelection");
  const firearmToolSelectionParts = firearmToolSelection?.split(":") ?? [];
  const selectedFirearmRecordId =
    getOptionalString(formData, "firearmRecordId") ??
    (firearmToolSelection?.startsWith("firearm:")
      ? firearmToolSelection.slice("firearm:".length)
      : firearmToolSelectionParts[0] === "barrel"
        ? firearmToolSelectionParts[1] ?? null
      : null);
  const selectedFirearmBarrelRecordId =
    getOptionalString(formData, "firearmBarrelRecordId") ??
    (firearmToolSelection?.startsWith("barrel:")
      ? firearmToolSelectionParts[2] ?? null
      : null);

  if (!isValidDate(eventDate)) {
    redirectWithMessage(pathname, "error", "保存に失敗しました。");
  }

  const safeEventDate = eventDate as Date;

  if (activityType === ActivityType.HUNTING && !targetSpecies) {
    redirectWithMessage(pathname, "error", "保存に失敗しました。");
  }

  if (resultCount !== null && resultCount < 0) {
    redirectWithMessage(pathname, "error", "保存に失敗しました。");
  }

  if (toolQuantity !== null && toolQuantity < 0) {
    redirectWithMessage(pathname, "error", "保存に失敗しました。");
  }

  if (shotCount !== null && shotCount < 0) {
    redirectWithMessage(pathname, "error", "保存に失敗しました。");
  }

  if (
    shotShellUsedCount < 0 ||
    slugUsedCount < 0 ||
    airgunPelletUsedCount < 0
  ) {
    redirectWithMessage(pathname, "error", "使用弾数は0以上で入力してください。");
  }

  if (activityType === ActivityType.SHOOTING && (!shootingType || !shootingRangeName)) {
    redirectWithMessage(pathname, "error", "保存に失敗しました。");
  }

  if (!selectedFirearmRecordId) {
    redirectWithMessage(pathname, "error", "使用道具を選択してください。");
  }

  const payload =
    activityType === ActivityType.SHOOTING
      ? {
          activityType,
          eventDate: safeEventDate,
          prefectureCode: null,
          municipalityCode: null,
          areaName: null,
          huntingMethod: null,
          targetSpecies: null,
          purposeCode: null,
          resultCount: null,
          shootingType,
          shootingRangeName,
          shotCount: totalAmmoUsed,
          shotShellUsedCount,
          slugUsedCount,
          airgunPelletUsedCount,
          isReportTransferTarget: false,
          importedToReportAt: null,
          notes: getOptionalString(formData, "notes"),
        }
      : {
          activityType,
          eventDate: safeEventDate,
          prefectureCode: getOptionalString(formData, "prefectureCode"),
          municipalityCode: null,
          areaName: normalizeMunicipalityName(
            getOptionalString(formData, "areaName"),
          ),
          huntingMethod: getOptionalString(formData, "huntingMethod") as
            | HuntingMethod
            | null,
          targetSpecies,
          purposeCode: getOptionalString(formData, "purposeCode") as
            | HuntingPurpose
            | null,
          resultCount,
          shootingType: null,
          shootingRangeName: null,
          shotCount: null,
          shotShellUsedCount,
          slugUsedCount,
          airgunPelletUsedCount,
          isReportTransferTarget: true,
          notes: getOptionalString(formData, "notes"),
        };

  try {
    const user = await getCurrentUser();
    const selectedFirearmTool = await requireReportFirearmTool(
      user.id,
      selectedFirearmRecordId,
      selectedFirearmBarrelRecordId,
    );
    const resolvedToolName = selectedFirearmTool?.toolName ?? toolName;
    const resolvedToolNotes =
      selectedFirearmTool?.notes ?? getOptionalString(formData, "toolNotes");

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

      if (resolvedToolName) {
        await withPrismaRetry((prisma) =>
          prisma.huntingEventTool.create({
            data: {
              huntingEventId: id,
              firearmRecordId: selectedFirearmTool?.firearmRecordId ?? null,
              firearmBarrelRecordId:
                selectedFirearmTool?.firearmBarrelRecordId ?? null,
              toolType:
                (getOptionalString(formData, "toolType") as HuntingToolType) ??
                HuntingToolType.FIREARM,
              toolName: resolvedToolName,
              quantity:
                activityType === ActivityType.SHOOTING ? null : toolQuantity,
              notes: resolvedToolNotes,
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

      if (resolvedToolName) {
        await withPrismaRetry((prisma) =>
          prisma.huntingEventTool.create({
            data: {
              huntingEventId: event.id,
              firearmRecordId: selectedFirearmTool?.firearmRecordId ?? null,
              firearmBarrelRecordId:
                selectedFirearmTool?.firearmBarrelRecordId ?? null,
              toolType:
                (getOptionalString(formData, "toolType") as HuntingToolType) ??
                HuntingToolType.FIREARM,
              toolName: resolvedToolName,
              quantity:
                activityType === ActivityType.SHOOTING ? null : toolQuantity,
              notes: resolvedToolNotes,
            },
          }),
        );
      }
    }
  } catch (error) {
    console.error("Failed to save hunting event", error);
    redirectWithMessage(
      pathname,
      "error",
      "活動記録の保存に失敗しました。入力内容を確認してください。",
    );
  }

  revalidateAppPaths("/", "/reports", "/account");
  redirectWithMessage(
    pathname,
    "success",
    id ? "活動記録を更新しました。" : "活動記録を登録しました。",
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
      error instanceof Error ? error.message : "活動記録の削除に失敗しました。";
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
    redirectWithMessage(pathname, "error", "対象の活動記録が見つかりません。");
  }

  try {
    const user = await getCurrentUser();
    await requireHuntingEvent(id, user.id);

    const target = await withPrismaRetry((prisma) =>
      prisma.huntingEvent.findFirst({
        where: {
          id,
          userId: user.id,
          activityType: ActivityType.HUNTING,
          isReportTransferTarget: true,
          deletedAt: null,
        },
        select: { id: true },
      }),
    );

    if (!target) {
      redirectWithMessage(
        pathname,
        "error",
        "転記対象の狩猟記録が見つかりません。",
      );
    }

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
    imported
      ? "報告書未記入に戻しました。"
      : "報告書記入済みにしました。",
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

  const birthDateError = getDateInputError(formData, "birthDate", "生年月日");
  if (birthDateError) {
    redirectWithFieldMessage(pathname, "error", birthDateError, "birthDate");
  }

  const normalizedPhoneNumber = normalizePhoneNumber(
    getOptionalString(formData, "phoneNumber"),
  );
  if (normalizedPhoneNumber && !/^\d+$/.test(normalizedPhoneNumber)) {
    redirectWithFieldMessage(
      pathname,
      "error",
      "電話番号はハイフンなしの半角数字で入力してください。",
      "phoneNumber",
    );
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
            phoneNumber: normalizedPhoneNumber,
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
