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
    console.log(`[COMMIT-V2] Starting commit for: ${import_id}`);

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const { data: importRecord, error: impErr } = await supabase
      .from("supplier_price_imports")
      .select("*")
      .eq("id", import_id)
      .single();
    if (impErr || !importRecord) throw new Error("Import not found");

    await supabase.from("supplier_price_imports").update({
      status: "committing",
      current_step: "committing",
      progress_percent: 80,
    }).eq("id", import_id);

    // Paginate through matched rows
    let updated = 0, created = 0, unchanged = 0, errors = 0;
    let page = 0;
    const pageSize = 500;
    const now = new Date().toISOString();
    const today = now.split("T")[0];

    while (true) {
      const { data: rows } = await supabase
        .from("supplier_price_import_rows")
        .select("*")
        .eq("import_id", import_id)
        .eq("match_status", "matched")
        .range(page * pageSize, (page + 1) * pageSize - 1);

      if (!rows || rows.length === 0) break;

      // Batch: collect upsert payloads
      const upsertPayloads: any[] = [];
      const rowCommitUpdates: { id: string; commit_status: string; commit_error_text: string | null }[] = [];

      for (const row of rows) {
        if (!row.product_id || row.computed_unit_price == null) {
          errors++;
          rowCommitUpdates.push({ id: row.id, commit_status: "error", commit_error_text: "Missing product_id or price" });
          continue;
        }

        const norm = row.normalized_json || {};

        upsertPayloads.push({
          row_id: row.id,
          payload: {
            workspace_id: importRecord.workspace_id,
            supplier_id: importRecord.supplier_id,
            product_id: row.product_id,
            variant_id: row.variant_id || null,
            unit_price: row.computed_unit_price,
            rrp_price: row.computed_rrp_price,
            pack_size: norm.pack_size || 1,
            min_order_qty: norm.min_order_qty || 1,
            lead_time_days: norm.lead_time_days,
            last_price_date: today,
            import_id: import_id,
            supplier_sku: norm.supplier_sku || null,
            supplier_sku_normalized: norm.supplier_sku_normalized || null,
            barcode: norm.barcode || null,
            barcode_normalized: norm.barcode_normalized || null,
            supplier_product_name_raw: norm.product_name || null,
            supplier_product_name_normalized: norm.product_name_normalized || null,
            category: norm.category || null,
            price_source: norm.price_source || "net",
            match_method: row.match_method,
            match_confidence: row.match_confidence,
            last_import_job_id: import_id,
            last_seen_at: now,
          },
        });
      }

      // Process upserts - check existing first in batch
      if (upsertPayloads.length > 0) {
        const productIds = upsertPayloads.map(p => p.payload.product_id);
        const { data: existingLinks } = await supabase
          .from("supplier_products")
          .select("id, product_id, unit_price, rrp_price")
          .eq("workspace_id", importRecord.workspace_id)
          .eq("supplier_id", importRecord.supplier_id)
          .in("product_id", productIds);

        const existingMap = new Map<string, any>();
        for (const e of (existingLinks || [])) {
          existingMap.set(e.product_id, e);
        }

        // Separate into inserts and updates
        const toInsert: any[] = [];
        const toUpdate: { id: string; payload: any; row_id: string }[] = [];

        for (const item of upsertPayloads) {
          const existing = existingMap.get(item.payload.product_id);
          if (existing) {
            // Store previous prices
            item.payload.previous_unit_price = existing.unit_price;
            item.payload.previous_rrp_price = existing.rrp_price;

            // Check if price actually changed
            const priceChanged = Number(existing.unit_price) !== Number(item.payload.unit_price) ||
              Number(existing.rrp_price || 0) !== Number(item.payload.rrp_price || 0);

            if (priceChanged) {
              item.payload.last_price_change_at = now;
            }

            toUpdate.push({ id: existing.id, payload: item.payload, row_id: item.row_id });
          } else {
            item.payload.last_price_change_at = now;
            toInsert.push({ ...item.payload, row_id: item.row_id });
          }
        }

        // Batch insert new records
        if (toInsert.length > 0) {
          const insertPayloads = toInsert.map(({ row_id, ...rest }) => rest);
          const { error: insErr } = await supabase
            .from("supplier_products")
            .insert(insertPayloads);

          if (insErr) {
            console.error(`[COMMIT-V2] Batch insert error: ${insErr.message}`);
            // Fallback to individual inserts
            for (const item of toInsert) {
              const { row_id, ...payload } = item;
              const { error: singleErr } = await supabase.from("supplier_products").insert(payload);
              if (singleErr) {
                errors++;
                rowCommitUpdates.push({ id: row_id, commit_status: "error", commit_error_text: singleErr.message });
              } else {
                created++;
                rowCommitUpdates.push({ id: row_id, commit_status: "committed", commit_error_text: null });
              }
            }
          } else {
            created += toInsert.length;
            for (const item of toInsert) {
              rowCommitUpdates.push({ id: item.row_id, commit_status: "committed", commit_error_text: null });
            }
          }
        }

        // Batch update existing records
        for (const item of toUpdate) {
          const { error: upErr } = await supabase
            .from("supplier_products")
            .update(item.payload)
            .eq("id", item.id);

          if (upErr) {
            errors++;
            rowCommitUpdates.push({ id: item.row_id, commit_status: "error", commit_error_text: upErr.message });
          } else {
            updated++;
            rowCommitUpdates.push({ id: item.row_id, commit_status: "committed", commit_error_text: null });
          }
        }
      }

      // Update commit status on staging rows
      for (const upd of rowCommitUpdates) {
        await supabase.from("supplier_price_import_rows")
          .update({ commit_status: upd.commit_status, commit_error_text: upd.commit_error_text })
          .eq("id", upd.id);
      }

      if (rows.length < pageSize) break;
      page++;
    }

    const stats = { total_matched: updated + created + errors, updated, created, unchanged, errors };

    await supabase.from("supplier_price_imports").update({
      status: "committed",
      current_step: "committed",
      progress_percent: 100,
      finished_at: now,
      stats_json: stats,
    }).eq("id", import_id);

    console.log(`[COMMIT-V2] Done: ${JSON.stringify(stats)}`);

    return new Response(
      JSON.stringify({ stats }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error(`[COMMIT-V2] FAILED: ${error.message}`);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
