/**
 * Retoma após interrupção temporária (revisão de 5a1b96b): pausa → 0 envios → retoma → 1 envio.
 * Corre o executor REAL sobre portas em memória.
 */
import { describe, it, expect, beforeEach } from "vitest";
import { readFileSync } from "node:fs";
import { runEnrollmentStep, TEMPORARY_BEGIN_REFUSALS } from "../../../supabase/functions/_shared/sdr-engine/executor";
import { FakeWorld } from "./fakeSdrPorts";

const WS = "ws-a";
let w: FakeWorld;
beforeEach(() => { w = new FakeWorld(); });
const attempt = () => [...w.attempts.values()][0];

type Case = [string, (w: FakeWorld) => void, (w: FakeWorld) => void];
const temporary: Case[] = [
  ["campanha pausada", (w) => { w.campaigns.get("c1")!.status = "paused"; }, (w) => { w.campaigns.get("c1")!.status = "active"; }],
  ["autónomo desligado", (w) => { w.campaigns.get("c1")!.autonomous_send_enabled = false; }, (w) => { w.campaigns.get("c1")!.autonomous_send_enabled = true; }],
  ["inscrição pausada", (w) => { w.enrollments.get("e1")!.status = "paused"; }, (w) => { w.enrollments.get("e1")!.status = "sequenced"; }],
  ["sequência pausada", (w) => { w.sequences.get("seq-c1")!.status = "paused"; }, (w) => { w.sequences.get("seq-c1")!.status = "active"; }],
  ["flag global desligada", (w) => { w.globalSendEnabled = false; }, (w) => { w.globalSendEnabled = true; }],
  ["snooze/reunião (não terminal)", (w) => { w.ineligible.set("e1", { reason: "snoozed", terminal: false }); }, (w) => { w.ineligible.delete("e1"); }],
];

describe("pausa durante a reserva → retoma da mesma etapa", () => {
  for (const [name, pause, resume] of temporary) {
    it(`${name}: 0 envios, quota libertada, depois 1 envio`, async () => {
      w.addCampaign("c1", WS); w.addEnrollment("e1", WS, "c1");
      w.hooks.afterReserve = () => { pause(w); w.hooks.afterReserve = undefined; };
      await runEnrollmentStep(w.ports(), WS, "e1");
      expect(w.sent).toHaveLength(0);
      expect(attempt().status).toBe("reserved");
      expect(attempt().attempt_count).toBe(0);
      expect(w.reservations.every((r) => r.released && !r.consumed)).toBe(true);
      expect(w.enrollments.get("e1")!.status).not.toBe("blocked");

      resume(w);
      w.now = new Date(w.now.getTime() + 2 * 3600_000); // depois de qualquer adiamento
      w.enrollments.get("e1")!.next_send_at = new Date(w.now.getTime() - 1000).toISOString();
      const r2 = await runEnrollmentStep(w.ports(), WS, "e1");
      expect(r2.outcome).toBe("sent");
      expect(w.sent).toHaveLength(1);
      expect(w.attempts.size).toBe(1); // mesma tentativa, histórico preservado
      expect(attempt().status).toBe("accepted");
      expect(w.enrollments.get("e1")!.current_step).toBe(1);
    });
  }

  it("pausa detectada só em beginDispatch também é retomável", async () => {
    w.addCampaign("c1", WS); w.addEnrollment("e1", WS, "c1");
    w.hooks.beforeBegin = () => { w.campaigns.get("c1")!.status = "paused"; w.hooks.beforeBegin = undefined; };
    expect((await runEnrollmentStep(w.ports(), WS, "e1")).outcome).toBe("campaign_inactive");
    expect(attempt().status).toBe("reserved");
    w.campaigns.get("c1")!.status = "active";
    expect((await runEnrollmentStep(w.ports(), WS, "e1")).outcome).toBe("sent");
    expect(w.sent).toHaveLength(1);
  });

  it("recusas terminais continuam a cancelar e nunca reabrem", async () => {
    w.addCampaign("c1", WS); w.addEnrollment("e1", WS, "c1");
    w.hooks.afterReserve = () => { w.inboundFor.add("e1"); };
    expect((await runEnrollmentStep(w.ports(), WS, "e1")).outcome).toBe("replied");
    expect(attempt().status).toBe("cancelled");
    w.inboundFor.clear(); w.hooks.afterReserve = undefined;
    Object.assign(w.enrollments.get("e1")!, { status: "sequenced", next_send_at: new Date(w.now.getTime() - 1).toISOString() }); // mesmo reposto à força
    const r = await runEnrollmentStep(w.ports(), WS, "e1");
    expect(w.sent).toHaveLength(0);
    expect(r.outcome).toBe("blocked");
  });

  it("opt-out depois da reserva cancela e não é retomável", async () => {
    w.addCampaign("c1", WS); w.addEnrollment("e1", WS, "c1");
    w.hooks.afterReserve = () => { w.suppressedEmails.add("e1@exemplo.pt"); };
    await runEnrollmentStep(w.ports(), WS, "e1");
    expect(attempt().status).toBe("cancelled");
    expect(w.enrollments.get("e1")!.status).toBe("opted_out");
  });

  it("tentativa accepted não é reenviada após pausa/retoma", async () => {
    w.addCampaign("c1", WS, {}, [{ channel: "email" }, { channel: "email" }]); w.addEnrollment("e1", WS, "c1");
    expect((await runEnrollmentStep(w.ports(), WS, "e1")).outcome).toBe("sent");
    w.campaigns.get("c1")!.status = "paused";
    w.campaigns.get("c1")!.status = "active";
    w.enrollments.get("e1")!.current_step = 0; // forçar reprocessamento da etapa aceite
    w.enrollments.get("e1")!.next_send_at = new Date(w.now.getTime() - 1).toISOString();
    const r = await runEnrollmentStep(w.ports(), WS, "e1");
    expect(r.reason).toBe("recovered_after_accept");
    expect(w.sent).toHaveLength(1);
  });

  it("concorrência na retoma: 8 execuções simultâneas → 1 envio", async () => {
    w.addCampaign("c1", WS, { email_min_interval_seconds: 0 }); w.addEnrollment("e1", WS, "c1");
    w.hooks.afterReserve = () => { w.campaigns.get("c1")!.status = "paused"; w.hooks.afterReserve = undefined; };
    await runEnrollmentStep(w.ports(), WS, "e1");
    w.campaigns.get("c1")!.status = "active";
    const res = await Promise.all(Array.from({ length: 8 }, () => runEnrollmentStep(w.ports(), WS, "e1")));
    expect(w.sent).toHaveLength(1);
    expect(res.filter((r) => r.outcome === "sent")).toHaveLength(1);
    expect(w.reservations.filter((r) => r.consumed)).toHaveLength(1);
  });
});

