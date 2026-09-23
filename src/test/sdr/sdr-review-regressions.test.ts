/**
 * Regressões da revisão independente da Fase 1 (código 4f7e6b6).
 * Executam a implementação REAL: executor.ts, schedule.ts e supabasePorts.ts
 * (este último sobre um cliente Supabase simulado em memória, sem rede).
 */
import { describe, it, expect, beforeEach } from "vitest";
import { readFileSync } from "node:fs";
import { runEnrollmentStep } from "../../../supabase/functions/_shared/sdr-engine/executor";
import { parseWindow, nextAllowedAt, isInWindow, DEFAULT_WINDOW, scheduleStep } from "../../../supabase/functions/_shared/sdr-engine/schedule";
import { createSupabasePorts, effectiveWhatsAppDailyCap } from "../../../supabase/functions/_shared/sdr-engine/supabasePorts";
import { parseSdrBinding } from "../../../supabase/functions/_shared/sdr-engine/transportGuard";
import { FakeWorld } from "./fakeSdrPorts";

const WS = "ws-a";
let w: FakeWorld;
beforeEach(() => { w = new FakeWorld(); });

// ─── 1) Revalidação imediatamente antes do transporte ────────────────────────
describe("1) mudanças concorrentes depois da reserva de quota", () => {
  const cases: [string, (w: FakeWorld) => void, string][] = [
    ["campanha pausada", (w) => { w.campaigns.get("c1")!.status = "paused"; }, "campaign_inactive"],
    ["autónomo desligado na campanha", (w) => { w.campaigns.get("c1")!.autonomous_send_enabled = false; }, "campaign_autonomous_disabled"],
    ["flag global removida", (w) => { w.globalSendEnabled = false; }, "disabled"],
    ["sequência pausada", (w) => { w.sequences.get("seq-c1")!.status = "paused"; }, "sequence_inactive"],
    ["resposta recebida", (w) => { w.inboundFor.add("e1"); }, "replied"],
    ["exclusão registada", (w) => { w.suppressedEmails.add("e1@exemplo.pt"); }, "opted_out"],
    ["inscrição pausada", (w) => { w.enrollments.get("e1")!.status = "paused"; }, "not_active"],
    ["contacto bloqueado", (w) => { w.ineligible.set("e1", { reason: "contact_blocked", terminal: true }); }, "blocked"],
  ];
  for (const [name, mutate, outcome] of cases) {
    it(`${name} → 0 envios, tentativa cancelada, reserva libertada`, async () => {
      w.addCampaign("c1", WS); w.addEnrollment("e1", WS, "c1");
      w.hooks.afterReserve = () => mutate(w);
      const r = await runEnrollmentStep(w.ports(), WS, "e1");
      expect(w.sent).toHaveLength(0);
      expect(r.outcome).toBe(outcome);
      const a = [...w.attempts.values()][0];
      expect(a.status).toBe("cancelled");
      expect(a.attempt_count).toBe(0);
      expect(w.reservations.every((x) => x.released && !x.consumed)).toBe(true);
    });
  }
  it("pausa entre o preflight e beginDispatch é apanhada no ponto transaccional", async () => {
    w.addCampaign("c1", WS); w.addEnrollment("e1", WS, "c1");
    w.hooks.beforeBegin = () => { w.campaigns.get("c1")!.status = "paused"; };
    const r = await runEnrollmentStep(w.ports(), WS, "e1");
    expect(w.sent).toHaveLength(0);
    expect(r.outcome).toBe("campaign_inactive");
    expect([...w.attempts.values()][0].status).toBe("cancelled");
  });
});

