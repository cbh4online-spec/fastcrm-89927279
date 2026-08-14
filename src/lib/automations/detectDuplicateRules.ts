import type { AutomationRule } from "@/hooks/useAutomations";

export interface DuplicateRuleGroup {
  key: string;
  name: string;
  trigger: string;
  rules: AutomationRule[];
  /** Regra sugerida para manter */
  keepId: string;
}

export function normalizeRuleName(name: string): string {
  return (name || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Agrupa regras por nome normalizado + gatilho e devolve apenas os grupos com
 * mais do que uma regra (duplicados).
 *
 * Sugestão de qual manter: mais execuções → mais ações → mais antiga.
 */
export function detectDuplicateRules(
  rules: AutomationRule[] | undefined,
  executionsByRule: Record<string, number> = {}
): DuplicateRuleGroup[] {
  if (!rules?.length) return [];

  const groups = new Map<string, AutomationRule[]>();
  for (const rule of rules) {
    const key = `${normalizeRuleName(rule.name)}::${rule.trigger}`;
    const list = groups.get(key);
    if (list) list.push(rule);
    else groups.set(key, [rule]);
  }

  const result: DuplicateRuleGroup[] = [];
  for (const [key, groupRules] of groups) {
    if (groupRules.length < 2) continue;

    const sorted = [...groupRules].sort((a, b) => {
      const execDiff = (executionsByRule[b.id] ?? 0) - (executionsByRule[a.id] ?? 0);
      if (execDiff !== 0) return execDiff;

      const actionsDiff = (b.actions?.length ?? 0) - (a.actions?.length ?? 0);
      if (actionsDiff !== 0) return actionsDiff;

      return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
    });

    result.push({
      key,
      name: sorted[0].name,
      trigger: sorted[0].trigger,
      rules: [...groupRules].sort(
        (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
      ),
      keepId: sorted[0].id,
    });
  }

  return result.sort((a, b) => b.rules.length - a.rules.length);
}

export function countDuplicateRedundant(groups: DuplicateRuleGroup[]): number {
  return groups.reduce((acc, g) => acc + (g.rules.length - 1), 0);
}
