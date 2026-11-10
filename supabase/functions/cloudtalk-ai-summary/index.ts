// Generates a FastCRM AI summary for a CloudTalk call transcript.
// Callers: managers (JWT) or the cloudtalk-webhook (service role, auto mode).
import { createClient } from "npm:@supabase/supabase-js@2";
import { z } from "npm:zod@3.23.8";
import { corsHeaders } from "../_shared/cors.ts";
import { requireAuth } from "../_shared/security.ts";
import { aiGate } from "../_shared/ai-gate.ts";
import { checkAIBudget, callAIInstrumented } from "../_shared/ai-instrumentation.ts";
import { DAILY_AI_LIMIT, parseAiSummary, transcriptToText, type TranscriptSegment } from "../_shared/cloudtalkAi.ts";

const MODEL = "google/gemini-3-flash-preview";
const json = (b: unknown, s = 200) =>
  new Response(JSON.stringify(b), { status: s, headers: { ...corsHeaders, "Content-Type": "application/json" } });
const Body = z.object({ workspaceId: z.string().uuid(), callId: z.string().uuid() });

const TOOL = {
  type: "function",
  function: {
    name: "report_call_summary",
    description: "Resumo estruturado de uma chamada comercial.",
    parameters: {
      type: "object",
      additionalProperties: false,
      required: ["summary", "sentiment", "action_items"],
      properties: {
        summary: { type: "string", description: "2 a 4 frases, português de Portugal." },
        sentiment: { type: "string", enum: ["positive", "neutral", "negative"], description: "Sentimento do cliente." },
        action_items: { type: "array", items: { type: "string" }, description: "Até 8 próximos passos concretos combinados." },
      },
    },
  },
};

function lisbonDayStartIso(): string {
  const ymd = new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Lisbon" }).format(new Date());
  const off = new Date().toLocaleString("en-US", { timeZone: "Europe/Lisbon", timeZoneName: "shortOffset" }).match(/GMT([+-]\d+)?/)?.[1] ?? "0";
  const d = new Date(`${ymd}T00:00:00Z`);
  d.setUTCHours(d.getUTCHours() - Number(off));
  return d.toISOString();
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!, { auth: { persistSession: false } });
  try {
    const parsed = Body.safeParse(await req.json().catch(() => ({})));
    if (!parsed.success) return json({ error: "invalid_input" }, 400);
    const { workspaceId, callId } = parsed.data;

    const token = req.headers.get("Authorization")?.replace("Bearer ", "") ?? "";
    const isService = token === Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    let userId: string | undefined;
    if (!isService) {
      const auth = await requireAuth(req);
      userId = auth.userId;
      const [{ data: isSuper }, { data: canManage }] = await Promise.all([
        admin.rpc("is_super_admin", { _user_id: userId }),
        admin.rpc("can_manage_workspace", { _user_id: userId, _workspace_id: workspaceId }),
      ]);
      if (!canManage && !isSuper) return json({ error: "forbidden", message: "Só gestores podem gerar resumos." }, 403);
    }

    const { data: mod } = await admin.from("workspace_modules").select("status, marketplace_modules!inner(slug)")
      .eq("workspace_id", workspaceId).eq("marketplace_modules.slug", "cloudtalk").in("status", ["active", "trial"]).limit(1).maybeSingle();
    if (!mod) return json({ error: "module_inactive", message: "O módulo Telefonia CloudTalk não está ativo." }, 403);

    const { data: call } = await admin.from("cloudtalk_calls").select("id, transcript, summary, ai_status")
      .eq("id", callId).eq("workspace_id", workspaceId).maybeSingle();
    if (!call) return json({ error: "not_found" }, 404);
    const transcript = call.transcript as TranscriptSegment[] | null;
    if (!transcript?.length) return json({ error: "no_transcript", message: "Esta chamada ainda não tem transcrição." }, 422);
    if (call.summary && call.ai_status === "done") return json({ ok: true, already: true });

    const { count } = await admin.from("cloudtalk_calls").select("id", { count: "exact", head: true })
      .eq("workspace_id", workspaceId).eq("ai_source", "fastcrm").gte("ai_generated_at", lisbonDayStartIso());
    if ((count ?? 0) >= DAILY_AI_LIMIT) {
      return json({ error: "daily_limit", message: `Limite de ${DAILY_AI_LIMIT} resumos por dia atingido. Tente amanhã.` }, 429);
    }
    const budget = await checkAIBudget(workspaceId);
    if (!budget.allowed) return json({ error: "budget", message: budget.reason ?? "Orçamento de IA atingido" }, 402);
    const gate = await aiGate(workspaceId, "light", "cloudtalk-ai-summary", userId);
    if (!gate.allowed) return json({ error: "plan", message: "O plano atual não inclui resumos com IA ou a quota foi atingida." }, 402);

    // Atomic claim: only one generation per call.
    const { data: claimed } = await admin.from("cloudtalk_calls").update({ ai_status: "processing", ai_error: null })
      .eq("id", callId).or("ai_status.is.null,ai_status.in.(pending,failed,skipped)").select("id").maybeSingle();
    if (!claimed) return json({ ok: true, already: true });

    const fail = async (msg: string) => {
      await admin.from("cloudtalk_calls").update({ ai_status: "failed", ai_error: msg.slice(0, 300) }).eq("id", callId);
    };

    let result;
    try {
      result = await callAIInstrumented({
        workspace_id: workspaceId, feature: "cloudtalk-ai-summary", model: MODEL, user_id: userId,
        system: "Resumes chamadas comerciais em português de Portugal. Usa apenas o conteúdo da transcrição; não inventes factos, valores nem datas. Próximos passos só se tiverem sido mencionados.",
        messages: [{ role: "user", content: transcriptToText(transcript) }],
        tools: [TOOL], tool_choice: { type: "function", function: { name: "report_call_summary" } },
        max_tokens_type: "analysis", entity_type: "cloudtalk_call", entity_id: callId, maxRetries: 1,
      });
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      console.error("[CLOUDTALK-AI] ai error", msg.slice(0, 200));
      await fail("Serviço de IA indisponível");
      if (/429/.test(msg)) return json({ error: "rate_limited", message: "Serviço de IA ocupado. Tente dentro de alguns minutos." }, 429);
      if (/402/.test(msg)) return json({ error: "credits", message: "Créditos de IA insuficientes." }, 402);
      return json({ fallback: true, error: "ai_failed", message: "Não foi possível gerar o resumo agora." });
    }

    const argsRaw = (result.data as any)?.choices?.[0]?.message?.tool_calls?.[0]?.function?.arguments;
    let obj: unknown = null;
    try { obj = typeof argsRaw === "string" ? JSON.parse(argsRaw) : argsRaw; } catch { obj = null; }
    const summary = parseAiSummary(obj);
    if (!summary) {
      await fail("Resposta da IA inválida");
      return json({ fallback: true, error: "invalid_output", message: "A IA devolveu um resumo inválido." });
    }
    await admin.from("cloudtalk_calls").update({
      summary: summary.summary, sentiment: summary.sentiment, action_items: summary.action_items,
      ai_source: "fastcrm", ai_status: "done", ai_error: null, ai_generated_at: new Date().toISOString(),
    }).eq("id", callId);
    return json({ ok: true });
  } catch (e) {
    if (e instanceof Response) return new Response(e.body, { status: e.status, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    console.error("cloudtalk-ai-summary error", (e as Error).message);
    return json({ error: "internal_error" }, 500);
  }
});
