import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const body = await req.json();
    const {
      workspace_id, template_id, conversation_id, message_id,
      channel, pipeline_stage, intent_label, sentiment_label,
      lead_score, potential_value, structure_key, event_type,
    } = body;

    if (!workspace_id || !template_id || !structure_key || !event_type) {
      return new Response(JSON.stringify({ error: "Missing required fields: workspace_id, template_id, structure_key, event_type" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data, error } = await supabase
      .from("structure_usage_events")
      .insert({
        workspace_id,
        template_id,
        conversation_id: conversation_id || null,
        message_id: message_id || null,
        channel: channel || "email",
        pipeline_stage: pipeline_stage || null,
        intent_label: intent_label || null,
        sentiment_label: sentiment_label || null,
        lead_score: lead_score || null,
        potential_value: potential_value || null,
        structure_key,
        event_type,
      })
      .select()
      .single();

    if (error) throw error;

    return new Response(JSON.stringify({ success: true, event: data }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("structure-log-event error:", e);
    return new Response(JSON.stringify({ error: e.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
