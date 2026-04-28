import {
  AmmoCategory,
  AmmoRecordType,
  FirearmStatus,
  FirearmBarrelType,
  FirearmType,
  HuntingMethod,
  HuntingPurpose,
  HuntingToolType,
  PlanCode,
  RenewalCategory,
  RenewalStatus,
  UserStatus,
} from "@prisma/client";
import { DEFAULT_RENEWAL_RULE_CONFIG, resolveRenewalRule, type RenewalRuleConfig } from "@/lib/validation-rules";
import { withPrismaRetry } from "@/lib/prisma";

const DEMO_EMAIL = "demo@local.hunting-app";
const DEMO_PASSWORD_HASH = "local-demo-password-not-used";

export async function ensureDemoUser() {
  return withPrismaRetry(async (prisma) => {
    const existing = await prisma.user.findUnique({
      where: { email: DEMO_EMAIL },
      include: {
        profile: true,
      },
    });

    if (existing?.profile) {
      return existing;
    }

    if (existing && !existing.profile) {
      return prisma.user.update({
        where: { id: existing.id },
        data: {
          profile: {
            create: {
              lastName: "狩猟",
              firstName: "太郎",
              birthDate: new Date("1988-04-01"),
              phoneNumber: "090-0000-0000",
              prefectureCode: "23",
              addressLine1: "テスト市テスト町 1-2-3",
              onboardingCompletedAt: new Date(),
            },
          },
        },
        include: {
          profile: true,
        },
      });
    }

    try {
      return await prisma.user.create({
        data: {
          email: DEMO_EMAIL,
          passwordHash: DEMO_PASSWORD_HASH,
          status: UserStatus.ACTIVE,
          planCode: PlanCode.FREE,
          emailVerifiedAt: new Date(),
          profile: {
            create: {
              lastName: "狩猟",
              firstName: "太郎",
              birthDate: new Date("1988-04-01"),
              phoneNumber: "090-0000-0000",
              prefectureCode: "23",
              addressLine1: "テスト市テスト町 1-2-3",
              onboardingCompletedAt: new Date(),
            },
          },
        },
        include: {
          profile: true,
        },
      });
    } catch {
      return prisma.user.findUniqueOrThrow({
        where: { email: DEMO_EMAIL },
        include: {
          profile: true,
        },
      });
    }
  });
}

export async function getDemoUserBundle() {
  const user = await ensureDemoUser();

  return withPrismaRetry((prisma) =>
    prisma.user.findUniqueOrThrow({
      where: { id: user.id },
      include: {
        profile: true,
      },
    }),
  );
}

export function getDashboardSummaryFallback() {
  return {
    renewals: 0,
    ammoBalance: 0,
    pendingReports: 0,
  };
}

export function getRenewalPageDataFallback() {
  return {
    renewals: [],
    renewalRuleConfigs: {
      HUNTING_LICENSE: DEFAULT_RENEWAL_RULE_CONFIG,
      GUN_LICENSE: DEFAULT_RENEWAL_RULE_CONFIG,
    } as Record<RenewalCategory, RenewalRuleConfig>,
  };
}

export function getAmmoPageDataFallback() {
  return {
    ammoRecords: [],
    balance: 0,
  };
}

export function getReportPageDataFallback() {
  return {
    huntingEvents: [],
    municipalitySuggestionsByPrefecture: {},
  };
}

export function getAccountPageDataFallback() {
  return {
    email: DEMO_EMAIL,
    status: UserStatus.ACTIVE,
    planCode: PlanCode.FREE,
    profile: {
      lastName: "狩猟",
      firstName: "太郎",
      birthDate: new Date("1988-04-01"),
      phoneNumber: "090-0000-0000",
      prefectureCode: "23",
      addressLine1: "テスト市テスト町 1-2-3",
      addressLine2: null,
    },
    renewalRecords: [],
    ammoRecords: [],
    huntingEvents: [],
  };
}

