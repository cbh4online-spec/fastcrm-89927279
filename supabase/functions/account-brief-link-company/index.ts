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

    // Get account
    const { data: account, error: accErr } = await supabase
      .from("account_brief_accounts")
      .select("id, name, domain, normalized_domain, probable_sector, probable_geography, description_short, executive_summary")
      .eq("id", accountId)
      .eq("workspace_id", workspaceId)
      .single();

    if (accErr || !account) {
      return new Response(JSON.stringify({ error: "Conta não encontrada" }), {
        status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    let linkedCompanyId = companyId;

    if (createNew) {
      // Create company in CRM
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

    // Create source record
    await supabase
      .from("account_brief_account_sources")
      .insert({
        workspace_id: workspaceId,
        account_id: accountId,
        source_type: "crm_link",
        source_value: linkedCompanyId,
        notes: createNew ? "Empresa criada automaticamente" : "Associação manual",
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
