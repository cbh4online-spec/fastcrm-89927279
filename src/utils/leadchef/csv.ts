/**
 * CSV — parsing e geração simples (sem dependências externas).
 * Suporta separador `,` ou `;` (auto-detect) e aspas para escape.
 */

export interface ParsedCSV {
  headers: string[];
  rows: Record<string, string>[];
  rawRows: string[][];
  separator: string;
}

function detectSeparator(line: string): string {
  const semis = (line.match(/;/g) || []).length;
  const commas = (line.match(/,/g) || []).length;
  return semis > commas ? ";" : ",";
}

function parseLine(line: string, sep: string): string[] {
  const out: string[] = [];
  let cur = "";
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const c = line[i];
    if (inQuotes) {
      if (c === '"' && line[i + 1] === '"') {
        cur += '"';
        i++;
      } else if (c === '"') {
        inQuotes = false;
      } else {
        cur += c;
      }
    } else {
      if (c === '"') inQuotes = true;
      else if (c === sep) {
        out.push(cur);
        cur = "";
      } else cur += c;
    }
  }
  out.push(cur);
  return out.map((s) => s.trim());
}

export function parseCSV(text: string): ParsedCSV {
  // Strip BOM
  if (text.charCodeAt(0) === 0xfeff) text = text.slice(1);
  const lines = text.split(/\r?\n/).filter((l) => l.trim().length > 0);
  if (lines.length === 0) {
    return { headers: [], rows: [], rawRows: [], separator: "," };
  }
  const sep = detectSeparator(lines[0]);
  const headers = parseLine(lines[0], sep);
  const rawRows: string[][] = [];
  const rows: Record<string, string>[] = [];
  for (let i = 1; i < lines.length; i++) {
    const cells = parseLine(lines[i], sep);
    rawRows.push(cells);
    const obj: Record<string, string> = {};
    headers.forEach((h, idx) => {
      obj[h] = cells[idx] ?? "";
    });
    rows.push(obj);
  }
  return { headers, rows, rawRows, separator: sep };
}

function escapeCell(value: unknown, sep: string): string {
  if (value === null || value === undefined) return "";
  const str = String(value);
  if (str.includes(sep) || str.includes('"') || str.includes("\n") || str.includes("\r")) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

export function buildCSV(headers: string[], rows: (Record<string, unknown> | unknown[])[], sep = ";"): string {
  const lines: string[] = [];
  lines.push(headers.map((h) => escapeCell(h, sep)).join(sep));
  for (const row of rows) {
    if (Array.isArray(row)) {
      lines.push(row.map((v) => escapeCell(v, sep)).join(sep));
    } else {
      lines.push(headers.map((h) => escapeCell((row as Record<string, unknown>)[h], sep)).join(sep));
    }
  }
  // BOM para compatibilidade Excel pt-PT
  return "\uFEFF" + lines.join("\n");
}

export function downloadFile(filename: string, content: string, mime = "text/csv;charset=utf-8") {
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
