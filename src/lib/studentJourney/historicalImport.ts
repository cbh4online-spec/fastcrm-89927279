import { buildOccurrences } from "./importReconciliation";

/** Fase F — importação histórica: mapeamento de colunas, normalização e validação (sem rede). */

export type ImportField =
  | "full_name" | "email" | "phone" | "nif" | "client_number"
  | "pedagogic_status" | "financial_status" | "agreed_amount"
  | "completed_at" | "certificate_issued" | "certificate_date" | "notes"
  | "course_label" | "edition_label";


export const IMPORT_FIELDS: { key: ImportField; label: string; aliases: string[] }[] = [
  { key: "full_name", label: "Nome", aliases: ["nome", "nome completo", "aluno", "formando", "name", "full name"] },
  { key: "email", label: "Email", aliases: ["email", "e-mail", "correio"] },
  { key: "phone", label: "Telefone", aliases: ["telefone", "telemovel", "tlm", "phone", "contacto"] },
  { key: "nif", label: "NIF", aliases: ["nif", "contribuinte", "nº contribuinte", "vat"] },
  { key: "client_number", label: "Nº de cliente", aliases: ["nº cliente", "n cliente", "numero cliente", "cliente", "client number"] },
  { key: "pedagogic_status", label: "Estado pedagógico", aliases: ["estado pedagogico", "estado", "situacao", "conclusao"] },
  { key: "financial_status", label: "Estado financeiro", aliases: ["estado financeiro", "pagamento", "pago"] },
  { key: "agreed_amount", label: "Valor acordado", aliases: ["valor", "valor acordado", "preco", "montante"] },
  { key: "completed_at", label: "Data de conclusão", aliases: ["data conclusao", "concluido em", "data fim"] },
  { key: "certificate_issued", label: "Certificado emitido", aliases: ["certificado", "certificado emitido"] },
  { key: "certificate_date", label: "Data do certificado", aliases: ["data certificado", "data emissao certificado"] },
  { key: "notes", label: "Notas", aliases: ["notas", "observacoes", "obs"] },
  { key: "course_label", label: "Designação da formação", aliases: ["formacao", "formacoes", "curso", "cursos", "designacao"] },
  { key: "edition_label", label: "Edição (local/ano/nº)", aliases: ["edicao", "edicoes", "turma"] },
];


const norm = (s: string) =>
  s.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9º ]/g, " ").replace(/\s+/g, " ").trim();

export function autoMapColumns(headers: string[]): Partial<Record<ImportField, string>> {
  const out: Partial<Record<ImportField, string>> = {};
  const used = new Set<string>();
  for (const f of IMPORT_FIELDS) {
    const hit = headers.find((h) => !used.has(h) && f.aliases.some((a) => norm(h) === norm(a)));
    if (hit) { out[f.key] = hit; used.add(hit); }
  }
  return out;
}

export function normalizePedagogic(v: string): string | null {
  const s = norm(v ?? "");
  if (!s) return "not_started";
  if (/(^| )(concluid|aprovad|complet|terminad|sim$)/.test(s)) return "completed";
  if (/(desist|anulad|withdraw)/.test(s)) return "withdrawn";
  if (/(nao concluid|reprovad|incomplet)/.test(s)) return "not_completed";
  if (/(curso|frequent|ativ|in training|a decorrer)/.test(s)) return "in_training";
  if (/(inscrit|nao iniciad|por iniciar)/.test(s)) return "not_started";
  return null;
}

/** Sem informação → null (Não informado). Nunca assume "não pago". */
export function normalizeFinancial(v: string): string | null {
  const s = norm(v ?? "");
  if (!s) return null;
  if (/(parcial|partial)/.test(s)) return "partial";
  if (/(reembols|refund)/.test(s)) return "refunded";
  if (/(isent|oferta|waiv)/.test(s)) return "waived";
  if (/(nao pago|por pagar|pendente|unpaid|em divida)/.test(s)) return "unpaid";
  if (/(^pago|paid|liquidad|^sim$)/.test(s)) return "paid";
  return null;
}

export function parseBool(v: string): boolean {
  return /^(sim|s|yes|y|true|1|x|emitido)$/.test(norm(v ?? ""));
}

