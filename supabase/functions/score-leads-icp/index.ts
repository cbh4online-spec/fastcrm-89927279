// Pontua leads novas face ao cliente ideal do workspace (fila lead_icp_score_queue).
// Acordada por trigger ao inserir leads, por «Repontuar» e por um backstop horário.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { createOpenAI } from "npm:@ai-sdk/openai@2";
import { streamText } from "npm:ai@5";
import { loadBusinessContext } from "../_shared/business-context-loader.ts";
import { logAIUsage } from "../_shared/ai-instrumentation.ts";

const MODEL = "openai/gpt-6-astra";
const BATCH = 20;
const MAX_BATCHES_PER_RUN = 3;
const SELF_COOLDOWN_MS = 5000;
const corsHeaders = { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-cron-secret" };

const json = (b: unknown, s = 200) => new Response(JSON.stringify(b), { status: s, headers: { ...corsHeaders, "Content-Type": "application/json" } });

function parseScore(text: string) {
  const m = text.match(/\{[\s\S]*\}/);
  if (!m) return null;
  try {
    const o = JSON.parse(m[0]);
    const score = Number(o.score);
    const summary = typeof o.summary === "string" ? o.summary.trim().slice(0, 300) : "";
    if (!Number.isFinite(score) || !summary) return null;
    const reasons = Array.isArray(o.reasons) ? o.reasons.filter((r: unknown) => typeof r === "string" && r.trim()).map((r: string) => r.trim().slice(0, 80)).slice(0, 3) : [];
    return { score: Math.round(Math.min(100, Math.max(0, score))), summary, reasons };
  } catch { return null; }
}

const LEAD_FIELDS = "id,workspace_id,name,email,phone,company_name,source,industry,business_category,number_of_employees,annual_revenue,contact_person_role,inferred_profession,inferred_specialty,city,region,country,website,about,activity_description,instagram_bio,instagram_followers_count,notes,cae_description";

function leadText(l: Record<string, unknown>) {
  return Object.entries(l)
    .filter(([k, v]) => !["id", "workspace_id", "email", "phone"].includes(k) && v !== null && v !== "")
    .map(([k, v]) => `- ${k}: ${String(v).slice(0, 400)}`)
    .concat([`- tem_email: ${l.email ? "sim" : "não"}`, `- tem_telefone: ${l.phone ? "sim" : "não"}`])
    .join("\n");
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

  const secret = req.headers.get("x-cron-secret");
  const { data: cfg } = await admin.from("_cron_config").select("value").eq("key", "lead_icp_cron_secret").maybeSingle();
  if (!secret || !cfg?.value || secret !== cfg.value) return json({ error: "unauthorized" }, 401);

  const body = await req.json().catch(() => ({}));
  const depth = Math.max(0, Math.min(10, Number(body?.depth ?? 0)));

  const apiKey = Deno.env.get("LOVABLE_API_KEY");
  if (!apiKey) return json({ error: "LOVABLE_API_KEY missing" }, 500);

  const { data: locked } = await admin.rpc("acquire_lead_icp_lock", { _ttl_seconds: 140 });
  if (!locked) return json({ skipped: "locked" });

  let processed = 0, rateLimited = false;
  const ctxCache = new Map<string, Awaited<ReturnType<typeof loadBusinessContext>>>();
  const paused = new Set<string>();

  try {
    for (let b = 0; b < MAX_BATCHES_PER_RUN && !rateLimited; b++) {
      const { data: items, error } = await admin.rpc("claim_lead_icp_batch", { _limit: BATCH });
      if (error) throw error;
      if (!items?.length) break;

      for (const item of items as Array<{ lead_id: string; workspace_id: string }>) {
        const workspaceId = item.workspace_id;
        if (rateLimited || paused.has(workspaceId)) {
          await admin.from("lead_icp_score_queue").update({ status: "pending", updated_at: new Date().toISOString() }).eq("lead_id", item.lead_id);
          continue;
        }
        let ctx = ctxCache.get(workspaceId);
        if (!ctx) { ctx = await loadBusinessContext(workspaceId); ctxCache.set(workspaceId, ctx); }
        if (!ctx.raw?.icp_description) {
          await admin.from("leads").update({ icp_score_status: "no_icp" }).eq("id", item.lead_id);
          await admin.from("lead_icp_score_queue").update({ status: "skipped", last_error: "no_icp", updated_at: new Date().toISOString() }).eq("lead_id", item.lead_id);
          continue;
        }
        const { data: lead } = await admin.from("leads").select(LEAD_FIELDS).eq("id", item.lead_id).maybeSingle();
        if (!lead) { await admin.from("lead_icp_score_queue").delete().eq("lead_id", item.lead_id); continue; }

        const started = Date.now();
        try {
          const provider = createOpenAI({
            baseURL: "https://ai.gateway.lovable.dev/v1",
            apiKey,
            headers: { "Lovable-API-Key": apiKey, "X-Lovable-AIG-SDK": "vercel-ai-sdk" },
          });
          const result = streamText({
            model: provider.responses(MODEL),
            system: `És um analista comercial. Avalia o encaixe da lead com o cliente ideal abaixo e responde APENAS em JSON: {"score": 0-100, "summary": "1-2 frases em português de Portugal", "reasons": ["até 3 motivos curtos"]}. Se houver poucos dados, pontua baixo e diz «dados insuficientes» no resumo. Não inventes factos.\n\n${ctx.systemPrompt}`,
            prompt: `Lead:\n${leadText(lead as Record<string, unknown>)}`,
            providerOptions: { openai: { store: false, forceReasoning: true, reasoningEffort: "low", reasoningSummary: "auto", include: ["reasoning.encrypted_content"] } },
          });
          const text = await result.text;
          const usage = await result.usage;
          const parsed = parseScore(text);
          logAIUsage({ workspace_id: workspaceId, feature: "lead-icp-score", model: MODEL, tokens_input: usage?.inputTokens ?? 0, tokens_output: usage?.outputTokens ?? 0, latency_ms: Date.now() - started, entity_type: "lead", entity_id: item.lead_id, was_error: !parsed });
          if (!parsed) throw Object.assign(new Error("invalid_ai_output"), { statusCode: 0 });
          await admin.from("leads").update({ icp_fit_score: parsed.score, icp_summary: parsed.summary, icp_reasons: parsed.reasons, icp_scored_at: new Date().toISOString(), icp_score_status: "scored" }).eq("id", item.lead_id);
          await admin.from("lead_icp_score_queue").update({ status: "done", last_error: null, updated_at: new Date().toISOString() }).eq("lead_id", item.lead_id);
          processed++;
        } catch (e) {
          const status = (e as any)?.statusCode ?? (e as any)?.lastError?.statusCode ?? 0;
          const msg = String((e as Error)?.message ?? e).slice(0, 300);
          if (status === 402 || status === 403) {
            paused.add(workspaceId);
            await admin.from("lead_icp_job_state").upsert({ key: workspaceId, workspace_id: workspaceId, paused: true, pause_reason: status === 402 ? "Sem créditos de IA" : `Acesso à IA bloqueado: ${msg}`, updated_at: new Date().toISOString() });
            await admin.from("lead_icp_score_queue").update({ status: "pending", attempts: 0, updated_at: new Date().toISOString() }).eq("lead_id", item.lead_id);
          } else if (status === 429 || status >= 500) {
            rateLimited = true;
            await admin.from("lead_icp_score_queue").update({ status: "pending", last_error: msg, updated_at: new Date().toISOString() }).eq("lead_id", item.lead_id);
          } else {
            await admin.from("lead_icp_score_queue").update({ status: "failed", last_error: msg, updated_at: new Date().toISOString() }).eq("lead_id", item.lead_id);
            await admin.from("leads").update({ icp_score_status: "failed" }).eq("id", item.lead_id);
          }
        }
      }
    }
  } catch (e) {
    console.error("[score-leads-icp]", (e as Error).message);
  } finally {
    await admin.rpc("release_lead_icp_lock");
  }

  // Próximo salto só se houver trabalho pendente, sem limite de taxa e com orçamento.
  if (!rateLimited && depth > 0) {
    const { count } = await admin.from("lead_icp_score_queue").select("lead_id", { count: "exact", head: true }).eq("status", "pending").lt("attempts", 5);
    if ((count ?? 0) > 0) {
      await new Promise((r) => setTimeout(r, SELF_COOLDOWN_MS));
      await fetch(`${Deno.env.get("SUPABASE_URL")}/functions/v1/score-leads-icp`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-cron-secret": secret },
        body: JSON.stringify({ trigger: "chain", depth: depth - 1 }),
      }).then((r) => r.body?.cancel()).catch((err) => console.error("[score-leads-icp] chain failed", err?.message));
    }
  }
  return json({ processed, rateLimited });
});
