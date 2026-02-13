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
      workspace_id,
      template_id,
      variant_id,
      conversation_id,
      message_id,
      channel,
      pipeline_stage,
      lead_id,
      contact_id,
      company_id,
      intent_label,
      sentiment_label,
      lead_score,
      potential_value,
      event_type,
    } = body;

    if (!workspace_id || !template_id || !event_type) {
      return new Response(JSON.stringify({ error: "Missing required fields" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Insert event
    const { data: event, error } = await supabase
      .from("template_usage_events")
      .insert({
        workspace_id,
        template_id,
        variant_id: variant_id || null,
        conversation_id: conversation_id || null,
        message_id: message_id || null,
        channel: channel || "email",
        pipeline_stage: pipeline_stage || null,
        lead_id: lead_id || null,
        contact_id: contact_id || null,
        company_id: company_id || null,
        intent_label: intent_label || null,
        sentiment_label: sentiment_label || null,
        lead_score: lead_score || null,
        potential_value: potential_value || null,
        event_type,
      })
      .select()
      .single();

    if (error) throw error;

    // For 'sent' events, also increment usage_count on the template
    if (event_type === "sent") {
      const { data: tpl } = await supabase
        .from("communication_templates")
        .select("usage_count")
        .eq("id", template_id)
        .single();

      await supabase
        .from("communication_templates")
        .update({
          usage_count: ((tpl as any)?.usage_count || 0) + 1,
          last_used_at: new Date().toISOString(),
        })
        .eq("id", template_id);
    }

    // For attribution events (replied, opportunity_created, deal_won), update conversion_count
    if (["replied", "opportunity_created", "deal_won"].includes(event_type)) {
      const { data: tpl } = await supabase
        .from("communication_templates")
        .select("conversion_count")
        .eq("id", template_id)
        .single();

      await supabase
        .from("communication_templates")
        .update({
          conversion_count: ((tpl as any)?.conversion_count || 0) + 1,
        })
        .eq("id", template_id);
    }

    return new Response(JSON.stringify({ success: true, event }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("template-log-event error:", e);
    return new Response(JSON.stringify({ error: e.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
