import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { supabaseForUser, unauthenticated, errorResult, jsonResult } from "../supabaseClient";

export default defineTool({
  name: "list_leads",
  title: "Listar leads",
  description: "Lista as leads mais recentes de um workspace, com filtro opcional por estado.",
  inputSchema: {
    workspace_id: z.string().uuid().describe("ID do workspace (ver list_workspaces)."),
    status: z.string().trim().max(40).optional().describe("Estado da lead (ex.: new, qualified)."),
    limit: z.number().int().min(1).max(50).default(20).describe("Número máximo de resultados."),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async ({ workspace_id, status, limit }, ctx) => {
    if (!ctx.isAuthenticated()) return unauthenticated();
    const supabase = supabaseForUser(ctx);
    let q = supabase
      .from("leads")
      .select("id, name, email, phone, company_name, source, status, lead_score, estimated_value, created_at")
      .eq("workspace_id", workspace_id)
      .order("created_at", { ascending: false })
      .limit(limit ?? 20);
    if (status) q = q.eq("status", status);
    const { data, error } = await q;
    if (error) return errorResult(error.message);
    return jsonResult({ count: data?.length ?? 0, leads: data ?? [] });
  },
});
