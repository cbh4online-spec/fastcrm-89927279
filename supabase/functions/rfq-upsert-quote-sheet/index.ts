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

    const { rfq_id, supplier_id, rows } = await req.json();
    if (!rfq_id || !supplier_id || !Array.isArray(rows) || rows.length === 0) {
      return new Response(JSON.stringify({ error: "rfq_id, supplier_id and rows[] required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(supabaseUrl, serviceKey);

    // Get rfq workspace
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

    let created = 0;
    let updated = 0;
    const errors: Array<{ index: number; rfq_item_id: string; error: string }> = [];

    // Process in chunks of 200
    const CHUNK_SIZE = 200;
    for (let i = 0; i < rows.length; i += CHUNK_SIZE) {
      const chunk = rows.slice(i, i + CHUNK_SIZE);

      for (let j = 0; j < chunk.length; j++) {
        const row = chunk[j];
        const globalIdx = i + j;

        try {
          if (!row.rfq_item_id) {
            errors.push({ index: globalIdx, rfq_item_id: "", error: "Missing rfq_item_id" });
            continue;
          }

          // Check if quote exists
          const { data: existing } = await supabase
            .from("rfq_quotes")
            .select("id")
            .eq("workspace_id", rfq.workspace_id)
            .eq("rfq_id", rfq_id)
            .eq("rfq_item_id", row.rfq_item_id)
            .eq("supplier_id", supplier_id)
            .maybeSingle();

          const quoteData = {
            unit_price: Number(row.unit_price) || 0,
            discount_percent: Number(row.discount_percent) || 0,
            vat_percent: Number(row.vat_percent) ?? 23,
            lead_time_days: row.lead_time_days != null ? Number(row.lead_time_days) : null,
            min_order_qty: row.min_order_qty != null ? Number(row.min_order_qty) : null,
            pack_size: row.pack_size != null ? Number(row.pack_size) : null,
            notes: row.notes || null,
            status: row.status || "draft",
            updated_at: new Date().toISOString(),
          };

          if (existing) {
            const { error: upErr } = await supabase
              .from("rfq_quotes")
              .update(quoteData as any)
              .eq("id", existing.id);
            if (upErr) throw upErr;
            updated++;
          } else {
            const { error: insErr } = await supabase
              .from("rfq_quotes")
              .insert({
                workspace_id: rfq.workspace_id,
                rfq_id,
                rfq_item_id: row.rfq_item_id,
                supplier_id,
                ...quoteData,
              } as any);
            if (insErr) throw insErr;
            created++;
          }
        } catch (e: any) {
          errors.push({ index: globalIdx, rfq_item_id: row.rfq_item_id, error: e.message || "Unknown error" });
        }
      }
    }

    return new Response(JSON.stringify({ success: true, created, updated, errors, total: rows.length }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("rfq-upsert-quote-sheet error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