// ─── 2) Sequência pausada ────────────────────────────────────────────────────
describe("2) sequência pausada nunca executa nem termina a inscrição", () => {
  it("executor: sequence_inactive, inscrição intacta", async () => {
    w.addCampaign("c1", WS); w.addEnrollment("e1", WS, "c1");
    w.sequences.get("seq-c1")!.status = "paused";
    const before = { ...w.enrollments.get("e1")! };
    const r = await runEnrollmentStep(w.ports(), WS, "e1");
    expect(r.outcome).toBe("sequence_inactive");
    expect(w.enrollments.get("e1")).toEqual(before);
    expect(w.attempts.size).toBe(0);
  });
  it("adaptador real: status da sequência é lido e etapas não são pedidas", async () => {
    const db = fakeAdmin({ multichannel_sequences: [{ id: "s1", workspace_id: WS, status: "paused" }], multichannel_sequence_steps: [{ id: "st1", sequence_id: "s1", is_active: true, step_order: 1 }] });
    const ports = createSupabasePorts(db.client, env());
    expect(await ports.getSequence(WS, "s1")).toEqual({ status: "paused", steps: [] });
    expect(db.calls.some((c) => c.table === "multichannel_sequence_steps")).toBe(false);
    expect(await ports.getSequence("ws-b", "s1")).toBeNull();
  });
  it("adaptador real: sequência activa devolve só etapas activas", async () => {
    const db = fakeAdmin({ multichannel_sequences: [{ id: "s1", workspace_id: WS, status: "active" }], multichannel_sequence_steps: [{ id: "st1", sequence_id: "s1", is_active: true, step_order: 1 }, { id: "st2", sequence_id: "s1", is_active: false, step_order: 2 }] });
    const seq = await createSupabasePorts(db.client, env()).getSequence(WS, "s1");
    expect(seq?.status).toBe("active");
    expect(seq?.steps.map((s) => s.id)).toEqual(["st1"]);
  });
});

// ─── 3) Janela de envio ──────────────────────────────────────────────────────
describe("3) janela de envio validada (fail-closed)", () => {
  it.each([
    [{ start: "25:00", end: "26:00" }], [{ start: "09:99", end: "18:00" }], [{ start: "9:00", end: "18:00" }],
    [{ timezone: "Europe/Atlantida" }], [{ days: [] }], [{ days: [7] }], [{ start: "18:00", end: "09:00" }], ["09:00-18:00"],
  ])("inválida %j → null", (raw) => { expect(parseWindow(raw)).toBeNull(); });
  it("ausente → janela por defeito explícita", () => {
    expect(parseWindow(undefined)).toEqual(DEFAULT_WINDOW);
    expect(parseWindow({ start: "10:00" })).toEqual({ ...DEFAULT_WINDOW, start: "10:00" });
  });
  it("executor não envia nem altera a inscrição com janela inválida", async () => {
    w.addCampaign("c1", WS, { settings: { send_window: { start: "25:00", end: "26:00" } } }); w.addEnrollment("e1", WS, "c1");
    const r = await runEnrollmentStep(w.ports(), WS, "e1");
    expect(r).toMatchObject({ outcome: "config_invalid", reason: "invalid_send_window" });
    expect(w.sent).toHaveLength(0); expect(w.attempts.size).toBe(0);
  });
  it("nextAllowedAt nunca devolve instante fora da janela", () => {
    const w2 = parseWindow({ start: "09:00", end: "10:00", days: [1] })!;
    const at = nextAllowedAt(new Date("2026-09-24T12:00:00Z"), w2)!; // quinta
    expect(isInWindow(at, w2)).toBe(true);
    expect(at.toISOString()).toBe("2026-09-28T08:00:00.000Z"); // segunda 09:00 Lisboa (WEST)
  });
  it("mudança de hora (fim do horário de verão 25/10/2026) → 09:00 Lisboa = 09:00 UTC", () => {
    const at = nextAllowedAt(new Date("2026-10-24T20:00:00Z"), DEFAULT_WINDOW)!; // sábado
    expect(at.toISOString()).toBe("2026-10-26T09:00:00.000Z");
  });
  it("mudança de hora (início 29/03/2026) → 09:00 Lisboa = 08:00 UTC", () => {
    const at = nextAllowedAt(new Date("2026-03-28T20:00:00Z"), DEFAULT_WINDOW)!;
    expect(at.toISOString()).toBe("2026-03-30T08:00:00.000Z");
  });
  it("scheduleStep respeita a janela noutro fuso válido", () => {
    const ny = parseWindow({ timezone: "America/New_York" })!;
    expect(isInWindow(scheduleStep(new Date("2026-09-24T02:00:00Z"), { delay_days: 0 }, ny)!, ny)).toBe(true);
  });
});

