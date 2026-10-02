import { resolveSenderDefaults } from "../_shared/senderAddress.ts";
import { resendFetch } from "../_shared/resendGateway.ts";
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

    const resendApiKey = Deno.env.get("RESEND_API_KEY");
    if (!resendApiKey) {
      return new Response(JSON.stringify({ error: "RESEND_API_KEY not configured" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Pick pending items where scheduled_for <= now
    const { data: queueItems, error: qErr } = await supabase
      .from("campaign_send_queue")
      .select("*, marketing_campaigns!campaign_send_queue_campaign_id_fkey(subject, body_html, from_name, reply_to, workspace_id)")
      .eq("status", "pending")
      .lte("scheduled_for", new Date().toISOString())
      .order("scheduled_for", { ascending: true })
      .limit(50);

    if (qErr || !queueItems || queueItems.length === 0) {
      return new Response(JSON.stringify({ processed: 0 }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    let sent = 0;
    let failed = 0;
    const senderCache = new Map<string, { email: string; fromName: string | null; replyTo: string | null }>();

    for (const item of queueItems) {
      try {
        // Mark as sending
        await supabase.from("campaign_send_queue").update({ status: "sending" }).eq("id", item.id);

        const campaign = (item as any).marketing_campaigns;
        if (!campaign) {
          await supabase.from("campaign_send_queue").update({ status: "failed", error_message: "Campaign not found" }).eq("id", item.id);
          failed++;
          continue;
        }

        // Personalize content
        let html = campaign.body_html || "";
        const firstName = item.recipient_name?.split(" ")[0] || "";
        html = html
          .replace(/\{\{primeiro_nome\}\}/g, firstName)
          .replace(/\{\{nome\}\}/g, item.recipient_name || "")
          .replace(/\{\{email\}\}/g, item.recipient_email);

        const wsKey = item.workspace_id || "";
        if (!senderCache.has(wsKey)) senderCache.set(wsKey, await resolveSenderDefaults(supabase, item.workspace_id));
        const sender = senderCache.get(wsKey)!; const fromEmail = sender.email;

        const response = await resendFetch("/emails", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${resendApiKey}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            from: `${campaign.from_name || sender.fromName || "FastCRM"} <${fromEmail}>`,
            to: [item.recipient_email],
            subject: campaign.subject,
            html,
            reply_to: campaign.reply_to || sender.replyTo || undefined,
          }),
        });

        const result = await response.json();

        if (response.ok && result.id) {
          await supabase.from("campaign_send_queue").update({
            status: "sent",
            sent_at: new Date().toISOString(),
          }).eq("id", item.id);

          // Create recipient record
          await supabase.from("marketing_recipients").insert({
            campaign_id: item.campaign_id,
            workspace_id: item.workspace_id,
            email: item.recipient_email,
            contact_id: item.contact_id,
            status: "sent",
            sent_at: new Date().toISOString(),
            resend_id: result.id,
          });

          sent++;

          // COST GUARD: faturar email enviado (Resend, margem 50%)
          const { error: recErr } = await supabase.rpc("cost_guard_record_event", {
            p_workspace_id: item.workspace_id,
            p_source_module: "marketing",
            p_usage_type: "email_newsletter",
            p_quantity: 1,
            p_unit: "email",
            p_provider_name: "resend",
            p_entity_type: "marketing_campaign",
            p_entity_id: item.campaign_id,
          });
          if (recErr) console.error("cost_guard_record_event failed:", recErr.message);
        } else {
          await supabase.from("campaign_send_queue").update({
            status: "failed",
            error_message: result.message || "Send failed",
          }).eq("id", item.id);
          failed++;
        }
      } catch (err) {
        await supabase.from("campaign_send_queue").update({
          status: "failed",
          error_message: err instanceof Error ? err.message : "Unknown error",
        }).eq("id", item.id);
        failed++;
      }
    }

    // Update campaign sent counts
    const campaignIds = [...new Set(queueItems.map(q => q.campaign_id))];
    for (const cid of campaignIds) {
      const { count } = await supabase
        .from("campaign_send_queue")
        .select("*", { count: "exact", head: true })
        .eq("campaign_id", cid)
        .eq("status", "sent");

      const { count: totalCount } = await supabase
        .from("campaign_send_queue")
        .select("*", { count: "exact", head: true })
        .eq("campaign_id", cid);

      const { count: pendingCount } = await supabase
        .from("campaign_send_queue")
        .select("*", { count: "exact", head: true })
        .eq("campaign_id", cid)
        .eq("status", "pending");

      await supabase.from("marketing_campaigns").update({
        sent_count: count || 0,
        total_recipients: totalCount || 0,
        ...(pendingCount === 0 ? { status: "sent", completed_at: new Date().toISOString() } : {}),
      }).eq("id", cid);
    }

    return new Response(JSON.stringify({ processed: queueItems.length, sent, failed }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (error) {
    console.error("Queue processor error:", error);
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : "Internal error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
