"use server";

import {
  AmmoCategory,
  AmmoRecordType,
  AmmoUnit,
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
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { ensureDemoUser } from "@/lib/app-data";
import { withPrismaRetry } from "@/lib/prisma";

function getString(formData: FormData, key: string) {
  const value = formData.get(key);
  return typeof value === "string" ? value.trim() : "";
}

function getOptionalString(formData: FormData, key: string) {
  const value = getString(formData, key);
  return value.length > 0 ? value : null;
}

function getOptionalDate(formData: FormData, key: string) {
  const value = getOptionalString(formData, key);
  return value ? new Date(value) : null;
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
      },
    }),
  );

  if (!renewal) {
    throw new Error("対象の更新記録が見つかりません。");
  }

  return renewal;
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

export async function upsertRenewalAction(formData: FormData) {
  const pathname = "/renewals";
  const id = getOptionalString(formData, "id");
  const title = getString(formData, "title");
  const expiresOn = getOptionalDate(formData, "expiresOn");

  if (!title) {
    redirectWithMessage(pathname, "error", "タイトルを入力してください。");
  }

  if (!isValidDate(expiresOn)) {
    redirectWithMessage(pathname, "error", "期限日を入力してください。");
  }

  const payload = {
    category: getString(formData, "category") as RenewalCategory,
    title,
    jurisdictionCode: getOptionalString(formData, "jurisdictionCode"),
    targetDate: getOptionalDate(formData, "targetDate"),
    issuedOn: getOptionalDate(formData, "issuedOn"),
    expiresOn,
    reminderStartOn: getOptionalDate(formData, "reminderStartOn"),
    status: getString(formData, "status") as RenewalStatus,
    notes: getOptionalString(formData, "notes"),
  };

  try {
    const user = await ensureDemoUser();
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

      const serialNumber = getOptionalString(formData, "serialNumber");
      if (serialNumber) {
        await withPrismaRetry((prisma) =>
          prisma.firearmRecord.create({
            data: {
              renewalRecordId: renewal.id,
              firearmType:
                (getOptionalString(formData, "firearmType") as FirearmType) ??
                FirearmType.SHOTGUN,
              serialNumber,
              manufacturer: getOptionalString(formData, "manufacturer"),
              modelName: getOptionalString(formData, "modelName"),
              caliber: getOptionalString(formData, "caliber"),
              status:
                (getOptionalString(formData, "firearmStatus") as FirearmStatus) ??
                FirearmStatus.ACTIVE,
            },
          }),
        );
      }
    }
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "更新記録の保存に失敗しました。";
    redirectWithMessage(pathname, "error", message);
  }

  revalidateAppPaths("/", "/renewals", "/account");
  redirectWithMessage(
    pathname,
    "success",
    id ? "更新記録を更新しました。" : "更新記録を登録しました。",
  );
}

export async function deleteRenewalAction(formData: FormData) {
  const pathname = "/renewals";
  const id = getString(formData, "id");

  if (!id) {
    redirectWithMessage(pathname, "error", "削除対象が見つかりません。");
  }

  try {
    const user = await ensureDemoUser();
    await requireRenewalRecord(id, user.id);

    await withPrismaRetry((prisma) =>
      prisma.firearmRecord.updateMany({
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
  redirectWithMessage(pathname, "success", "更新記録を削除しました。");
}

export async function upsertAmmoAction(formData: FormData) {
  const pathname = "/ammo";
  const id = getOptionalString(formData, "id");
  const quantity = getInt(formData, "quantity");
  const transactionDate = getOptionalDate(formData, "transactionDate");

  if (quantity <= 0) {
    redirectWithMessage(pathname, "error", "数量は 1 以上で入力してください。");
  }

  if (!isValidDate(transactionDate)) {
    redirectWithMessage(pathname, "error", "取引日を入力してください。");
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
    const user = await ensureDemoUser();
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
    redirectWithMessage(pathname, "error", "削除対象が見つかりません。");
  }

  try {
    const user = await ensureDemoUser();
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
  redirectWithMessage(pathname, "success", "実包記録を削除しました。");
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
    redirectWithMessage(pathname, "error", "実施日を入力してください。");
  }

  const safeEventDate = eventDate as Date;

  if (!targetSpecies) {
    redirectWithMessage(pathname, "error", "対象鳥獣を入力してください。");
  }

  if (resultCount !== null && resultCount < 0) {
    redirectWithMessage(pathname, "error", "成果数は 0 以上で入力してください。");
  }

  if (toolQuantity !== null && toolQuantity < 0) {
    redirectWithMessage(pathname, "error", "道具数量は 0 以上で入力してください。");
  }

  const payload = {
    eventDate: safeEventDate,
    prefectureCode: getOptionalString(formData, "prefectureCode"),
    municipalityCode: getOptionalString(formData, "municipalityCode"),
    areaName: getOptionalString(formData, "areaName"),
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
    const user = await ensureDemoUser();
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
    redirectWithMessage(pathname, "error", "削除対象が見つかりません。");
  }

  try {
    const user = await ensureDemoUser();
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
  redirectWithMessage(pathname, "success", "狩猟記録を削除しました。");
}

export async function toggleImportedToReportAction(formData: FormData) {
  const pathname = "/reports";
  const id = getString(formData, "id");
  const imported = getString(formData, "imported") === "true";

  if (!id) {
    redirectWithMessage(pathname, "error", "対象の狩猟記録が見つかりません。");
  }

  try {
    const user = await ensureDemoUser();
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
    const user = await ensureDemoUser();
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
  redirectWithMessage(pathname, "success", "アカウント情報を更新しました。");
}
