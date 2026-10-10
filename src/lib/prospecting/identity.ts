import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";

export type ProspectingIdentityStatus = "new" | "review" | "exists" | "opportunity" | "blocked" | "unavailable";
export interface ProspectingIdentityCandidate {
  name: string;
  email?: string | null;
  phone?: string | null;
  website?: string | null;
  profile_url?: string | null;
  instagram_url?: string | null;
  google_place_id?: string | null;
}
export interface ProspectingIdentityMatch {
  entity_type: "lead" | "contact" | "company" | "profile";
  entity_id: string;
  name: string | null;
  field: "google_place_id" | "email" | "phone" | "profile" | "url" | "domain" | "name";
  strength: "strong" | "possible";
  blocked: boolean;
  opportunity_id: string | null;
}
export interface ProspectingIdentityCheck {
  status: ProspectingIdentityStatus;
  matches: ProspectingIdentityMatch[];
  reason?: "missing_identifier";
}
export interface ProspectingImportResult extends ProspectingIdentityCheck {
  lead_id?: string;
}

export const SEPARATE_PROSPECTING_INSTANCE_MESSAGE =
  "A prospeção ainda não está ligada em segurança à instância própria deste espaço de trabalho.";
export const PROSPECTING_INSTANCE_NOT_READY_MESSAGE =
  "A ligação ao espaço de trabalho ainda não está pronta. Tente novamente dentro de instantes.";

export function isSeparateProspectingInstance(instanceUrl: string | null | undefined, mainUrl: string): boolean {
  if (!instanceUrl) return false;
  try {
    return new URL(instanceUrl).origin !== new URL(mainUrl).origin;
  } catch {
    return true;
  }
}

const statuses = new Set<ProspectingIdentityStatus>(["new", "review", "exists", "opportunity", "blocked"]);
type RpcResult = { data: unknown; error: { message: string } | null };
type ProspectingRpcClient = { rpc: (name: string, args: Record<string, unknown>) => PromiseLike<RpcResult> };

function parseCheck(data: unknown): ProspectingIdentityCheck {
  if (!data || typeof data !== "object") throw new Error("A verificação de duplicados não está disponível.");
  const record = data as Record<string, unknown>;
  if (typeof record.status !== "string" || !statuses.has(record.status as ProspectingIdentityStatus) || !Array.isArray(record.matches)) {
    throw new Error("A verificação de duplicados devolveu uma resposta inválida.");
  }
  return {
    status: record.status as ProspectingIdentityStatus,
    matches: record.matches as ProspectingIdentityMatch[],
    reason: record.reason === "missing_identifier" ? "missing_identifier" : undefined,
  };
}

/** The RPC checks all CRM entities in the selected workspace, including open opportunities. */
export async function checkProspectingIdentity(
  client: SupabaseClient<Database>,
  workspaceId: string,
  candidate: ProspectingIdentityCandidate,
  profileId?: string,
): Promise<ProspectingIdentityCheck> {
  const { data, error } = await (client as unknown as ProspectingRpcClient).rpc("prospecting_identity_check", {
    p_workspace_id: workspaceId,
    p_candidate: candidate,
    p_profile_id: profileId ?? null,
  });
  if (error) throw new Error(`Não foi possível verificar duplicados: ${error.message}`);
  return parseCheck(data);
}

/** Run before a paid external search so an unavailable identity RPC cannot strand the results. */
export async function assertProspectingIdentityReady(client: SupabaseClient<Database>, workspaceId: string): Promise<void> {
  await checkProspectingIdentity(client, workspaceId, {
    name: "Verificação FastCRM",
    website: "https://fastcrm-prospecting-preflight.invalid",
  });
}

/** Fail closed. The server rechecks identity and creates the lead in one transaction. */
export async function importProspectingLead(
  client: SupabaseClient<Database>,
  workspaceId: string,
  lead: Record<string, unknown>,
  profileId?: string,
  allowPossible = false,
): Promise<ProspectingImportResult> {
  const { data, error } = await (client as unknown as ProspectingRpcClient).rpc("prospecting_import_lead_safe", {
    p_workspace_id: workspaceId,
    p_candidate: lead,
    p_lead: lead,
    p_profile_id: profileId ?? null,
    p_allow_possible: allowPossible,
  });
  if (error) throw new Error(`Importação não concluída: ${error.message}`);
  if (data && typeof data === "object" && (data as Record<string, unknown>).status === "created") {
    const record = data as Record<string, unknown>;
    if (typeof record.lead_id !== "string") throw new Error("O servidor não confirmou o lead criado.");
    return { status: "new", lead_id: record.lead_id, matches: Array.isArray(record.matches) ? record.matches as ProspectingIdentityMatch[] : [] };
  }
  return parseCheck(data);
}

