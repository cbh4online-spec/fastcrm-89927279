import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "@supabase/supabase-js";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceKey);

    const { rfq_supplier_id, action, token } = await req.json();

    // Action: validate - used by portal page to get RFQ data
    if (action === "validate" && token) {
      const { data: rs, error } = await supabase
        .from("rfq_suppliers")
        .select("*, suppliers:supplier_id(name, email), rfqs:rfq_id(*, procurement_projects:project_id(name))")
        .eq("portal_token", token)
        .single();

      if (error || !rs) {
        return new Response(JSON.stringify({ error: "Token inválido ou expirado" }), {
          status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Check expiry
      if (rs.portal_token_expires_at && new Date(rs.portal_token_expires_at) < new Date()) {
        return new Response(JSON.stringify({ error: "Token expirado" }), {
          status: 410, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Fetch items
      const { data: items } = await supabase
        .from("rfq_items")
        .select("*, products:product_id(name, sku)")
        .eq("rfq_id", rs.rfq_id)
        .order("created_at");

      // Fetch workspace
      const rfqData = rs.rfqs as any;
      const { data: ws } = await supabase
        .from("workspaces")
        .select("company_name, tax_id, billing_address")
        .eq("id", rfqData?.workspace_id)
        .single();

      // Fetch existing quotes by this supplier
      const { data: existingQuotes } = await supabase
        .from("rfq_quotes")
        .select("*")
        .eq("rfq_id", rs.rfq_id)
        .eq("supplier_id", rs.supplier_id);

      return new Response(JSON.stringify({
        rfq_supplier: rs,
        rfq: rfqData,
        items: items || [],
        workspace: ws,
        existing_quotes: existingQuotes || [],
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Action: generate - create a portal token
    if (!rfq_supplier_id) throw new Error("rfq_supplier_id required");

    const portalToken = crypto.randomUUID();
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 30);

    const { error } = await supabase
      .from("rfq_suppliers")
      .update({
        portal_token: portalToken,
        portal_token_expires_at: expiresAt.toISOString(),
      } as any)
      .eq("id", rfq_supplier_id);

    if (error) throw error;

    return new Response(JSON.stringify({ token: portalToken, expires_at: expiresAt.toISOString() }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("rfq-supplier-portal-token error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
