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
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;

    // Validate JWT
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: claimsData, error: claimsErr } = await userClient.auth.getClaims(authHeader.replace("Bearer ", ""));
    if (claimsErr || !claimsData?.claims) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const userId = claimsData.claims.sub;

    const { rfq_id, supplier_id } = await req.json();
    if (!rfq_id || !supplier_id) {
      return new Response(JSON.stringify({ error: "rfq_id and supplier_id required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(supabaseUrl, serviceKey);

    // Get rfq
    const { data: rfq } = await supabase
      .from("rfqs")
      .select("id, workspace_id")
      .eq("id", rfq_id)
      .single();
    if (!rfq) {
      return new Response(JSON.stringify({ error: "RFQ not found" }), {
        status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Validate membership
    const { data: member } = await supabase
      .from("workspace_members")
      .select("id")
      .eq("workspace_id", rfq.workspace_id)
      .eq("user_id", userId)
      .maybeSingle();
    if (!member) {
      return new Response(JSON.stringify({ error: "Not a workspace member" }), {
        status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Get all quotes for this supplier
    const { data: quotes, error: qErr } = await supabase
      .from("rfq_quotes")
      .select("id, unit_price, rfq_item_id")
      .eq("rfq_id", rfq_id)
      .eq("supplier_id", supplier_id)
      .eq("workspace_id", rfq.workspace_id);
    if (qErr) throw qErr;

    // Get total items count
    const { count: totalItems } = await supabase
      .from("rfq_items")
      .select("id", { count: "exact", head: true })
      .eq("rfq_id", rfq_id);

    // Validate all quoted items have unit_price > 0
    const invalidQuotes = (quotes || []).filter((q: any) => !q.unit_price || Number(q.unit_price) <= 0);
    if (invalidQuotes.length > 0) {
      return new Response(JSON.stringify({
        error: `${invalidQuotes.length} item(s) com preço inválido. Todos os itens cotados devem ter preço > 0.`,
        invalid_items: invalidQuotes.map((q: any) => q.rfq_item_id),
      }), {
        status: 422, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (!quotes || quotes.length === 0) {
      return new Response(JSON.stringify({ error: "Nenhuma cotação encontrada para submeter." }), {
        status: 422, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const now = new Date().toISOString();

    // Update all quotes to submitted
    const { error: updateErr } = await supabase
      .from("rfq_quotes")
      .update({ status: "submitted", submitted_at: now, updated_at: now } as any)
      .eq("rfq_id", rfq_id)
      .eq("supplier_id", supplier_id)
      .eq("workspace_id", rfq.workspace_id);
    if (updateErr) throw updateErr;

    // Update rfq_suppliers status
    const { error: suppErr } = await supabase
      .from("rfq_suppliers")
      .update({ status: "responded", responded_at: now } as any)
      .eq("rfq_id", rfq_id)
      .eq("supplier_id", supplier_id)
      .eq("workspace_id", rfq.workspace_id);
    if (suppErr) throw suppErr;

    return new Response(JSON.stringify({
      success: true,
      submitted_count: quotes.length,
      total_items: totalItems || 0,
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("rfq-submit-quote-sheet error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
