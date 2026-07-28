import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { supabaseForUser, unauthenticated, errorResult, jsonResult } from "../supabaseClient";

export default defineTool({
  name: "search_companies",
  title: "Procurar empresas",
  description: "Procura empresas/clientes do CRM num workspace por nome, NIF, email ou website.",
  inputSchema: {
    workspace_id: z.string().uuid().describe("ID do workspace (ver list_workspaces)."),
    query: z.string().trim().max(120).optional().describe("Texto a procurar em nome, NIF ou email."),
    limit: z.number().int().min(1).max(50).default(20).describe("Número máximo de resultados."),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async ({ workspace_id, query, limit }, ctx) => {
    if (!ctx.isAuthenticated()) return unauthenticated();
    const supabase = supabaseForUser(ctx);
    let q = supabase
      .from("companies")
      .select("id, name, legal_name, tax_id, email, phone, website, city, abc_category, total_revenue, last_purchase_date")
      .eq("workspace_id", workspace_id)
      .is("deleted_at", null)
      .order("updated_at", { ascending: false })
      .limit(limit ?? 20);
    if (query) {
      const safe = query.replace(/[,%()]/g, " ");
      q = q.or(`name.ilike.%${safe}%,legal_name.ilike.%${safe}%,tax_id.ilike.%${safe}%,email.ilike.%${safe}%`);
    }
    const { data, error } = await q;
    if (error) return errorResult(error.message);
    return jsonResult({ count: data?.length ?? 0, companies: data ?? [] });
  },
});
