// FastCRM Kernel — Process Event
// Atualiza timeline, context graph, avalia decision rules, marca processed.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  try {
    const { event_id } = await req.json();
    if (!event_id) return json({ ok: false, error: "missing event_id" }, 400);

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const { data: ev, error: evErr } = await supabase
      .from("kernel_events")
      .select("*")
      .eq("id", event_id)
      .single();
    if (evErr || !ev) throw evErr ?? new Error("event not found");

    const { data: reg } = await supabase
      .from("kernel_event_registry")
      .select("*")
      .eq("event_type", ev.event_name ?? ev.type)
      .maybeSingle();

    // 1) Timeline
    if (!reg || reg.produces_timeline_event !== false) {
      await supabase.from("kernel_entity_timeline").insert({
        workspace_id: ev.workspace_id,
        entity_type: ev.entity_kind,
        entity_id: ev.entity_id,
        event_id: ev.id,
        timeline_type: "event",
        title: ev.event_name ?? ev.type,
        description: null,
        occurred_at: ev.occurred_at ?? ev.created_at,
        actor_user_id: ev.actor_user_id,
        source_module: ev.source_module,
      });
    }

    // 2) Context node upsert
    if (!reg || reg.affects_context_graph !== false) {
      await supabase.from("kernel_context_nodes").upsert(
        {
          workspace_id: ev.workspace_id,
          entity_type: ev.entity_kind,
          entity_id: ev.entity_id,
          last_event_at: ev.occurred_at ?? ev.created_at,
        },
        { onConflict: "workspace_id,entity_type,entity_id" },
      );
    }

    // 3) Decision rules
    const { data: rules } = await supabase
      .from("kernel_decision_rules")
      .select("*")
      .eq("active", true)
      .eq("trigger_event_type", ev.event_name ?? ev.type);

    let decisionsCreated = 0;
    for (const rule of rules ?? []) {
      // workspace scope check
      if (rule.workspace_id && rule.workspace_id !== ev.workspace_id) continue;
      const { error: dErr } = await supabase.from("kernel_decisions").insert({
        workspace_id: ev.workspace_id,
        event_id: ev.id,
        rule_id: rule.id,
        type: rule.decision_type,
        decision_type: rule.decision_type,
        title: rule.name,
        description: rule.description,
        priority: rule.priority / 100,
        summary: rule.name,
        rationale: `Disparada pela regra "${rule.name}" via evento ${ev.event_name}`,
        recommended_action: rule.actions,
        recommended_actions: rule.actions,
        decision_source: "system",
        status: "open",
        confidence: 0.7,
      });
      if (!dErr) decisionsCreated++;
    }

    // 4) Mark processed
    await supabase
      .from("kernel_events")
      .update({ status: "processed", processed_at: new Date().toISOString() })
      .eq("id", event_id);

    return json({ ok: true, event_id, decisionsCreated });
  } catch (err) {
    console.error("[kernel-process-event]", err);
    return json({ ok: false, fallback: true, error: (err as Error).message }, 200);
  }
});

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
