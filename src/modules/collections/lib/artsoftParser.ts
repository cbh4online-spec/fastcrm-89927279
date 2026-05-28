/**
 * Parser for ARTSOFT "Extrato de Clientes C/C — Documentos por saldar".
 * Consumes raw text extracted from the PDF (one string with newlines preserved)
 * and returns a structured list of clients with their open documents.
 *
 * Tested with output of pdfjs-dist `getTextContent` joined with line breaks,
 * matches the layout produced by ARTSOFT v26.0 (combit List & Label).
 */

export interface ArtsoftDoc {
  doc_type: string;            // e.g. "A100-Fatura PT", "B200-Nota de Crédito PT"
  doc_no: string;              // ARTSOFT internal doc number, e.g. "5009"
  doc_third_no: string | null; // External doc number, e.g. "V100/5009"
  doc_date: string;            // ISO yyyy-mm-dd
  due_date: string;            // ISO yyyy-mm-dd
  total: number;
  balance: number;
  overdue_days: number | null;
}

export interface ArtsoftClient {
  client_number: string;       // ARTSOFT client number, e.g. "15"
  name: string;
  address: string | null;
  email: string | null;
  is_inactive: boolean;
  docs: ArtsoftDoc[];
  total_due: number;
}

export interface ArtsoftParseResult {
  reference_date: string | null; // ISO yyyy-mm-dd extracted from "Data: ..."
  clients: ArtsoftClient[];
  total_clients: number;
  total_docs: number;
  total_due: number;
  warnings: string[];
}

const SKIP_PATTERNS = [
  /^EXTRATO DE CLIENTES/i,
  /^DOCUMENTOS POR SALDAR/i,
  /^N[ºo]\s+do\s+/,
  /^N[ºo]\s+Conta\s+/,
  /^\s*documento\s+terceiro/,
  /^\s*Clientes:/,
  /^ARTSOFT\b/,
  /^PHARLISS\b/, // header brand line (issuer)
  /^\s*A transportar:/,
  /^\s*Transporte:/,
  /^\s*P[áa]g\./,
  /^\s*Total de Cliente:/,
];

function ptDateToIso(s: string): string {
  // DD.MM.YYYY → YYYY-MM-DD
  const [d, m, y] = s.split(".");
  return `${y}-${m.padStart(2, "0")}-${d.padStart(2, "0")}`;
}

function ptNumberToFloat(s: string): number {
  // "1 278,84" or "-33,41" → 1278.84 / -33.41
  const cleaned = s.replace(/\s+/g, "").replace(/\./g, "").replace(",", ".");
  const v = Number.parseFloat(cleaned);
  return Number.isFinite(v) ? v : 0;
}

const DATE_RE = /\d{2}\.\d{2}\.\d{4}/;
const NUM_RE = /-?\d{1,3}(?:[ \u00a0]\d{3})*,\d{2}/;
const DOC_LINE_RE = new RegExp(
  // (line_no) (account) (doctype text up to numbers) (doc_no) (third_no?) (doc_date) (due_date) (total) (balance) ...
  `^\\s*(\\d{1,4})\\s+(\\d{3,7})\\s+(.+?)\\s+(${DATE_RE.source})\\s+(${DATE_RE.source})\\s+(${NUM_RE.source})\\s+(${NUM_RE.source})\\b.*$`,
);

const CLIENT_HEADER_RE = /^\s*(\d{1,7}):\s+(.+)$/;
const EMAIL_LINE_RE = /^\s*>\s*Email:\s*(.+?)\s*$/i;
const REFERENCE_DATE_RE = /Data:\s*(\d{2}\.\d{2}\.\d{4})/;

function isSkippable(line: string): boolean {
  if (!line.trim()) return true;
  return SKIP_PATTERNS.some((re) => re.test(line));
}

/**
 * Splits the chunk between doctype and dates into [doc_type, doc_no, doc_third_no?].
 *   "A100-Fatura PT          5009 V100/5009"
 *   "B200-Nota de Crédito PT     43 V200/43"
 *   "A105-Documentos de Anos Anteriores  1461"   ← no third no
 */
