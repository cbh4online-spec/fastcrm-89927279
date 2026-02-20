import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

interface Recipient {
  id: string;
  email: string;
  name: string;
  type: "contact" | "lead" | "company";
}

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const resendApiKey = Deno.env.get("RESEND_API_KEY");

    if (!resendApiKey) {
      return new Response(
        JSON.stringify({ error: "RESEND_API_KEY not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    // Verify user
    const token = authHeader.replace("Bearer ", "");
    const { data: claimsData, error: claimsError } = await supabase.auth.getClaims(token);
    
    if (claimsError || !claimsData?.claims) {
      return new Response(
        JSON.stringify({ error: "Invalid token" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { campaignId } = await req.json();

    if (!campaignId) {
      return new Response(
        JSON.stringify({ error: "campaignId is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Fetch campaign
    const { data: campaign, error: campaignError } = await supabase
      .from("marketing_campaigns")
      .select("*")
      .eq("id", campaignId)
      .single();

    if (campaignError || !campaign) {
      return new Response(
        JSON.stringify({ error: "Campaign not found" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (campaign.status !== "draft") {
      return new Response(
        JSON.stringify({ error: "Campaign already sent or in progress" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const workspaceId = campaign.workspace_id;

    // Get segment contacts if segment is defined
    let recipients: Recipient[] = [];
    
    if (campaign.segment_id) {
      // Fetch segment rules
      const { data: segment } = await supabase
        .from("marketing_segments")
        .select("filter_rules")
        .eq("id", campaign.segment_id)
        .single();

      if (segment?.filter_rules) {
        const rules = segment.filter_rules as { logic: string; conditions: Array<{ field: string; operator: string; value: string }> };
        
        // Query contacts, leads, and companies based on segment rules
        for (const condition of rules.conditions || []) {
          if (condition.field === "tags" && condition.operator === "contains" && condition.value) {
            // Query contacts with matching tags
            const { data: contacts } = await supabase
              .from("contacts")
              .select("id, name, email")
              .eq("workspace_id", workspaceId)
              .contains("tags", [condition.value]);
            
            if (contacts) {
              recipients.push(...contacts.filter(c => c.email).map(c => ({
                id: c.id,
                email: c.email!,
                name: c.name,
                type: "contact" as const,
              })));
            }

            // Query leads with matching tags
            const { data: leads } = await supabase
              .from("leads")
              .select("id, name, email")
              .eq("workspace_id", workspaceId)
              .contains("tags", [condition.value]);
            
            if (leads) {
              recipients.push(...leads.filter(l => l.email).map(l => ({
                id: l.id,
                email: l.email!,
                name: l.name,
                type: "lead" as const,
              })));
            }

            // Query companies with matching tags
            const { data: companies } = await supabase
              .from("companies")
              .select("id, name, email")
              .eq("workspace_id", workspaceId)
              .contains("tags", [condition.value]);
            
            if (companies) {
              recipients.push(...companies.filter(c => c.email).map(c => ({
                id: c.id,
                email: c.email!,
                name: c.name,
                type: "company" as const,
              })));
            }
          }
        }
      }
    } else {
      // No segment - get all contacts with email
      const { data: contacts } = await supabase
        .from("contacts")
        .select("id, name, email")
        .eq("workspace_id", workspaceId)
        .not("email", "is", null)
        .limit(500);

      if (contacts) {
        recipients = contacts.filter(c => c.email).map(c => ({
          id: c.id,
          email: c.email!,
          name: c.name,
          type: "contact" as const,
        }));
      }
    }

    // Remove duplicates by email
    const uniqueRecipients = recipients.filter((r, index, self) => 
      index === self.findIndex(t => t.email.toLowerCase() === r.email.toLowerCase())
    );

    if (uniqueRecipients.length === 0) {
      return new Response(
        JSON.stringify({ error: "No recipients found for this campaign" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Update campaign status to sending
    await supabase
      .from("marketing_campaigns")
      .update({
        status: "sending",
        started_at: new Date().toISOString(),
        total_recipients: uniqueRecipients.length,
      })
      .eq("id", campaignId);

    // Get marketing settings for from email
    const { data: settings } = await supabase
      .from("marketing_settings")
      .select("*")
      .eq("workspace_id", workspaceId)
      .single();

    // Get verified domain for sending - use the official marketing subdomain
    // CRITICAL: Must match the domain scope of the RESEND_API_KEY
    const fromDomain = "m.fastcrm.metodopare.ai";
    const fromEmail = `news@${fromDomain}`;

    let sentCount = 0;
    let failedCount = 0;
    const errors: string[] = [];

    // Send emails via Resend
    for (const recipient of uniqueRecipients) {
      try {
        // Personalize email content
        let htmlContent = campaign.body_html || "";
        const firstName = recipient.name?.split(" ")[0] || "";
        
        htmlContent = htmlContent
          .replace(/\{\{primeiro_nome\}\}/g, firstName)
          .replace(/\{\{nome\}\}/g, recipient.name || "")
          .replace(/\{\{email\}\}/g, recipient.email)
          .replace(/\{\{subject\}\}/g, campaign.subject || "");

        const response = await fetch("https://api.resend.com/emails", {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${resendApiKey}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            from: `${campaign.from_name || "FastCRM"} <${fromEmail}>`,
            to: [recipient.email],
            subject: campaign.subject,
            html: htmlContent,
            reply_to: campaign.reply_to || undefined,
          }),
        });

        const result = await response.json();

        if (response.ok && result.id) {
          sentCount++;
          
          // Create recipient record with workspace_id for webhook processing
          await supabase.from("marketing_recipients").insert({
            campaign_id: campaignId,
            workspace_id: workspaceId,
            email: recipient.email,
            contact_id: recipient.type === "contact" ? recipient.id : null,
            lead_id: recipient.type === "lead" ? recipient.id : null,
            company_id: recipient.type === "company" ? recipient.id : null,
            status: "sent",
            sent_at: new Date().toISOString(),
            resend_id: result.id,
          });
        } else {
          failedCount++;
          errors.push(`${recipient.email}: ${result.message || "Unknown error"}`);
        }
      } catch (err) {
        failedCount++;
        errors.push(`${recipient.email}: ${err instanceof Error ? err.message : "Unknown error"}`);
      }
    }

    // Update campaign with final stats
    await supabase
      .from("marketing_campaigns")
      .update({
        status: sentCount > 0 ? "sent" : "failed",
        completed_at: new Date().toISOString(),
        sent_count: sentCount,
        total_recipients: uniqueRecipients.length,
      })
      .eq("id", campaignId);

    // Update usage
    const now = new Date();
    const periodStart = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-01`;
    
    try {
      await supabase.rpc("increment_marketing_usage", {
        p_workspace_id: workspaceId,
        p_period_start: periodStart,
        p_emails_sent: sentCount,
        p_campaigns_sent: 1,
      });
    } catch {
      // Ignore if function doesn't exist
    }

    return new Response(
      JSON.stringify({
        success: true,
        sent: sentCount,
        failed: failedCount,
        total: uniqueRecipients.length,
        errors: errors.length > 0 ? errors : undefined,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("Error in marketing-send-campaign:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
