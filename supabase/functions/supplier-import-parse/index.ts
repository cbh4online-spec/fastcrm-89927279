import { createClient } from "@supabase/supabase-js";
import * as XLSX from "npm:xlsx@0.18.5";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { import_id } = await req.json();
    if (!import_id) throw new Error("import_id is required");
    console.log(`[IMPORTS] Parsing file for import: ${import_id}`);

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

    // Download file from storage
    const { data: fileData, error: dlErr } = await supabase.storage
      .from("supplier-price-files")
      .download(importRecord.file_url);
    if (dlErr || !fileData) throw new Error("File download failed: " + dlErr?.message);

    let rows: Record<string, unknown>[] = [];
    let columns: string[] = [];

    const fileType = importRecord.file_type?.toLowerCase();

    if (fileType === "csv") {
      const text = await fileData.text();
      const lines = text.split(/\r?\n/).filter((l: string) => l.trim());
      if (lines.length === 0) throw new Error("Empty CSV file");

      // Detect delimiter
      const firstLine = lines[0];
      const delimiter = firstLine.includes(";") ? ";" : ",";

      columns = firstLine.split(delimiter).map((c: string) => c.trim().replace(/^"|"$/g, ""));

      for (let i = 1; i < lines.length; i++) {
        const values = lines[i].split(delimiter).map((v: string) => v.trim().replace(/^"|"$/g, ""));
        const row: Record<string, unknown> = {};
        columns.forEach((col, idx) => {
          row[col] = values[idx] || "";
        });
        rows.push(row);
      }
    } else {
      // XLSX
      const buffer = await fileData.arrayBuffer();
      const workbook = XLSX.read(new Uint8Array(buffer), { type: "array" });
      const sheetName = workbook.SheetNames[0];
      const sheet = workbook.Sheets[sheetName];
      rows = XLSX.utils.sheet_to_json(sheet, { defval: "" });
      if (rows.length > 0) {
        columns = Object.keys(rows[0]);
      }
    }

    const sampleRows = rows.slice(0, 20);
    const totalRows = rows.length;
    console.log(`[IMPORTS] Parse complete: ${totalRows} rows, ${columns.length} columns`);

    // Update import status
    await supabase
      .from("supplier_price_imports")
      .update({
        status: "parsed",
        stats_json: { total_rows: totalRows, columns_detected: columns.length },
      })
      .eq("id", import_id);

    return new Response(
      JSON.stringify({ columns, sample_rows: sampleRows, total_rows: totalRows }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error(`[IMPORTS] PARSE_FAILED: ${error.message}`);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