// ─── 4) Logs e fecho de tentativas ───────────────────────────────────────────
describe("4) persistência e erros de log", () => {
  it("campanha sem sequência: bloqueia sem log com sequence_step_id null", async () => {
    w.addCampaign("c1", WS, { sequence_id: null }); w.addEnrollment("e1", WS, "c1");
    const r = await runEnrollmentStep(w.ports(), WS, "e1"); // fake lança se log(null)
    expect(r).toMatchObject({ outcome: "blocked", reason: "campaign_without_sequence" });
    expect(r.warnings).toBeUndefined();
    expect((w.enrollments.get("e1") as unknown as { failure_reason: string }).failure_reason).toBe("campaign_without_sequence");
  });
  it("adaptador real: log sem etapa não insere; erro de insert lança", async () => {
    const db = fakeAdmin({}, { insertError: { sdr_sequence_step_logs: { code: "23502" } } });
    const ports = createSupabasePorts(db.client, env());
    const e = w2e();
    await ports.log(e, null, "email", "blocked", { error: "x" });
    expect(db.calls.some((c) => c.table === "sdr_sequence_step_logs")).toBe(false);
    await expect(ports.log(e, "st1", "email", "sent")).rejects.toThrow(/sdr_step_log_insert_failed:23502/);
  });
  it("falha de log depois de envio aceite é reportada, não silenciada", async () => {
    w.addCampaign("c1", WS, {}, [{ channel: "email" }, { channel: "email" }]); w.addEnrollment("e1", WS, "c1");
    w.failLog = true;
    const r = await runEnrollmentStep(w.ports(), WS, "e1");
    expect(r.outcome).toBe("sent");
    expect(r.warnings?.[0]).toMatch(/log_failed/);
  });
  it("falha a persistir a aceitação → lança e NÃO avança a sequência", async () => {
    w.addCampaign("c1", WS, {}, [{ channel: "email" }, { channel: "email" }]); w.addEnrollment("e1", WS, "c1");
    w.failFinishAccepted = true;
    await expect(runEnrollmentStep(w.ports(), WS, "e1")).rejects.toThrow("db_down");
    expect(w.enrollments.get("e1")!.current_step).toBe(0);
    const a = [...w.attempts.values()][0];
    expect(a.status).toBe("dispatching");
    // Execução seguinte, após expirar o lease: ambíguo, sem reenvio.
    w.failFinishAccepted = false; w.now = new Date(w.now.getTime() + 10 * 60_000);
    const r2 = await runEnrollmentStep(w.ports(), WS, "e1");
    expect(r2).toMatchObject({ outcome: "blocked", reason: "ambiguous_delivery_requires_review" });
    expect(w.sent).toHaveLength(1);
  });
  it("adaptador real: finishAttempt/releaseAttempt lançam se não aplicados", async () => {
    const db = fakeAdmin({ sdr_step_attempts: [] }, { rpc: { sdr_finish_attempt: false } });
    const ports = createSupabasePorts(db.client, env());
    await expect(ports.finishAttempt("a1", ["dispatching"], { status: "accepted" })).rejects.toThrow(/not_applied/);
    await expect(ports.releaseAttempt("a1", {})).rejects.toThrow(/not_applied/);
  });
});

