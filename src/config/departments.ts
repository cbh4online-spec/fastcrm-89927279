/**
 * Department Visibility — Control Plane
 *
 * SSoT para mapear planos de subscrição → departamentos visíveis.
 * O sidebar consome `computeDepartmentVisibility()` cruzando:
 *   1. Plano da workspace (starter | growth | scale)
 *   2. Overrides manuais em `workspace_department_overrides`
 *   3. Status do super admin (bypass total)
 *
 * Departamentos = MegaGroups definidos em `routeManifest.ts`.
 */

import type { MegaGroup } from "@/config/routeManifest";
import type { SubscriptionPlan } from "@/contexts/SubscriptionContext";

/** Departamentos sempre disponíveis em qualquer plano (incl. starter). */
export const ALWAYS_AVAILABLE_DEPARTMENTS: MegaGroup[] = [
  "inicio",
  "administracao",
];

/**
 * Mapping plano → departamentos incluídos.
 * Cada plano herda os do tier inferior + adiciona novos.
 */
export const PLAN_DEPARTMENTS: Record<SubscriptionPlan, MegaGroup[]> = {
  starter: [
    ...ALWAYS_AVAILABLE_DEPARTMENTS,
    "comercial",
    "comunicacao",
  ],
  growth: [
    ...ALWAYS_AVAILABLE_DEPARTMENTS,
    "comercial",
    "comunicacao",
    "marketing",
    "vendas-financeiro",
    "suporte",
    "inteligencia",
  ],
  scale: [
    ...ALWAYS_AVAILABLE_DEPARTMENTS,
    "comercial",
    "comunicacao",
    "marketing",
    "vendas-financeiro",
    "compras-logistica",
    "loja-marketplace",
    "suporte",
    "rh",
    "seguranca",
    "inteligencia",
  ],
};

export interface DepartmentOverride {
  department_slug: string;
  enabled: boolean;
  locked_by_plan: boolean;
}

export interface DepartmentVisibilityState {
  /** Departamento visível no sidebar (não bloqueado, não desactivado). */
  visible: boolean;
  /** Bloqueado pelo plano actual → mostra cadeado + CTA upgrade. */
  lockedByPlan: boolean;
  /** Desactivado manualmente pelo admin via override. */
  disabledByAdmin: boolean;
  /** Incluído no plano contratado. */
  includedInPlan: boolean;
}

/**
 * Computa o estado de visibilidade para um departamento.
 * Super admin = bypass (vê tudo).
 */
export function computeDepartmentVisibility(
  department: MegaGroup,
  plan: SubscriptionPlan,
  overrides: DepartmentOverride[],
  isSuperAdmin: boolean = false,
): DepartmentVisibilityState {
  const includedInPlan = PLAN_DEPARTMENTS[plan].includes(department);
  const override = overrides.find((o) => o.department_slug === department);

  if (isSuperAdmin) {
    return {
      visible: override?.enabled !== false,
      lockedByPlan: false,
      disabledByAdmin: override?.enabled === false,
      includedInPlan: true,
    };
  }

  const lockedByPlan = !includedInPlan && override?.enabled !== true;
  const disabledByAdmin = override?.enabled === false;
  const visible = includedInPlan && !disabledByAdmin;

  return { visible, lockedByPlan, disabledByAdmin, includedInPlan };
}

/** Helper: lista de departamentos visíveis dado um plano + overrides. */
export function getVisibleDepartments(
  plan: SubscriptionPlan,
  overrides: DepartmentOverride[],
  isSuperAdmin: boolean = false,
): Set<MegaGroup> {
  const allDepartments: MegaGroup[] = [
    "inicio",
    "comercial",
    "marketing",
    "comunicacao",
    "vendas-financeiro",
    "compras-logistica",
    "loja-marketplace",
    "suporte",
    "rh",
    "seguranca",
    "inteligencia",
    "administracao",
  ];
  const visible = new Set<MegaGroup>();
  for (const d of allDepartments) {
    const state = computeDepartmentVisibility(d, plan, overrides, isSuperAdmin);
    if (state.visible) visible.add(d);
  }
  return visible;
}