describe("throttle WhatsApp revalidado antes do transporte", () => {
  const setup = () => {
    w.addCampaign("c1", WS, {}, [{ channel: "whatsapp" }]); w.addEnrollment("e1", WS, "c1");
    w.waThrottle[WS] = { max: 20, min: 45, maxI: 120 };
  };
  it("pausa surgida depois da reserva (preflight resolve a rota de novo) → 0 envios, retomável", async () => {
    setup();
    w.hooks.afterReserve = () => { w.waThrottle[WS].paused = true; w.hooks.afterReserve = undefined; };
    const r = await runEnrollmentStep(w.ports(), WS, "e1");
    expect(r).toMatchObject({ outcome: "deferred_quota", reason: "whatsapp_throttle_paused" });
    expect(w.sent).toHaveLength(0);
    expect(attempt().status).toBe("reserved");
    expect(w.reservations.every((x) => x.released)).toBe(true);
    w.waThrottle[WS].paused = false;
    w.now = new Date(w.now.getTime() + 2 * 3600_000);
    expect((await runEnrollmentStep(w.ports(), WS, "e1")).outcome).toBe("sent");
    expect(w.sent).toHaveLength(1);
  });
  it("pausa surgida entre preflight e beginDispatch → recusada no ponto transaccional", async () => {
    setup();
    w.hooks.beforeBegin = () => { w.waThrottle[WS].paused = true; w.hooks.beforeBegin = undefined; };
    const r = await runEnrollmentStep(w.ports(), WS, "e1");
    expect(r.reason).toBe("whatsapp_throttle_paused");
    expect(w.sent).toHaveLength(0);
    expect(attempt().status).toBe("reserved");
  });
  it("SQL: sdr_begin_dispatch consulta whatsapp_throttle_settings", () => {
    const sql = readFileSync("supabase/pending-migrations/20260923180000_sdr_prospecting_phase1.sql", "utf8");
    const body = sql.slice(sql.indexOf("FUNCTION public.sdr_begin_dispatch("), sql.indexOf("FUNCTION public.sdr_finish_attempt("));
    expect(body).toMatch(/whatsapp_throttle_settings/);
    expect(body).toMatch(/whatsapp_throttle_paused/);
    expect(TEMPORARY_BEGIN_REFUSALS.has("whatsapp_throttle_paused")).toBe(true);
    expect(TEMPORARY_BEGIN_REFUSALS.has("suppressed")).toBe(false);
  });
});
