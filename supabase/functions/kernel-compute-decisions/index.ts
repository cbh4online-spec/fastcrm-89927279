import { createClient } from "@supabase/supabase-js";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface KernelEvent {
  id: string;
  workspace_id: string;
  type: string;
  entity_kind: string;
  entity_id: string;
  payload: Record<string, unknown>;
  created_at: string;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { workspace_id, events } = await req.json();
    if (!workspace_id) throw new Error("workspace_id required");

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const decisions: { decision: Record<string, unknown>; evidence: Record<string, unknown>[] }[] = [];
    const dedup7d = new Date(Date.now() - 7 * 86400_000).toISOString();

    // Rule 1: Opportunity stale (>5 days no activity)
    const { data: staleOpps } = await supabase
      .from("opportunities")
      .select("id, title, stage, updated_at")
      .eq("workspace_id", workspace_id)
      .not("stage", "in", '("won","lost","closed")')
      .lt("updated_at", new Date(Date.now() - 5 * 86400_000).toISOString())
      .limit(20);

    for (const opp of staleOpps ?? []) {
      // Check dedup
      const { data: existing } = await supabase
        .from("kernel_decisions")
        .select("id")
        .eq("workspace_id", workspace_id)
        .eq("type", "opportunity_stale")
        .gt("created_at", dedup7d)
        .limit(1);

      if (existing?.length) continue;

      const staleDays = Math.floor((Date.now() - new Date(opp.updated_at).getTime()) / 86400_000);
      decisions.push({
        decision: {
          workspace_id,
          type: "opportunity_stale",
          priority: Math.min(1, staleDays / 14),
          summary: `Oportunidade "${opp.title}" está parada há ${staleDays} dias`,
          rationale: `Sem atividade desde ${opp.updated_at}. Stage atual: ${opp.stage}`,
          recommended_actions: [
            { action_key: "CREATE_TASK", params: { title: `Fazer follow-up: ${opp.title}`, related_type: "opportunity", related_id: opp.id } },
            { action_key: "NOTIFY", params: { title: `Oportunidade parada: ${opp.title}`, severity: "warn" } },
          ],
          policy: { mode: "approval" },
          status: "open",
        },
        evidence: [
          { evidence_type: "query", ref_id: opp.id, snippet: `Última atualização: ${opp.updated_at}, Stage: ${opp.stage}` },
        ],
      });
    }

    // Rule 2: Hot lead conversations
    if (events?.length) {
      const hotLeadEvents = (events as KernelEvent[]).filter(
        e => e.type === "conversation.classified" && (e.payload as any)?.classification === "hot_lead"
      );

      for (const evt of hotLeadEvents) {
        decisions.push({
          decision: {
            workspace_id,
            type: "hot_lead_detected",
            priority: 0.9,
            summary: `Lead quente detectado na conversa ${evt.entity_id}`,
            rationale: `Conversa classificada como hot_lead pelo motor conversacional`,
            recommended_actions: [
              { action_key: "CREATE_TASK", params: { title: `Contactar lead quente: ${evt.entity_id}`, priority: "high" } },
              { action_key: "NOTIFY", params: { title: "Lead quente detectado", severity: "info" } },
            ],
            policy: { mode: "auto" },
            status: "open",
          },
          evidence: [
            { evidence_type: "event", ref_id: evt.id, snippet: JSON.stringify(evt.payload).slice(0, 200) },
          ],
        });
      }
    }

    // Rule 3: Deal score drop
    const { data: lowScores } = await supabase
      .from("deal_scores")
      .select("opportunity_id, score, previous_score, opportunities(title)")
      .eq("workspace_id", workspace_id)
      .lt("score", 40)
      .gt("previous_score", 60)
      .limit(10);

    for (const ds of lowScores ?? []) {
      const { data: existing } = await supabase
        .from("kernel_decisions")
        .select("id")
        .eq("workspace_id", workspace_id)
        .eq("type", "deal_score_drop")
        .gt("created_at", dedup7d)
        .limit(1);

      if (existing?.length) continue;

      const oppTitle = (ds as any).opportunities?.title ?? ds.opportunity_id;
      decisions.push({
        decision: {
          workspace_id,
          type: "deal_score_drop",
          priority: 0.85,
          summary: `Score do deal "${oppTitle}" caiu de ${ds.previous_score} para ${ds.score}`,
          rationale: `Queda significativa no deal score indica risco de perda`,
          recommended_actions: [
            { action_key: "NOTIFY", params: { title: `Deal em risco: ${oppTitle}`, severity: "risk" } },
            { action_key: "RUN_AI_AGENT_JOB", params: { agent_type: "deal_rescue", entity_id: ds.opportunity_id } },
          ],
          policy: { mode: "approval" },
          status: "open",
        },
        evidence: [
          { evidence_type: "query", ref_id: ds.opportunity_id, snippet: `Score: ${ds.previous_score} → ${ds.score}` },
        ],
      });
    }

    // Insert decisions + evidence
    let created = 0;
    for (const { decision, evidence } of decisions) {
      const { data: dec, error: decErr } = await supabase
        .from("kernel_decisions")
        .insert(decision)
        .select("id")
        .single();

      if (decErr) { console.error("Decision insert error:", decErr.message); continue; }
      created++;

      if (evidence.length > 0) {
        await supabase.from("kernel_decision_evidence").insert(
          evidence.map(e => ({ ...e, decision_id: dec.id }))
        );
      }
    }

    return new Response(
      JSON.stringify({ created, total_rules_checked: 3 }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    return new Response(JSON.stringify({ error: (err as Error).message }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