const entityLabels: Record<ProspectingIdentityMatch["entity_type"], string> = {
  lead: "lead", contact: "contacto", company: "empresa", profile: "perfil de prospeção",
};
const fieldLabels: Record<ProspectingIdentityMatch["field"], string> = {
  google_place_id: "ID Google", email: "email", phone: "telefone", profile: "perfil social",
  url: "URL", domain: "domínio", name: "nome",
};

export function describeProspectingIdentity(check: ProspectingIdentityCheck): string {
  if (check.status === "unavailable") return "Verificação indisponível; a importação está suspensa.";
  if (check.status === "new") return "Sem correspondências no CRM.";
  if (check.reason === "missing_identifier") return "Sem identificador fiável (email, telefone, website, perfil ou ID Google). Confirme antes de importar.";
  const match = check.matches[0];
  if (!match) return "Correspondência no CRM; reveja antes de importar.";
  const entity = entityLabels[match.entity_type] ?? "registo";
  const field = fieldLabels[match.field] ?? "identificador";
  const reason = `${entity} ${match.name || match.entity_id} (mesmo ${field})`;
  if (check.status === "blocked") return `Não contactar: ${reason}.`;
  if (check.status === "opportunity") return `Oportunidade em curso: ${reason}.`;
  if (check.status === "review") return `Possível duplicado: ${reason}. Confirme antes de importar.`;
  return `Já existe: ${reason}.`;
}

export function prospectingIdentityHref(check: ProspectingIdentityCheck): string | null {
  const match = check.matches[0];
  if (!match) return null;
  if (check.status === "opportunity" && match.opportunity_id) return `/dashboard/opportunities/${match.opportunity_id}`;
  const section = match.entity_type === "lead" ? "leads" : match.entity_type === "contact" ? "contacts" : match.entity_type === "company" ? "companies" : null;
  return section ? `/dashboard/${section}/${match.entity_id}` : null;
}

export interface ProspectingIdentityBatchItem extends ProspectingIdentityCandidate {
  key: string;
  profile_id?: string | null;
}

/** Small chunks keep each RPC under the DB statement timeout on large workspaces. */
export const PROSPECTING_IDENTITY_BATCH_SIZE = 10;
const PROSPECTING_IDENTITY_CONCURRENCY = 3;

/** A few small RPCs per visible page (≤100), never per row. Missing keys become "unavailable". */
export async function checkProspectingIdentityBatch(
  client: SupabaseClient<Database>,
  workspaceId: string,
  items: ProspectingIdentityBatchItem[],
): Promise<Record<string, ProspectingIdentityCheck>> {
  const out: Record<string, ProspectingIdentityCheck> = {};
  const chunks: ProspectingIdentityBatchItem[][] = [];
  for (let i = 0; i < items.length; i += PROSPECTING_IDENTITY_BATCH_SIZE) {
    chunks.push(items.slice(i, i + PROSPECTING_IDENTITY_BATCH_SIZE));
  }
  const runChunk = async (chunk: ProspectingIdentityBatchItem[]) => {
    const { data, error } = await (client as unknown as ProspectingRpcClient).rpc("prospecting_identity_check_batch", {
      p_workspace_id: workspaceId,
      p_candidates: chunk,
    });
    if (error) throw new Error(`Não foi possível verificar duplicados: ${error.message}`);
    if (!Array.isArray(data)) throw new Error("A verificação de duplicados devolveu uma resposta inválida.");
    for (const row of data as Array<{ key?: unknown; result?: unknown }>) {
      if (typeof row?.key !== "string") continue;
      try {
        out[row.key] = parseCheck(row.result);
      } catch {
        out[row.key] = { status: "unavailable", matches: [] };
      }
    }
    for (const item of chunk) if (!out[item.key]) out[item.key] = { status: "unavailable", matches: [] };
  };
  for (let i = 0; i < chunks.length; i += PROSPECTING_IDENTITY_CONCURRENCY) {
    await Promise.all(chunks.slice(i, i + PROSPECTING_IDENTITY_CONCURRENCY).map(runChunk));
  }
  return out;
}

export type ProspectingIdentityTone = "new" | "warning" | "danger" | "info" | "muted";

/** Short label for result lists: names the existing record type, not just "Lead". */
export function prospectingIdentityLabel(check: ProspectingIdentityCheck): { label: string; tone: ProspectingIdentityTone } {
  if (check.status === "unavailable") return { label: "Verificação indisponível", tone: "muted" };
  if (check.status === "blocked") return { label: "Não contactar", tone: "danger" };
  if (check.status === "opportunity") return { label: "Oportunidade em curso", tone: "warning" };
  if (check.status === "review") return { label: "Possível duplicado", tone: "warning" };
  if (check.status === "new") return { label: "Novo", tone: "new" };
  const type = check.matches[0]?.entity_type;
  const label = type === "contact" ? "Já é contacto" : type === "company" ? "Já é empresa"
    : type === "profile" ? "Já recolhido" : "Já é lead";
  return { label, tone: "info" };
}