// ─── 5) Quota por despacho e mudança de dia ──────────────────────────────────
describe("5) quota por despacho", () => {
  it("retry noutro dia exige nova reserva validada contra a quota desse dia", async () => {
    w.addCampaign("c1", WS, { email_daily_limit: 1, email_min_interval_seconds: 30 });
    w.addEnrollment("e1", WS, "c1");
    w.transport = async () => ({ kind: "rejected", retryable: true, error: "smtp_421" });
    expect((await runEnrollmentStep(w.ports(), WS, "e1")).outcome).toBe("failed_retry");
    // Dia seguinte: outra inscrição consome a quota (1/dia) antes do retry.
    w.now = new Date("2026-09-25T09:30:00Z");
    w.transport = async () => ({ kind: "accepted", providerMessageId: "x" });
    w.addEnrollment("e2", WS, "c1");
    expect((await runEnrollmentStep(w.ports(), WS, "e2")).outcome).toBe("sent");
    w.enrollments.get("e1")!.next_send_at = new Date(w.now.getTime() - 1).toISOString();
    const r = await runEnrollmentStep(w.ports(), WS, "e1");
    expect(r).toMatchObject({ outcome: "deferred_quota", reason: "daily_limit" });
    expect(w.sent.map((s) => s.to)).toEqual(["e2@exemplo.pt"]);
  });
  it("aquecimento WhatsApp nunca aumenta o limite", () => {
    const now = new Date("2026-09-24T10:00:00Z");
    expect(effectiveWhatsAppDailyCap({ max_per_day: 20, warmup_enabled: false }, now)).toBe(20);
    expect(effectiveWhatsAppDailyCap({ max_per_day: 20, warmup_enabled: true, warmup_start_per_day: 5, warmup_increment_per_day: 2, warmup_started_at: "2026-09-21T10:00:00Z" }, now)).toBe(11);
    expect(effectiveWhatsAppDailyCap({ max_per_day: 20, warmup_enabled: true, warmup_start_per_day: 5, warmup_increment_per_day: 5, warmup_started_at: "2026-01-01T00:00:00Z" }, now)).toBe(20);
    expect(effectiveWhatsAppDailyCap({ max_per_day: 20, warmup_enabled: true, warmup_start_per_day: 5, warmup_increment_per_day: 2, warmup_started_at: null }, now)).toBe(5);
    expect(effectiveWhatsAppDailyCap({ max_per_day: null }, now)).toBeNull();
  });
  it("sequências WhatsApp Pro autónomas estão bloqueadas explicitamente na Fase 1", () => {
    const src = readFileSync("supabase/functions/whatsapp-pro-sequence-dispatch/index.ts", "utf8");
    expect(src).toMatch(/PHASE1_WA_SEQUENCE_AUTONOMOUS_BLOCKED: boolean = true/);
    expect(src.indexOf("PHASE1_WA_SEQUENCE_AUTONOMOUS_BLOCKED) {")).toBeLessThan(src.indexOf("workerModeConfigured(workerEnv)) {"));
  });
});

// ─── 6) Fronteira de envio ───────────────────────────────────────────────────
describe("6) vínculo do pedido worker ao despacho", () => {
  it("binding exige attemptId UUID e dispatchNo 1–5", () => {
    expect(parseSdrBinding(undefined)).toBeNull();
    expect(parseSdrBinding({ attemptId: "x", dispatchNo: 1 })).toBeNull();
    expect(parseSdrBinding({ attemptId: "00000000-0000-0000-0000-000000000001", dispatchNo: 0 })).toBeNull();
    expect(parseSdrBinding({ attemptId: "00000000-0000-0000-0000-000000000001", dispatchNo: 2 })).toEqual({ attemptId: "00000000-0000-0000-0000-000000000001", dispatchNo: 2 });
  });
  it.each(["email-send", "whatsapp-pro-send", "whatsapp-zapi-send"])("%s consome recibo no modo worker", (fn) => {
    const src = readFileSync(`supabase/functions/${fn}/index.ts`, "utf8");
    expect(src).toContain("consumeWorkerDispatch(");
    expect(src).toMatch(new RegExp(`stage: ["']${fn}["']`));
  });
  it("transporte recebe o número do despacho", async () => {
    const seen: number[] = [];
    w.addCampaign("c1", WS); w.addEnrollment("e1", WS, "c1");
    const ports = w.ports(); const orig = ports.sendEmail;
    ports.sendEmail = async (i) => { seen.push(i.dispatchNo); return orig(i); };
    await runEnrollmentStep(ports, WS, "e1");
    expect(seen).toEqual([1]);
  });
});