export function getDataLoadErrorMessage(error: unknown) {
  if (error instanceof Error && error.message) {
    return `データの取得に失敗しました。接続を確認して再読み込みしてください。(${error.message})`;
  }

  return "データの取得に失敗しました。接続を確認して再読み込みしてください。";
}

export async function getDashboardSummary() {
  const user = await ensureDemoUser();

  const renewals = await withPrismaRetry((prisma) =>
    prisma.renewalRecord.count({
      where: {
        userId: user.id,
        deletedAt: null,
      },
    }),
  );

  const ammoRecords = await withPrismaRetry((prisma) =>
    prisma.ammoRecord.findMany({
      where: {
        userId: user.id,
        deletedAt: null,
      },
      select: {
        recordType: true,
        quantity: true,
      },
    }),
  );

  const pendingReports = await withPrismaRetry((prisma) =>
    prisma.huntingEvent.count({
      where: {
        userId: user.id,
        deletedAt: null,
        importedToReportAt: null,
      },
    }),
  );

  const ammoBalance = ammoRecords.reduce((total, record) => {
    if (record.recordType === AmmoRecordType.CONSUME) {
      return total - record.quantity;
    }

    return total + record.quantity;
  }, 0);

  return {
    renewals,
    ammoBalance,
    pendingReports,
  };
}

export async function getRenewalPageData() {
  const user = await ensureDemoUser();

  const [renewalRuleConfigs, renewals] = await Promise.all([
    Promise.all([
      resolveRenewalRule("COMMON", RenewalCategory.HUNTING_LICENSE),
      resolveRenewalRule("COMMON", RenewalCategory.GUN_LICENSE),
    ]).then(([huntingConfig, gunConfig]) => ({
      HUNTING_LICENSE: huntingConfig,
      GUN_LICENSE: gunConfig,
    } as Record<RenewalCategory, RenewalRuleConfig>)),
    withPrismaRetry((prisma) =>
      prisma.renewalRecord.findMany({
        where: {
          userId: user.id,
          deletedAt: null,
        },
        include: {
          fileRecords: {
            where: {
              deletedAt: null,
            },
            select: {
              id: true,
              fileCategory: true,
              storageKey: true,
              originalFileName: true,
              mimeType: true,
              fileSize: true,
              uploadedAt: true,
            },
            orderBy: { uploadedAt: "desc" },
          },
          firearmRecords: {
            where: {
              deletedAt: null,
            },
            include: {
              barrelRecords: {
                where: {
                  deletedAt: null,
                },
                orderBy: { createdAt: "asc" },
              },
            },
            orderBy: { createdAt: "asc" },
          },
        },
        orderBy: [{ expiresOn: "asc" }, { createdAt: "desc" }],
      }),
    ),
  ]);

  return { user, renewals, renewalRuleConfigs };
}

export async function getAmmoPageData() {
  const user = await ensureDemoUser();

  const ammoRecords = await withPrismaRetry((prisma) =>
    prisma.ammoRecord.findMany({
      where: {
        userId: user.id,
        deletedAt: null,
      },
      orderBy: [{ transactionDate: "desc" }, { createdAt: "desc" }],
    }),
  );

  const balance = ammoRecords.reduce((total, record) => {
    if (record.recordType === AmmoRecordType.CONSUME) {
      return total - record.quantity;
    }

    return total + record.quantity;
  }, 0);

  return { user, ammoRecords, balance };
}

