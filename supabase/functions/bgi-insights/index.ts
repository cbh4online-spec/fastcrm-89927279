import { createClient } from "npm:@supabase/supabase-js@2";
import { z } from "npm:zod@3.23.8";
import { aiGate } from "../_shared/ai-gate.ts";
import { checkAIBudget, callAIInstrumented } from "../_shared/ai-instrumentation.ts";
import { buildInsightsPayload, stableHash } from "./payload.ts";
import { sanitizeInsights } from "./schema.ts";
import { SUPPORTED_INDICATORS } from "./indicators.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};
const MODEL = "google/gemini-3-flash-preview";
const DAILY_LIMIT = 3;
const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });

const bodySchema = z.object({
  workspaceId: z.string().uuid(),
  period: z.enum(["month", "quarter", "year"]),
  anchor: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullable().optional(),
});

function lisbonDayStartIso(): string {
  const ymd = new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Lisbon" }).format(new Date());
  // início do dia de Lisboa em UTC (aproximação via offset atual)
  const off = new Date().toLocaleString("en-US", { timeZone: "Europe/Lisbon", timeZoneName: "shortOffset" }).match(/GMT([+-]\d+)?/)?.[1] ?? "0";
  const d = new Date(`${ymd}T00:00:00Z`);
  d.setUTCHours(d.getUTCHours() - Number(off));
  return d.toISOString();
}

