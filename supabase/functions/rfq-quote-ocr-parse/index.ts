import { createClient } from "@supabase/supabase-js";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function normalize(s: string): string {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9 ]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function trigramSimilarity(a: string, b: string): number {
  const triA = new Set<string>();
  const triB = new Set<string>();
  for (let i = 0; i <= a.length - 3; i++) triA.add(a.slice(i, i + 3));
  for (let i = 0; i <= b.length - 3; i++) triB.add(b.slice(i, i + 3));
  if (triA.size === 0 && triB.size === 0) return 0;
  let intersection = 0;
  triA.forEach((t) => { if (triB.has(t)) intersection++; });
  return intersection / Math.max(triA.size, triB.size);
}

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
    const { data: imp, error: impErr } = await supabase
      .from("rfq_quote_imports")
      .select("*")
      .eq("id", import_id)
      .single();
    if (impErr || !imp) throw new Error("Import not found");

    // Update status
    await supabase.from("rfq_quote_imports").update({ status: "processing" }).eq("id", import_id);

    // Download file
    const { data: fileData, error: dlErr } = await supabase.storage
      .from("rfq-quote-files")
      .download(imp.file_url);
    if (dlErr || !fileData) throw new Error("File download failed: " + dlErr?.message);

    // Convert to base64
    const arrayBuffer = await fileData.arrayBuffer();
    const base64 = btoa(String.fromCharCode(...new Uint8Array(arrayBuffer)));

    const mimeType = imp.file_type === "pdf" ? "application/pdf" :
      imp.file_type === "png" ? "image/png" : "image/jpeg";

    // Get RFQ items for matching context
    const { data: rfqItems } = await supabase
      .from("rfq_items")
      .select("id, qty, unit, spec_notes, line_number, product_id, products(name, sku, barcode)")
      .eq("rfq_id", imp.rfq_id)
      .eq("workspace_id", imp.workspace_id);

    const itemsList = (rfqItems || []).map((item: any) => ({
      id: item.id,
      name: item.products?.name || "",
      sku: item.products?.sku || "",
      barcode: item.products?.barcode || "",
      qty: item.qty,
      unit: item.unit,
      spec_notes: item.spec_notes || "",
    }));

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");

    // OCR + Parse via Gemini with tool calling
    const ocrResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          {
            role: "system",
            content: `You are a document OCR and parsing expert specialized in commercial documents (quotes, invoices, proposals) from Portugal and Europe.
Extract ALL line items from the document. For each line item extract:
- description: product/service description
- quantity: numeric quantity (use decimal comma as period)
- unit_price: price per unit in EUR (convert comma decimals to periods)
- line_total: total for the line
- vat_percent: VAT percentage if mentioned
- discount_percent: discount if mentioned
- raw_text: the original text of the line

Important rules:
- Portuguese/European number format: comma is decimal separator, period/space is thousands
- Convert all numbers to standard format (period as decimal)
- If only line_total and quantity exist, compute unit_price = line_total / quantity
- If only unit_price and quantity exist, compute line_total = unit_price * quantity
- Extract document-level totals (subtotal, VAT total, grand total) if visible
- Set parse_confidence 0-1 based on how clearly you could read each field`
          },
          {
            role: "user",
            content: [
              {
                type: "image_url",
                image_url: { url: `data:${mimeType};base64,${base64}` }
              },
              {
                type: "text",
                text: "Extract all line items from this supplier quote/invoice document. Return structured data using the extract_quote_lines tool."
              }
            ]
          }
        ],
        tools: [
          {
            type: "function",
            function: {
              name: "extract_quote_lines",
              description: "Extract structured line items from a supplier quote document",
              parameters: {
                type: "object",
                properties: {
                  lines: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        description: { type: "string" },
                        quantity: { type: "number" },
                        unit_price: { type: "number" },
                        line_total: { type: "number" },
                        vat_percent: { type: "number" },
                        discount_percent: { type: "number" },
                        raw_text: { type: "string" },
                        parse_confidence: { type: "number" }
                      },
                      required: ["description", "raw_text"]
                    }
                  },
                  document_totals: {
                    type: "object",
                    properties: {
                      subtotal: { type: "number" },
                      vat_total: { type: "number" },
                      grand_total: { type: "number" },
                      currency: { type: "string" }
                    }
                  }
                },
                required: ["lines"]
              }
            }
          }
        ],
        tool_choice: { type: "function", function: { name: "extract_quote_lines" } }
      }),
    });

    if (!ocrResponse.ok) {
      const errText = await ocrResponse.text();
      console.error("AI gateway error:", ocrResponse.status, errText);
      if (ocrResponse.status === 429) throw new Error("Rate limit exceeded, try again later");
      if (ocrResponse.status === 402) throw new Error("AI credits exhausted");
      throw new Error("OCR processing failed");
    }

    const ocrResult = await ocrResponse.json();
    const toolCall = ocrResult.choices?.[0]?.message?.tool_calls?.[0];
    if (!toolCall) throw new Error("No structured data returned from OCR");

    const parsed = JSON.parse(toolCall.function.arguments);
    const extractedLines = parsed.lines || [];
    const docTotals = parsed.document_totals || {};

    // Matching phase
    const linesToInsert: any[] = [];

    for (let i = 0; i < extractedLines.length; i++) {
      const line = extractedLines[i];

      // Compute unit price
      let computedUnitPrice = line.unit_price || null;
      if (!computedUnitPrice && line.line_total && line.quantity) {
        computedUnitPrice = line.line_total / line.quantity;
      }

      // Try matching
      let bestMatch: any = null;
      let bestScore = 0;
      let bestMethod = "none";

      const lineDesc = normalize(line.description || "");

      for (const item of itemsList) {
        // Layer 1: SKU exact match
        if (item.sku && lineDesc.includes(normalize(item.sku)) && item.sku.length >= 3) {
          if (1.0 > bestScore) {
            bestScore = 1.0;
            bestMatch = item;
            bestMethod = "sku";
          }
          continue;
        }

        // Layer 1: Barcode exact match
        if (item.barcode && line.raw_text?.includes(item.barcode)) {
          if (1.0 > bestScore) {
            bestScore = 1.0;
            bestMatch = item;
            bestMethod = "ean";
          }
          continue;
        }

        // Layer 2: Fuzzy text matching
        const itemName = normalize(item.name);
        const sim = trigramSimilarity(lineDesc, itemName);
        if (sim > bestScore) {
          bestScore = sim;
          bestMatch = item;
          bestMethod = "fuzzy";
        }
      }

      // Determine match status
      let matchStatus = "unmatched";
      if (bestScore >= 0.86) matchStatus = "matched";
      else if (bestScore >= 0.5) matchStatus = "needs_review";

      linesToInsert.push({
        workspace_id: imp.workspace_id,
        import_id: import_id,
        line_no: i + 1,
        raw_text: line.raw_text || "",
        description: line.description || "",
        quantity: line.quantity || null,
        unit_price: line.unit_price || null,
        line_total: line.line_total || null,
        vat_percent: line.vat_percent || null,
        discount_percent: line.discount_percent || null,
        currency: docTotals.currency || "EUR",
        computed_unit_price: computedUnitPrice,
        parse_confidence: line.parse_confidence || 0.5,
        match_rfq_item_id: bestMatch?.id || null,
        match_score: bestScore,
        match_method: bestMethod,
        match_status: matchStatus,
        normalized_json: { tokens: lineDesc.split(" ") },
      });
    }

    // If fuzzy didn't match well, try semantic matching via AI for unmatched lines
    const unmatchedLines = linesToInsert.filter(l => l.match_status === "unmatched" || l.match_status === "needs_review");
    if (unmatchedLines.length > 0 && itemsList.length > 0) {
      try {
        const semanticResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${LOVABLE_API_KEY}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            model: "google/gemini-2.5-flash",
            messages: [
              {
                role: "system",
                content: "You are a product matching expert. Match supplier quote line descriptions to RFQ items based on semantic similarity."
              },
              {
                role: "user",
                content: `Match these supplier quote lines to the RFQ items. Return matches using the tool.

Quote lines to match:
${unmatchedLines.map((l, i) => `${i}: "${l.description}"`).join("\n")}

RFQ Items:
${itemsList.map((item: any) => `ID:${item.id} - "${item.name}" (SKU: ${item.sku || "N/A"})`).join("\n")}`
              }
            ],
            tools: [{
              type: "function",
              function: {
                name: "match_lines",
                description: "Match quote lines to RFQ items",
                parameters: {
                  type: "object",
                  properties: {
                    matches: {
                      type: "array",
                      items: {
                        type: "object",
                        properties: {
                          line_index: { type: "number" },
                          rfq_item_id: { type: "string" },
                          confidence: { type: "number", description: "0 to 1" },
                          reason: { type: "string" }
                        },
                        required: ["line_index", "rfq_item_id", "confidence"]
                      }
                    }
                  },
                  required: ["matches"]
                }
              }
            }],
            tool_choice: { type: "function", function: { name: "match_lines" } }
          }),
        });

        if (semanticResponse.ok) {
          const semanticResult = await semanticResponse.json();
          const semanticCall = semanticResult.choices?.[0]?.message?.tool_calls?.[0];
          if (semanticCall) {
            const semanticParsed = JSON.parse(semanticCall.function.arguments);
            const validItemIds = new Set(itemsList.map((it: any) => it.id));

            for (const match of (semanticParsed.matches || [])) {
              if (match.line_index >= 0 && match.line_index < unmatchedLines.length && validItemIds.has(match.rfq_item_id)) {
                const targetLine = unmatchedLines[match.line_index];
                if (match.confidence > targetLine.match_score) {
                  targetLine.match_rfq_item_id = match.rfq_item_id;
                  targetLine.match_score = match.confidence;
                  targetLine.match_method = "semantic";
                  targetLine.match_status = match.confidence >= 0.86 ? "matched" : "needs_review";
                }
              }
            }
          }
        }
      } catch (e) {
        console.error("Semantic matching failed (non-fatal):", e);
      }
    }

    // Check for collisions (2 lines matched to same rfq_item)
    const matchedItemIds = new Map<string, number[]>();
    linesToInsert.forEach((l, idx) => {
      if (l.match_rfq_item_id && l.match_status === "matched") {
        if (!matchedItemIds.has(l.match_rfq_item_id)) matchedItemIds.set(l.match_rfq_item_id, []);
        matchedItemIds.get(l.match_rfq_item_id)!.push(idx);
      }
    });
    matchedItemIds.forEach((indices) => {
      if (indices.length > 1) {
        indices.forEach(idx => { linesToInsert[idx].match_status = "needs_review"; });
      }
    });

    // Insert lines
    const { error: insertErr } = await supabase
      .from("rfq_quote_import_lines")
      .insert(linesToInsert);
    if (insertErr) throw new Error("Failed to insert lines: " + insertErr.message);

    // Update import status and totals
    await supabase.from("rfq_quote_imports").update({
      status: "matched",
      totals_json: docTotals,
    }).eq("id", import_id);

    const matched = linesToInsert.filter(l => l.match_status === "matched").length;
    const needsReview = linesToInsert.filter(l => l.match_status === "needs_review").length;
    const unmatched = linesToInsert.filter(l => l.match_status === "unmatched").length;

    return new Response(JSON.stringify({
      lines_count: linesToInsert.length,
      matched,
      needs_review: needsReview,
      unmatched,
    }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });

  } catch (error) {
    console.error("rfq-quote-ocr-parse error:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
