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

export const renewalCategoryLabels: Record<RenewalCategory, string> = {
  HUNTING_LICENSE: "狩猟免許",
  GUN_LICENSE: "銃砲所持許可",
  HUNTER_REGISTRATION: "狩猟者登録",
  SKILL_COURSE: "技能講習",
  MEDICAL_CHECK: "健康診断",
  OTHER: "その他",
};

export const renewalStatusLabels: Record<RenewalStatus, string> = {
  ACTIVE: "管理中",
  EXPIRED: "要確認",
  RENEWED: "完了",
  ARCHIVED: "完了",
};

export const ammoRecordTypeLabels: Record<AmmoRecordType, string> = {
  PURCHASE: "購入",
  CONSUME: "消費",
  ADJUST: "調整",
  CARRYOVER: "繰越",
};

export const ammoCategoryLabels: Record<AmmoCategory, string> = {
  SHOT_SHELL: "散弾実包",
  SLUG: "スラッグ",
  RIFLE_ROUND: "ライフル実包",
  AIR_PELLET: "空気銃弾",
  OTHER: "その他",
};

export const huntingMethodLabels: Record<HuntingMethod, string> = {
  GUN: "銃猟",
  TRAP: "わな猟",
  NET: "網猟",
  OTHER: "その他",
};

export const huntingPurposeLabels: Record<HuntingPurpose, string> = {
  HUNTING: "狩猟",
  PEST_CONTROL: "有害鳥獣捕獲",
  TRAINING: "訓練",
  OTHER: "その他",
};

export const huntingToolTypeLabels: Record<HuntingToolType, string> = {
  FIREARM: "銃",
  TRAP: "わな",
  DOG: "猟犬",
  VEHICLE: "車両",
  OTHER: "その他",
};

export const userStatusLabels: Record<UserStatus, string> = {
  PENDING_VERIFICATION: "確認待ち",
  ACTIVE: "利用中",
  WITHDRAWN: "停止済み",
  SUSPENDED: "制限中",
};

export const planCodeLabels: Record<PlanCode, string> = {
  FREE: "無料プラン",
  PAID: "有料プラン",
  ADMIN: "管理者",
};

export const firearmTypeLabels: Record<FirearmType, string> = {
  RIFLE: "ライフル銃",
  SHOTGUN: "散弾銃",
  AIR_RIFLE: "空気銃",
  OTHER: "その他",
};

export const firearmBarrelTypeLabels: Record<FirearmBarrelType, string> = {
  RIFLED: "ライフル銃身",
  HALF_RIFLED: "ハーフライフル銃身",
  SMOOTHBORE: "平筒",
  OTHER: "その他",
};

export const firearmStatusLabels: Record<FirearmStatus, string> = {
  ACTIVE: "使用中",
  DISPOSED: "処分済み",
  INACTIVE: "休止中",
};

export const reportTransferStatusLabels = {
  imported: "転記済み",
  pending: "未転記",
} as const;

export const appNavigationItems = [
  {
    href: "/",
    shortLabel: "ホーム",
    label: "ダッシュボード",
    description: "全体の件数と状態を確認します。",
  },
  {
    href: "/renewals",
    shortLabel: "更新",
    label: "更新管理",
    description: "許可や講習の期限を整理します。",
  },
  {
    href: "/ammo",
    shortLabel: "実包",
    label: "実包帳簿",
    description: "購入と消費の流れを管理します。",
  },
  {
    href: "/reports",
    shortLabel: "報告",
    label: "報告書転記",
    description: "狩猟記録から転記内容を確認します。",
  },
  {
    href: "/account",
    shortLabel: "設定",
    label: "利用者設定",
    description: "固定利用者の情報を整えます。",
  },
] as const;

export function toDisplayLabel<T extends string>(
  value: T | null | undefined,
  labels: Partial<Record<T, string>>,
  fallback = "未設定",
) {
  if (!value) {
    return fallback;
  }

  return labels[value] ?? value;
}