// ─── 7) Guardas WhatsApp no caminho SDR ──────────────────────────────────────
describe("7) consentimento e guardas WhatsApp no adaptador real", () => {
  const base = () => ({
    whatsapp_consents: [{ id: "k1", workspace_id: WS, phone: "+351912345678", status: "granted", revoked_at: null, consent_category: "marketing" }],
    leads: [{ id: "l1", workspace_id: WS, is_blocked: false, archived_at: null, automation_active: true, status: "new" }],
  });
  it("com consentimento e lead activa → elegível", async () => {
    const ports = createSupabasePorts(fakeAdmin(base()).client, env());
    expect(await ports.checkEligibility(w2e({ lead_id: "l1" }), "whatsapp")).toEqual({ ok: true });
  });
  it("sem consentimento → bloqueia", async () => {
    const t = base(); t.whatsapp_consents = [];
    const r = await createSupabasePorts(fakeAdmin(t).client, env()).checkEligibility(w2e({ lead_id: "l1" }), "whatsapp");
    expect(r).toMatchObject({ ok: false, reason: "whatsapp_consent_missing", terminal: true });
  });
  it("consentimento revogado → bloqueia", async () => {
    const t = base(); t.whatsapp_consents[0].revoked_at = "2026-09-20T00:00:00Z" as any;
    expect((await createSupabasePorts(fakeAdmin(t).client, env()).checkEligibility(w2e(), "whatsapp")).ok).toBe(false);
  });
  it.each([["is_blocked", true, "contact_blocked"], ["automation_active", false, "automation_paused"], ["archived_at", "2026-09-01", "contact_blocked"]])
  ("lead %s=%s → %s", async (col, val, reason) => {
    const t = base(); (t.leads[0] as any)[col] = val;
    expect(await createSupabasePorts(fakeAdmin(t).client, env()).checkEligibility(w2e({ lead_id: "l1" }), "whatsapp")).toMatchObject({ ok: false, reason });
  });
  it("lead de outro workspace → bloqueia", async () => {
    const t = base(); t.leads[0].workspace_id = "ws-b";
    expect(await createSupabasePorts(fakeAdmin(t).client, env()).checkEligibility(w2e({ lead_id: "l1" }), "email")).toMatchObject({ ok: false, reason: "lead_not_in_workspace" });
  });
  it("erro de leitura → falha fechada (não envia)", async () => {
    const db = fakeAdmin(base(), { selectError: { whatsapp_consents: { code: "XX" } } });
    expect((await createSupabasePorts(db.client, env()).checkEligibility(w2e(), "whatsapp")).ok).toBe(false);
  });
});

// ─── 8) Contrato de esquema (colunas confirmadas por SELECT no esquema real) ─
describe("8) colunas usadas existem no esquema real", () => {
  const REAL = {
    leads: "id workspace_id name email phone source status is_blocked archived_at automation_active company_name lead_score icp_fit_score city county region inferred_profession industry business_category prospecting_profile_id",
    contacts: "id workspace_id is_blocked archived_at deleted_at automation_active",
    professional_prospecting_profiles: "id workspace_id profile_name extracted_email extracted_phone lead_score inferred_location inferred_profession inferred_type status platform converted_lead_id",
    multichannel_sequences: "id workspace_id status",
    whatsapp_consents: "id workspace_id phone status revoked_at consent_category",
    whatsapp_throttle_settings: "instance_id max_per_day min_interval_seconds max_interval_seconds paused warmup_enabled warmup_start_per_day warmup_increment_per_day warmup_started_at",
  } as Record<string, string>;
  const files = ["supabase/functions/sdr-orchestrator/index.ts", "supabase/functions/_shared/sdr-engine/supabasePorts.ts"];
  it("todos os .select() explícitos destas tabelas usam colunas reais", () => {
    const bad: string[] = [];
    for (const f of files) {
      const src = readFileSync(f, "utf8");
      for (const m of src.matchAll(/from\("([a-z_]+)"\)\s*\.select\("([^"*]+)"\)/g)) {
        const real = REAL[m[1]]; if (!real) continue;
        for (const col of m[2].split(",").map((c) => c.trim())) if (!real.split(" ").includes(col)) bad.push(`${f}:${m[1]}.${col}`);
      }
    }
    expect(bad).toEqual([]);
  });
});

