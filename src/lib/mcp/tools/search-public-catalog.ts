import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { supabaseForUser, unauthenticated, errorResult, jsonResult } from "../supabaseClient";
import { auditCall, isWorkspaceMember } from "../safeRead";

export default defineTool({
  name: "search_public_catalog",
  title: "Pesquisar catálogo público",
  description: "Procura produtos publicados na loja do workspace (nome, SKU, preço público, disponibilidade), sem custos nem margens.",
  inputSchema: {
    workspace_id: z.string().uuid().describe("ID do workspace (ver list_workspaces)."),
    query: z.string().trim().min(2).max(80).describe("Nome ou SKU a procurar."),
    limit: z.number().int().min(1).max(50).default(20).describe("Máximo de produtos."),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async ({ workspace_id, query, limit }, ctx) => {
    if (!ctx.isAuthenticated()) return unauthenticated();
    const t0 = Date.now();
    const supabase = supabaseForUser(ctx);
    if (!(await isWorkspaceMember(supabase, workspace_id, ctx.getUserId()!))) {
      await auditCall(supabase, ctx, "search_public_catalog", null, t0, false);
      return errorResult("Sem acesso a este workspace.");
    }
    const term = query.replace(/[%_,()]/g, " ").trim();
    const { data, error } = await supabase
      .from("products")
      .select("id, name, sku, base_price, currency, stock_status, store_slug")
      .eq("workspace_id", workspace_id)
      .eq("store_published", true)
      .eq("status", "active")
      .or(`name.ilike.%${term}%,sku.ilike.%${term}%`)
      .limit(limit ?? 20);
    if (error) {
      await auditCall(supabase, ctx, "search_public_catalog", workspace_id, t0, false);
      return errorResult("Não foi possível pesquisar o catálogo.");
    }
    const products = (data ?? []).map((p) => ({
      id: p.id, name: p.name, sku: p.sku ?? null,
      public_price: p.base_price ?? null, currency: p.currency ?? "EUR",
      availability: p.stock_status ?? null, slug: p.store_slug ?? null,
    }));
    await auditCall(supabase, ctx, "search_public_catalog", workspace_id, t0, true);
    return jsonResult({ count: products.length, products });
  },
});
