import { createClient } from "@supabase/supabase-js";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function normalizeText(val: string): string {
  return val.trim().toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[\s]+/g, " ").replace(/[_\-\/\\]+/g, " ");
}

function normalizeBarcode(val: string): string {
  let s = String(val).trim();
  if (/^\d+\.0+$/.test(s)) s = s.replace(/\.0+$/, "");
  return s.replace(/\s/g, "");
}

/** Simple Levenshtein distance for fuzzy matching */
function levenshtein(a: string, b: string): number {
  if (a.length === 0) return b.length;
  if (b.length === 0) return a.length;
  const matrix: number[][] = [];
  for (let i = 0; i <= b.length; i++) matrix[i] = [i];
  for (let j = 0; j <= a.length; j++) matrix[0][j] = j;
  for (let i = 1; i <= b.length; i++) {
    for (let j = 1; j <= a.length; j++) {
      const cost = b[i - 1] === a[j - 1] ? 0 : 1;
      matrix[i][j] = Math.min(
        matrix[i - 1][j] + 1,
        matrix[i][j - 1] + 1,
        matrix[i - 1][j - 1] + cost
      );
    }
  }
  return matrix[b.length][a.length];
}

function computePrices(
  row: Record<string, unknown>,
  mapping: Record<string, string>,
  pricingMode: string,
  globalDiscount: number | null,
  marginPercent: number | null,
  basePriceField: string | null,
  priceIsPerPack: boolean,
  categoryDiscounts: Record<string, number> | null
): { unit_price: number | null; rrp_price: number | null; discount_percent: number | null; error: string | null; price_source: string } {
  const getNum = (field: string): number | null => {
    const col = mapping[field];
    if (!col) return null;
    const v = parseFloat(String(row[col]).replace(",", "."));
    return isNaN(v) ? null : v;
  };
  const getStr = (field: string): string => {
    const col = mapping[field];
    if (!col) return "";
    return String(row[col] || "").trim();
  };

  let netPrice = getNum("net_price");
  let rrpPrice = getNum("rrp_price");
  const packSize = getNum("pack_size") || 1;
  let unitPrice: number | null = null;
  let computedRrp: number | null = null;
  let discountApplied: number | null = null;
  let priceSource = "net";
  let error: string | null = null;

  switch (pricingMode) {
    case "NET_PRICE_ONLY":
      if (netPrice == null) { error = "Missing net_price"; break; }
      unitPrice = netPrice;
      break;
    case "RRP_ONLY":
      if (rrpPrice == null) { error = "Missing rrp_price"; break; }
      computedRrp = rrpPrice;
      if (globalDiscount != null) {
        unitPrice = rrpPrice * (1 - globalDiscount / 100);
        discountApplied = globalDiscount;
        priceSource = "discount";
      } else { error = "RRP_ONLY requires global_discount_percent"; }
      break;
    case "NET_AND_RRP":
      if (netPrice == null) { error = "Missing net_price"; break; }
      unitPrice = netPrice;
      computedRrp = rrpPrice;
      break;
    case "DISCOUNT_GLOBAL": {
      const bf = basePriceField || "net_price";
      const bp = getNum(bf);
      if (bp == null) { error = `Missing ${bf}`; break; }
      if (globalDiscount == null) { error = "Missing global_discount_percent"; break; }
      unitPrice = bp * (1 - globalDiscount / 100);
      discountApplied = globalDiscount;
      priceSource = "discount";
      break;
    }
    case "DISCOUNT_BY_CATEGORY": {
      const bf2 = basePriceField || "net_price";
      const bp2 = getNum(bf2);
      if (bp2 == null) { error = `Missing ${bf2}`; break; }
      const cat = getStr("category");
      const disc = categoryDiscounts?.[cat] ?? globalDiscount;
      if (disc == null) { error = `No discount for category "${cat}"`; break; }
      unitPrice = bp2 * (1 - disc / 100);
      discountApplied = disc;
      priceSource = "discount";
      break;
    }
    case "MARGIN_RULE":
      if (marginPercent == null) { error = "Missing margin_percent"; break; }
      if (netPrice != null) {
        unitPrice = netPrice;
        computedRrp = netPrice * (1 + marginPercent / 100);
      } else if (rrpPrice != null) {
        unitPrice = rrpPrice / (1 + marginPercent / 100);
        computedRrp = rrpPrice;
        priceSource = "computed";
      } else { error = "Need net_price or rrp_price"; }
      break;
    default:
      error = `Unknown pricing_mode: ${pricingMode}`;
  }

  if (unitPrice != null && priceIsPerPack && packSize > 1) unitPrice /= packSize;
  if (computedRrp != null && priceIsPerPack && packSize > 1) computedRrp /= packSize;

  return {
    unit_price: unitPrice != null ? Math.round(unitPrice * 10000) / 10000 : null,
    rrp_price: computedRrp != null ? Math.round(computedRrp * 10000) / 10000 : null,
    discount_percent: discountApplied,
    error,
    price_source: priceSource,
  };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const body = await req.json();
    const {
      import_id, mapping_json, pricing_mode,
      global_discount_percent, margin_percent,
      base_price_field, price_is_per_pack,
      category_discounts_json,
    } = body;

    if (!import_id || !mapping_json || !pricing_mode) throw new Error("Missing required fields");
    console.log(`[VALIDATE-V2] Starting for: ${import_id}`);

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
      status: "validating",
      current_step: "matching",
      progress_percent: 40,
    }).eq("id", import_id);

    // Load products for matching
    const allProducts: any[] = [];
    let offset = 0;
    while (true) {
      const { data } = await supabase
        .from("products")
        .select("id, name, sku, barcode")
        .eq("workspace_id", importRecord.workspace_id)
        .range(offset, offset + 999);
      if (!data || data.length === 0) break;
      allProducts.push(...data);
      if (data.length < 1000) break;
      offset += 1000;
    }

    // Load existing supplier catalog
    const allCatalog: any[] = [];
    offset = 0;
    while (true) {
      const { data } = await supabase
        .from("supplier_products")
        .select("id, product_id, supplier_sku, supplier_sku_normalized, barcode, barcode_normalized, match_locked")
        .eq("workspace_id", importRecord.workspace_id)
        .eq("supplier_id", importRecord.supplier_id)
        .range(offset, offset + 999);
      if (!data || data.length === 0) break;
      allCatalog.push(...data);
      if (data.length < 1000) break;
      offset += 1000;
    }

    // Load aliases
    const { data: aliases } = await supabase
      .from("supplier_product_aliases")
      .select("*")
      .eq("workspace_id", importRecord.workspace_id)
      .eq("supplier_id", importRecord.supplier_id)
      .eq("is_active", true)
      .limit(5000);

    // Build lookup maps
    // 1. Existing supplier links by SKU
    const catalogSkuMap = new Map<string, { product_id: string; sp_id: string; locked: boolean }>();
    for (const sp of allCatalog) {
      const normSku = sp.supplier_sku_normalized || (sp.supplier_sku ? normalizeText(sp.supplier_sku) : null);
      if (normSku) catalogSkuMap.set(normSku, { product_id: sp.product_id, sp_id: sp.id, locked: sp.match_locked || false });
      const normBc = sp.barcode_normalized || (sp.barcode ? normalizeBarcode(sp.barcode) : null);
      if (normBc) catalogSkuMap.set(`bc:${normBc}`, { product_id: sp.product_id, sp_id: sp.id, locked: sp.match_locked || false });
    }

    // 2. Products by barcode
    const productBarcodeMap = new Map<string, string>();
    const productNameMap = new Map<string, string>();
    const productSkuMap = new Map<string, string>();
    for (const p of allProducts) {
      if (p.barcode) productBarcodeMap.set(normalizeBarcode(p.barcode), p.id);
      if (p.name) productNameMap.set(normalizeText(p.name), p.id);
      if (p.sku) productSkuMap.set(normalizeText(p.sku), p.id);
    }

    // 3. Aliases
    const aliasMap = new Map<string, string>();
    for (const a of (aliases || [])) {
      const key = `${a.alias_type}:${a.alias_value_normalized}`;
      if (a.product_id) aliasMap.set(key, a.product_id);
    }

    // Load staging rows (paginated)
    const mapping = mapping_json as Record<string, string>;
    const categoryDiscounts = category_discounts_json as Record<string, number> | null;
    let matched = 0, unmatched = 0, errors = 0, duplicates = 0;
    const seenSkus = new Map<string, string>(); // sku -> first row id for dedup

    let page = 0;
    const pageSize = 500;

    while (true) {
      const { data: stagingRows } = await supabase
        .from("supplier_price_import_rows")
        .select("*")
        .eq("import_id", import_id)
        .order("row_index")
        .range(page * pageSize, (page + 1) * pageSize - 1);

      if (!stagingRows || stagingRows.length === 0) break;

      const updates: any[] = [];

      for (const sRow of stagingRows) {
        const raw = sRow.raw_json || {};

        // Build normalized values from raw + mapping
        const supplierSku = mapping.supplier_sku ? String(raw[mapping.supplier_sku] || "") : "";
        const barcode = mapping.barcode ? String(raw[mapping.barcode] || "") : "";
        const productName = mapping.product_name ? String(raw[mapping.product_name] || "") : "";
        const normSku = supplierSku ? normalizeText(supplierSku) : "";
        const normBarcode = barcode ? normalizeBarcode(barcode) : "";
        const normName = productName ? normalizeText(productName) : "";

        // Compute prices
        const pricing = computePrices(
          raw, mapping, pricing_mode,
          global_discount_percent, margin_percent,
          base_price_field, price_is_per_pack ?? false,
          categoryDiscounts
        );

        let productId: string | null = null;
        let matchMethod: string | null = null;
        let matchConfidence: number | null = null;
        let matchedSpId: string | null = null;
        let matchStatus = "unmatched";
        let duplicateKey: string | null = null;
        let validationError: string | null = pricing.error;

        // Duplicate detection
        if (normSku) {
          const existingRowId = seenSkus.get(normSku);
          if (existingRowId && existingRowId !== sRow.id) {
            duplicateKey = normSku;
            duplicates++;
          } else {
            seenSkus.set(normSku, sRow.id);
          }
        }

        // === MATCHING ENGINE ===

        // 1. Existing supplier link by SKU (locked reuse)
        if (!productId && normSku && catalogSkuMap.has(normSku)) {
          const link = catalogSkuMap.get(normSku)!;
          productId = link.product_id;
          matchedSpId = link.sp_id;
          matchMethod = link.locked ? "locked_link_reuse" : "exact_supplier_sku";
          matchConfidence = link.locked ? 0.95 : 1.0;
          matchStatus = "matched";
        }

        // 2. Barcode match via catalog
        if (!productId && normBarcode && catalogSkuMap.has(`bc:${normBarcode}`)) {
          const link = catalogSkuMap.get(`bc:${normBarcode}`)!;
          productId = link.product_id;
          matchedSpId = link.sp_id;
          matchMethod = "exact_barcode";
          matchConfidence = 1.0;
          matchStatus = "matched";
        }

        // 3. Barcode match via products
        if (!productId && normBarcode && productBarcodeMap.has(normBarcode)) {
          productId = productBarcodeMap.get(normBarcode)!;
          matchMethod = "exact_barcode";
          matchConfidence = 1.0;
          matchStatus = "matched";
        }

        // 4. Alias match
        if (!productId && normSku) {
          const aliasProduct = aliasMap.get(`sku:${normSku}`) || aliasMap.get(`name:${normSku}`);
          if (aliasProduct) {
            productId = aliasProduct;
            matchMethod = "exact_alias";
            matchConfidence = 0.85;
            matchStatus = "matched";
          }
        }
        if (!productId && normBarcode) {
          const aliasProduct = aliasMap.get(`barcode:${normBarcode}`);
          if (aliasProduct) {
            productId = aliasProduct;
            matchMethod = "exact_alias";
            matchConfidence = 0.85;
            matchStatus = "matched";
          }
        }

        // 5. Internal SKU match
        if (!productId && normSku && productSkuMap.has(normSku)) {
          productId = productSkuMap.get(normSku)!;
          matchMethod = "exact_internal_sku";
          matchConfidence = 0.90;
          matchStatus = "matched";
        }

        // 6. Exact name match
        if (!productId && normName && productNameMap.has(normName)) {
          productId = productNameMap.get(normName)!;
          matchMethod = "exact_name";
          matchConfidence = 0.80;
          matchStatus = "matched";
        }

        // 7. Fuzzy name match (only if name is long enough)
        if (!productId && normName && normName.length >= 4) {
          let bestScore = Infinity;
          let bestId: string | null = null;
          for (const [pName, pId] of productNameMap) {
            if (Math.abs(pName.length - normName.length) > 5) continue;
            const dist = levenshtein(normName, pName);
            const maxLen = Math.max(normName.length, pName.length);
            const similarity = 1 - dist / maxLen;
            if (similarity >= 0.75 && dist < bestScore) {
              bestScore = dist;
              bestId = pId;
            }
          }
          if (bestId) {
            const maxLen = Math.max(normName.length, 1);
            const similarity = 1 - bestScore / maxLen;
            productId = bestId;
            matchMethod = "fuzzy_name";
            matchConfidence = Math.round(similarity * 100) / 100;
            matchStatus = matchConfidence >= 0.70 ? "matched" : "needs_review";
          }
        }

        // Price warning detection
        let pricingStatus = pricing.error ? "error" : "ok";
        if (!pricing.error && productId && pricing.unit_price != null) {
          // Check for suspicious price changes
          const existingLink = allCatalog.find(c => c.product_id === productId);
          if (existingLink && existingLink.unit_price != null) {
            const oldPrice = Number(existingLink.unit_price);
            const newPrice = pricing.unit_price;
            if (oldPrice > 0) {
              const change = Math.abs((newPrice - oldPrice) / oldPrice);
              if (change > 0.5) pricingStatus = "warning"; // >50% change
            }
          }
        }

        if (pricing.error) {
          matchStatus = "needs_review";
          errors++;
        } else if (matchStatus === "matched") {
          matched++;
        } else {
          unmatched++;
        }

        const normalized = {
          supplier_sku: supplierSku,
          supplier_sku_normalized: normSku || null,
          barcode: barcode,
          barcode_normalized: normBarcode || null,
          product_name: productName,
          product_name_normalized: normName || null,
          net_price: pricing.unit_price,
          rrp_price: pricing.rrp_price,
          pack_size: mapping.pack_size ? parseFloat(String(raw[mapping.pack_size] || "1")) || 1 : 1,
          min_order_qty: mapping.min_order_qty ? parseInt(String(raw[mapping.min_order_qty] || "1")) || 1 : 1,
          lead_time_days: mapping.lead_time_days ? parseInt(String(raw[mapping.lead_time_days] || "")) || null : null,
          category: mapping.category ? String(raw[mapping.category] || "") : null,
          price_source: pricing.price_source,
        };

        updates.push({
          id: sRow.id,
          normalized_json: normalized,
          match_status: matchStatus,
          product_id: productId,
          match_method: matchMethod,
          match_confidence: matchConfidence,
          matched_supplier_product_id: matchedSpId,
          computed_unit_price: pricing.unit_price,
          computed_rrp_price: pricing.rrp_price,
          computed_discount_percent: pricing.discount_percent,
          validation_status: pricing.error ? "error" : "ok",
          validation_error_text: validationError,
          pricing_status: pricingStatus,
          duplicate_key: duplicateKey,
          error_text: pricing.error,
        });
      }

      // Batch update staging rows
      for (const upd of updates) {
        const { id, ...fields } = upd;
        await supabase.from("supplier_price_import_rows").update(fields).eq("id", id);
      }

      if (stagingRows.length < pageSize) break;
      page++;
    }

    const stats = { total: (importRecord.total_rows || 0), matched, unmatched, errors, duplicates };

    await supabase.from("supplier_price_imports").update({
      status: "validated",
      current_step: "ready_for_review",
      progress_percent: 70,
      matched_rows: matched,
      unmatched_rows: unmatched,
      error_rows: errors,
      duplicate_rows: duplicates,
      mapping_json,
      pricing_mode,
      global_discount_percent,
      margin_percent,
      base_price_field,
      price_is_per_pack: price_is_per_pack ?? false,
      category_discounts_json,
      stats_json: stats,
    }).eq("id", import_id);

    console.log(`[VALIDATE-V2] Done: ${JSON.stringify(stats)}`);

    return new Response(
      JSON.stringify({ stats }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error(`[VALIDATE-V2] FAILED: ${error.message}`);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
