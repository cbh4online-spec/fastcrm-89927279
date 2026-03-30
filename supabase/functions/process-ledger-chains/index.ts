import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const CHAIN_TYPE_MAP: Record<string, string> = {
  cart: "recovery_journey",
  abandoned_cart: "recovery_journey",
  recovery: "recovery_journey",
  lead: "lead_journey",
  contact: "lead_journey",
  opportunity: "opportunity_journey",
  proposal: "opportunity_journey",
  objective: "objective_execution",
  mission: "mission_execution",
  action: "action_chain",
  action_execution: "action_chain",
  bot: "agent_handoff_chain",
  ai_employee: "agent_handoff_chain",
  strategy: "strategy_to_execution",
  strategic_recommendation: "strategy_to_execution",
  forecast: "forecast_to_action",
  portfolio: "strategy_to_execution",
};

const OUTCOME_EVENTS = new Set([
  "PAYMENT.RECEIVED", "ORDER.PAID", "PROPOSAL.PAID", "OPPORTUNITY.CLOSED",
  "TASK.COMPLETED", "MISSION.COMPLETED", "OBJECTIVE.COMPLETED",
  "RECOVERY.SUCCESS", "CONVERSION.COMPLETED", "MEETING.BOOKED",
]);

const FAILURE_EVENTS = new Set([
  "RECOVERY.FAILED", "MISSION.FAILED", "OBJECTIVE.FAILED",
  "OPPORTUNITY.LOST", "TASK.FAILED", "ACTION.FAILED",
]);

function inferChainType(entityKind: string, eventType: string): string {
  if (CHAIN_TYPE_MAP[entityKind]) return CHAIN_TYPE_MAP[entityKind];
  if (eventType.startsWith("RECOVERY")) return "recovery_journey";
  if (eventType.startsWith("OPPORTUNITY")) return "opportunity_journey";
  if (eventType.startsWith("OBJECTIVE")) return "objective_execution";
  if (eventType.startsWith("MISSION")) return "mission_execution";
  return "action_chain";
}

