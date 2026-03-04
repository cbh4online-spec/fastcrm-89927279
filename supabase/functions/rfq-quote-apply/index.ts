import { createClient } from "@supabase/supabase-js";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { import_id, mode } = await req.json();
    if (!import_id) throw new Error("import_id is required");

    const status = mode === "submitted" ? "submitted" : "draft";

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Get import record
    const { data: imp, error: impErr } = await supabase
      .from("rfq_quote_imports")
      .select("*")
      .eq("id", import_id)
      .single();
    if (impErr || !imp) throw new Error("Import not found");

    // Get matched lines
    const { data: lines, error: linesErr } = await supabase
      .from("rfq_quote_import_lines")
      .select("*")
      .eq("import_id", import_id)
      .in("match_status", ["matched"]);
    if (linesErr) throw new Error("Failed to fetch lines: " + linesErr.message);

    if (!lines || lines.length === 0) {
      return new Response(JSON.stringify({ created: 0, updated: 0, errors: ["No matched lines to apply"] }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    let created = 0;
    let updated = 0;
    const errors: string[] = [];

    // Process in chunks of 200
    const chunkSize = 200;
    for (let i = 0; i < lines.length; i += chunkSize) {
      const chunk = lines.slice(i, i + chunkSize);

      for (const line of chunk) {
        if (!line.match_rfq_item_id) continue;

        const unitPrice = line.computed_unit_price || line.unit_price;
        if (!unitPrice || unitPrice <= 0) {
          errors.push(`Line ${line.line_no}: no valid price`);
          continue;
        }

        // Check if quote exists
        const { data: existing } = await supabase
          .from("rfq_quotes")
          .select("id")
          .eq("workspace_id", imp.workspace_id)
          .eq("rfq_id", imp.rfq_id)
          .eq("rfq_item_id", line.match_rfq_item_id)
          .eq("supplier_id", imp.supplier_id)
          .maybeSingle();

        if (existing) {
          // Update
          const { error: upErr } = await supabase
            .from("rfq_quotes")
            .update({
              unit_price: unitPrice,
              discount_percent: line.discount_percent || 0,
              vat_percent: line.vat_percent || 23,
              lead_time_days: line.lead_time_days,
              min_order_qty: line.moq,
              pack_size: line.pack_size,
              status,
              submitted_at: status === "submitted" ? new Date().toISOString() : null,
              updated_at: new Date().toISOString(),
            })
            .eq("id", existing.id);
          if (upErr) errors.push(`Line ${line.line_no}: update failed`);
          else updated++;
        } else {
          // Insert
          const { error: insErr } = await supabase
            .from("rfq_quotes")
            .insert({
              workspace_id: imp.workspace_id,
              rfq_id: imp.rfq_id,
              rfq_item_id: line.match_rfq_item_id,
              supplier_id: imp.supplier_id,
              unit_price: unitPrice,
              discount_percent: line.discount_percent || 0,
              vat_percent: line.vat_percent || 23,
              lead_time_days: line.lead_time_days,
              min_order_qty: line.moq,
              pack_size: line.pack_size,
              status,
              submitted_at: status === "submitted" ? new Date().toISOString() : null,
            });
          if (insErr) errors.push(`Line ${line.line_no}: insert failed - ${insErr.message}`);
          else created++;
        }
      }
    }

    // Update import status
    await supabase.from("rfq_quote_imports").update({ status: "applied" }).eq("id", import_id);

    // If submitted, update supplier status
    if (status === "submitted") {
      await supabase
        .from("rfq_suppliers")
        .update({ status: "responded", responded_at: new Date().toISOString() })
        .eq("rfq_id", imp.rfq_id)
        .eq("supplier_id", imp.supplier_id);
    }

    return new Response(JSON.stringify({ created, updated, errors }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
