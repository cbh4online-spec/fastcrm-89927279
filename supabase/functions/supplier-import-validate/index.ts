import { createClient } from "@supabase/supabase-js";
import * as XLSX from "npm:xlsx@0.18.5";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function computePrices(
  row: Record<string, unknown>,
  mapping: Record<string, string>,
  pricingMode: string,
  globalDiscount: number | null,
  marginPercent: number | null,
  basePriceField: string | null,
  priceIsPerPack: boolean,
  categoryDiscounts: Record<string, number> | null
): { unit_price: number | null; rrp_price: number | null; error: string | null; price_source: string } {
  const getNum = (field: string): number | null => {
    const col = mapping[field];
    if (!col) return null;
    const v = parseFloat(String(row[col]));
    return isNaN(v) ? null : v;
  };
  const getStr = (field: string): string => {
    const col = mapping[field];
    if (!col) return "";
    return String(row[col] || "").trim();
  };

  let netPrice = getNum("net_price");
  let rrpPrice = getNum("rrp_price");
  const discountPercent = getNum("discount_percent");
  const packSize = getNum("pack_size") || 1;
  let unitPrice: number | null = null;
  let computedRrp: number | null = null;
  let priceSource = "net";
  let error: string | null = null;

  switch (pricingMode) {
    case "NET_PRICE_ONLY":
      if (netPrice == null) { error = "Missing net_price"; break; }
      unitPrice = netPrice;
      priceSource = "net";
      break;

    case "RRP_ONLY":
      if (rrpPrice == null) { error = "Missing rrp_price"; break; }
      computedRrp = rrpPrice;
      if (globalDiscount != null) {
        unitPrice = rrpPrice * (1 - globalDiscount / 100);
        priceSource = "discount";
      } else {
        error = "RRP_ONLY requires global_discount_percent";
      }
      break;

    case "NET_AND_RRP":
      if (netPrice == null) { error = "Missing net_price"; break; }
      unitPrice = netPrice;
      computedRrp = rrpPrice;
      priceSource = "net";
      break;

    case "DISCOUNT_GLOBAL": {
      const baseField = basePriceField || "net_price";
      const basePrice = getNum(baseField);
      if (basePrice == null) { error = `Missing ${baseField}`; break; }
      if (globalDiscount == null) { error = "Missing global_discount_percent"; break; }
      unitPrice = basePrice * (1 - globalDiscount / 100);
      priceSource = "discount";
      break;
    }

    case "DISCOUNT_BY_CATEGORY": {
      const baseField2 = basePriceField || "net_price";
      const basePrice2 = getNum(baseField2);
      if (basePrice2 == null) { error = `Missing ${baseField2}`; break; }
      const category = getStr("category");
      const discount = categoryDiscounts?.[category] ?? globalDiscount;
      if (discount == null) { error = `No discount for category "${category}"`; break; }
      unitPrice = basePrice2 * (1 - discount / 100);
      priceSource = "discount";
      break;
    }

    case "MARGIN_RULE":
      if (marginPercent == null) { error = "Missing margin_percent"; break; }
      if (netPrice != null) {
        unitPrice = netPrice;
        computedRrp = netPrice * (1 + marginPercent / 100);
        priceSource = "net";
      } else if (rrpPrice != null) {
        unitPrice = rrpPrice / (1 + marginPercent / 100);
        computedRrp = rrpPrice;
        priceSource = "computed";
      } else {
        error = "Need net_price or rrp_price for MARGIN_RULE";
      }
      break;

    default:
      error = `Unknown pricing_mode: ${pricingMode}`;
  }

  // Pack size adjustment
  if (unitPrice != null && priceIsPerPack && packSize > 1) {
    unitPrice = unitPrice / packSize;
  }
  if (computedRrp != null && priceIsPerPack && packSize > 1) {
    computedRrp = computedRrp / packSize;
  }

  return {
    unit_price: unitPrice != null ? Math.round(unitPrice * 10000) / 10000 : null,
    rrp_price: computedRrp != null ? Math.round(computedRrp * 10000) / 10000 : null,
    error,
    price_source: priceSource,
  };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const body = await req.json();
    const {
      import_id,
      mapping_json,
      pricing_mode,
      global_discount_percent,
      margin_percent,
      base_price_field,
      price_is_per_pack,
      category_discounts_json,
    } = body;

    if (!import_id || !mapping_json || !pricing_mode) throw new Error("Missing required fields");

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

    // Download and parse file again
    const { data: fileData, error: dlErr } = await supabase.storage
      .from("supplier-price-files")
      .download(importRecord.file_url);
    if (dlErr || !fileData) throw new Error("File download failed");

    let rows: Record<string, unknown>[] = [];
    const fileType = importRecord.file_type?.toLowerCase();

    if (fileType === "csv") {
      const text = await fileData.text();
      const lines = text.split(/\r?\n/).filter((l: string) => l.trim());
      const delimiter = lines[0]?.includes(";") ? ";" : ",";
      const columns = lines[0].split(delimiter).map((c: string) => c.trim().replace(/^"|"$/g, ""));
      for (let i = 1; i < lines.length; i++) {
        const values = lines[i].split(delimiter).map((v: string) => v.trim().replace(/^"|"$/g, ""));
        const row: Record<string, unknown> = {};
        columns.forEach((col, idx) => { row[col] = values[idx] || ""; });
        rows.push(row);
      }
    } else {
      const buffer = await fileData.arrayBuffer();
      const workbook = XLSX.read(new Uint8Array(buffer), { type: "array" });
      const sheet = workbook.Sheets[workbook.SheetNames[0]];
      rows = XLSX.utils.sheet_to_json(sheet, { defval: "" });
    }

    // Load products for matching
    const { data: products } = await supabase
      .from("products")
      .select("id, name, sku, barcode")
      .eq("workspace_id", importRecord.workspace_id)
      .limit(5000);

    const { data: existingCatalog } = await supabase
      .from("supplier_products")
      .select("id, product_id, supplier_sku")
      .eq("workspace_id", importRecord.workspace_id)
      .eq("supplier_id", importRecord.supplier_id)
      .limit(5000);

    // Build lookup maps
    const barcodeMap = new Map<string, string>();
    const nameMap = new Map<string, string>();
    (products || []).forEach((p: { id: string; name: string; barcode?: string }) => {
      if (p.barcode) barcodeMap.set(p.barcode.trim().toLowerCase(), p.id);
      if (p.name) nameMap.set(p.name.trim().toLowerCase(), p.id);
    });

    const skuMap = new Map<string, string>();
    (existingCatalog || []).forEach((sp: { product_id: string; supplier_sku?: string }) => {
      if (sp.supplier_sku) skuMap.set(sp.supplier_sku.trim().toLowerCase(), sp.product_id);
    });

    // Delete existing rows for re-validation
    await supabase
      .from("supplier_price_import_rows")
      .delete()
      .eq("import_id", import_id);

    // Process rows
    const mapping = mapping_json as Record<string, string>;
    const categoryDiscounts = category_discounts_json as Record<string, number> | null;
    let matched = 0, unmatched = 0, errors = 0;
    const batchSize = 250;
    const importRows: any[] = [];

    for (let i = 0; i < rows.length; i++) {
      const raw = rows[i];
      const { unit_price, rrp_price, error, price_source } = computePrices(
        raw, mapping, pricing_mode,
        global_discount_percent, margin_percent,
        base_price_field, price_is_per_pack ?? false,
        categoryDiscounts
      );

      // Matching
      let productId: string | null = null;
      let matchStatus = "unmatched";

      // 1) barcode
      const barcodeCol = mapping["barcode"];
      if (barcodeCol && raw[barcodeCol]) {
        const bc = String(raw[barcodeCol]).trim().toLowerCase();
        if (barcodeMap.has(bc)) {
          productId = barcodeMap.get(bc)!;
          matchStatus = "matched";
        }
      }

      // 2) supplier_sku
      if (!productId) {
        const skuCol = mapping["supplier_sku"];
        if (skuCol && raw[skuCol]) {
          const sku = String(raw[skuCol]).trim().toLowerCase();
          if (skuMap.has(sku)) {
            productId = skuMap.get(sku)!;
            matchStatus = "matched";
          }
        }
      }

      // 3) product_name exact match
      if (!productId) {
        const nameCol = mapping["product_name"];
        if (nameCol && raw[nameCol]) {
          const name = String(raw[nameCol]).trim().toLowerCase();
          if (nameMap.has(name)) {
            productId = nameMap.get(name)!;
            matchStatus = "matched";
          }
        }
      }

      if (error) {
        matchStatus = "needs_review";
        errors++;
      } else if (matchStatus === "matched") {
        matched++;
      } else {
        unmatched++;
      }

      importRows.push({
        workspace_id: importRecord.workspace_id,
        import_id,
        row_index: i,
        raw_json: raw,
        normalized_json: {
          supplier_sku: mapping["supplier_sku"] ? String(raw[mapping["supplier_sku"]] || "") : null,
          barcode: mapping["barcode"] ? String(raw[mapping["barcode"]] || "") : null,
          product_name: mapping["product_name"] ? String(raw[mapping["product_name"]] || "") : null,
          net_price: unit_price,
          rrp_price,
          pack_size: mapping["pack_size"] ? parseFloat(String(raw[mapping["pack_size"]] || "1")) || 1 : 1,
          min_order_qty: mapping["min_order_qty"] ? parseInt(String(raw[mapping["min_order_qty"]] || "1")) || 1 : 1,
          lead_time_days: mapping["lead_time_days"] ? parseInt(String(raw[mapping["lead_time_days"]] || "")) || null : null,
          category: mapping["category"] ? String(raw[mapping["category"]] || "") : null,
          price_source,
        },
        match_status: matchStatus,
        product_id: productId,
        variant_id: null,
        computed_unit_price: unit_price,
        computed_rrp_price: rrp_price,
        error_text: error,
      });

      // Batch insert
      if (importRows.length >= batchSize) {
        await supabase.from("supplier_price_import_rows").insert(importRows.splice(0, batchSize));
      }
    }

    // Insert remaining
    if (importRows.length > 0) {
      await supabase.from("supplier_price_import_rows").insert(importRows);
    }

    const stats = { total: rows.length, matched, unmatched, errors };

    // Update import
    await supabase
      .from("supplier_price_imports")
      .update({
        status: "validated",
        mapping_json,
        pricing_mode,
        global_discount_percent,
        margin_percent,
        base_price_field,
        price_is_per_pack: price_is_per_pack ?? false,
        category_discounts_json,
        stats_json: stats,
      })
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
