import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { supabaseForUser, unauthenticated, errorResult, jsonResult } from "../supabaseClient";
import { auditCall, isWorkspaceMember } from "../safeRead";

const lisbonDay = (d: Date) =>
  new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Lisbon" }).format(d);

export function daysUntilLisbon(dueAt: string, now = new Date()): number {
  const a = Date.parse(lisbonDay(new Date(dueAt)));
  const b = Date.parse(lisbonDay(now));
  return Math.round((a - b) / 86_400_000);
}

export default defineTool({
  name: "list_my_open_tasks",
  title: "As minhas tarefas abertas",
  description: "Lista as tarefas abertas atribuídas ao utilizador autenticado, sem dados de contacto.",
  inputSchema: {
    workspace_id: z.string().uuid().describe("ID do workspace (ver list_workspaces)."),
    limit: z.number().int().min(1).max(50).default(20).describe("Máximo de tarefas."),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async ({ workspace_id, limit }, ctx) => {
    if (!ctx.isAuthenticated()) return unauthenticated();
    const t0 = Date.now();
    const userId = ctx.getUserId()!;
    const supabase = supabaseForUser(ctx);
    if (!(await isWorkspaceMember(supabase, workspace_id, userId))) {
      await auditCall(supabase, ctx, "list_my_open_tasks", null, t0, false);
      return errorResult("Sem acesso a este workspace.");
    }
    const { data, error } = await supabase
      .from("tasks")
      .select("id, title, due_at, priority, status, related_type")
      .eq("workspace_id", workspace_id)
      .eq("assigned_to", userId)
      .not("status", "in", "(done,completed,cancelled)")
      .order("due_at", { ascending: true, nullsFirst: false })
      .limit(limit ?? 20);
    if (error) {
      await auditCall(supabase, ctx, "list_my_open_tasks", workspace_id, t0, false);
      return errorResult("Não foi possível ler as tarefas.");
    }
    const tasks = (data ?? []).map((t) => ({
      id: t.id, title: t.title, status: t.status, priority: t.priority ?? null,
      entity_type: t.related_type ?? null,
      due_at: t.due_at ?? null,
      days_until_due: t.due_at ? daysUntilLisbon(t.due_at) : null,
    }));
    await auditCall(supabase, ctx, "list_my_open_tasks", workspace_id, t0, true);
    return jsonResult({ count: tasks.length, tasks });
  },
});
