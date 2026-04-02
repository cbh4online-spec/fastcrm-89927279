import { createClient } from "@supabase/supabase-js";
import ExcelJS from "npm:exceljs@4.4.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

/** Normalise a text value for matching purposes */
function normalizeText(val: string): string {
  return val
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[\s]+/g, " ")
    .replace(/[_\-\/\\]+/g, " ");
}

/** Clean barcode: remove .0 from Excel scientific notation, trim spaces */
function normalizeBarcode(val: string): string {
  let s = String(val).trim();
  // Remove trailing .0 from Excel numeric interpretation
  if (/^\d+\.0+$/.test(s)) s = s.replace(/\.0+$/, "");
  // Remove any non-digit except leading zeros
  return s.replace(/\s/g, "");
}

/** Parse CSV robustly, handling quoted fields, delimiters inside quotes, multiline */
function parseCSV(text: string): { headers: string[]; rows: Record<string, string>[] } {
  // Detect delimiter from first line
  const firstNewline = text.indexOf("\n");
  const firstLine = text.substring(0, firstNewline > 0 ? firstNewline : text.length);
  const semicolons = (firstLine.match(/;/g) || []).length;
  const commas = (firstLine.match(/,/g) || []).length;
  const delimiter = semicolons > commas ? ";" : ",";

  const rows: string[][] = [];
  let currentRow: string[] = [];
  let currentField = "";
  let inQuotes = false;

  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    const next = text[i + 1];

    if (inQuotes) {
      if (ch === '"') {
        if (next === '"') {
          currentField += '"';
          i++; // skip escaped quote
        } else {
          inQuotes = false;
        }
      } else {
        currentField += ch;
      }
    } else {
      if (ch === '"') {
        inQuotes = true;
      } else if (ch === delimiter) {
        currentRow.push(currentField.trim());
        currentField = "";
      } else if (ch === "\n" || (ch === "\r" && next === "\n")) {
        currentRow.push(currentField.trim());
        if (currentRow.some(f => f !== "")) rows.push(currentRow);
        currentRow = [];
        currentField = "";
        if (ch === "\r") i++; // skip \n after \r
      } else {
        currentField += ch;
      }
    }
  }
  // Last field/row
  if (currentField || currentRow.length > 0) {
    currentRow.push(currentField.trim());
    if (currentRow.some(f => f !== "")) rows.push(currentRow);
  }

  if (rows.length === 0) return { headers: [], rows: [] };

  const headers = rows[0].map(h => h.replace(/^"|"$/g, ""));
  const dataRows: Record<string, string>[] = [];

  for (let r = 1; r < rows.length; r++) {
    const obj: Record<string, string> = {};
    let hasData = false;
    headers.forEach((h, idx) => {
      const val = (rows[r][idx] || "").replace(/^"|"$/g, "");
      obj[h] = val;
      if (val) hasData = true;
    });
    if (hasData) dataRows.push(obj);
  }

  return { headers, rows: dataRows };
}

/** Parse XLSX using ExcelJS */
async function parseXLSX(buffer: ArrayBuffer): Promise<{ headers: string[]; rows: Record<string, string>[] }> {
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load(buffer);
  const worksheet = workbook.worksheets[0];

  if (!worksheet || worksheet.rowCount === 0) return { headers: [], rows: [] };

  // Scan for header row (first row with 2+ non-empty cells)
  let headerRowIndex = 1;
  const maxScan = Math.min(10, worksheet.rowCount);
  for (let r = 1; r <= maxScan; r++) {
    const row = worksheet.getRow(r);
    let count = 0;
    row.eachCell(() => { count++; });
    if (count >= 2) { headerRowIndex = r; break; }
  }

  const headerRow = worksheet.getRow(headerRowIndex);
  const headers: string[] = [];
  const colMap: Record<number, string> = {};

  headerRow.eachCell((cell, colNumber) => {
    const val = String(cell.value || "").trim();
    if (val && !val.startsWith("__EMPTY")) {
      headers.push(val);
      colMap[colNumber] = val;
    }
  });

  if (headers.length === 0) return { headers: [], rows: [] };

  const rows: Record<string, string>[] = [];
  for (let r = headerRowIndex + 1; r <= worksheet.rowCount; r++) {
    const row = worksheet.getRow(r);
    const obj: Record<string, string> = {};
    let hasData = false;
    for (const [colNum, header] of Object.entries(colMap)) {
      const cell = row.getCell(parseInt(colNum));
      const val = cell.value;
      if (val !== null && val !== undefined && String(val).trim() !== "") {
        obj[header] = String(val).trim();
        hasData = true;
      } else {
        obj[header] = "";
      }
    }
    if (hasData) rows.push(obj);
  }

  return { headers, rows };
}

