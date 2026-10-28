// Correspondência de clientes SAF-T com fichas existentes.
// Ordem: NIF normalizado → nome igual → email (só se único, ou desempate por nome).

export interface MatchRow { id: string; name?: string | null; tax_id?: string | null; email?: string | null }

/** Remove espaços/pontos/hífens e prefixo de país (PT, LU, ...). "999999990" (consumidor final) → "". */
export function normalizeNif(v?: string | null): string {
  if (!v) return "";
  let s = String(v).toUpperCase().replace(/[\s.\-_/]/g, "");
  s = s.replace(/^[A-Z]{2}(?=[0-9A-Z]*\d)/, "");
  if (s === "999999990" || /^0+$/.test(s)) return "";
  return s;
}

export function normalizeName(v?: string | null): string {
  return (v ?? "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/\s+/g, " ").trim();
}

export function normalizeEmail(v?: string | null): string {
  return (v ?? "").trim().toLowerCase();
}

export interface MatchIndex {
  byNif: Map<string, MatchRow[]>;
  byName: Map<string, MatchRow[]>;
  byEmail: Map<string, MatchRow[]>;
}

function push(m: Map<string, MatchRow[]>, k: string, r: MatchRow) {
  if (!k) return;
  const a = m.get(k);
  if (a) a.push(r); else m.set(k, [r]);
}

export function buildMatchIndex(rows: MatchRow[]): MatchIndex {
  const idx: MatchIndex = { byNif: new Map(), byName: new Map(), byEmail: new Map() };
  for (const r of rows) {
    push(idx.byNif, normalizeNif(r.tax_id), r);
    push(idx.byName, normalizeName(r.name), r);
    push(idx.byEmail, normalizeEmail(r.email), r);
  }
  return idx;
}

function pick(cands: MatchRow[] | undefined, name: string): string | null {
  if (!cands?.length) return null;
  if (cands.length === 1) return cands[0].id;
  const byName = cands.filter((c) => normalizeName(c.name) === name);
  return byName.length >= 1 ? byName[0].id : null;
}

export function matchCustomer(idx: MatchIndex, c: { tax_id?: string | null; name?: string | null; email?: string | null }): string | null {
  const name = normalizeName(c.name);
  const nif = normalizeNif(c.tax_id);
  if (nif) {
    const hit = idx.byNif.get(nif);
    if (hit?.length) return pick(hit, name) ?? hit[0].id;
  }
  if (name) {
    const hit = idx.byName.get(name);
    if (hit?.length) return hit[0].id;
  }
  const email = normalizeEmail(c.email);
  if (email) return pick(idx.byEmail.get(email), name);
  return null;
}