// ─── utilitários ─────────────────────────────────────────────────────────────
function env() {
  return { supabaseUrl: "http://x", serviceRoleKey: "k", workerSecret: undefined, globalSendEnabled: true, publicAppUrl: undefined, schemaReady: true };
}
function w2e(over: Record<string, unknown> = {}) {
  return { id: "e1", workspace_id: WS, campaign_id: "c1", status: "sequenced", current_step: 0, next_send_at: null, prospect_name: "Ana", prospect_email: "ana@x.pt", prospect_phone: "912345678", lead_id: null, contact_id: null, conversation_id: null, created_at: "2026-09-01T00:00:00Z", ...over } as any;
}

type Row = Record<string, any>;
interface FakeOpts { insertError?: Record<string, unknown>; selectError?: Record<string, unknown>; rpc?: Record<string, unknown> }
/** Cliente Supabase mínimo: eq/is/in/or(eq)/ilike/gt/not/order/limit/maybeSingle/select/insert/update. */
function fakeAdmin(tables: Record<string, Row[]>, opts: FakeOpts = {}) {
  const calls: { table: string; op: string }[] = [];
  const client = {
    rpc: async (name: string) => ({ data: opts.rpc?.[name] ?? null, error: null }),
    from(table: string) {
      const filters: ((r: Row) => boolean)[] = [];
      let op = "select"; let payload: Row | null = null; let lim = Infinity; let returning = false;
      const rows = () => (tables[table] ?? []).filter((r) => filters.every((f) => f(r)));
      const exec = () => {
        calls.push({ table, op });
        if (op === "insert") return { data: null, error: opts.insertError?.[table] ?? null };
        if (op === "select" && opts.selectError?.[table]) return { data: null, error: opts.selectError[table] };
        if (op === "update") { const rs = rows(); rs.forEach((r) => Object.assign(r, payload)); return { data: returning ? rs : null, error: null }; }
        return { data: rows().slice(0, lim), error: null };
      };
      const q: any = {
        select() { if (op !== "select") returning = true; return q; },
        insert(p: Row) { op = "insert"; payload = p; return q; },
        update(p: Row) { op = "update"; payload = p; return q; },
        eq(c: string, v: unknown) { filters.push((r) => r[c] === v); return q; },
        is(c: string, v: unknown) { filters.push((r) => (r[c] ?? null) === v); return q; },
        in(c: string, v: unknown[]) { filters.push((r) => v.includes(r[c])); return q; },
        gt(c: string, v: any) { filters.push((r) => r[c] > v); return q; },
        ilike(c: string, v: string) { const re = new RegExp("^" + v.replace(/%/g, ".*") + "$", "i"); filters.push((r) => re.test(String(r[c] ?? ""))); return q; },
        not() { return q; },
        or(expr: string) {
          const alts = expr.split(",").map((x) => { const [c, o, ...v] = x.split("."); return { c, o, v: v.join(".") }; });
          filters.push((r) => alts.some((a) => a.o === "eq" ? String(r[a.c]) === a.v : a.o === "is" ? (r[a.c] ?? null) === null : false));
          return q;
        },
        order() { return q; },
        limit(n: number) { lim = n; return q; },
        maybeSingle() { const x = exec(); return Promise.resolve({ data: Array.isArray(x.data) ? x.data[0] ?? null : x.data, error: x.error }); },
        single() { return q.maybeSingle(); },
        then(res: any, rej: any) { return Promise.resolve(exec()).then(res, rej); },
      };
      return q;
    },
  };
  return { client, calls };
}
