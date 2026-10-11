import {
  AmmoCategory,
  AmmoRecordType,
  ActivityType,
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
  User,
  UserProfile,
  RenewalRecord,
  AmmoRecord,
  HuntingEvent,
} from "@prisma/client";
import { DEFAULT_RENEWAL_RULE_CONFIG, resolveRenewalRule, type RenewalRuleConfig } from "@/lib/validation-rules";
import { withPrismaRetry } from "@/lib/prisma";
import {
  firearmBarrelTypeLabels,
  firearmTypeLabels,
} from "@/lib/labels";

const DEMO_EMAIL = "demo@local.hunting-app";
const DEMO_PASSWORD_HASH = "local-demo-password-not-used";

export async function ensureDemoUser() {
  return withPrismaRetry(async (prisma) => {
    // Temporary demo identity uses an immutable marker, not the editable email.
    // Replace this lookup with the authenticated user ID when authentication is added.
    const existing = await prisma.user.findFirst({
      where: process.env.DEMO_USER_ID
        ? { id: process.env.DEMO_USER_ID }
        : { passwordHash: DEMO_PASSWORD_HASH },
      orderBy: [{ createdAt: "asc" }, { id: "asc" }],
      include: {
        profile: true,
      },
    });

    if (process.env.DEMO_USER_ID && !existing) {
      throw new Error("デモ利用者の設定を確認してください。");
    }

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
      return prisma.user.findFirstOrThrow({
        where: { passwordHash: DEMO_PASSWORD_HASH },
        orderBy: [{ createdAt: "asc" }, { id: "asc" }],
        include: {
          profile: true,
        },
      });
    }
  });
}

export async function getCurrentUser() {
  return ensureDemoUser();
}

export async function getDemoUserBundle() {
  const user = await getCurrentUser();

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
    ammoRegisteredCount: 0,
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
    registeredCount: 0,
  };
}

export function getReportPageDataFallback() {
  return {
    huntingEvents: [],
    municipalitySuggestionsByPrefecture: {},
    firearmToolOptions: [],
    ammoBalance: {
      shotShell: 0,
      slug: 0,
      airgunPellet: 0,
    },
  };
}

export type AmmoUsageCategory = "shotShell" | "slug" | "airgunPellet";

export type FirearmToolOption = {
  value: string;
  firearmRecordId: string;
  firearmBarrelRecordId: string | null;
  label: string;
  detailLabel: string;
  caliberLabel: string;
  ammoUsageCategory: AmmoUsageCategory;
  ammoUsageLabel: string;
};

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
  console.error("Failed to load application data", error);

  return "データの取得に失敗しました。接続を確認して再読み込みしてください。";
}

export async function getDashboardSummary() {
  const user = await getCurrentUser();

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
        recordType: {
          not: AmmoRecordType.CONSUME,
        },
      },
      select: {
        recordType: true,
        ammoCategory: true,
        quantity: true,
      },
    }),
  );

  const pendingReports = await withPrismaRetry((prisma) =>
    prisma.huntingEvent.count({
      where: {
        userId: user.id,
        deletedAt: null,
        activityType: ActivityType.HUNTING,
        isReportTransferTarget: true,
        importedToReportAt: null,
      },
    }),
  );

  const usageRows = await withPrismaRetry((prisma) =>
    prisma.huntingEvent.findMany({
      where: { userId: user.id, deletedAt: null },
      select: { shotShellUsedCount: true, slugUsedCount: true, airgunPelletUsedCount: true },
    }),
  );
  const balance = calculateAmmoBalance(ammoRecords, usageRows);
  const ammoRegisteredCount = balance.shotShell + balance.slug + balance.airgunPellet;

  return {
    renewals,
    ammoRegisteredCount,
    pendingReports,
  };
}

export async function getRenewalPageData() {
  const user = await getCurrentUser();

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
                orderBy: [{ createdAt: "asc" }, { id: "asc" }],
              },
            },
            orderBy: { createdAt: "asc" },
          },
          firearmInspectionRecords: {
            where: {
              deletedAt: null,
            },
            orderBy: [{ scheduledOn: "desc" }, { createdAt: "desc" }],
          },
        },
        orderBy: [{ expiresOn: "asc" }, { createdAt: "desc" }],
      }),
    ),
  ]);

  return { user, renewals, renewalRuleConfigs };
}

