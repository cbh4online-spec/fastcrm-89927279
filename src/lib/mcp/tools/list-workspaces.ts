import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { supabaseForUser, unauthenticated, errorResult, jsonResult } from "../supabaseClient";

export default defineTool({
  name: "list_workspaces",
  title: "Listar workspaces",
  description: "Lista os workspaces a que o utilizador autenticado pertence, com o respetivo papel.",
  inputSchema: {},
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async (_input, ctx) => {
    if (!ctx.isAuthenticated()) return unauthenticated();
    const supabase = supabaseForUser(ctx);
    const { data, error } = await supabase
      .from("workspace_members")
      .select("role, workspace:workspaces(id, name, slug, status)")
      .eq("user_id", ctx.getUserId());
    if (error) return errorResult(error.message);
    return jsonResult({ workspaces: data ?? [] });
  },
});
