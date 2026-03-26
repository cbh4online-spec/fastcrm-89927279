import { createClient } from "@supabase/supabase-js";
import { corsHeaders } from "../_shared/cors.ts";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { accountId, workspaceId, companyId, createNew } = await req.json();
    if (!accountId || !workspaceId) {
      return new Response(JSON.stringify({ error: "accountId e workspaceId obrigatórios" }), {
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

    let linkedCompanyId = companyId;

    if (createNew) {
      const { data: newCompany, error: compErr } = await supabase
        .from("companies")
        .insert({
          workspace_id: workspaceId,
          name: account.name,
          website: `https://${account.normalized_domain || account.domain}`,
          industry: account.probable_sector || null,
          notes: account.description_short || account.executive_summary || null,
        })
        .select("id")
        .single();

      if (compErr) {
        return new Response(JSON.stringify({ error: `Erro ao criar empresa: ${compErr.message}` }), {
          status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      linkedCompanyId = newCompany.id;
    }

    if (!linkedCompanyId) {
      return new Response(JSON.stringify({ error: "companyId ou createNew obrigatório" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Link account to company
    await supabase
      .from("account_brief_accounts")
      .update({ company_id: linkedCompanyId, updated_at: new Date().toISOString() })
      .eq("id", accountId);

    // --- Enrich company with briefing data (fill-only) ---
    const { data: existingCompany } = await supabase
      .from("companies")
      .select("*")
      .eq("id", linkedCompanyId)
      .single();

    if (existingCompany) {
      const enrichFields: Record<string, any> = {};
      const fillOnly = (field: string, value: any) => {
        if (value != null && value !== "" && (existingCompany[field] == null || existingCompany[field] === "")) {
          enrichFields[field] = value;
        }
      };

      fillOnly("industry", account.probable_sector);
      fillOnly("region", account.probable_geography);
      fillOnly("website", `https://${account.normalized_domain || account.domain}`);
      fillOnly("tax_id", account.nif);
      fillOnly("email", account.email_main);
      fillOnly("phone", account.phone_main);
      fillOnly("company_score", account.total_score);
      fillOnly("linkedin_url", account.linkedin_url);
      fillOnly("facebook_url", account.facebook_url);
      fillOnly("instagram_url", account.instagram_url);
      fillOnly("twitter_url", account.twitter_url);
      fillOnly("notes", account.description_short || account.executive_summary);

      // Append tagline to notes if notes already has content
      if (account.tagline && existingCompany.notes && !enrichFields.notes) {
        enrichFields.notes = `${existingCompany.notes}\n\nTagline: ${account.tagline}`;
      } else if (account.tagline && !existingCompany.notes && !enrichFields.notes) {
        enrichFields.notes = `Tagline: ${account.tagline}`;
      }

      // Corporate data enrichment
      if (corpData) {
        fillOnly("capital_social", corpData.capital_social);
        fillOnly("legal_nature", corpData.legal_nature);
        fillOnly("founding_date", corpData.founding_date);
        fillOnly("company_status", corpData.company_status);

        // Shareholders + managers → company_context
        if (!existingCompany.company_context && (corpData.shareholders?.length || corpData.managers?.length)) {
          enrichFields.company_context = {
            shareholders: corpData.shareholders || [],
            managers: corpData.managers || [],
          };
        }

        // Annual revenue → annual_revenue (most recent year)
        if (corpData.annual_revenue?.length) {
          const sorted = [...corpData.annual_revenue].sort((a: any, b: any) => b.year - a.year);
          if (sorted[0]?.revenue != null) {
            fillOnly("annual_revenue", sorted[0].revenue);
          }
        }
      }

      // AI summary fields
      if (!existingCompany.ai_insight && (account.executive_summary || account.description_short)) {
        enrichFields.ai_insight = account.executive_summary || account.description_short;
      }

      if (Object.keys(enrichFields).length > 0) {
        enrichFields.updated_at = new Date().toISOString();
        await supabase
          .from("companies")
          .update(enrichFields)
          .eq("id", linkedCompanyId);
      }
    }

    // Create source record
    await supabase
      .from("account_brief_account_sources")
      .insert({
        workspace_id: workspaceId,
        account_id: accountId,
        source_type: "crm_link",
        source_value: linkedCompanyId,
        notes: createNew ? "Empresa criada e enriquecida com briefing" : "Associação manual + enriquecimento",
      });

    return new Response(JSON.stringify({
      success: true,
      companyId: linkedCompanyId,
      created: !!createNew,
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("[link-company] Error:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
