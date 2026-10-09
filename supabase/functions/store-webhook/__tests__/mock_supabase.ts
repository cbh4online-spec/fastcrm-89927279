// Base de dados em memória para testes isolados do handler real. Sem rede.
type Row = Record<string, any>;
export interface Fault { table: string; op: string; times: number; error?: any; match?: (b: Builder) => boolean; before?: () => Promise<void> }
export const db: { tables: Record<string, Row[]>; faults: Fault[]; log: string[]; delayMs: number } =
  { tables: {}, faults: [], log: [], delayMs: 1 };
export function reset(tables: Record<string, Row[]>) { db.tables = structuredClone(tables); db.faults = []; db.log = []; }
const UNIQUE: Record<string, string[]> = { store_webhook_events: ["workspace_id", "stripe_event_id"] };
let seq = 0;
class Builder {
  op = "select"; filters: ((r: Row) => boolean)[] = []; payload: any; returning = false; head = false; countMode = false; mode: "many" | "single" | "maybe" = "many";
  constructor(public table: string) {}
  select(_c?: string, o?: { count?: string; head?: boolean }) { if (this.op === "select") { this.head = !!o?.head; this.countMode = !!o?.count; } else this.returning = true; return this; }
  insert(p: any) { this.op = "insert"; this.payload = p; return this; }
  update(p: any) { this.op = "update"; this.payload = p; return this; }
  upsert(p: any) { this.op = "insert"; this.payload = p; return this; }
  delete() { this.op = "delete"; return this; }
  eq(c: string, v: any) { this.filters.push((r) => r[c] === v); return this; }
  neq(c: string, v: any) { this.filters.push((r) => r[c] !== v); return this; }
  in(c: string, v: any[]) { this.filters.push((r) => v.includes(r[c])); return this; }
  is(c: string, v: any) { this.filters.push((r) => (r[c] ?? null) === v); return this; }
  order() { return this; } limit() { return this; }
  single() { this.mode = "single"; return this; }
  maybeSingle() { this.mode = "maybe"; return this; }
  then(res: any, rej: any) { return this.exec().then(res, rej); }
  async exec(): Promise<any> {
    await new Promise((r) => setTimeout(r, db.delayMs));
    const f = db.faults.find((x) => x.table === this.table && x.op === this.op && x.times > 0 && (!x.match || x.match(this)));
    if (f) { if (f.before) await f.before(); f.times--; db.log.push(`FAULT ${this.table}.${this.op}`); return { data: null, error: f.error ?? { message: "simulated db failure", code: "XX000" }, count: null }; }
    const t = (db.tables[this.table] ??= []);
    const match = (r: Row) => this.filters.every((fn) => fn(r));
    db.log.push(`${this.table}.${this.op}`);
    if (this.op === "insert") {
      const rows = (Array.isArray(this.payload) ? this.payload : [this.payload]).map((r: Row) => ({ id: r.id ?? `gen-${++seq}`, outcome: null, ...r }));
      const u = UNIQUE[this.table];
      for (const r of rows) if (u && t.some((x) => u.every((k) => x[k] === r[k]))) return { data: null, error: { code: "23505", message: "duplicate key" } };
      t.push(...rows); return this.shape(rows);
    }
    if (this.op === "update") { const rows = t.filter(match); rows.forEach((r) => Object.assign(r, this.payload)); return this.returning ? this.shape(structuredClone(rows)) : { data: null, error: null }; }
    if (this.op === "delete") { const keep = t.filter((r) => !match(r)); const n = t.length - keep.length; db.tables[this.table] = keep; return { data: null, error: null, count: n }; }
    const rows = t.filter(match);
    if (this.head) return { data: null, error: null, count: rows.length };
    return this.shape(structuredClone(rows));
  }
  shape(rows: Row[]) {
    if (this.mode === "many") return { data: rows, error: null, count: rows.length };
    if (rows.length > 1 || (this.mode === "single" && rows.length === 0)) return { data: null, error: { message: "cardinality" } };
    return { data: rows[0] ?? null, error: null };
  }
}
export function createClient(_u: string, _k: string) {
  return { from: (t: string) => new Builder(t), storage: { from: () => ({ createSignedUrl: async () => ({ data: null }) }) }, rpc: async (fn: string, a: any) => {
    if (fn !== "decrement_store_product_stock") return { data: null, error: null };
    const f = db.faults.findIndex((x: any) => x.table === "products" && x.op === "rpc" && x.times > 0);
    if (f >= 0) { db.faults[f].times--; return { data: null, error: { message: "fault" } }; }
    const p = (db.tables.products ?? []).find((r: any) => r.id === a.p_product_id && r.workspace_id === a.p_workspace_id && r.track_stock && r.stock_quantity != null);
    if (!p) return { data: null, error: null };
    await Promise.resolve();
    p.stock_quantity = Math.max(0, p.stock_quantity - a.p_quantity);
    return { data: p.stock_quantity, error: null };
  } };
}
