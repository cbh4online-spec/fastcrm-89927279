import type { ToolContext } from "@lovable.dev/mcp-js";
import type { SupabaseClient } from "@supabase/supabase-js";

/** Campos que nunca podem sair numa ferramenta de leitura segura. */
export const SENSITIVE_KEYS = [
  "direct_cost", "avg_cost", "last_cost", "operational_cost", "target_margin_pct",
  "commission_amount", "commission_percentage", "phone", "email", "nif", "vat_number",
  "notes", "description", "partner_notes", "default_supplier_id",
] as const;

export function findSensitiveKeys(value: unknown, found = new Set<string>()): string[] {
  if (Array.isArray(value)) value.forEach((v) => findSensitiveKeys(v, found));
  else if (value && typeof value === "object") {
    for (const [k, v] of Object.entries(value)) {
      if ((SENSITIVE_KEYS as readonly string[]).includes(k)) found.add(k);
      findSensitiveKeys(v, found);
    }
  }
  return [...found];
}

/** Confirma pertença ao workspace pela identidade do token (RLS). */
export async function isWorkspaceMember(supabase: SupabaseClient, workspaceId: string, userId: string) {
  const { data, error } = await supabase
    .from("workspace_members")
    .select("user_id")
    .eq("workspace_id", workspaceId)
    .eq("user_id", userId)
    .limit(1);
  return !error && (data?.length ?? 0) > 0;
}

/** Regista a chamada sem conteúdo de dados; nunca falha a ferramenta. */
export async function auditCall(
  supabase: SupabaseClient, ctx: ToolContext, tool: string,
  workspaceId: string | null, startedAt: number, ok: boolean,
) {
  try {
    await supabase.from("mcp_tool_audit").insert({
      user_id: ctx.getUserId(),
      workspace_id: workspaceId,
      client_id: ctx.getClientId() ?? null,
      tool_name: tool,
      duration_ms: Date.now() - startedAt,
      ok,
    });
  } catch {
    // auditoria best-effort
  }
}
