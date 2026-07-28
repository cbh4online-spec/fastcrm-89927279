import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { supabaseForUser, unauthenticated, errorResult, jsonResult } from "../supabaseClient";

export default defineTool({
  name: "search_contacts",
  title: "Procurar contactos",
  description: "Procura contactos do CRM num workspace por nome, email, telefone ou NIF.",
  inputSchema: {
    workspace_id: z.string().uuid().describe("ID do workspace (ver list_workspaces)."),
    query: z.string().trim().max(120).optional().describe("Texto a procurar em nome, email ou telefone."),
    limit: z.number().int().min(1).max(50).default(20).describe("Número máximo de resultados."),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async ({ workspace_id, query, limit }, ctx) => {
    if (!ctx.isAuthenticated()) return unauthenticated();
    const supabase = supabaseForUser(ctx);
    let q = supabase
      .from("contacts")
      .select("id, name, email, phone, company, job_title, tax_id, lifecycle_stage, total_revenue, last_contact_at")
      .eq("workspace_id", workspace_id)
      .is("deleted_at", null)
      .order("updated_at", { ascending: false })
      .limit(limit ?? 20);
    if (query) {
      const safe = query.replace(/[,%()]/g, " ");
      q = q.or(`name.ilike.%${safe}%,email.ilike.%${safe}%,phone.ilike.%${safe}%,tax_id.ilike.%${safe}%`);
    }
    const { data, error } = await q;
    if (error) return errorResult(error.message);
    return jsonResult({ count: data?.length ?? 0, contacts: data ?? [] });
  },
});
