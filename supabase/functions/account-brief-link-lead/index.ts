import { createClient } from "@supabase/supabase-js";
import { corsHeaders } from "../_shared/cors.ts";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { accountId, workspaceId, leadId } = await req.json();
    if (!accountId || !workspaceId || !leadId) {
      return new Response(JSON.stringify({ error: "accountId, workspaceId e leadId obrigatórios" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

    // Get account with all enrichable fields
    const { data: account, error: accErr } = await supabase
      .from("account_brief_accounts")
      .select("id, name, domain, normalized_domain, probable_sector, probable_geography, description_short, executive_summary, nif, email_main, phone_main, tagline, total_score, linkedin_url, facebook_url, instagram_url, twitter_url, tiktok_url, youtube_url")
      .eq("id", accountId)
      .eq("workspace_id", workspaceId)
      .single();

    if (accErr || !account) {
      return new Response(JSON.stringify({ error: "Conta não encontrada" }), {
        status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Get corporate data if available
    const { data: corpData } = await supabase
      .from("account_brief_corporate_data")
      .select("*")
      .eq("account_id", accountId)
      .maybeSingle();

    // Get existing lead
    const { data: existingLead, error: leadErr } = await supabase
      .from("leads")
      .select("*")
      .eq("id", leadId)
      .eq("workspace_id", workspaceId)
      .single();

    if (leadErr || !existingLead) {
      return new Response(JSON.stringify({ error: "Lead não encontrada" }), {
        status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Build enrichment fields (fill-only: never overwrite existing data)
    const enrichFields: Record<string, any> = {};
    const fillOnly = (field: string, value: any) => {
      if (value != null && value !== "" && (existingLead[field] == null || existingLead[field] === "")) {
        enrichFields[field] = value;
      }
    };

    fillOnly("about", account.description_short || account.executive_summary);
    fillOnly("industry", account.probable_sector);
    fillOnly("website", `https://${account.normalized_domain || account.domain}`);
    fillOnly("tax_id", account.nif);
    fillOnly("email", account.email_main);
    fillOnly("phone", account.phone_main);
    fillOnly("lead_score", account.total_score);
    fillOnly("linkedin_url", account.linkedin_url);
    fillOnly("facebook_url", account.facebook_url);
    fillOnly("instagram_url", account.instagram_url);
    fillOnly("twitter_url", account.twitter_url);
    fillOnly("tiktok_url", account.tiktok_url);
    fillOnly("youtube_url", account.youtube_url);
    fillOnly("company_name", account.name);

    // Corporate data enrichment
    if (corpData) {
      fillOnly("capital_social", corpData.capital_social);
      fillOnly("legal_nature", corpData.legal_nature);
      fillOnly("founding_date", corpData.founding_date);
      fillOnly("company_status", corpData.company_status);

      // Annual revenue (most recent year)
      if (corpData.annual_revenue?.length) {
        const sorted = [...corpData.annual_revenue].sort((a: any, b: any) => b.year - a.year);
        if (sorted[0]?.revenue != null) {
          fillOnly("annual_revenue", sorted[0].revenue);
        }
      }
    }

    // AI insight
    if (!existingLead.ai_insight && (account.executive_summary || account.description_short)) {
      enrichFields.ai_insight = account.executive_summary || account.description_short;
    }

    // Update lead with enrichment + link
    enrichFields.updated_at = new Date().toISOString();
    await supabase
      .from("leads")
      .update(enrichFields)
      .eq("id", leadId)
      .eq("workspace_id", workspaceId);

    // Link account to lead
    await supabase
      .from("account_brief_accounts")
      .update({ lead_id: leadId, updated_at: new Date().toISOString() })
      .eq("id", accountId)
      .eq("workspace_id", workspaceId);

    // Create source record
    await supabase
      .from("account_brief_account_sources")
      .insert({
        workspace_id: workspaceId,
        account_id: accountId,
        source_type: "crm_lead_link",
        source_value: leadId,
        notes: "Lead associada e enriquecida com briefing",
      });

    const enrichedCount = Object.keys(enrichFields).length - 1; // minus updated_at
    return new Response(JSON.stringify({
      success: true,
      leadId,
      enrichedFields: enrichedCount,
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("[link-lead] Error:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
