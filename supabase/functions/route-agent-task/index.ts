import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

// Map work_type → compatible bot roles
const WORK_TYPE_ROLE_MAP: Record<string, string[]> = {
  qualify_lead: ["lead_qualifier", "revenue_supervisor"],
  followup_contact: ["followup_operator", "pipeline_nudger"],
  recover_cart: ["abandoned_cart_recovery"],
  reengage_lead: ["followup_operator", "pipeline_nudger"],
  propose_meeting: ["meeting_setter"],
  escalate_human: ["human_handoff_router"],
  intervene_renewal: ["renewal_guardian"],
  enrich_context: ["lead_qualifier", "revenue_supervisor"],
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceKey);

    const body = await req.json();
    const {
      workspace_id,
      entity_type,
      entity_id,
      work_type,
      context,
      priority,
    } = body;

    if (!workspace_id || !entity_type || !work_type) {
      return new Response(
        JSON.stringify({ error: "workspace_id, entity_type, work_type required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // 1. Check agent_ops_settings
    const { data: settings } = await supabase
      .from("agent_ops_settings")
      .select("*")
      .eq("workspace_id", workspace_id)
      .maybeSingle();

    if (!settings?.is_enabled) {
      return new Response(
        JSON.stringify({ routed: false, reason: "agent_ops_disabled" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // 2. Find compatible roles for work_type
    const compatibleRoles = WORK_TYPE_ROLE_MAP[work_type] || [];

    // 3. Find eligible bots
    let botsQuery = supabase
      .from("bots")
      .select("id, name, role, channel, status, team_id, specialization, execution_permissions")
      .eq("workspace_id", workspace_id)
      .eq("status", "active");

    if (compatibleRoles.length > 0) {
      botsQuery = botsQuery.in("role", compatibleRoles);
    }

    const { data: eligibleBots, error: botsError } = await botsQuery;

    if (botsError) {
      console.error("[ROUTE-AGENT] Error fetching bots:", botsError);
      throw botsError;
    }

    // 4. If no eligible bot, escalate to human
    if (!eligibleBots || eligibleBots.length === 0) {
      if (settings.human_fallback_enabled) {
        const { data: handoff } = await supabase
          .from("agent_handoffs")
          .insert({
            workspace_id,
            from_bot_id: null,
            to_bot_id: null,
            entity_type,
            entity_id: entity_id || null,
            trigger_type: "no_eligible_agent",
            trigger_reason: `No agent with role for work_type=${work_type}`,
            context_snapshot: context || {},
            status: "escalated_to_human",
          })
          .select("id")
          .single();

        // Emit kernel event
        await supabase.functions.invoke("kernel-ingest-event", {
          body: {
            workspace_id,
            type: "AGENT.ESCALATED_TO_HUMAN",
            entity_kind: entity_type,
            entity_id: entity_id || handoff?.id || workspace_id,
            actor_type: "system",
            source_module: "route-agent-task",
            payload: { work_type, reason: "no_eligible_agent" },
            schema_version: 1,
            occurred_at: new Date().toISOString(),
          },
        });

        return new Response(
          JSON.stringify({ routed: false, escalated: true, handoff_id: handoff?.id }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      return new Response(
        JSON.stringify({ routed: false, reason: "no_eligible_agents" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // 5. Score bots: prefer lower workload
    const botIds = eligibleBots.map((b) => b.id);
    const { data: workloadData } = await supabase
      .from("agent_work_items")
      .select("bot_id")
      .in("bot_id", botIds)
      .in("status", ["pending", "assigned", "in_progress"]);

    const workloadMap: Record<string, number> = {};
    for (const item of workloadData || []) {
      workloadMap[item.bot_id] = (workloadMap[item.bot_id] || 0) + 1;
    }

    // Sort by workload ascending
    const sortedBots = [...eligibleBots].sort((a, b) => {
      const loadA = workloadMap[a.id] || 0;
      const loadB = workloadMap[b.id] || 0;
      return loadA - loadB;
    });

    // Filter by execution permissions
    const WORK_TYPE_PERMISSION_MAP: Record<string, string> = {
      qualify_lead: "can_create_task",
      followup_contact: "can_send_email",
      recover_cart: "can_generate_recovery",
      reengage_lead: "can_enroll_sequence",
      propose_meeting: "can_create_task",
      escalate_human: "can_create_task",
      intervene_renewal: "can_send_email",
      enrich_context: "can_create_task",
    };

    const requiredPerm = WORK_TYPE_PERMISSION_MAP[work_type];
    const permFiltered = requiredPerm
      ? sortedBots.filter((b: any) => {
          const perms = b.execution_permissions || {};
          // If no permissions set, allow (backwards compat)
          if (Object.keys(perms).length === 0) return true;
          // If requires_human_approval, skip auto-routing
          if (perms.requires_human_approval) return false;
          return perms[requiredPerm] !== false;
        })
      : sortedBots;

    const selectedBot = permFiltered[0] || sortedBots[0];

    // Check max open items
    const currentLoad = workloadMap[selectedBot.id] || 0;
    if (currentLoad >= (settings.max_open_items_per_agent || 10)) {
      // All agents at capacity — escalate
      const { data: handoff } = await supabase
        .from("agent_handoffs")
        .insert({
          workspace_id,
          from_bot_id: null,
          to_bot_id: null,
          entity_type,
          entity_id: entity_id || null,
          trigger_type: "capacity_exceeded",
          trigger_reason: `All agents at max capacity for work_type=${work_type}`,
          context_snapshot: context || {},
          status: "escalated_to_human",
        })
        .select("id")
        .single();

      return new Response(
        JSON.stringify({ routed: false, escalated: true, reason: "capacity_exceeded", handoff_id: handoff?.id }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // 6. Create work item
    const { data: workItem, error: wiError } = await supabase
      .from("agent_work_items")
      .insert({
        workspace_id,
        bot_id: selectedBot.id,
        entity_type,
        entity_id: entity_id || null,
        work_type,
        payload_json: context || {},
        priority: priority || 5,
        status: "assigned",
        routed_by: "route-agent-task",
        assigned_at: new Date().toISOString(),
      })
      .select("id")
      .single();

    if (wiError) {
      console.error("[ROUTE-AGENT] Error creating work item:", wiError);
      throw wiError;
    }

    // 7. Emit kernel event
    await supabase.functions.invoke("kernel-ingest-event", {
      body: {
        workspace_id,
        type: "AGENT.ROUTED",
        entity_kind: entity_type,
        entity_id: entity_id || workItem.id,
        actor_type: "system",
        source_module: "route-agent-task",
        payload: {
          work_type,
          bot_id: selectedBot.id,
          bot_name: selectedBot.name,
          work_item_id: workItem.id,
        },
        schema_version: 1,
        occurred_at: new Date().toISOString(),
      },
    });

    console.log(`[ROUTE-AGENT] Routed ${work_type} to bot ${selectedBot.name} (${selectedBot.id})`);

    return new Response(
      JSON.stringify({
        routed: true,
        work_item_id: workItem.id,
        bot_id: selectedBot.id,
        bot_name: selectedBot.name,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("[ROUTE-AGENT] Error:", err);
    return new Response(
      JSON.stringify({ error: (err as Error).message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
