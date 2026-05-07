// Fase 1R — Missed Call Recovery
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeaders } from "../_shared/cors.ts";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  try {
    const { workspace_id, call_log_id, mode = "manual" } = await req.json();
    if (!workspace_id || !call_log_id) {
      return new Response(JSON.stringify({ error: "missing_required_fields" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    const supabase = createClient(SUPABASE_URL, SERVICE_ROLE);

    const { data: call } = await supabase.from("voice_call_logs").select("*").eq("id", call_log_id).single();
    if (!call) throw new Error("call_not_found");

    // Existing open callback?
    const { data: existing } = await supabase.from("voice_callback_requests")
      .select("id").eq("call_log_id", call_log_id).in("status", ["pending", "scheduled"]).maybeSingle();

    let callback_id = existing?.id;
    if (!callback_id) {
      const due = new Date(Date.now() + 15 * 60 * 1000); // 15 min default
      const { data: cb, error } = await supabase.from("voice_callback_requests").insert({
        workspace_id,
        call_log_id,
        contact_id: call.contact_id,
        queue_id: call.queue_id,
        phone: call.from_number,
        normalized_phone: call.normalized_from_number || call.from_number,
        status: "pending",
        priority: "high",
        source: "missed_call",
        due_at: due.toISOString(),
        reason: "Recuperar chamada perdida",
      }).select("id").single();
      if (error) throw error;
      callback_id = cb.id;
      await supabase.from("voice_call_logs").update({ callback_request_id: callback_id, missed_reason: "no_agent_available" }).eq("id", call_log_id);
    }

    // Suggested WhatsApp message
    const { data: contact } = call.contact_id
      ? await supabase.from("contacts").select("name").eq("id", call.contact_id).maybeSingle()
      : { data: null };
    const suggested_message = contact?.name
      ? `Olá ${contact.name}, vimos que tentou entrar em contacto connosco. Em que podemos ajudar?`
      : `Olá, vimos que tentou entrar em contacto connosco. Em que podemos ajudar?`;

    return new Response(JSON.stringify({
      callback_id,
      suggested_message,
      mode,
    }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e) {
    console.error("missed_recovery_error", e);
    return new Response(JSON.stringify({ error: "internal_error", message: String(e) }), {
      status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
