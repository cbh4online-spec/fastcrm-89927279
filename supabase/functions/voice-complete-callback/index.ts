// Fase 1R — Complete Callback
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeaders } from "../_shared/cors.ts";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  try {
    const { workspace_id, callback_id, outcome, notes, create_followup = false } = await req.json();
    if (!workspace_id || !callback_id) {
      return new Response(JSON.stringify({ error: "missing_required_fields" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    const supabase = createClient(SUPABASE_URL, SERVICE_ROLE);

    const { data: cb } = await supabase.from("voice_callback_requests").select("*").eq("id", callback_id).single();
    if (!cb) throw new Error("callback_not_found");

    const status = outcome === "no_answer" ? "no_answer" : outcome === "cancelled" ? "cancelled" : "completed";
    await supabase.from("voice_callback_requests").update({
      status,
      completed_at: new Date().toISOString(),
      attempts: (cb.attempts || 0) + 1,
      last_attempt_at: new Date().toISOString(),
      notes: notes || cb.notes,
    }).eq("id", callback_id);

    if (cb.queue_id) {
      await supabase.from("voice_queue_events").insert({
        workspace_id, queue_id: cb.queue_id, call_log_id: cb.call_log_id,
        event_type: "completed", payload: { callback_id, outcome },
      });
    }

    return new Response(JSON.stringify({ ok: true, status }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e) {
    console.error("complete_callback_error", e);
    return new Response(JSON.stringify({ error: "internal_error", message: String(e) }), {
      status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