export async function getReportPageData() {
  const user = await ensureDemoUser();

  const [huntingEvents, municipalitySuggestionRows] = await withPrismaRetry(
    (prisma) =>
      Promise.all([
        prisma.huntingEvent.findMany({
          where: {
            userId: user.id,
            deletedAt: null,
          },
          select: {
            id: true,
            eventDate: true,
            prefectureCode: true,
            municipalityCode: true,
            areaName: true,
            huntingMethod: true,
            targetSpecies: true,
            purposeCode: true,
            resultCount: true,
            notes: true,
            importedToReportAt: true,
            huntingEventTools: {
              where: {
                deletedAt: null,
              },
              select: {
                id: true,
                toolType: true,
                toolName: true,
                quantity: true,
                notes: true,
              },
              orderBy: { createdAt: "asc" },
            },
            _count: {
              select: {
                ammoRecords: {
                  where: {
                    deletedAt: null,
                  },
                },
              },
            },
          },
          orderBy: [{ eventDate: "desc" }, { createdAt: "desc" }],
        }),
        prisma.huntingEvent.findMany({
          where: {
            userId: user.id,
            deletedAt: null,
            areaName: {
              not: null,
            },
          },
          select: {
            prefectureCode: true,
            areaName: true,
          },
          distinct: ["prefectureCode", "areaName"],
          orderBy: [{ prefectureCode: "asc" }, { areaName: "asc" }],
        }),
      ]),
  );

  const municipalitySuggestionsByPrefecture =
    municipalitySuggestionRows.reduce<Record<string, string[]>>((result, row) => {
      if (!row.prefectureCode || !row.areaName) {
        return result;
      }

      result[row.prefectureCode] ??= [];
      if (!result[row.prefectureCode].includes(row.areaName)) {
        result[row.prefectureCode].push(row.areaName);
      }

      return result;
    }, {});

  return { user, huntingEvents, municipalitySuggestionsByPrefecture };
}

export async function getAccountPageData() {
  const user = await ensureDemoUser();

  return withPrismaRetry((prisma) =>
    prisma.user.findUniqueOrThrow({
      where: { id: user.id },
      include: {
        profile: true,
        renewalRecords: {
          where: {
            deletedAt: null,
          },
        },
        ammoRecords: {
          where: {
            deletedAt: null,
          },
        },
        huntingEvents: {
          where: {
            deletedAt: null,
          },
        },
      },
    }),
  );
}

export const renewalCategoryOptions = [
  RenewalCategory.HUNTING_LICENSE,
  RenewalCategory.GUN_LICENSE,
];

export const renewalStatusOptions = [
  RenewalStatus.ACTIVE,
  RenewalStatus.EXPIRED,
  RenewalStatus.RENEWED,
];

export const ammoRecordTypeOptions = [
  AmmoRecordType.PURCHASE,
  AmmoRecordType.CONSUME,
  AmmoRecordType.ADJUST,
  AmmoRecordType.CARRYOVER,
];

export const ammoCategoryOptions = [
  AmmoCategory.SHOT_SHELL,
  AmmoCategory.SLUG,
  AmmoCategory.RIFLE_ROUND,
  AmmoCategory.AIR_PELLET,
  AmmoCategory.OTHER,
];

export const huntingMethodOptions = [
  HuntingMethod.GUN,
  HuntingMethod.TRAP,
  HuntingMethod.NET,
  HuntingMethod.OTHER,
];

export const huntingPurposeOptions = [
  HuntingPurpose.HUNTING,
  HuntingPurpose.PEST_CONTROL,
  HuntingPurpose.TRAINING,
  HuntingPurpose.OTHER,
];

export const huntingToolTypeOptions = [
  HuntingToolType.FIREARM,
  HuntingToolType.TRAP,
  HuntingToolType.DOG,
  HuntingToolType.VEHICLE,
  HuntingToolType.OTHER,
];

export const userStatusOptions = [
  UserStatus.PENDING_VERIFICATION,
  UserStatus.ACTIVE,
  UserStatus.WITHDRAWN,
  UserStatus.SUSPENDED,
];

export const planCodeOptions = [PlanCode.FREE, PlanCode.PAID, PlanCode.ADMIN];

export const firearmTypeOptions = [
  FirearmType.RIFLE,
  FirearmType.SHOTGUN,
  FirearmType.AIR_RIFLE,
];

export const firearmBarrelTypeOptions = [
  FirearmBarrelType.RIFLED,
  FirearmBarrelType.HALF_RIFLED,
  FirearmBarrelType.SMOOTHBORE,
  FirearmBarrelType.OTHER,
];

export const firearmStatusOptions = [
  FirearmStatus.ACTIVE,
  FirearmStatus.DISPOSED,
  FirearmStatus.INACTIVE,
];
