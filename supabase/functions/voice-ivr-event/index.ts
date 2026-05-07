// Fase 1R — IVR Event Handler
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeaders } from "../_shared/cors.ts";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  try {
    const { workspace_id, provider_call_id, ivr_menu_id, digit } = await req.json();
    if (!workspace_id || !ivr_menu_id || !digit) {
      return new Response(JSON.stringify({ error: "missing_required_fields" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    const supabase = createClient(SUPABASE_URL, SERVICE_ROLE);

    const { data: option } = await supabase.from("voice_ivr_options")
      .select("*").eq("ivr_menu_id", ivr_menu_id).eq("digit", digit).eq("active", true).maybeSingle();

    if (!option) {
      return new Response(JSON.stringify({ action: "repeat_menu", reason: "invalid_digit" }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    let call_log_id: string | null = null;
    if (provider_call_id) {
      const { data: call } = await supabase.from("voice_call_logs")
        .select("id").eq("provider_call_id", provider_call_id).eq("workspace_id", workspace_id).maybeSingle();
      if (call) {
        call_log_id = call.id;
        await supabase.from("voice_call_logs").update({
          ivr_menu_id, ivr_selection: digit,
          queue_id: option.target_queue_id,
        }).eq("id", call.id);
      }
    }

    await supabase.from("voice_queue_events").insert({
      workspace_id, queue_id: option.target_queue_id, call_log_id,
      event_type: "entered_queue",
      payload: { ivr_menu_id, digit, action_type: option.action_type, label: option.label },
    });

    return new Response(JSON.stringify({
      action: option.action_type,
      target: { queue_id: option.target_queue_id, user_id: option.target_user_id, number: option.target_number },
      label: option.label,
    }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e) {
    console.error("ivr_event_error", e);
    return new Response(JSON.stringify({ error: "internal_error", message: String(e) }), {
      status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