const TOOL = {
  type: "function",
  function: {
    name: "report_growth_insights",
    description: "Análise executiva baseada apenas nos indicadores fornecidos.",
    parameters: {
      type: "object",
      additionalProperties: false,
      required: ["summary", "highlights", "alerts", "objectives_at_risk", "actions"],
      properties: {
        summary: { type: "string", description: "3 a 5 frases em português de Portugal." },
        highlights: { type: "array", items: { $ref: "#/$defs/item" } },
        alerts: { type: "array", items: { $ref: "#/$defs/item" } },
        objectives_at_risk: { type: "array", items: { $ref: "#/$defs/item" } },
        actions: { type: "array", maxItems: 5, items: { $ref: "#/$defs/item" } },
      },
      $defs: {
        item: { type: "object", additionalProperties: false, required: ["text", "indicator_id"], properties: { text: { type: "string" }, indicator_id: { type: "string" } } },
      },
    },
  },
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "method_not_allowed" }, 405);

  try {
    const authHeader = req.headers.get("Authorization") ?? "";
    if (!authHeader.startsWith("Bearer ")) return json({ error: "unauthorized", message: "Sessão inválida" }, 401);
    const url = Deno.env.get("SUPABASE_URL")!;
    const userClient = createClient(url, Deno.env.get("SUPABASE_ANON_KEY")!, { global: { headers: { Authorization: authHeader } } });
    const admin = createClient(url, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

    const { data: { user }, error: userErr } = await userClient.auth.getUser(authHeader.slice(7));
    if (userErr || !user) return json({ error: "unauthorized", message: "Sessão inválida" }, 401);

    const parsed = bodySchema.safeParse(await req.json().catch(() => null));
    if (!parsed.success) return json({ error: "invalid_input", message: "Pedido inválido" }, 400);
    const { workspaceId, period, anchor } = parsed.data;

    const [{ data: canManage }, { data: isSuper }] = await Promise.all([
      admin.rpc("can_manage_workspace", { _user_id: user.id, _workspace_id: workspaceId }),
      admin.rpc("is_super_admin", { _user_id: user.id }),
    ]);
    if (!canManage && !isSuper) {
      console.warn("[BGI-INSIGHTS] denied: not manager", { workspaceId });
      return json({ error: "forbidden", message: "Só gestores podem gerar análises" }, 403);
    }

    // Valores calculados no servidor; a função valida pertença e módulo (fail-closed).
    const { data: values, error: valErr } = await userClient.rpc("bgi_compute_indicators", { _workspace_id: workspaceId, _period: period, ...(anchor ? { _anchor: anchor } : {}) });
    if (valErr || !values) return json({ error: "module_required", message: "Módulo Crescimento não ativo ou sem acesso" }, 403);
    const v = values as { current: Record<string, number | null>; previous: Record<string, number | null>; yoy: Record<string, number | null>; start: string; end: string };

    // Limite diário (dia de Lisboa)
    const { count } = await admin.from("bgi_ai_insights").select("id", { count: "exact", head: true })
      .eq("workspace_id", workspaceId).gte("created_at", lisbonDayStartIso());
    if ((count ?? 0) >= DAILY_LIMIT) return json({ error: "daily_limit", message: `Limite de ${DAILY_LIMIT} análises por dia atingido. Tente amanhã.`, remaining: 0 }, 429);

    const { data: objectives } = await userClient.from("bgi_objectives").select("indicator_id, target_value, direction")
      .eq("workspace_id", workspaceId).eq("period_type", period).eq("period_start", v.start).is("archived_at", null);

    const payload = buildInsightsPayload(SUPPORTED_INDICATORS, v, (objectives ?? []).map((o) => ({ ...o, target_value: Number(o.target_value) })));
    if (payload.indicators.length === 0) return json({ error: "no_data", message: "Ainda não há dados suficientes neste período para analisar." }, 422);

    const budget = await checkAIBudget(workspaceId);
    if (!budget.allowed) return json({ error: "budget", message: budget.reason ?? "Orçamento de IA atingido" }, 402);
    const gate = await aiGate(workspaceId, "medium", "bgi-insights", user.id);
    if (!gate.allowed) return json({ error: "plan", message: "O plano atual não inclui análises com IA ou a quota foi atingida." }, 402);

    const input = { period, start: v.start, end: v.end, indicators: payload.indicators, objectives: payload.objectives };
    const system = "És um analista de crescimento para PME portuguesas. Responde em português de Portugal. Usa APENAS os números fornecidos; nunca inventes valores nem indicadores. Cada item tem de indicar o indicator_id em que se baseia (um dos ids fornecidos). 'previous' é o período anterior e 'yoy' o mesmo período do ano anterior. Objetivos com direction 'gte' são mínimos e 'lte' máximos. Dá no máximo 5 ações concretas e realistas.";

    let result;
    try {
      result = await callAIInstrumented({
        workspace_id: workspaceId, feature: "bgi-insights", model: MODEL, user_id: user.id,
        system, messages: [{ role: "user", content: JSON.stringify(input) }],
        tools: [TOOL], tool_choice: { type: "function", function: { name: "report_growth_insights" } },
        max_tokens_type: "analysis", entity_type: "workspace", entity_id: workspaceId, maxRetries: 1,
      });
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      console.error("[BGI-INSIGHTS] ai error", msg);
      if (/429/.test(msg)) return json({ error: "rate_limited", message: "Serviço de IA ocupado. Tente dentro de alguns minutos." }, 429);
      if (/402/.test(msg)) return json({ error: "credits", message: "Créditos de IA insuficientes." }, 402);
      return json({ fallback: true, error: "ai_failed", message: "Não foi possível gerar a análise agora." });
    }

    const choice = (result.data as any)?.choices?.[0]?.message;
    const argsRaw = choice?.tool_calls?.[0]?.function?.arguments;
    let rawObj: unknown = null;
    try { rawObj = typeof argsRaw === "string" ? JSON.parse(argsRaw) : argsRaw; } catch { rawObj = null; }
    const content = sanitizeInsights(rawObj, payload.allowedIds);
    if (!content) return json({ fallback: true, error: "invalid_ai_output", message: "A IA devolveu uma resposta inválida. Tente novamente mais tarde." });

    const { data: saved, error: saveErr } = await admin.from("bgi_ai_insights").insert({
      workspace_id: workspaceId, period_type: period, period_start: v.start, content,
      input_hash: stableHash(input), model: MODEL, created_by: user.id,
    }).select("id, content, created_at, created_by, model").single();
    if (saveErr) { console.error("[BGI-INSIGHTS] save error", saveErr.message); return json({ fallback: true, error: "save_failed", message: "Análise gerada mas não guardada." }); }

    return json({ ok: true, insight: saved, remaining: Math.max(0, DAILY_LIMIT - (count ?? 0) - 1) });
  } catch (e) {
    console.error("[BGI-INSIGHTS] internal", e instanceof Error ? e.message : e);
    return json({ fallback: true, error: "internal_error", message: "Erro interno. Tente novamente." });
  }
});
