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

  const startTime = Date.now();

  try {
    const { workspace_id, events, correlation_id } = await req.json();
    if (!workspace_id) throw new Error("workspace_id required");

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const decisions: { decision: Record<string, unknown>; evidence: Record<string, unknown>[] }[] = [];
    const dedup7d = new Date(Date.now() - 7 * 86400_000).toISOString();

    // Load workspace policies
    const { data: policies } = await supabase
      .from("kernel_policies")
      .select("*")
      .eq("workspace_id", workspace_id);

    const getPolicy = (type: string) => {
      const p = policies?.find(p => p.decision_type === type);
      return p ? { mode: p.default_mode, approver_role: p.approver_role, risk_level: p.risk_thresholds } : { mode: "suggest" };
    };

    const getStatusFromPolicy = (type: string) => {
      const policy = getPolicy(type);
      if (policy.mode === "auto") return "open"; // will auto-execute
      return "open";
    };

    // Helper: check dedup
    async function isDuplicate(type: string): Promise<boolean> {
      const { data } = await supabase
        .from("kernel_decisions")
        .select("id")
        .eq("workspace_id", workspace_id)
        .eq("type", type)
        .gt("created_at", dedup7d)
        .limit(1);
      return (data?.length ?? 0) > 0;
    }

    // Rule 1: Opportunity stale (>5 days no activity)
    const { data: staleOpps } = await supabase
      .from("opportunities")
      .select("id, title, stage, updated_at")
      .eq("workspace_id", workspace_id)
      .not("stage", "in", '("won","lost","closed")')
      .lt("updated_at", new Date(Date.now() - 5 * 86400_000).toISOString())
      .limit(20);

    for (const opp of staleOpps ?? []) {
      if (await isDuplicate("opportunity_stale")) continue;
      const staleDays = Math.floor((Date.now() - new Date(opp.updated_at).getTime()) / 86400_000);
      const policy = getPolicy("opportunity_stale");
      decisions.push({
        decision: {
          workspace_id,
          type: "opportunity_stale",
          priority: Math.min(1, staleDays / 14),
          summary: `Oportunidade "${opp.title}" está parada há ${staleDays} dias`,
          rationale: `Sem atividade desde ${opp.updated_at}. Stage atual: ${opp.stage}`,
          recommended_actions: [
            { action_key: "CREATE_TASK", params: { title: `Fazer follow-up: ${opp.title}`, related_type: "opportunity", related_id: opp.id } },
            { action_key: "NOTIFY_OWNER", params: { title: `Oportunidade parada: ${opp.title}`, severity: "warn", entity_type: "opportunity", entity_id: opp.id } },
          ],
          policy,
          status: getStatusFromPolicy("opportunity_stale"),
        },
        evidence: [
          { evidence_type: "query", ref_kind: "opportunity", ref_id: opp.id, snippet: `Última atualização: ${opp.updated_at}, Stage: ${opp.stage}` },
        ],
      });
    }

    // Rule 2: Hot lead conversations
    if (events?.length) {
      const hotLeadEvents = (events as KernelEvent[]).filter(
        e => e.type === "conversation.classified" && (e.payload as any)?.classification === "hot_lead"
      );

      for (const evt of hotLeadEvents) {
        const policy = getPolicy("hot_lead_detected");
        decisions.push({
          decision: {
            workspace_id,
            type: "hot_lead_detected",
            priority: 0.9,
            summary: `Lead quente detectado na conversa ${evt.entity_id}`,
            rationale: `Conversa classificada como hot_lead pelo motor conversacional`,
            recommended_actions: [
              { action_key: "CREATE_TASK", params: { title: `Contactar lead quente: ${evt.entity_id}`, priority: "high" } },
              { action_key: "NOTIFY_OWNER", params: { title: "Lead quente detectado", severity: "info", entity_type: "conversation", entity_id: evt.entity_id } },
            ],
            policy,
            status: getStatusFromPolicy("hot_lead_detected"),
          },
          evidence: [
            { evidence_type: "event", ref_kind: "conversation", ref_id: evt.id, snippet: JSON.stringify(evt.payload).slice(0, 200) },
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
      if (await isDuplicate("deal_score_drop")) continue;
      const oppTitle = (ds as any).opportunities?.title ?? ds.opportunity_id;
      const policy = getPolicy("deal_score_drop");
      decisions.push({
        decision: {
          workspace_id,
          type: "deal_score_drop",
          priority: 0.85,
          summary: `Score do deal "${oppTitle}" caiu de ${ds.previous_score} para ${ds.score}`,
          rationale: `Queda significativa no deal score indica risco de perda`,
          recommended_actions: [
            { action_key: "NOTIFY_OWNER", params: { title: `Deal em risco: ${oppTitle}`, severity: "risk", entity_type: "opportunity", entity_id: ds.opportunity_id } },
            { action_key: "RUN_AI_AGENT_JOB", params: { agent_type: "deal_rescue", entity_id: ds.opportunity_id } },
          ],
          policy,
          status: getStatusFromPolicy("deal_score_drop"),
        },
        evidence: [
          { evidence_type: "query", ref_kind: "deal_score", ref_id: ds.opportunity_id, snippet: `Score: ${ds.previous_score} → ${ds.score}` },
        ],
      });
    }

    // Rule 4: Context drift high (drift_scores > 60)
    const { data: highDrift } = await supabase
      .from("drift_scores")
      .select("id, block_id, score, context_blocks(title, block_type)")
      .eq("workspace_id", workspace_id)
      .gt("score", 60)
      .limit(10);

    for (const ds of highDrift ?? []) {
      if (await isDuplicate("context_drift_high")) continue;
      const blockInfo = (ds as any).context_blocks;
      const blockTitle = blockInfo?.title ?? ds.block_id;
      const blockType = blockInfo?.block_type ?? "block";
      const policy = getPolicy("context_drift_high");

      decisions.push({
        decision: {
          workspace_id,
          type: "context_drift_high",
          priority: Math.min(1, ds.score / 100),
          summary: `Drift elevado no bloco "${blockTitle}" (${blockType}): ${ds.score}%`,
          rationale: `O drift score ultrapassou o limiar de 60%, indicando desalinhamento estratégico que precisa de revisão`,
          recommended_actions: [
            { action_key: "NOTIFY_OWNER", params: { title: `Drift elevado: ${blockTitle}`, severity: "warn", entity_type: "context_block", entity_id: ds.block_id } },
            { action_key: "CREATE_TASK", params: { title: `Rever bloco de contexto: ${blockTitle}`, related_type: "context_block", related_id: ds.block_id } },
          ],
          policy,
          status: getStatusFromPolicy("context_drift_high"),
        },
        evidence: [
          { evidence_type: "query", ref_kind: "context_block", ref_id: ds.block_id, snippet: `Drift score: ${ds.score}%, Tipo: ${blockType}` },
        ],
      });
    }

    // Rule 5: FUNNEL_LEAK — detect conversion drops from events
    if (events?.length) {
      const funnelEvents = (events as KernelEvent[]).filter(
        e => e.type === "FUNNEL.CONVERSION_DROPPED" || e.type === "funnel.conversion_dropped"
      );
      for (const evt of funnelEvents) {
        const policy = getPolicy("funnel_leak");
        decisions.push({
          decision: {
            workspace_id,
            type: "funnel_leak",
            priority: 0.8,
            summary: `Queda de conversão detectada no funil ${evt.entity_id}`,
            rationale: `Evento de queda de conversão recebido: ${JSON.stringify(evt.payload).slice(0, 150)}`,
            recommended_actions: [
              { action_key: "NOTIFY_OWNER", params: { title: `Leak no funil: ${evt.entity_id}`, severity: "risk" } },
              { action_key: "CREATE_TASK", params: { title: `Investigar queda de conversão: ${evt.entity_id}`, priority: "high" } },
            ],
            policy,
            status: getStatusFromPolicy("funnel_leak"),
          },
          evidence: [
            { evidence_type: "event", ref_kind: "funnel", ref_id: evt.id, snippet: JSON.stringify(evt.payload).slice(0, 200) },
          ],
        });
      }
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

    // Log observability
    supabase.from("system_function_runs").insert({
      workspace_id,
      function_name: "kernel-compute-decisions",
      module_id: "kernel",
      status: "success",
      latency_ms: Date.now() - startTime,
      request_id: correlation_id ?? null,
    }).then(() => {});

    return new Response(
      JSON.stringify({ created, total_rules_checked: 5 }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    return new Response(JSON.stringify({ error: (err as Error).message }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
