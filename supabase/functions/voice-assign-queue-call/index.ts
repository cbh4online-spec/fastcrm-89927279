// Fase 1R — Assign Queue Call to an agent
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeaders } from "../_shared/cors.ts";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  try {
    const { workspace_id, queue_id, call_log_id } = await req.json();
    if (!workspace_id || !queue_id) {
      return new Response(JSON.stringify({ error: "missing_required_fields" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    const supabase = createClient(SUPABASE_URL, SERVICE_ROLE);

    const { data: queue } = await supabase.from("voice_queues").select("*").eq("id", queue_id).single();
    if (!queue) throw new Error("queue_not_found");

    const { data: members = [] } = await supabase
      .from("voice_queue_members")
      .select("user_id, priority, max_concurrent_calls")
      .eq("queue_id", queue_id)
      .eq("active", true)
      .order("priority", { ascending: true });

    if (members.length === 0) {
      return new Response(JSON.stringify({ assigned_agent: null, reason: "no_active_members" }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const userIds = (members as any[]).map(m => m.user_id);
    const { data: statuses = [] } = await supabase
      .from("voice_agent_status")
      .select("user_id, status, active_call_id")
      .eq("workspace_id", workspace_id)
      .in("user_id", userIds);

    const statusMap = new Map((statuses as any[]).map(s => [s.user_id, s]));
    const available = (members as any[]).filter(m => {
      const s = statusMap.get(m.user_id);
      return !s || s.status === "available";
    });

    if (available.length === 0) {
      return new Response(JSON.stringify({ assigned_agent: null, reason: "no_available_agent" }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    let chosen = available[0];
    if (queue.routing_strategy === "least_loaded") {
      // Count today's calls per agent
      const today = new Date(); today.setHours(0,0,0,0);
      const { data: counts = [] } = await supabase
        .from("voice_call_logs")
        .select("assigned_to")
        .eq("workspace_id", workspace_id)
        .gte("created_at", today.toISOString())
        .in("assigned_to", available.map(a => a.user_id));
      const tally = new Map<string, number>();
      (counts as any[]).forEach(c => tally.set(c.assigned_to, (tally.get(c.assigned_to) || 0) + 1));
      chosen = available.sort((a, b) => (tally.get(a.user_id) || 0) - (tally.get(b.user_id) || 0))[0];
    } else if (queue.routing_strategy === "round_robin") {
      chosen = available[Math.floor(Math.random() * available.length)];
    }

    if (call_log_id) {
      await supabase.from("voice_call_logs").update({
        assigned_to: chosen.user_id,
        queue_answered_at: new Date().toISOString(),
      }).eq("id", call_log_id);

      await supabase.from("voice_queue_events").insert({
        workspace_id, queue_id, call_log_id,
        event_type: "assigned_agent",
        user_id: chosen.user_id,
      });
    }

    return new Response(JSON.stringify({ assigned_agent: chosen.user_id }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e) {
    console.error("assign_queue_error", e);
    return new Response(JSON.stringify({ error: "internal_error", message: String(e) }), {
      status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
