import { PrismaPg } from "@prisma/adapter-pg";
import {
  FirearmBarrelType,
  FirearmStatus,
  FirearmType,
  PlanCode,
  PrismaClient,
  RenewalCategory,
  RenewalStatus,
  UserStatus,
} from "@prisma/client";

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error("DATABASE_URL is not configured.");
}

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString }),
});

async function main() {
  const user = await prisma.user.upsert({
    where: { email: "demo@local.hunting-app" },
    update: {
      status: UserStatus.ACTIVE,
      planCode: PlanCode.FREE,
      emailVerifiedAt: new Date(),
    },
    create: {
      email: "demo@local.hunting-app",
      passwordHash: "local-demo-password-not-used",
      status: UserStatus.ACTIVE,
      planCode: PlanCode.FREE,
      emailVerifiedAt: new Date(),
    },
  });

  await prisma.userProfile.upsert({
    where: { userId: user.id },
    update: {},
    create: {
      userId: user.id,
      lastName: "狩猟",
      firstName: "太郎",
      birthDate: new Date("1988-04-01"),
      onboardingCompletedAt: new Date(),
    },
  });

  const existing = await prisma.renewalRecord.findFirst({
    where: {
      userId: user.id,
      category: RenewalCategory.GUN_LICENSE,
      deletedAt: null,
    },
    orderBy: { createdAt: "asc" },
  });

  const renewal =
    existing
      ? await prisma.renewalRecord.update({
          where: { id: existing.id },
          data: {
            category: RenewalCategory.GUN_LICENSE,
            title: "銃砲所持許可 更新管理",
            issuedOn: new Date("2025-07-03"),
            expiresOn: new Date("2027-09-09"),
            targetDate: new Date("2027-09-09"),
            reminderStartOn: new Date("2027-06-11"),
            originalPermittedOn: new Date("2025-07-03"),
            originalPermitNumber: "127070058",
            permitNumber: "127070058",
            confirmedOn: new Date("2025-07-08"),
            applicationStartOn: new Date("2027-08-09"),
            applicationEndOn: new Date("2027-09-09"),
            validityDescription: "令和9年の誕生日まで",
            status: RenewalStatus.ACTIVE,
            notes: "表示確認用の銃砲所持許可ダミーデータ",
          },
        })
      : await prisma.renewalRecord.create({
      data: {
        userId: user.id,
        category: RenewalCategory.GUN_LICENSE,
        title: "銃砲所持許可 更新管理",
        issuedOn: new Date("2025-07-03"),
        expiresOn: new Date("2027-09-09"),
        targetDate: new Date("2027-09-09"),
        reminderStartOn: new Date("2027-06-11"),
        originalPermittedOn: new Date("2025-07-03"),
        originalPermitNumber: "127070058",
        permitNumber: "127070058",
        confirmedOn: new Date("2025-07-08"),
        applicationStartOn: new Date("2027-08-09"),
        applicationEndOn: new Date("2027-09-09"),
        validityDescription: "令和9年の誕生日まで",
        status: RenewalStatus.ACTIVE,
        notes: "表示確認用の銃砲所持許可ダミーデータ",
      },
    });

  await prisma.firearmRecord.updateMany({
    where: { renewalRecordId: renewal.id, deletedAt: null },
    data: { deletedAt: new Date() },
  });

  const firearm = await prisma.firearmRecord.create({
    data: {
      renewalRecordId: renewal.id,
      displayName: "レミントン M870",
      firearmType: FirearmType.RIFLE,
      manufacturer: "レミントン",
      modelName: "M870",
      serialNumber: "242254V",
      caliber: "18.4mm",
      permittedOn: new Date("2025-07-03"),
      expiresOn: new Date("2027-09-09"),
      totalLength: "110.0cm",
      barrelLength: "61.3cm",
      riflingRate: "1/5以上1/2以下",
      magazineSpec: "チューブ型 2発",
      compatibleAmmo: "12番",
      features: "ハーフライフリングあり",
      purposeText: "狩猟",
      status: FirearmStatus.ACTIVE,
      notes: "銃本体は1丁として扱う。替え銃身は子情報として登録。",
      barrelRecords: {
        create: [
          {
            barrelType: FirearmBarrelType.HALF_RIFLED,
            firearmKind: "ライフル銃",
            caliber: "18.4mm",
            barrelLength: "61.3cm",
            riflingRate: "1/5以上1/2以下",
            compatibleAmmo: "12番",
            features: "ハーフライフリングあり",
          },
          {
            barrelType: FirearmBarrelType.SMOOTHBORE,
            firearmKind: "散弾銃",
            caliber: "17.6mm",
            barrelLength: "70.9cm",
            compatibleAmmo: "12番",
          },
          {
            barrelType: FirearmBarrelType.SMOOTHBORE,
            firearmKind: "散弾銃",
            caliber: "18.3mm",
            barrelLength: "65.1cm",
            compatibleAmmo: "12番",
          },
          {
            barrelType: FirearmBarrelType.SMOOTHBORE,
            firearmKind: "散弾銃",
            caliber: "18.2cm",
            barrelLength: "71.2cm",
            compatibleAmmo: "12番",
          },
        ],
      },
    },
  });

  console.log(`demo gun license ready: ${renewal.id}`);
  console.log(`demo firearm ready: ${firearm.id}`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
