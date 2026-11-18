/**
 * Conciliação da importação histórica — espelho de leitura das regras do servidor
 * (sj_norm_text / sj_norm_phone / sj_valid_nif / sj_nif_kind / sj_names_compatible
 * e as razões devolvidas por sj_import_preview). O servidor é sempre autoritativo:
 * isto serve só para preparar as linhas e explicar os resultados ao utilizador.
 */

export function normText(s: string | null | undefined): string | null {
  const out = (s ?? "")
    .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
    .toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
  return out || null;
}

/** +351/00351/telefone local PT coincidem; outros países mantêm o indicativo completo. */
export function normPhone(raw: string | null | undefined): string | null {
  const s = (raw ?? "").trim();
  if (!s) return null;
  let d = s.replace(/\D/g, "");
  let intl = s.startsWith("+");
  if (d.startsWith("00")) { d = d.slice(2); intl = true; }
  if (d.length < 7) return null;
  if (intl) return `+${d}`;
  if (d.length === 9 && /^[239]/.test(d)) return `+351${d}`;
  if (d.length === 12 && d.startsWith("351")) return `+${d}`;
  return `local:${d}`;
}

export function validNif(raw: string | null | undefined): boolean {
  const d = (raw ?? "").replace(/^PT/i, "").replace(/\s/g, "");
  if (!/^\d{9}$/.test(d) || d[0] === "0") return false;
  let sum = 0;
  for (let i = 0; i < 8; i++) sum += Number(d[i]) * (9 - i);
  let c = 11 - (sum % 11);
  if (c >= 10) c = 0;
  return c === Number(d[8]);
}

export function nifKind(raw: string | null | undefined): "person" | "company" | null {
  if (!validNif(raw)) return null;
  const d = (raw ?? "").replace(/^PT/i, "").replace(/\s/g, "");
  return /^[123]/.test(d) || d.startsWith("45") ? "person" : "company";
}

export function namesCompatible(a: string | null | undefined, b: string | null | undefined): boolean {
  const ta = (normText(a) ?? "").split(" ").filter((x) => x.length > 2);
  const tb = (normText(b) ?? "").split(" ").filter((x) => x.length > 2);
  if (!ta.length || !tb.length) return false;
  if (ta[0] !== tb[0]) return false;
  if (ta.length === 1 || tb.length === 1) return true;
  return tb.includes(ta[ta.length - 1]) || ta.includes(tb[tb.length - 1]);
}

/** Um telefone colocado no campo de e-mail é pista para revisão, nunca um e-mail. */
export function emailFieldHint(raw: string | null | undefined): "email" | "phone_in_email" | "invalid_email" | null {
  const s = (raw ?? "").trim();
  if (!s) return null;
  if (/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s)) return "email";
  return normPhone(s) ? "phone_in_email" : "invalid_email";
}

/** Separa várias formações numa célula (; | quebra de linha). Vírgulas não separam. */
export function splitLabels(cell: string | null | undefined): string[] {
  return (cell ?? "").split(/[;\n|]+/).map((x) => x.trim()).filter(Boolean);
}

export interface OccurrenceInput {
  sourceRow: number;               // número da linha no ficheiro (1 = cabeçalho)
  courseCell: string;
  editionCell?: string;
}

/**
 * Cada formação de uma linha é uma ocorrência própria, com os seus rótulos
 * (designação + edição). Nunca junta duas formações na mesma inscrição.
 */
export function buildOccurrences({ sourceRow, courseCell, editionCell }: OccurrenceInput): { source_row: string; labels: string[] }[] {
  const courses = splitLabels(courseCell);
  const editions = splitLabels(editionCell);
  if (!courses.length) return [{ source_row: String(sourceRow), labels: editions }];
  return courses.map((c, i) => {
    const labels = [c];
    if (editions.length === courses.length) labels.push(editions[i]);
    else if (editions.length) labels.push(...editions); // contagens diferentes → servidor deixa pendente
    return { source_row: courses.length === 1 ? String(sourceRow) : `${sourceRow}#${i + 1}`, labels };
  });
}

export type RowStatus = "new" | "match" | "review" | "invalid";

export const STATUS_LABEL: Record<RowStatus, string> = {
  new: "Novo", match: "Reconhecido", review: "Rever", invalid: "Inválida",
};

