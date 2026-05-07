// Fase 1R — Route Inbound Call
// Decide routing for an inbound call: queue, agent, IVR, callback, after_hours.
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeaders } from "../_shared/cors.ts";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

function normalizePT(num: string): string {
  if (!num) return "";
  const t = num.trim().replace(/[\s().-]/g, "");
  if (t.startsWith("+")) return t;
  if (t.startsWith("00")) return `+${t.slice(2)}`;
  if (t.startsWith("351")) return `+${t}`;
  return t.length > 9 ? `+${t}` : `+351${t}`;
}

function isWithinHours(bh: any): boolean {
  if (!bh?.weekly_schedule) return true;
  const now = new Date();
  const days = ["sunday","monday","tuesday","wednesday","thursday","friday","saturday"];
  const day = days[now.getDay()];
  const slots = bh.weekly_schedule[day] || [];
  if (!Array.isArray(slots) || slots.length === 0) return false;
  const hhmm = `${String(now.getHours()).padStart(2,"0")}:${String(now.getMinutes()).padStart(2,"0")}`;
  return slots.some((s: any) => hhmm >= s.start && hhmm <= s.end);
}

function evalCondition(c: any, ctx: any): boolean {
  switch (c.field) {
    case "called_number": return ctx.to_number === c.value;
    case "caller_phone_contains": return (ctx.from_number || "").includes(c.value);
    case "contact_exists": return Boolean(ctx.contact_id) === Boolean(c.value);
    case "business_hours": return ctx.business_hours_open === (c.value === "open");
    default: return true;
  }
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  try {
    const body = await req.json();
    const { workspace_id, provider_instance_id, voice_number_id, from_number, to_number, provider_call_id, metadata = {} } = body;
    if (!workspace_id || !from_number) {
      return new Response(JSON.stringify({ error: "missing_required_fields" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const supabase = createClient(SUPABASE_URL, SERVICE_ROLE);
    const normFrom = normalizePT(from_number);
    const normTo = normalizePT(to_number || "");

    // Find contact by phone
    const { data: contact } = await supabase
      .from("contacts")
      .select("id, name")
      .or(`phone.eq.${normFrom},mobile.eq.${normFrom}`)
      .eq("workspace_id", workspace_id)
      .maybeSingle();

    // Create call_log
    const { data: callLog, error: clErr } = await supabase
      .from("voice_call_logs")
      .insert({
        workspace_id, provider_instance_id, voice_number_id,
        contact_id: contact?.id || null,
        call_direction: "inbound",
        call_type: "phone_call",
        status: "ringing",
        from_number, to_number,
        normalized_from_number: normFrom, normalized_to_number: normTo,
        provider_call_id, metadata,
        queue_entered_at: new Date().toISOString(),
      })
      .select("id").single();
    if (clErr) throw clErr;

    // Business hours from active number's queue (or first active)
    const { data: bh } = await supabase.from("voice_business_hours").select("*").eq("workspace_id", workspace_id).eq("active", true).limit(1).maybeSingle();
    const open = bh ? isWithinHours(bh) : true;

    const ctx = { from_number: normFrom, to_number: normTo, contact_id: contact?.id, business_hours_open: open };

    // Routing rules (active, by priority)
    const { data: rules = [] } = await supabase
      .from("voice_routing_rules")
      .select("*")
      .eq("workspace_id", workspace_id)
      .eq("active", true)
      .eq("trigger_type", open ? "inbound_call" : "after_hours")
      .order("priority", { ascending: true });

    let action: any = { action: "route_to_queue", target: {}, message: "default" };
    for (const r of rules as any[]) {
      const conds = Array.isArray(r.conditions) ? r.conditions : [];
      const match = conds.length === 0 || conds.every((c: any) => evalCondition(c, ctx));
      if (match) {
        const acts = Array.isArray(r.actions) ? r.actions : [];
        if (acts.length > 0) {
          action = acts[0];
          await supabase.from("voice_call_logs").update({ routing_rule_id: r.id }).eq("id", callLog.id);
          await supabase.from("voice_routing_rules").update({
            last_executed_at: new Date().toISOString(),
            execution_count: (r.execution_count || 0) + 1,
          }).eq("id", r.id);
          break;
        }
      }
    }

    // After-hours fallback if no rule matched
    if (!open && action.action === "route_to_queue") {
      action = { action: "after_hours", target: { action: bh?.after_hours_action || "callback" }, message: bh?.after_hours_message || "Estamos fora de horário." };
    }

    // Default: try to find a queue
    if (action.action === "route_to_queue" && !action.target?.queue_id) {
      const { data: q } = await supabase.from("voice_queues").select("id").eq("workspace_id", workspace_id).eq("status", "active").limit(1).maybeSingle();
      if (q) action.target.queue_id = q.id;
    }

    if (action.target?.queue_id) {
      await supabase.from("voice_call_logs").update({ queue_id: action.target.queue_id }).eq("id", callLog.id);
      await supabase.from("voice_queue_events").insert({
        workspace_id, queue_id: action.target.queue_id, call_log_id: callLog.id,
        event_type: "entered_queue", payload: { from: normFrom },
      });
    }

    return new Response(JSON.stringify({
      action: action.action,
      target: action.target,
      message: action.message,
      call_log_id: callLog.id,
      queue_id: action.target?.queue_id || null,
    }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e) {
    console.error("route_inbound_error", e);
    return new Response(JSON.stringify({ action: "reject", error: "internal_error", message: String(e) }), {
      status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
