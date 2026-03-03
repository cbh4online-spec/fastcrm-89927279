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

    const { token, quotes } = await req.json();
    if (!token || !quotes?.length) throw new Error("token and quotes required");

    // Validate token
    const { data: rs, error: rsErr } = await supabase
      .from("rfq_suppliers")
      .select("*")
      .eq("portal_token", token)
      .single();

    if (rsErr || !rs) {
      return new Response(JSON.stringify({ error: "Token inválido" }), {
        status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (rs.portal_token_expires_at && new Date(rs.portal_token_expires_at) < new Date()) {
      return new Response(JSON.stringify({ error: "Token expirado" }), {
        status: 410, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const now = new Date().toISOString();
    let savedCount = 0;

    for (const q of quotes) {
      // Check for existing quote
      const { data: existing } = await supabase
        .from("rfq_quotes")
        .select("*")
        .eq("rfq_id", rs.rfq_id)
        .eq("rfq_item_id", q.rfq_item_id)
        .eq("supplier_id", rs.supplier_id)
        .maybeSingle();

      if (existing) {
        // Log changes to audit
        const fields = ["unit_price", "discount_percent", "vat_percent", "lead_time_days", "min_order_qty", "pack_size", "notes"];
        for (const field of fields) {
          const oldVal = String(existing[field] ?? "");
          const newVal = String(q[field] ?? "");
          if (oldVal !== newVal) {
            await supabase.from("rfq_quote_audit_log").insert({
              rfq_quote_id: existing.id,
              supplier_id: rs.supplier_id,
              field_changed: field,
              old_value: oldVal,
              new_value: newVal,
              workspace_id: rs.workspace_id,
            } as any);
          }
        }

        // Update
        await supabase.from("rfq_quotes").update({
          unit_price: q.unit_price,
          discount_percent: q.discount_percent || 0,
          vat_percent: q.vat_percent || 23,
          lead_time_days: q.lead_time_days || null,
          min_order_qty: q.min_order_qty || null,
          pack_size: q.pack_size || null,
          notes: q.notes || null,
          submitted_via_portal: true,
        } as any).eq("id", existing.id);
      } else {
        // Insert
        await supabase.from("rfq_quotes").insert({
          workspace_id: rs.workspace_id,
          rfq_id: rs.rfq_id,
          rfq_item_id: q.rfq_item_id,
          supplier_id: rs.supplier_id,
          unit_price: q.unit_price,
          discount_percent: q.discount_percent || 0,
          vat_percent: q.vat_percent || 23,
          lead_time_days: q.lead_time_days || null,
          min_order_qty: q.min_order_qty || null,
          pack_size: q.pack_size || null,
          notes: q.notes || null,
          submitted_via_portal: true,
        } as any);
      }
      savedCount++;
    }

    // Update supplier status
    await supabase.from("rfq_suppliers").update({
      status: "responded",
      responded_at: now,
    } as any).eq("id", rs.id);

    return new Response(JSON.stringify({ success: true, saved: savedCount }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("rfq-submit-quote error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