/** Aceita dd/mm/aaaa, dd-mm-aaaa, aaaa-mm-dd e datas Excel. Devolve YYYY-MM-DD ou null. */
export function parseDate(v: string): string | null {
  const s = (v ?? "").trim();
  if (!s) return null;
  let m = s.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (m) return `${m[1]}-${m[2]}-${m[3]}`;
  m = s.match(/^(\d{1,2})[/.-](\d{1,2})[/.-](\d{4})$/);
  if (m) return `${m[3]}-${m[2].padStart(2, "0")}-${m[1].padStart(2, "0")}`;
  const d = new Date(s);
  return isNaN(d.getTime()) ? null : d.toISOString().slice(0, 10);
}

export function parseAmount(v: string): number | null {
  const s = (v ?? "").replace(/[€\s]/g, "");
  if (!s) return null;
  const n = Number(s.includes(",") ? s.replace(/\./g, "").replace(",", ".") : s);
  return isFinite(n) && n >= 0 ? Math.round(n * 100) / 100 : null;
}

export interface PreparedRow {
  source_row: string;
  full_name: string; email: string; phone: string; nif: string; client_number: string;
  pedagogic_status: string; financial_status: string | null;
  agreed_amount: number | null; completed_at: string | null;
  notes: string; labels: string[];
  /** Células originais da linha (proveniência auditável). */
  cells: Record<string, string>;
}
export interface RowIssue { row: string; message: string; blocking: boolean }

/**
 * Prepara as ocorrências (uma por formação). A identidade e os duplicados são
 * decididos no servidor (sj_import_preview / sj_import_historical_rows).
 * Certificados e pagamentos não são criados pela importação histórica.
 */
export function prepareRows(
  rows: Record<string, string>[],
  mapping: Partial<Record<ImportField, string>>,
): { valid: PreparedRow[]; issues: RowIssue[] } {
  const get = (r: Record<string, string>, f: ImportField) => (mapping[f] ? String(r[mapping[f]!] ?? "").trim() : "");
  const valid: PreparedRow[] = [];
  const issues: RowIssue[] = [];

  rows.forEach((r, idx) => {
    const sourceRow = idx + 2; // linha 1 = cabeçalho
    const row = String(sourceRow);
    const full_name = get(r, "full_name");
    if (!full_name) { issues.push({ row, message: "Nome em falta", blocking: true }); return; }
    const ped = normalizePedagogic(get(r, "pedagogic_status"));
    if (!ped) issues.push({ row, message: `Estado pedagógico desconhecido «${get(r, "pedagogic_status")}» — fica não iniciado`, blocking: false });
    const finRaw = get(r, "financial_status");
    const fin = normalizeFinancial(finRaw);
    if (finRaw && !fin) issues.push({ row, message: `Estado financeiro «${finRaw}» não reconhecido — fica Não informado`, blocking: false });
    const rawAmount = get(r, "agreed_amount");
    const amount = parseAmount(rawAmount);
    if (rawAmount && amount === null) issues.push({ row, message: `Valor inválido «${rawAmount}» ignorado`, blocking: false });
    if (get(r, "certificate_issued")) issues.push({ row, message: "Certificados não são criados pela importação histórica", blocking: false });
    const cells: Record<string, string> = {};
    for (const [k, v] of Object.entries(r)) { const t = String(v ?? "").trim(); if (t) cells[k.slice(0, 80)] = t.slice(0, 300); }

    const occurrences = buildOccurrences({ sourceRow, courseCell: get(r, "course_label"), editionCell: get(r, "edition_label") });
    for (const occ of occurrences) {
      valid.push({
        source_row: occ.source_row, labels: occ.labels, cells,
        full_name: full_name.slice(0, 200), email: get(r, "email"), phone: get(r, "phone"),
        nif: get(r, "nif").replace(/\s/g, ""), client_number: get(r, "client_number"),
        pedagogic_status: ped ?? "not_started", financial_status: fin,
        agreed_amount: amount, completed_at: parseDate(get(r, "completed_at")),
        notes: get(r, "notes").slice(0, 1000),
      });
    }
  });
  return { valid, issues };
}

export const TEMPLATE_HEADERS = IMPORT_FIELDS.filter((f) => !f.key.startsWith("certificate")).map((f) => f.label);
