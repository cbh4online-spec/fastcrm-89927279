import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { supabaseForUser, unauthenticated, errorResult, jsonResult } from "../supabaseClient";
import { auditCall, isWorkspaceMember } from "../safeRead";

export default defineTool({
  name: "get_pipeline_summary",
  title: "Resumo do pipeline",
  description: "Contagens e valor total das oportunidades por estado num workspace, sem nomes nem contactos.",
  inputSchema: {
    workspace_id: z.string().uuid().describe("ID do workspace (ver list_workspaces)."),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async ({ workspace_id }, ctx) => {
    if (!ctx.isAuthenticated()) return unauthenticated();
    const t0 = Date.now();
    const supabase = supabaseForUser(ctx);
    if (!(await isWorkspaceMember(supabase, workspace_id, ctx.getUserId()!))) {
      await auditCall(supabase, ctx, "get_pipeline_summary", null, t0, false);
      return errorResult("Sem acesso a este workspace.");
    }
    const { data, error } = await supabase
      .from("opportunities")
      .select("status, value, currency")
      .eq("workspace_id", workspace_id)
      .limit(5000);
    if (error) {
      await auditCall(supabase, ctx, "get_pipeline_summary", workspace_id, t0, false);
      return errorResult("Não foi possível ler o pipeline.");
    }
    const byStatus: Record<string, { count: number; total_value: number }> = {};
    for (const o of data ?? []) {
      const k = o.status ?? "sem_estado";
      byStatus[k] ??= { count: 0, total_value: 0 };
      byStatus[k].count += 1;
      byStatus[k].total_value += Number(o.value ?? 0);
    }
    const statuses = Object.entries(byStatus).map(([status, v]) => ({
      status, count: v.count, total_value: Math.round(v.total_value * 100) / 100,
    }));
    await auditCall(supabase, ctx, "get_pipeline_summary", workspace_id, t0, true);
    return jsonResult({ total: data?.length ?? 0, statuses });
  },
});
