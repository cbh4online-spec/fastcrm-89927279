import { createClient } from "npm:@supabase/supabase-js@2";

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

    // Get all active triggers
    const { data: triggers, error: tErr } = await supabase
      .from("campaign_triggers")
      .select("*")
      .eq("is_active", true);

    if (tErr || !triggers || triggers.length === 0) {
      return new Response(JSON.stringify({ processed: 0 }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    let totalProcessed = 0;

    for (const trigger of triggers) {
      const waitMs = (trigger.wait_hours || 48) * 60 * 60 * 1000;
      const cutoff = new Date(Date.now() - waitMs).toISOString();

      let matchingEmails: string[] = [];

      if (trigger.trigger_event === "opened") {
        const { data: events } = await supabase
          .from("marketing_events")
          .select("email")
          .eq("campaign_id", trigger.campaign_id)
          .eq("event_type", "opened")
          .lte("occurred_at", cutoff);
        matchingEmails = [...new Set((events || []).map(e => e.email).filter(Boolean) as string[])];
      } else if (trigger.trigger_event === "clicked") {
        const { data: events } = await supabase
          .from("marketing_events")
          .select("email")
          .eq("campaign_id", trigger.campaign_id)
          .eq("event_type", "clicked")
          .lte("occurred_at", cutoff);
        matchingEmails = [...new Set((events || []).map(e => e.email).filter(Boolean) as string[])];
      } else if (trigger.trigger_event === "not_opened") {
        // Get all recipients sent before cutoff
        const { data: recipients } = await supabase
          .from("marketing_recipients")
          .select("email")
          .eq("campaign_id", trigger.campaign_id)
          .eq("status", "sent")
          .lte("sent_at", cutoff);

        const { data: openedEvents } = await supabase
          .from("marketing_events")
          .select("email")
          .eq("campaign_id", trigger.campaign_id)
          .eq("event_type", "opened");

        const openedSet = new Set((openedEvents || []).map(e => e.email?.toLowerCase()));
        matchingEmails = (recipients || [])
          .map(r => r.email)
          .filter(e => e && !openedSet.has(e.toLowerCase()));
      } else if (trigger.trigger_event === "not_clicked") {
        const { data: recipients } = await supabase
          .from("marketing_recipients")
          .select("email")
          .eq("campaign_id", trigger.campaign_id)
          .eq("status", "sent")
          .lte("sent_at", cutoff);

        const { data: clickedEvents } = await supabase
          .from("marketing_events")
          .select("email")
          .eq("campaign_id", trigger.campaign_id)
          .eq("event_type", "clicked");

        const clickedSet = new Set((clickedEvents || []).map(e => e.email?.toLowerCase()));
        matchingEmails = (recipients || [])
          .map(r => r.email)
          .filter(e => e && !clickedSet.has(e.toLowerCase()));
      }

      // Filter out already processed
      for (const email of matchingEmails) {
        const { data: existing } = await supabase
          .from("campaign_trigger_executions")
          .select("id")
          .eq("trigger_id", trigger.id)
          .eq("recipient_email", email)
          .maybeSingle();

        if (existing) continue;

        // Execute action
        let actionResult: any = { status: "executed" };

        try {
          if (trigger.action_type === "add_tag" && trigger.action_payload?.tag) {
            // Find contact and add tag
            const { data: contact } = await supabase
              .from("contacts")
              .select("id, tags")
              .eq("workspace_id", trigger.workspace_id)
              .eq("email", email)
              .maybeSingle();

            if (contact) {
              const tags = [...(contact.tags || []), trigger.action_payload.tag];
              await supabase.from("contacts").update({ tags }).eq("id", contact.id);
              actionResult = { status: "tag_added", tag: trigger.action_payload.tag };
            }
          } else if (trigger.action_type === "send_campaign" && trigger.action_payload?.campaign_id) {
            // Add to send queue for the follow-up campaign
            await supabase.from("campaign_send_queue").insert({
              campaign_id: trigger.action_payload.campaign_id,
              workspace_id: trigger.workspace_id,
              recipient_email: email,
              status: "pending",
              scheduled_for: new Date().toISOString(),
            });
            actionResult = { status: "enqueued", target_campaign: trigger.action_payload.campaign_id };
          }
        } catch (err) {
          actionResult = { status: "error", message: err instanceof Error ? err.message : "Unknown" };
        }

        // Log execution
        await supabase.from("campaign_trigger_executions").insert({
          trigger_id: trigger.id,
          workspace_id: trigger.workspace_id,
          recipient_email: email,
          action_result: actionResult,
        });

        totalProcessed++;
      }
    }

    return new Response(JSON.stringify({ processed: totalProcessed }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (error) {
    console.error("Trigger processor error:", error);
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : "Internal error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
