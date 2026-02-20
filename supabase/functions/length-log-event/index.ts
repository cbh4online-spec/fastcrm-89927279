import { createClient } from "@supabase/supabase-js";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const body = await req.json();
    const {
      workspace_id, conversation_id, template_id, structure_key,
      channel, pipeline_stage, intent_label, chosen_length,
      char_count, event_type,
    } = body;

    if (!workspace_id || !structure_key || !chosen_length || !event_type) {
      return new Response(JSON.stringify({ error: "workspace_id, structure_key, chosen_length, event_type required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data, error } = await supabase
      .from("message_length_events")
      .insert({
        workspace_id,
        conversation_id: conversation_id || null,
        template_id: template_id || null,
        structure_key,
        channel: channel || "email",
        pipeline_stage: pipeline_stage || null,
        intent_label: intent_label || null,
        chosen_length,
        char_count: char_count || 0,
        event_type,
      })
      .select()
      .single();

    if (error) throw error;

    return new Response(JSON.stringify({ success: true, event: data }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("length-log-event error:", e);
    return new Response(JSON.stringify({ error: e.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