export async function getAmmoPageData() {
  const user = await getCurrentUser();

  const ammoRecords = await withPrismaRetry((prisma) =>
    prisma.ammoRecord.findMany({
      where: {
        userId: user.id,
        deletedAt: null,
        recordType: {
          not: AmmoRecordType.CONSUME,
        },
      },
      orderBy: [{ transactionDate: "desc" }, { createdAt: "desc" }],
    }),
  );

  const registeredCount = ammoRecords.reduce(
    (total, record) => total + record.quantity,
    0,
  );

  return { user, ammoRecords, registeredCount };
}

export async function getReportPageData() {
  const user = await getCurrentUser();

  const [huntingEvents, municipalitySuggestionRows, ammoRecords, usageRows, firearmRecords] = await withPrismaRetry(
    (prisma) =>
      Promise.all([
        prisma.huntingEvent.findMany({
          where: {
            userId: user.id,
            deletedAt: null,
          },
          select: {
            id: true,
            activityType: true,
            eventDate: true,
            prefectureCode: true,
            municipalityCode: true,
            areaName: true,
            huntingMethod: true,
            targetSpecies: true,
            purposeCode: true,
            resultCount: true,
            shootingType: true,
            shootingRangeName: true,
            shotCount: true,
            shotShellUsedCount: true,
            slugUsedCount: true,
            airgunPelletUsedCount: true,
            isReportTransferTarget: true,
            notes: true,
            importedToReportAt: true,
            huntingEventTools: {
              where: {
                deletedAt: null,
              },
              select: {
                id: true,
                firearmRecordId: true,
                firearmBarrelRecordId: true,
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
            activityType: ActivityType.HUNTING,
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
        prisma.ammoRecord.findMany({
          where: {
            userId: user.id,
            deletedAt: null,
            recordType: {
              not: AmmoRecordType.CONSUME,
            },
          },
          select: {
            recordType: true,
            ammoCategory: true,
            quantity: true,
          },
        }),
        prisma.huntingEvent.findMany({
          where: {
            userId: user.id,
            deletedAt: null,
          },
          select: {
            shotShellUsedCount: true,
            slugUsedCount: true,
            airgunPelletUsedCount: true,
          },
        }),
        prisma.firearmRecord.findMany({
          where: {
            deletedAt: null,
            renewalRecord: {
              userId: user.id,
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
            features: true,
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
                isPrimary: true,
              },
              orderBy: [{ createdAt: "asc" }, { id: "asc" }],
            },
          },
          orderBy: [{ createdAt: "asc" }, { id: "asc" }],
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

  const ammoBalance = calculateAmmoBalance(ammoRecords, usageRows);
  const firearmToolOptions = buildFirearmToolOptions(firearmRecords);

  return {
    user,
    huntingEvents,
    municipalitySuggestionsByPrefecture,
    firearmToolOptions,
    ammoBalance,
  };
}

type FirearmToolSource = {
  id: string;
  displayName: string;
  firearmType: FirearmType;
  manufacturer: string | null;
  modelName: string | null;
  caliber: string | null;
  features: string | null;
  barrelRecords: Array<{
    id: string;
    barrelType: FirearmBarrelType;
    caliber: string | null;
    features: string | null;
    purposeMemo: string | null;
    isPrimary: boolean;
  }>;
};

function getFirearmBaseName(firearm: FirearmToolSource) {
  const parts = [
    firearm.displayName,
    firearm.manufacturer,
    firearm.modelName,
  ].filter((part) => part && part.trim().length > 0);

  return parts.length > 0 ? parts.join(" ") : firearmTypeLabels[firearm.firearmType];
}

function getBarrelDisplayName(index: number, barrel: FirearmToolSource["barrelRecords"][number]) {
  return `${index === 0 ? "銃身情報" : `替え銃身 ${index}`} / ${firearmBarrelTypeLabels[barrel.barrelType]}`;
}

function formatReportCaliber(value: string | null | undefined) {
  if (!value) {
    return "口径未登録";
  }

  return value.endsWith("番") || value.endsWith("mm") ? value : `${value}番`;
}

function getAmmoUsageCategoryForFirearm(
  firearm: Pick<FirearmToolSource, "firearmType">,
  barrel?: Pick<FirearmToolSource["barrelRecords"][number], "barrelType" | "features" | "purposeMemo">,
): AmmoUsageCategory {
  if (firearm.firearmType === FirearmType.AIR_RIFLE) {
    return "airgunPellet";
  }

  if (
    firearm.firearmType === FirearmType.RIFLE ||
    barrel?.barrelType === FirearmBarrelType.RIFLED ||
    barrel?.barrelType === FirearmBarrelType.HALF_RIFLED ||
    [barrel?.features, barrel?.purposeMemo].some((value) =>
      value?.includes("スラッグ") || value?.includes("ライフル"),
    )
  ) {
    return "slug";
  }

  return "shotShell";
}

function getAmmoUsageLabel(category: AmmoUsageCategory) {
  if (category === "slug") {
    return "単弾";
  }
  if (category === "airgunPellet") {
    return "空気銃弾";
  }
  return "散弾";
}

function buildFirearmToolOptions(
  firearmRecords: FirearmToolSource[],
): FirearmToolOption[] {
  return firearmRecords.flatMap((firearm) => {
    const firearmName = getFirearmBaseName(firearm);
    const firearmCategory = getAmmoUsageCategoryForFirearm(firearm);
    const firearmOption: FirearmToolOption = {
      value: `firearm:${firearm.id}`,
      firearmRecordId: firearm.id,
      firearmBarrelRecordId: null,
      label: `${firearmName} / 銃本体 / ${formatReportCaliber(firearm.caliber)}`,
      detailLabel: [firearm.features].filter(Boolean).join(" / "),
      caliberLabel: formatReportCaliber(firearm.caliber),
      ammoUsageCategory: firearmCategory,
      ammoUsageLabel: getAmmoUsageLabel(firearmCategory),
    };

    const barrelOptions = firearm.barrelRecords.map((barrel, index) => {
      const barrelCategory = getAmmoUsageCategoryForFirearm(firearm, barrel);
      const detailLabel = [barrel.features, barrel.purposeMemo]
        .filter((value) => value && value.trim().length > 0)
        .join(" / ");

      return {
        value: `barrel:${firearm.id}:${barrel.id}`,
        firearmRecordId: firearm.id,
        firearmBarrelRecordId: barrel.id,
        label: `${firearmName} / ${getBarrelDisplayName(index, barrel)} / ${formatReportCaliber(barrel.caliber ?? firearm.caliber)}`,
        detailLabel,
        caliberLabel: formatReportCaliber(barrel.caliber ?? firearm.caliber),
        ammoUsageCategory: barrelCategory,
        ammoUsageLabel: getAmmoUsageLabel(barrelCategory),
      } satisfies FirearmToolOption;
    });

    return [firearmOption, ...barrelOptions];
  });
}

type AmmoBalanceSourceRecord = {
  recordType: AmmoRecordType;
  ammoCategory: AmmoCategory;
  quantity: number;
};

type AmmoUsageSourceRecord = {
  shotShellUsedCount: number | null;
  slugUsedCount: number | null;
  airgunPelletUsedCount: number | null;
};

function getAmmoQuantitySign(recordType: AmmoRecordType) {
  if (
    recordType === "TRANSFER_OUT" ||
    recordType === "DISPOSAL"
  ) {
    return -1;
  }

  return 1;
}

export function calculateAmmoBalance(
  ammoRecords: AmmoBalanceSourceRecord[],
  usageRows: AmmoUsageSourceRecord[],
) {
  const balance = {
    shotShell: 0,
    slug: 0,
    airgunPellet: 0,
  };

  for (const record of ammoRecords) {
    if (record.recordType === AmmoRecordType.CONSUME) continue;
    const quantity = record.quantity * getAmmoQuantitySign(record.recordType);

    if (record.ammoCategory === AmmoCategory.SHOT_SHELL) {
      balance.shotShell += quantity;
    } else if (
      record.ammoCategory === AmmoCategory.SLUG ||
      record.ammoCategory === AmmoCategory.RIFLE_ROUND
    ) {
      balance.slug += quantity;
    } else if (record.ammoCategory === AmmoCategory.AIR_PELLET) {
      balance.airgunPellet += quantity;
    }
  }

  for (const usage of usageRows) {
    balance.shotShell -= usage.shotShellUsedCount ?? 0;
    balance.slug -= usage.slugUsedCount ?? 0;
    balance.airgunPellet -= usage.airgunPelletUsedCount ?? 0;
  }

  return balance;
}

export type AccountPageData = User & {
  profile: UserProfile | null;
  renewalRecords: RenewalRecord[];
  ammoRecords: AmmoRecord[];
  huntingEvents: HuntingEvent[];
};

export async function getAccountPageData(): Promise<AccountPageData> {
  const user = await getCurrentUser();

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
  "PURCHASE",
  "TRANSFER_IN",
  "TRANSFER_OUT",
  "DISPOSAL",
  "ADJUST",
] satisfies AmmoRecordType[];

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

export const activityTypeOptions = [ActivityType.HUNTING, ActivityType.SHOOTING];

export const shootingTypeOptions = [
  "標的射撃",
  "射撃練習",
  "試射",
  "技能講習練習",
  "その他",
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