function inferRelationType(eventType: string): string {
  if (OUTCOME_EVENTS.has(eventType)) return "resolved";
  if (eventType.includes("ESCALAT")) return "escalated";
  if (eventType.includes("CONVERT")) return "converted";
  if (eventType.includes("COMPLET")) return "completed";
  if (eventType.includes("EXECUT")) return "executed";
  if (eventType.includes("UPDAT")) return "updated";
  return "triggered";
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { workspace_id } = await req.json();
    if (!workspace_id) throw new Error("workspace_id required");

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Get settings
    const { data: settings } = await supabase
      .from("ledger_settings")
      .select("*")
      .eq("workspace_id", workspace_id)
      .maybeSingle();

    const maxDepth = settings?.max_chain_depth ?? 20;

    // Find orphan events (have correlation_id but no ledger link yet)
    const { data: orphanEvents, error: orphErr } = await supabase
      .from("kernel_events")
      .select("id, type, entity_kind, entity_id, correlation_id, causation_id, actor_type, actor_id, source_module, occurred_at, payload, created_at")
      .eq("workspace_id", workspace_id)
      .not("correlation_id", "is", null)
      .order("occurred_at", { ascending: true })
      .limit(500);

    if (orphErr) throw orphErr;
    if (!orphanEvents?.length) {
      return new Response(JSON.stringify({ status: "ok", chains_processed: 0 }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Check which events already have links
    const eventIds = orphanEvents.map(e => e.id);
    const { data: existingLinks } = await supabase
      .from("operating_ledger_links")
      .select("event_id")
      .in("event_id", eventIds);

    const linkedSet = new Set((existingLinks ?? []).map(l => l.event_id));
    const newEvents = orphanEvents.filter(e => !linkedSet.has(e.id));

    if (!newEvents.length) {
      return new Response(JSON.stringify({ status: "ok", chains_processed: 0 }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Group by correlation_id
    const groups = new Map<string, typeof newEvents>();
    for (const evt of newEvents) {
      const cid = evt.correlation_id!;
      if (!groups.has(cid)) groups.set(cid, []);
      groups.get(cid)!.push(evt);
    }

    let chainsProcessed = 0;
    let chainsCreated = 0;
    let outcomesResolved = 0;

    for (const [correlationId, events] of groups) {
      // Check if chain already exists
      const { data: existingChain } = await supabase
        .from("operating_ledger_chains")
        .select("id, event_count, status")
        .eq("workspace_id", workspace_id)
        .eq("correlation_id", correlationId)
        .maybeSingle();

      // Sort events by occurred_at
      events.sort((a, b) => new Date(a.occurred_at).getTime() - new Date(b.occurred_at).getTime());

      const rootEvent = events.find(e => !e.causation_id) ?? events[0];
      const chainType = inferChainType(rootEvent.entity_kind, rootEvent.type);

      // Check for outcomes
      const outcomeEvent = events.find(e => OUTCOME_EVENTS.has(e.type));
      const failureEvent = events.find(e => FAILURE_EVENTS.has(e.type));

      let chainStatus = "active";
      let outcomeType: string | null = null;
      let outcomeValue: number | null = null;
      let outcomeSummary: string | null = null;
      let successScore: number | null = null;

      if (outcomeEvent) {
        chainStatus = "completed";
        outcomeType = outcomeEvent.type;
        outcomeValue = outcomeEvent.payload?.value ?? outcomeEvent.payload?.amount ?? null;
        outcomeSummary = `${outcomeEvent.type} on ${outcomeEvent.entity_kind}:${outcomeEvent.entity_id}`;
        successScore = 100;
        outcomesResolved++;
      } else if (failureEvent) {
        chainStatus = "failed";
        outcomeType = failureEvent.type;
        outcomeSummary = `${failureEvent.type} on ${failureEvent.entity_kind}:${failureEvent.entity_id}`;
        successScore = 0;
      }

      let chainId: string;

      if (existingChain) {
        chainId = existingChain.id;
        await supabase
          .from("operating_ledger_chains")
          .update({
            event_count: (existingChain.event_count ?? 0) + events.length,
            status: chainStatus !== "active" ? chainStatus : existingChain.status,
            outcome_type: outcomeType ?? undefined,
            outcome_value: outcomeValue ?? undefined,
            outcome_summary: outcomeSummary ?? undefined,
            success_score: successScore ?? undefined,
            ended_at: chainStatus !== "active" ? new Date().toISOString() : undefined,
            updated_at: new Date().toISOString(),
          })
          .eq("id", chainId);
      } else {
        const { data: newChain, error: chainErr } = await supabase
          .from("operating_ledger_chains")
          .insert({
            workspace_id,
            root_event_id: rootEvent.id,
            correlation_id: correlationId,
            chain_type: chainType,
            title: `${chainType} · ${rootEvent.entity_kind}:${rootEvent.entity_id?.slice(0, 8)}`,
            status: chainStatus,
            outcome_type: outcomeType,
            outcome_value: outcomeValue,
            outcome_summary: outcomeSummary,
            success_score: successScore,
            event_count: events.length,
            started_at: rootEvent.occurred_at,
            ended_at: chainStatus !== "active" ? new Date().toISOString() : null,
          })
          .select("id")
          .single();

        if (chainErr) {
          console.error(`Chain create error for ${correlationId}:`, chainErr.message);
          continue;
        }
        chainId = newChain.id;
        chainsCreated++;
      }

      // Build links with depth calculation
      const eventIdMap = new Map(events.map(e => [e.id, e]));
      const depthMap = new Map<string, number>();

      // Calculate depths via causation_id
      for (const evt of events) {
        if (!evt.causation_id || !eventIdMap.has(evt.causation_id)) {
          depthMap.set(evt.id, 0);
        }
      }

      let changed = true;
      let iterations = 0;
      while (changed && iterations < maxDepth) {
        changed = false;
        iterations++;
        for (const evt of events) {
          if (depthMap.has(evt.id)) continue;
          if (evt.causation_id && depthMap.has(evt.causation_id)) {
            depthMap.set(evt.id, depthMap.get(evt.causation_id)! + 1);
            changed = true;
          }
        }
      }

      // Assign depth 0 to any remaining
      for (const evt of events) {
        if (!depthMap.has(evt.id)) depthMap.set(evt.id, 0);
      }

      // Insert links
      const links = events.map(evt => ({
        workspace_id,
        chain_id: chainId,
        event_id: evt.id,
        parent_event_id: evt.causation_id ?? null,
        relation_type: inferRelationType(evt.type),
        depth: depthMap.get(evt.id) ?? 0,
      }));

      if (links.length > 0) {
        await supabase.from("operating_ledger_links").insert(links);
      }

      chainsProcessed++;
    }

    // Emit kernel events (fire-and-forget)
    if (chainsCreated > 0) {
      supabase.from("kernel_events").insert({
        workspace_id,
        type: "LEDGER.CHAIN_CREATED",
        event_name: "system.ledger.chain_created",
        entity_kind: "ledger_chain",
        entity_id: workspace_id,
        actor_type: "system",
        payload: { chains_created: chainsCreated, chains_processed: chainsProcessed },
        source_module: "ledger",
        occurred_at: new Date().toISOString(),
        ingested_at: new Date().toISOString(),
        schema_version: 1,
        status: "processed",
        metadata_json: {},
      }).then(() => {});
    }

    if (outcomesResolved > 0) {
      supabase.from("kernel_events").insert({
        workspace_id,
        type: "LEDGER.OUTCOME_RESOLVED",
        event_name: "system.ledger.outcome_resolved",
        entity_kind: "ledger_chain",
        entity_id: workspace_id,
        actor_type: "system",
        payload: { outcomes_resolved: outcomesResolved },
        source_module: "ledger",
        occurred_at: new Date().toISOString(),
        ingested_at: new Date().toISOString(),
        schema_version: 1,
        status: "processed",
        metadata_json: {},
      }).then(() => {});
    }

    return new Response(
      JSON.stringify({ status: "ok", chains_processed: chainsProcessed, chains_created: chainsCreated, outcomes_resolved: outcomesResolved }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    return new Response(JSON.stringify({ error: (err as Error).message }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