/** Create a simple hash of a row for dedup */
function hashRow(obj: Record<string, string>): string {
  const sorted = Object.keys(obj).sort().map(k => `${k}=${obj[k]}`).join("|");
  // Simple djb2 hash
  let hash = 5381;
  for (let i = 0; i < sorted.length; i++) {
    hash = ((hash << 5) + hash) + sorted.charCodeAt(i);
  }
  return (hash >>> 0).toString(36);
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { import_id, mapping_json, profile_id } = await req.json();
    if (!import_id) throw new Error("import_id is required");
    console.log(`[IMPORT-V2] Parse starting for: ${import_id}`);

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

    // Update status
    await supabase.from("supplier_price_imports").update({
      status: "parsing",
      current_step: "parsing",
      started_at: new Date().toISOString(),
    }).eq("id", import_id);

    // Download file
    const { data: fileData, error: dlErr } = await supabase.storage
      .from("supplier-price-files")
      .download(importRecord.file_url);
    if (dlErr || !fileData) throw new Error("File download failed: " + dlErr?.message);

    // Parse based on file type
    const fileType = importRecord.file_type?.toLowerCase();
    let parsed: { headers: string[]; rows: Record<string, string>[] };

    if (fileType === "csv") {
      const text = await fileData.text();
      parsed = parseCSV(text);
    } else {
      const buffer = await fileData.arrayBuffer();
      parsed = await parseXLSX(buffer);
    }

    const { headers, rows } = parsed;
    console.log(`[IMPORT-V2] Parsed ${rows.length} rows, ${headers.length} columns`);

    if (rows.length === 0) {
      await supabase.from("supplier_price_imports").update({
        status: "failed",
        current_step: "failed",
        stats_json: { error: "No data rows found" },
      }).eq("id", import_id);
      throw new Error("No data rows found in file");
    }

    // If we have a mapping (from profile), apply normalisation and build staging rows
    const mapping = mapping_json || importRecord.mapping_json || {};
    const hasMapping = Object.keys(mapping).length > 0;

    // Delete existing staging rows for re-parse
    await supabase
      .from("supplier_price_import_rows")
      .delete()
      .eq("import_id", import_id);

    // Build staging rows in batches
    const batchSize = 250;
    let parseErrors = 0;
    const stagingBatch: any[] = [];

    for (let i = 0; i < rows.length; i++) {
      const raw = rows[i];
      const rowHash = hashRow(raw);

      // Build normalised JSON if mapping is available
      let normalized: Record<string, any> = {};
      let parseStatus = "ok";
      let parseErrorText: string | null = null;

      if (hasMapping) {
        try {
          const supplierSku = mapping.supplier_sku ? String(raw[mapping.supplier_sku] || "") : "";
          const barcode = mapping.barcode ? String(raw[mapping.barcode] || "") : "";
          const productName = mapping.product_name ? String(raw[mapping.product_name] || "") : "";

          normalized = {
            supplier_sku: supplierSku,
            supplier_sku_normalized: supplierSku ? normalizeText(supplierSku) : null,
            barcode: barcode,
            barcode_normalized: barcode ? normalizeBarcode(barcode) : null,
            product_name: productName,
            product_name_normalized: productName ? normalizeText(productName) : null,
            net_price: mapping.net_price ? String(raw[mapping.net_price] || "") : null,
            rrp_price: mapping.rrp_price ? String(raw[mapping.rrp_price] || "") : null,
            discount_percent: mapping.discount_percent ? String(raw[mapping.discount_percent] || "") : null,
            pack_size: mapping.pack_size ? String(raw[mapping.pack_size] || "1") : "1",
            min_order_qty: mapping.min_order_qty ? String(raw[mapping.min_order_qty] || "1") : "1",
            lead_time_days: mapping.lead_time_days ? String(raw[mapping.lead_time_days] || "") : null,
            category: mapping.category ? String(raw[mapping.category] || "") : null,
          };
        } catch (e) {
          parseStatus = "error";
          parseErrorText = e.message;
          parseErrors++;
        }
      }

      stagingBatch.push({
        workspace_id: importRecord.workspace_id,
        import_id,
        row_index: i,
        raw_json: raw,
        normalized_json: hasMapping ? normalized : null,
        match_status: "pending",
        parse_status: parseStatus,
        parse_error_text: parseErrorText,
        row_hash: rowHash,
      });

      if (stagingBatch.length >= batchSize) {
        const { error: insErr } = await supabase
          .from("supplier_price_import_rows")
          .insert(stagingBatch.splice(0, batchSize));
        if (insErr) console.error(`[IMPORT-V2] Batch insert error: ${insErr.message}`);
      }
    }

    // Flush remaining
    if (stagingBatch.length > 0) {
      const { error: insErr } = await supabase
        .from("supplier_price_import_rows")
        .insert(stagingBatch);
      if (insErr) console.error(`[IMPORT-V2] Final batch insert error: ${insErr.message}`);
    }

    // Compute file checksum (simple hash of first + last 1000 chars)
    const fileText = fileType === "csv" ? await fileData.text() : `xlsx_${rows.length}_${headers.length}`;
    let checksum = 5381;
    const sample = fileText.substring(0, 1000) + fileText.substring(Math.max(0, fileText.length - 1000));
    for (let i = 0; i < sample.length; i++) {
      checksum = ((checksum << 5) + checksum) + sample.charCodeAt(i);
    }

    // Update import record
    await supabase.from("supplier_price_imports").update({
      status: "parsed",
      current_step: "parsed",
      progress_percent: 30,
      total_rows: rows.length,
      parsed_rows: rows.length - parseErrors,
      error_rows: parseErrors,
      file_checksum: (checksum >>> 0).toString(36),
      file_size_bytes: fileData.size,
      mapping_json: hasMapping ? mapping : importRecord.mapping_json,
      stats_json: {
        total_rows: rows.length,
        columns_detected: headers.length,
        parse_errors: parseErrors,
      },
    }).eq("id", import_id);

    const sampleRows = rows.slice(0, 20);

    return new Response(
      JSON.stringify({
        columns: headers,
        sample_rows: sampleRows,
        total_rows: rows.length,
        parse_errors: parseErrors,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error(`[IMPORT-V2] PARSE_FAILED: ${error.message}`);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
