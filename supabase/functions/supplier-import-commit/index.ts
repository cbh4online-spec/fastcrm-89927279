import { createClient } from "@supabase/supabase-js";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { import_id } = await req.json();
    if (!import_id) throw new Error("import_id is required");

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Get import record
    const { data: importRecord, error: importErr } = await supabase
      .from("supplier_price_imports")
      .select("*")
      .eq("id", import_id)
      .single();
    if (importErr || !importRecord) throw new Error("Import not found");

    // Get matched rows
    const allRows: any[] = [];
    let from = 0;
    const pageSize = 1000;
    while (true) {
      const { data: batch } = await supabase
        .from("supplier_price_import_rows")
        .select("*")
        .eq("import_id", import_id)
        .eq("match_status", "matched")
        .range(from, from + pageSize - 1);
      if (!batch || batch.length === 0) break;
      allRows.push(...batch);
      if (batch.length < pageSize) break;
      from += pageSize;
    }

    let updated = 0;
    let created = 0;
    let errors = 0;
    const batchSize = 250;

    for (let i = 0; i < allRows.length; i += batchSize) {
      const batch = allRows.slice(i, i + batchSize);

      for (const row of batch) {
        if (!row.product_id || row.computed_unit_price == null) {
          errors++;
          continue;
        }

        const norm = row.normalized_json || {};
        const now = new Date().toISOString().split("T")[0];

        // Check if entry exists
        const { data: existing } = await supabase
          .from("supplier_products")
          .select("id")
          .eq("workspace_id", importRecord.workspace_id)
          .eq("supplier_id", importRecord.supplier_id)
          .eq("product_id", row.product_id)
          .maybeSingle();

        const payload = {
          workspace_id: importRecord.workspace_id,
          supplier_id: importRecord.supplier_id,
          product_id: row.product_id,
          variant_id: row.variant_id || null,
          unit_price: row.computed_unit_price,
          rrp_price: row.computed_rrp_price,
          pack_size: norm.pack_size || 1,
          min_order_qty: norm.min_order_qty || 1,
          lead_time_days: norm.lead_time_days,
          last_price_date: now,
          import_id: import_id,
          supplier_sku: norm.supplier_sku || null,
          barcode: norm.barcode || null,
          category: norm.category || null,
          price_source: norm.price_source || "net",
        };

        if (existing) {
          const { error: upErr } = await supabase
            .from("supplier_products")
            .update(payload)
            .eq("id", existing.id);
          if (upErr) { errors++; } else { updated++; }
        } else {
          const { error: insErr } = await supabase
            .from("supplier_products")
            .insert(payload);
          if (insErr) { errors++; } else { created++; }
        }
      }
    }

    const stats = {
      total_matched: allRows.length,
      updated,
      created,
      errors,
    };

    await supabase
      .from("supplier_price_imports")
      .update({ status: "committed", stats_json: stats })
      .eq("id", import_id);

    return new Response(
      JSON.stringify({ stats }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
