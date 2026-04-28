import { ValidationRuleGroup, RenewalCategory } from "@prisma/client";
import { prisma } from "@/lib/prisma";

export type RenewalRuleConfig = {
  reminderLeadDays: number;
  reminderLeadDaysHelp: string;
};

export const DEFAULT_RENEWAL_RULE_CONFIG: RenewalRuleConfig = {
  reminderLeadDays: 90,
  reminderLeadDaysHelp: "90日前から注意表示する想定です。",
};

type ValidationRuleConditions = {
  category?: string;
  categories?: string[];
  categoryIn?: string[];
  leadDays?: number;
  value?: number;
};

function parseConditionsJson(value: unknown): ValidationRuleConditions {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return {};
  }

  return {
    ...(value as ValidationRuleConditions),
  };
}

function matchesCategory(
  conditions: ValidationRuleConditions,
  category: RenewalCategory,
) {
  if (!conditions.category && !conditions.categories && !conditions.categoryIn) {
    return true;
  }

  if (conditions.category === category) {
    return true;
  }

  if (Array.isArray(conditions.categories) && conditions.categories.includes(category)) {
    return true;
  }

  if (Array.isArray(conditions.categoryIn) && conditions.categoryIn.includes(category)) {
    return true;
  }

  return false;
}

function getRuleNumericValue(rule: { conditionsJson: unknown } | undefined): number | null {
  if (!rule) {
    return null;
  }

  const conditions = parseConditionsJson(rule.conditionsJson);
  if (typeof conditions.leadDays === "number" && Number.isFinite(conditions.leadDays)) {
    return Math.max(0, Math.floor(conditions.leadDays));
  }

  if (typeof conditions.value === "number" && Number.isFinite(conditions.value)) {
    return Math.max(0, Math.floor(conditions.value));
  }

  return null;
}

export async function getActiveValidationRules(
  group: ValidationRuleGroup,
  prefectureCode: string,
  category?: RenewalCategory,
) {
  const ruleRows = await prisma.validationRule.findMany({
    where: {
      ruleGroup: group,
      isActive: true,
      prefectureCode: { in: [prefectureCode, "COMMON"] },
    },
    orderBy: [{ version: "desc" }],
  });

  return ruleRows
    .map((rule) => ({
      ...rule,
      conditions: parseConditionsJson(rule.conditionsJson),
    }))
    .filter((rule) => !category || matchesCategory(rule.conditions, category))
    .sort((a, b) => {
      const aPriority = a.prefectureCode === prefectureCode ? 0 : 1;
      const bPriority = b.prefectureCode === prefectureCode ? 0 : 1;
      if (aPriority !== bPriority) {
        return aPriority - bPriority;
      }

      return b.version - a.version;
    });
}

export async function resolveRenewalRule(
  prefectureCode: string,
  category: RenewalCategory,
): Promise<RenewalRuleConfig> {
  const rules = await getActiveValidationRules(
    ValidationRuleGroup.RENEWAL,
    prefectureCode,
    category,
  );

  const reminderRule = rules.find((rule) => rule.ruleCode === "reminderLeadDays");
  const reminderLeadDays = getRuleNumericValue(reminderRule) ?? DEFAULT_RENEWAL_RULE_CONFIG.reminderLeadDays;
  const reminderLeadDaysHelp = reminderRule?.message ?? DEFAULT_RENEWAL_RULE_CONFIG.reminderLeadDaysHelp;

  return {
    reminderLeadDays,
    reminderLeadDaysHelp,
  };
}
