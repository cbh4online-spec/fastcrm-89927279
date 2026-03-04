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

    // Get rfq to determine workspace
    const { data: rfq, error: rfqErr } = await supabase
      .from("rfqs")
      .select("id, workspace_id, currency")
      .eq("id", rfq_id)
      .single();
    if (rfqErr || !rfq) {
      return new Response(JSON.stringify({ error: "RFQ not found" }), {
        status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Validate workspace membership
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

    // Get rfq items with product info
    const { data: items, error: itemsErr } = await supabase
      .from("rfq_items")
      .select("id, line_number, qty, unit, spec_notes, product_id, products(name, sku)")
      .eq("rfq_id", rfq_id)
      .order("line_number", { ascending: true });
    if (itemsErr) throw itemsErr;

    // Get existing quotes for this supplier
    const { data: existingQuotes, error: quotesErr } = await supabase
      .from("rfq_quotes")
      .select("*")
      .eq("rfq_id", rfq_id)
      .eq("supplier_id", supplier_id)
      .eq("workspace_id", rfq.workspace_id);
    if (quotesErr) throw quotesErr;

    // Build quote map by rfq_item_id
    const quoteMap: Record<string, any> = {};
    (existingQuotes || []).forEach((q: any) => {
      quoteMap[q.rfq_item_id] = q;
    });

    // Build sheet rows
    const rows = (items || []).map((item: any, idx: number) => {
      const quote = quoteMap[item.id];
      return {
        rfq_item_id: item.id,
        line_number: item.line_number || idx + 1,
        product_name: item.products?.name || "—",
        sku: item.products?.sku || "",
        qty: item.qty,
        unit: item.unit || "un",
        spec_notes: item.spec_notes || "",
        // Quote fields (pre-filled or defaults)
        unit_price: quote?.unit_price ?? 0,
        discount_percent: quote?.discount_percent ?? 0,
        vat_percent: quote?.vat_percent ?? 23,
        lead_time_days: quote?.lead_time_days ?? null,
        min_order_qty: quote?.min_order_qty ?? null,
        pack_size: quote?.pack_size ?? null,
        notes: quote?.notes ?? "",
        status: quote?.status ?? "draft",
        has_existing_quote: !!quote,
      };
    });

    return new Response(JSON.stringify({
      rfq_id,
      supplier_id,
      workspace_id: rfq.workspace_id,
      currency: rfq.currency || "EUR",
      rows,
      total_items: rows.length,
      quoted_items: rows.filter((r: any) => r.has_existing_quote).length,
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("rfq-get-supplier-quote-sheet error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