const REASON_LABEL: Record<string, string> = {
  invalid_row: "Linha inválida (sem nome)",
  missing_name: "Nome em falta",
  needs_decision: "Precisa de decisão manual",
  incomplete_decision: "Decisão incompleta",
  decision_stale: "Os dados mudaram desde a decisão — decidir de novo",
  marked_pending: "Marcada como pendente",
  "conflict:identifier_name_mismatch": "Conflito: NIF/e-mail/telefone pertence a alguém com nome incompatível",
  "conflict:profile_name_mismatch": "Conflito: perfil candidato com nome incompatível",
  "conflict:shared_identifier_different_nif": "Conflito: e-mail/telefone partilhado por pessoa com outro NIF",
  "conflict:name_only": "Só coincide pelo nome — acrescente um identificador",
  name_hint: "Existe contacto com nome semelhante — confirmar se é a mesma pessoa",
  profile_name_hint: "Existe perfil com nome semelhante — confirmar se é a mesma pessoa",
  phone_without_country_code: "Telefone sem indicativo e não português — confirmar o país",
  identity_not_proven: "Sem identificador comum — descreva a prova de que é a mesma pessoa",
  "conflict:phone_hint_only": "Só coincide por um telefone que estava no campo de e-mail",
  "conflict:missing_name": "Nome em falta",
  contact_candidates_exist: "Já existem contactos candidatos — não é criado outro",
  profile_candidates_exist: "Já existe perfil candidato — não é criado outro",
  contact_not_candidate: "O contacto escolhido não é candidato",
  contact_not_acceptable: "O contacto escolhido tem conflitos",
  profile_not_candidate: "O perfil escolhido não é candidato",
  profile_not_acceptable: "O perfil escolhido tem nome incompatível",
  profile_linked_to_other_contact: "O perfil está ligado a outro contacto",
  contact_has_other_profile: "O contacto já tem outro perfil — consolidar primeiro",
  legacy_enrollment_needs_decision: "Existe inscrição antiga sem edição neste curso — decidir",
  legacy_choice_not_candidate: "A inscrição antiga escolhida já não é candidata",
  existing_status_conflict: "A inscrição existente está cancelada/desistida",
  label_missing: "Sem designação da formação",
  label_empty: "Designação vazia",
  label_unmapped: "Designação ainda não mapeada",
  label_edition_not_mapped: "Designação sem edição associada",
  label_other_edition: "Designação aponta para outra edição",
};

export function reasonLabel(code: string | null | undefined): string {
  if (!code) return "";
  return REASON_LABEL[code] ?? code;
}

const HINT_LABEL: Record<string, string> = {
  phone_in_email: "Telefone no campo de e-mail",
  invalid_email: "E-mail inválido",
  postal_or_place_in_phone: "Código postal/localidade no telefone",
  invalid_phone: "Telefone inválido",
  company_nif: "NIF de empresa (não identifica a pessoa)",
  invalid_nif: "NIF inválido",
  previous_profile_unresolvable: "Perfil de importação anterior não resolvido",
};
export const hintLabel = (c: string) => HINT_LABEL[c] ?? c;

/** SHA-256 hexadecimal do ficheiro (identifica o lote e torna a repetição segura). */
export async function sha256Hex(buf: ArrayBuffer): Promise<string> {
  const h = await crypto.subtle.digest("SHA-256", buf);
  return [...new Uint8Array(h)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

/** Linha devolvida por sj_import_preview (formato do servidor). */
export interface PreviewRow {
  source_row: string;
  status: RowStatus;
  reasons: string[];
  hints: { code: string; value: string }[];
  contacts: { id: string; name: string; email: string | null; phone: string | null; tax_id: string | null; matched_by: string[]; name_ok: boolean; nif_conflict: boolean }[];
  profiles: { id: string; full_name: string; email: string | null; phone: string | null; contact_id: string | null; name_ok: boolean; name_only?: boolean; enrollments: number }[];
  resolution: { pending?: string; contact?: string; profile?: string; legacy?: string | null; decision_id?: string; previous?: boolean };
  stored_decision: null | { stale?: boolean; id: string; reason?: string; contact?: string; profile?: string; legacy?: string | null };
  legacy_enrollments: { id: string; pedagogic_status: string | null; admin_status: string | null; financial_status: string | null; created_at: string }[];
  existing_in_cohort: string[];
  label_status: string | null;
}

/** Pronta = sem pendência no servidor, designações aprovadas para esta edição e inscrição antiga decidida. */
export function isRowReady(p: PreviewRow): boolean {
  if (p.resolution?.pending) return false;
  if (p.label_status !== "ok") return false;
  if (p.legacy_enrollments?.length && !p.existing_in_cohort?.length && !p.resolution?.legacy) return false;
  return true;
}

const STRONG = ["nif", "email", "phone", "client_number", "previous_import"];
/** Contactos que uma decisão manual pode escolher (o servidor aplica as mesmas regras). */
export function acceptableContacts(p: PreviewRow) {
  return p.contacts.filter((c) => c.name_ok && !c.nif_conflict && c.matched_by.some((m) => STRONG.includes(m)));
}
