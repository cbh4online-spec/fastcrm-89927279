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

    // Rule 6: HOT_LEAD_UNANSWERED — leads with status new/contacted, no activity in 48h, no pending tasks
    const cutoff48h = new Date(Date.now() - 48 * 3600_000).toISOString();
    const { data: hotLeads } = await supabase
      .from("leads")
      .select("id, name, status, updated_at, assigned_to")
      .eq("workspace_id", workspace_id)
      .in("status", ["new", "contacted"])
      .lt("updated_at", cutoff48h)
      .limit(20);

    for (const lead of hotLeads ?? []) {
      if (await isDuplicate("hot_lead_unanswered")) break;
      // Check if there are pending tasks for this lead
      const { data: pendingTasks } = await supabase
        .from("tasks")
        .select("id")
        .eq("workspace_id", workspace_id)
        .eq("related_type", "lead")
        .eq("related_id", lead.id)
        .in("status", ["pending", "in_progress"])
        .limit(1);

      if ((pendingTasks?.length ?? 0) > 0) continue;

      const hoursInactive = Math.floor((Date.now() - new Date(lead.updated_at).getTime()) / 3600_000);
      const policy = getPolicy("hot_lead_unanswered");
      decisions.push({
        decision: {
          workspace_id,
          type: "hot_lead_unanswered",
          priority: 0.9,
          summary: `Lead "${lead.name}" sem resposta há ${hoursInactive}h`,
          rationale: `Lead com status "${lead.status}" sem atividade desde ${lead.updated_at}. Sem tarefas pendentes associadas.`,
          recommended_actions: [
            { action_key: "CREATE_TASK", params: { title: `Follow-up urgente: ${lead.name}`, related_type: "lead", related_id: lead.id, priority: "high" } },
            { action_key: "NOTIFY_OWNER", params: { title: `Lead sem resposta: ${lead.name}`, severity: "risk", entity_type: "lead", entity_id: lead.id } },
          ],
          policy,
          status: getStatusFromPolicy("hot_lead_unanswered"),
        },
        evidence: [
          { evidence_type: "query", ref_kind: "lead", ref_id: lead.id, snippet: `Status: ${lead.status}, Última atividade: ${lead.updated_at}, Horas inativo: ${hoursInactive}` },
          { evidence_type: "query", ref_kind: "task", ref_id: lead.id, snippet: `Tarefas pendentes: 0` },
        ],
      });
    }

    // Rule 7: CHURN_RISK — contacts/companies with no activity in 30+ days that have past deals
    if (!(await isDuplicate("churn_risk"))) {
      const cutoff30d = new Date(Date.now() - 30 * 86400_000).toISOString();
      const { data: inactiveContacts } = await supabase
        .from("contacts")
        .select("id, name, company, updated_at")
        .eq("workspace_id", workspace_id)
        .lt("updated_at", cutoff30d)
        .limit(10);

      for (const contact of inactiveContacts ?? []) {
        const { count: dealCount } = await supabase
          .from("opportunities")
          .select("id", { count: "exact", head: true })
          .eq("workspace_id", workspace_id)
          .eq("contact_id", contact.id)
          .eq("stage", "won");

        if ((dealCount ?? 0) > 0) {
          const inactiveDays = Math.floor((Date.now() - new Date(contact.updated_at).getTime()) / 86400_000);
          const policy = getPolicy("churn_risk");
          decisions.push({
            decision: {
              workspace_id,
              type: "churn_risk",
              priority: 0.85,
              summary: `Cliente "${contact.name}" sem atividade há ${inactiveDays} dias (risco de churn)`,
              rationale: `Cliente com deals ganhos anteriores está inativo há ${inactiveDays} dias. Requer intervenção proativa.`,
              recommended_actions: [
                { action_key: "RUN_AI_AGENT_JOB", params: { agent: "churn_prevention", entity_type: "contact", entity_id: contact.id, objective: "analisar risco de churn e propor estratégia de retenção" } },
                { action_key: "NOTIFY_OWNER", params: { title: `Risco de churn: ${contact.name}`, severity: "risk", entity_type: "contact", entity_id: contact.id } },
              ],
              policy,
              status: getStatusFromPolicy("churn_risk"),
            },
            evidence: [
              { evidence_type: "query", ref_kind: "contact", ref_id: contact.id, snippet: `Última atividade: ${contact.updated_at}, Deals ganhos: ${dealCount}, Dias inativo: ${inactiveDays}` },
            ],
          });
          break; // one churn decision per cycle
        }
      }
    }

    // Rule 8: UPSELL_OPPORTUNITY — won deals where contact has high engagement
    if (!(await isDuplicate("upsell_opportunity"))) {
      const cutoff90d = new Date(Date.now() - 90 * 86400_000).toISOString();
      const { data: recentWins } = await supabase
        .from("opportunities")
        .select("id, title, contact_id, value, contacts(name)")
        .eq("workspace_id", workspace_id)
        .eq("stage", "won")
        .gte("updated_at", cutoff90d)
        .limit(10);

      for (const deal of recentWins ?? []) {
        if (!deal.contact_id) continue;
        const contactName = (deal as any).contacts?.name ?? deal.contact_id;
        const policy = getPolicy("upsell_opportunity");
        decisions.push({
          decision: {
            workspace_id,
            type: "upsell_opportunity",
            priority: 0.7,
            summary: `Oportunidade de upsell com "${contactName}" (deal "${deal.title}" ganho recentemente)`,
            rationale: `Deal ganho recentemente com valor ${deal.value}. Bom momento para propor produtos/serviços complementares.`,
            recommended_actions: [
              { action_key: "RUN_AI_AGENT_JOB", params: { agent: "upsell_advisor", entity_type: "contact", entity_id: deal.contact_id, objective: "identificar oportunidades de cross-sell e upsell" } },
              { action_key: "CREATE_TASK", params: { title: `Explorar upsell: ${contactName}`, related_type: "contact", related_id: deal.contact_id, priority: "medium" } },
            ],
            policy,
            status: getStatusFromPolicy("upsell_opportunity"),
          },
          evidence: [
            { evidence_type: "query", ref_kind: "opportunity", ref_id: deal.id, snippet: `Deal ganho: "${deal.title}", Valor: ${deal.value}` },
          ],
        });
        break; // one upsell per cycle
      }
    }

    // Rule 9: SDR_QUALIFICATION — new leads with no qualification in 24h
    if (!(await isDuplicate("sdr_qualification_needed"))) {
      const cutoff24h = new Date(Date.now() - 24 * 3600_000).toISOString();
      const { data: newLeads } = await supabase
        .from("leads")
        .select("id, name, status, created_at")
        .eq("workspace_id", workspace_id)
        .eq("status", "new")
        .lt("created_at", cutoff24h)
        .limit(5);

      for (const lead of newLeads ?? []) {
        const hoursAge = Math.floor((Date.now() - new Date(lead.created_at).getTime()) / 3600_000);
        const policy = getPolicy("sdr_qualification_needed");
        decisions.push({
          decision: {
            workspace_id,
            type: "sdr_qualification_needed",
            priority: 0.8,
            summary: `Lead "${lead.name}" precisa de qualificação (criado há ${hoursAge}h)`,
            rationale: `Lead novo sem qualificação após 24h. O SDR Operator pode avaliar automaticamente.`,
            recommended_actions: [
              { action_key: "RUN_AI_AGENT_JOB", params: { agent: "sdr_operator", entity_type: "lead", entity_id: lead.id, objective: "qualificar lead e recomendar próximos passos" } },
            ],
            policy,
            status: getStatusFromPolicy("sdr_qualification_needed"),
          },
          evidence: [
            { evidence_type: "query", ref_kind: "lead", ref_id: lead.id, snippet: `Lead: ${lead.name}, Status: ${lead.status}, Criado: ${lead.created_at}` },
          ],
        });
        break; // one SDR decision per cycle
      }
    }

    // Rule 10: LEAD_DROP_ALERT — >20% drop in new leads week-over-week
    if (!(await isDuplicate("lead_drop_alert"))) {
      const now = Date.now();
      const thisWeekStart = new Date(now - 7 * 86400_000).toISOString();
      const lastWeekStart = new Date(now - 14 * 86400_000).toISOString();

      const { count: thisWeekCount } = await supabase
        .from("leads")
        .select("id", { count: "exact", head: true })
        .eq("workspace_id", workspace_id)
        .gte("created_at", thisWeekStart);

      const { count: lastWeekCount } = await supabase
        .from("leads")
        .select("id", { count: "exact", head: true })
        .eq("workspace_id", workspace_id)
        .gte("created_at", lastWeekStart)
        .lt("created_at", thisWeekStart);

      const tw = thisWeekCount ?? 0;
      const lw = lastWeekCount ?? 0;

      if (lw > 0 && tw < lw * 0.8) {
        const dropPct = Math.round((1 - tw / lw) * 100);
        const policy = getPolicy("lead_drop_alert");
        decisions.push({
          decision: {
            workspace_id,
            type: "lead_drop_alert",
            priority: 0.75,
            summary: `Queda de ${dropPct}% em novos leads esta semana (${tw} vs ${lw})`,
            rationale: `Volume de novos leads caiu mais de 20% em relação à semana anterior. Pode indicar problema no marketing ou sazonalidade.`,
            recommended_actions: [
              { action_key: "NOTIFY_OWNER", params: { title: `Alerta: queda de ${dropPct}% em leads`, severity: "warn" } },
              { action_key: "OPEN_FILTERED_VIEW", params: { path: "/dashboard/leads", filters: { date_range: "last_14_days" } } },
            ],
            policy,
            status: getStatusFromPolicy("lead_drop_alert"),
          },
          evidence: [
            { evidence_type: "query", ref_kind: "leads", ref_id: workspace_id, snippet: `Esta semana: ${tw} leads, Semana anterior: ${lw} leads, Queda: ${dropPct}%` },
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
      JSON.stringify({ created, total_rules_checked: 10 }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    return new Response(JSON.stringify({ error: (err as Error).message }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
