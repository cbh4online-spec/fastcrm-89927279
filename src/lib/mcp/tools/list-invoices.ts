import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { supabaseForUser, unauthenticated, errorResult, jsonResult } from "../supabaseClient";

export default defineTool({
  name: "list_invoices",
  title: "Listar faturas",
  description: "Lista faturas de um workspace, com filtros opcionais por estado, empresa e datas de emissão.",
  inputSchema: {
    workspace_id: z.string().uuid().describe("ID do workspace (ver list_workspaces)."),
    status: z.string().trim().max(40).optional().describe("Estado da fatura (ex.: draft, sent, paid)."),
    company_id: z.string().uuid().optional().describe("Filtrar por empresa/cliente."),
    issued_from: z.string().trim().max(10).optional().describe("Data mínima de emissão (YYYY-MM-DD)."),
    issued_to: z.string().trim().max(10).optional().describe("Data máxima de emissão (YYYY-MM-DD)."),
    limit: z.number().int().min(1).max(100).default(25).describe("Número máximo de resultados."),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async (input, ctx) => {
    if (!ctx.isAuthenticated()) return unauthenticated();
    const supabase = supabaseForUser(ctx);
    let q = supabase
      .from("invoices")
      .select("id, invoice_number, status, document_type, client_name, issue_date, due_date, subtotal, tax_amount, total, amount_paid, currency")
      .eq("workspace_id", input.workspace_id)
      .order("issue_date", { ascending: false })
      .limit(input.limit ?? 25);
    if (input.status) q = q.eq("status", input.status);
    if (input.company_id) q = q.eq("company_id", input.company_id);
    if (input.issued_from) q = q.gte("issue_date", input.issued_from);
    if (input.issued_to) q = q.lte("issue_date", input.issued_to);
    const { data, error } = await q;
    if (error) return errorResult(error.message);
    const net = (data ?? []).reduce((s, r) => s + Number(r.subtotal ?? 0), 0);
    const gross = (data ?? []).reduce((s, r) => s + Number(r.total ?? 0), 0);
    return jsonResult({
      count: data?.length ?? 0,
      totals: { subtotal: Number(net.toFixed(2)), total: Number(gross.toFixed(2)) },
      invoices: data ?? [],
    });
  },
});
