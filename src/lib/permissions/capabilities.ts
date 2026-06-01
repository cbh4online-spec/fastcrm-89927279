/**
 * SSoT — Matriz de capabilities por função de workspace.
 *
 * IMPORTANTE: Este ficheiro DEVE ser espelhado em
 * `supabase/functions/_shared/capabilities.ts`. Qualquer alteração aqui
 * tem de ser replicada lá (e vice-versa). Há um teste (`capability-matrix.test.ts`)
 * que valida a consistência entre frontend e backend.
 *
 * `super_admin` faz bypass global de todas as capabilities — esse check é feito
 * pelo `useCapability` hook, não pela matriz.
 */

import type { WorkspaceRole } from "@/contexts/WorkspaceContext";

export const CAPABILITIES = [
  // Workspace administration
  "workspace.manage",
  "workspace.billing",
  "members.manage",

  // Integrations / config
  "integrations.manage",
  "ai.configure",

  // Finance
  "finance.view",
  "finance.manage",

  // CRM
  "crm.read",
  "crm.write",
  "crm.delete",
  "crm.bulk_export",

  // Inbox / comms
  "inbox.read",
  "inbox.reply",

  // Catalog
  "catalog.read",
  "catalog.write",

  // Reports
  "reports.operational",
  "reports.executive",

  // Restricted modules
  "hr.access",
  "security.access",
  "audit.view",

  // Renting / Financiamento
  "rentals.view",
  "rentals.manage",
] as const;

export type Capability = (typeof CAPABILITIES)[number];

const ALL: Capability[] = [...CAPABILITIES];

/**
 * Matriz canónica role → capabilities concedidas.
 *
 * - `owner`  : tudo.
 * - `admin`  : tudo excepto `workspace.billing` (operações financeiras
 *              irreversíveis ficam reservadas ao owner).
 * - `agency` : igual a admin (operador externo a gerir o workspace).
 * - `hr`     : agente + acesso completo ao módulo HR.
 * - `agent`  : operação diária — CRM, inbox, catálogo (leitura), reports
 *              operacionais. Não vê finance nem configura integrações.
 * - `viewer` : só leitura — CRM/inbox/catálogo, reports operacionais e
 *              `finance.view` (KPIs/faturas, sem export).
 */
export const ROLE_CAPABILITIES: Record<WorkspaceRole, Capability[]> = {
  owner: ALL,

  admin: ALL.filter((c) => c !== "workspace.billing"),

  agency: ALL.filter((c) => c !== "workspace.billing"),

  hr: [
    "crm.read",
    "crm.write",
    "inbox.read",
    "inbox.reply",
    "catalog.read",
    "reports.operational",
    "hr.access",
  ],

  agent: [
    "crm.read",
    "crm.write",
    "inbox.read",
    "inbox.reply",
    "catalog.read",
    "reports.operational",
    "rentals.view",
  ],

  viewer: [
    "crm.read",
    "inbox.read",
    "catalog.read",
    "reports.operational",
    "finance.view",
    "rentals.view",
  ],
};

export function roleHasCapability(
  role: WorkspaceRole | null | undefined,
  cap: Capability,
): boolean {
  if (!role) return false;
  return ROLE_CAPABILITIES[role]?.includes(cap) ?? false;
}

/** Etiquetas legíveis para UI (mensagens de "Access Denied"). */
export const CAPABILITY_LABELS: Record<Capability, string> = {
  "workspace.manage": "Gerir workspace",
  "workspace.billing": "Faturação do workspace",
  "members.manage": "Gerir membros",
  "integrations.manage": "Gerir integrações",
  "ai.configure": "Configurar IA",
  "finance.view": "Ver dados financeiros",
  "finance.manage": "Gerir dados financeiros",
  "crm.read": "Ler CRM",
  "crm.write": "Editar CRM",
  "crm.delete": "Apagar registos CRM",
  "crm.bulk_export": "Exportar dados em massa",
  "inbox.read": "Ler inbox",
  "inbox.reply": "Responder no inbox",
  "catalog.read": "Ver catálogo",
  "catalog.write": "Editar catálogo",
  "reports.operational": "Relatórios operacionais",
  "reports.executive": "Relatórios executivos",
  "hr.access": "Aceder a Recursos Humanos",
  "security.access": "Aceder ao módulo Segurança",
  "audit.view": "Ver logs de auditoria",
};