function splitDocTypeAndNumbers(chunk: string): { doc_type: string; doc_no: string; doc_third_no: string | null } {
  // Tokenize from the right: last token may be third_no (contains '/' or starts with letter), before it the doc_no (all digits)
  const tokens = chunk.trim().split(/\s+/);
  if (tokens.length < 2) {
    return { doc_type: chunk.trim(), doc_no: "", doc_third_no: null };
  }
  const last = tokens[tokens.length - 1];
  const prev = tokens[tokens.length - 2];

  let doc_no = "";
  let doc_third_no: string | null = null;
  let typeEnd = tokens.length;

  const lastLooksThird = /[A-Za-z]/.test(last) || last.includes("/");
  const lastIsDocNo = /^\d+$/.test(last);

  if (lastLooksThird && /^-?\d+$/.test(prev)) {
    doc_third_no = last;
    doc_no = prev;
    typeEnd = tokens.length - 2;
  } else if (lastIsDocNo) {
    doc_no = last;
    typeEnd = tokens.length - 1;
  } else {
    // Fallback — push everything into doc_type
    typeEnd = tokens.length;
  }

  const doc_type = tokens.slice(0, typeEnd).join(" ");
  return { doc_type, doc_no, doc_third_no };
}

function extractOverdueDays(restOfLine: string): number | null {
  // The "Atraso" (overdue days) is typically the last integer on the line.
  const intMatches = restOfLine.match(/\b\d{1,5}\b(?!\S)/g);
  if (!intMatches || intMatches.length === 0) return null;
  const v = Number.parseInt(intMatches[intMatches.length - 1], 10);
  return Number.isFinite(v) ? v : null;
}

export function parseArtsoftStatement(text: string): ArtsoftParseResult {
  const warnings: string[] = [];
  const lines = text.split(/\r?\n/);
  const clients: ArtsoftClient[] = [];
  let current: ArtsoftClient | null = null;
  let reference_date: string | null = null;

  for (let i = 0; i < lines.length; i++) {
    const raw = lines[i];
    if (!reference_date) {
      const m = raw.match(REFERENCE_DATE_RE);
      if (m) reference_date = ptDateToIso(m[1]);
    }
    if (isSkippable(raw)) continue;

    // Client header
    const headerMatch = raw.match(CLIENT_HEADER_RE);
    if (headerMatch) {
      // Heuristic: client header usually has "> " somewhere OR text doesn't start with a doc-pattern.
      const rest = headerMatch[2];
      const looksLikeDocLine = DOC_LINE_RE.test(raw);
      if (!looksLikeDocLine) {
        const parts = rest.split(/\s*>\s*/);
        const name = (parts.shift() || "").trim();
        const isInactive = /^INATIVO\b/i.test(name);
        const cleanName = name.replace(/^INATIVO\s*-\s*/i, "").trim();
        const address = parts.length ? parts.join(", ").trim() : null;
        current = {
          client_number: headerMatch[1],
          name: cleanName,
          address: address || null,
          email: null,
          is_inactive: isInactive,
          docs: [],
          total_due: 0,
        };
        clients.push(current);
        continue;
      }
    }

    // Email line for current client
    const emailMatch = raw.match(EMAIL_LINE_RE);
    if (emailMatch && current) {
      current.email = emailMatch[1].trim().toLowerCase();
      continue;
    }

    // Doc line
    const docMatch = raw.match(DOC_LINE_RE);
    if (docMatch && current) {
      const [, , , docTypeChunk, docDate, dueDate, totalStr, balanceStr] = docMatch;
      const { doc_type, doc_no, doc_third_no } = splitDocTypeAndNumbers(docTypeChunk);
      const total = ptNumberToFloat(totalStr);
      const balance = ptNumberToFloat(balanceStr);
      const overdue = extractOverdueDays(raw.slice(docMatch.index! + docMatch[0].indexOf(balanceStr) + balanceStr.length));
      if (!doc_no) {
        warnings.push(`Linha ${i + 1}: documento sem número detectado — "${raw.trim().slice(0, 80)}"`);
        continue;
      }
      current.docs.push({
        doc_type,
        doc_no,
        doc_third_no,
        doc_date: ptDateToIso(docDate),
        due_date: ptDateToIso(dueDate),
        total,
        balance,
        overdue_days: overdue,
      });
      current.total_due += balance;
      continue;
    }
  }

  // Remove clients with zero docs (header detected but no docs parsed)
  const filtered = clients.filter((c) => c.docs.length > 0);

  const total_docs = filtered.reduce((acc, c) => acc + c.docs.length, 0);
  const total_due = filtered.reduce((acc, c) => acc + c.total_due, 0);

  return {
    reference_date,
    clients: filtered,
    total_clients: filtered.length,
    total_docs,
    total_due: Number(total_due.toFixed(2)),
    warnings,
  };
}
