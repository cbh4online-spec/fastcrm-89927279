import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { supabaseForUser, unauthenticated, errorResult, jsonResult } from "../supabaseClient";

export default defineTool({
  name: "create_lead",
  title: "Criar lead",
  description: "Cria uma nova lead no CRM para um workspace do utilizador autenticado.",
  inputSchema: {
    workspace_id: z.string().uuid().describe("ID do workspace (ver list_workspaces)."),
    name: z.string().trim().min(1).max(160).describe("Nome da lead."),
    email: z.string().trim().email().max(160).optional().describe("Email de contacto."),
    phone: z.string().trim().max(40).optional().describe("Telefone de contacto."),
    company_name: z.string().trim().max(160).optional().describe("Empresa associada."),
    source: z.string().trim().max(60).optional().describe("Origem da lead (ex.: website, referral)."),
    notes: z.string().trim().max(2000).optional().describe("Notas iniciais."),
  },
  annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: false, openWorldHint: false },
  handler: async (input, ctx) => {
    if (!ctx.isAuthenticated()) return unauthenticated();
    const supabase = supabaseForUser(ctx);
    const { data, error } = await supabase
      .from("leads")
      .insert({
        workspace_id: input.workspace_id,
        name: input.name,
        email: input.email ?? null,
        phone: input.phone ?? null,
        company_name: input.company_name ?? null,
        source: input.source ?? "mcp",
        notes: input.notes ?? null,
        created_by: ctx.getUserId(),
      })
      .select("id, name, email, phone, company_name, source, status, created_at")
      .single();
    if (error) return errorResult(error.message);
    return jsonResult({ lead: data });
  },
});
