import type ExcelJS_NS from "exceljs";

/**
 * Parse an Excel file (xlsx/xls) and return rows as key-value objects.
 * Optionally scans for the header row using expected field patterns.
 */
export async function parseExcelFile(
  buffer: ArrayBuffer,
  options?: {
    expectedFields?: string[];
    normalizeHeader?: (h: string) => string;
  }
): Promise<{ headers: string[]; rows: Record<string, string>[] }> {
  const ExcelJS = (await import("exceljs")).default;
  const workbook = new (ExcelJS as any).Workbook() as ExcelJS_NS.Workbook;
  await workbook.xlsx.load(buffer);
  const worksheet = workbook.worksheets[0];
  if (!worksheet || worksheet.rowCount === 0) {
    return { headers: [], rows: [] };
  }

  // Find header row
  let headerRowIndex = 1;
  if (options?.expectedFields && options.normalizeHeader) {
    const maxScan = Math.min(10, worksheet.rowCount);
    for (let r = 1; r <= maxScan; r++) {
      const row = worksheet.getRow(r);
      let matchCount = 0;
      row.eachCell((cell) => {
        const val = String(cell.value || "").trim();
        if (val) {
          const normalized = options.normalizeHeader!(val);
          if (options.expectedFields!.some((f) => normalized.includes(f))) {
            matchCount++;
          }
        }
      });
      if (matchCount >= 2) {
        headerRowIndex = r;
        break;
      }
    }
  }

  // Extract headers
  const headerRow = worksheet.getRow(headerRowIndex);
  const headers: string[] = [];
  const colMap: Record<number, string> = {};
  
  headerRow.eachCell((cell, colNumber) => {
    const val = String(cell.value || "").trim();
    if (val && !val.startsWith("__EMPTY") && !val.startsWith("_")) {
      headers.push(val);
      colMap[colNumber] = val;
    }
  });

  if (headers.length === 0) {
    return { headers: [], rows: [] };
  }

  // Extract data rows
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

    if (hasData) {
      rows.push(obj);
    }
  }

  return { headers, rows };
}

/**
 * Export data to an Excel file and trigger download in the browser.
 */
export async function exportToExcel(
  data: Record<string, unknown>[],
  sheetName: string,
  fileName: string
): Promise<void> {
  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet(sheetName);

  if (data.length === 0) return;

  // Set columns from keys of first row
  const keys = Object.keys(data[0]);
  worksheet.columns = keys.map((key) => ({
    header: key,
    key,
    width: Math.max(key.length + 2, 12),
  }));

  // Add rows
  data.forEach((row) => {
    worksheet.addRow(row);
  });

  // Style header row
  const headerRow = worksheet.getRow(1);
  headerRow.font = { bold: true };

  // Generate and download
  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = fileName;
  a.click();
  URL.revokeObjectURL(url);
}
