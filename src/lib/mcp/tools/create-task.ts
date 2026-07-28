import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { supabaseForUser, unauthenticated, errorResult, jsonResult } from "../supabaseClient";

export default defineTool({
  name: "create_task",
  title: "Criar tarefa",
  description: "Cria uma tarefa num workspace, opcionalmente associada a um contacto, empresa ou oportunidade.",
  inputSchema: {
    workspace_id: z.string().uuid().describe("ID do workspace (ver list_workspaces)."),
    title: z.string().trim().min(1).max(200).describe("Título da tarefa."),
    description: z.string().trim().max(2000).optional().describe("Descrição da tarefa."),
    due_at: z.string().trim().max(40).optional().describe("Data/hora limite em ISO 8601."),
    priority: z.enum(["low", "medium", "high"]).optional().describe("Prioridade da tarefa."),
    related_type: z.enum(["contact", "company", "lead", "opportunity"]).optional().describe("Tipo de registo associado."),
    related_id: z.string().uuid().optional().describe("ID do registo associado."),
  },
  annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: false, openWorldHint: false },
  handler: async (input, ctx) => {
    if (!ctx.isAuthenticated()) return unauthenticated();
    const supabase = supabaseForUser(ctx);
    const { data, error } = await supabase
      .from("tasks")
      .insert({
        workspace_id: input.workspace_id,
        title: input.title,
        description: input.description ?? null,
        due_at: input.due_at ?? null,
        priority: input.priority ?? "medium",
        related_type: input.related_type ?? null,
        related_id: input.related_id ?? null,
        assigned_to: ctx.getUserId(),
        created_by: ctx.getUserId(),
      })
      .select("id, title, status, priority, due_at, created_at")
      .single();
    if (error) return errorResult(error.message);
    return jsonResult({ task: data });
  },
});
