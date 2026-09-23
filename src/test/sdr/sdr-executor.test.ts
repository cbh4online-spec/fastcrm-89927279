import { describe, it, expect, beforeEach } from "vitest";
import { runEnrollmentStep, firstSendAt } from "../../../supabase/functions/_shared/sdr-engine/executor";
import { FakeWorld } from "./fakeSdrPorts";

const WS = "ws-a";
const WS_B = "ws-b";
let w: FakeWorld;
beforeEach(() => { w = new FakeWorld(); });

describe("SDR executor — desligado por defeito", () => {
  it("não faz nada sem flag global", async () => {
    w.globalSendEnabled = false;
    w.addCampaign("c1", WS); w.addEnrollment("e1", WS, "c1");
    expect((await runEnrollmentStep(w.ports(), WS, "e1")).outcome).toBe("disabled");
    expect(w.sent).toHaveLength(0); expect(w.attempts.size).toBe(0);
  });
  it("não faz nada sem esquema da Fase 1", async () => {
    w.schemaReady = false; w.addCampaign("c1", WS); w.addEnrollment("e1", WS, "c1");
    expect((await runEnrollmentStep(w.ports(), WS, "e1")).outcome).toBe("schema_not_ready");
  });
  it("campanha sem autonomous_send_enabled não envia", async () => {
    w.addCampaign("c1", WS, { autonomous_send_enabled: false }); w.addEnrollment("e1", WS, "c1");
    expect((await runEnrollmentStep(w.ports(), WS, "e1")).outcome).toBe("campaign_autonomous_disabled");
    expect(w.sent).toHaveLength(0);
  });
});

describe("caminho feliz", () => {
  it("email: envia com rodapé tokenizado, sem email no URL, e agenda etapa seguinte", async () => {
    w.addCampaign("c1", WS, {}, [{ channel: "email" }, { channel: "email" }]);
    w.addEnrollment("e1", WS, "c1");
    const r = await runEnrollmentStep(w.ports(), WS, "e1");
    expect(r.outcome).toBe("sent");
    expect(w.sent[0].body).toContain("Olá Ana");
    expect(w.sent[0].body).toContain("/unsubscribe?token=");
    expect(w.sent[0].body).not.toContain("e1@exemplo.pt");
    const e = w.enrollments.get("e1")!;
    expect(e.current_step).toBe(1);
    expect(new Date(e.next_send_at!).getTime()).toBeGreaterThanOrEqual(w.now.getTime() + 2 * 86400_000);
    expect([...w.attempts.values()][0].status).toBe("accepted");
  });
  it("whatsapp: usa whatsapp_template como texto e completa na última etapa", async () => {
    w.waThrottle[WS] = { max: 20, min: 45, maxI: 120 };
    w.addCampaign("c1", WS, {}, [{ channel: "whatsapp", whatsapp_template: "<b>Olá</b> {{first_name}}", body_html: null }]);
    w.addEnrollment("e1", WS, "c1");
    expect((await runEnrollmentStep(w.ports(), WS, "e1")).outcome).toBe("sent");
    expect(w.sent[0]).toMatchObject({ channel: "whatsapp", body: "Olá Ana", account: `wa:inst-${WS}` });
    expect(w.enrollments.get("e1")!.status).toBe("completed");
  });
});

describe("primeira data (B02)", () => {
  it("fora da janela Lisboa agenda para as 09:00 do próximo dia útil", () => {
    const sat = new Date("2026-09-26T12:00:00Z"); // sábado
    const at = firstSendAt([{ id: "s", step_order: 1, channel: "email", delay_days: 0, delay_hours: 0 }], sat, undefined)!;
    expect(at.toISOString()).toBe("2026-09-28T08:00:00.000Z"); // segunda 09:00 WEST
  });
  it("respeita horário de inverno (UTC+0)", () => {
    const at = firstSendAt([{ id: "s", step_order: 1, channel: "email", delay_days: 0, delay_hours: 0 }], new Date("2026-12-05T12:00:00Z"), undefined)!;
    expect(at.toISOString()).toBe("2026-12-07T09:00:00.000Z");
  });
  it("sem etapas → null", () => { expect(firstSendAt([], new Date(), undefined)).toBeNull(); });
});

describe("concorrência e idempotência (B09)", () => {
  it("duas execuções simultâneas enviam uma única vez", async () => {
    w.addCampaign("c1", WS, {}, [{ channel: "email" }, { channel: "email" }]); w.addEnrollment("e1", WS, "c1");
    const [a, b] = await Promise.all([runEnrollmentStep(w.ports(), WS, "e1"), runEnrollmentStep(w.ports(), WS, "e1")]);
    expect([a.outcome, b.outcome].filter((o) => o === "sent")).toHaveLength(1);
    expect(w.sent).toHaveLength(1);
  });
  it("aceitação já registada numa execução anterior avança sem reenviar", async () => {
    w.addCampaign("c1", WS, {}, [{ channel: "email" }, { channel: "email" }]); w.addEnrollment("e1", WS, "c1");
    w.attempts.set("x", { id: "x", key: "e1:1:c1-s0", workspace_id: WS, enrollment_id: "e1", status: "accepted", attempt_count: 1, lease: null, next_retry_at: null });
    expect((await runEnrollmentStep(w.ports(), WS, "e1")).reason).toBe("recovered_after_accept");
    expect(w.sent).toHaveLength(0);
    expect(w.enrollments.get("e1")!.current_step).toBe(1);
  });
});

describe("pausa, exclusão, resposta", () => {
  it("pausado não envia", async () => {
    w.addCampaign("c1", WS); w.addEnrollment("e1", WS, "c1", { status: "paused" });
    expect((await runEnrollmentStep(w.ports(), WS, "e1")).outcome).toBe("not_active");
    expect(w.sent).toHaveLength(0);
  });
  it("campanha pausada não envia nem avança", async () => {
    w.addCampaign("c1", WS, { status: "paused" }); w.addEnrollment("e1", WS, "c1");
    expect((await runEnrollmentStep(w.ports(), WS, "e1")).outcome).toBe("campaign_inactive");
    expect(w.enrollments.get("e1")!.current_step).toBe(0);
  });
  it("email excluído → opted_out, sem envio", async () => {
    w.addCampaign("c1", WS); w.addEnrollment("e1", WS, "c1"); w.suppressedEmails.add("e1@exemplo.pt");
    expect((await runEnrollmentStep(w.ports(), WS, "e1")).outcome).toBe("opted_out");
    expect(w.enrollments.get("e1")!.status).toBe("opted_out"); expect(w.sent).toHaveLength(0);
  });
  it("resposta de entrada → replied com reply_detected_at", async () => {
    w.addCampaign("c1", WS); w.addEnrollment("e1", WS, "c1"); w.inboundFor.add("e1");
    expect((await runEnrollmentStep(w.ports(), WS, "e1")).outcome).toBe("replied");
    const e = w.enrollments.get("e1") as unknown as Record<string, unknown>;
    expect(e.status).toBe("replied"); expect(e.reply_detected_at).toBeTruthy(); expect(e.replied_at).toBeUndefined();
  });
  it("sem URL de cancelamento configurado, email bloqueia (fail-closed)", async () => {
    w.unsubscribeBase = null; w.addCampaign("c1", WS); w.addEnrollment("e1", WS, "c1");
    expect((await runEnrollmentStep(w.ports(), WS, "e1")).reason).toBe("unsubscribe_not_configured");
    expect(w.sent).toHaveLength(0);
  });
});

describe("falhas (B08)", () => {
  it("falha retry-able não avança; limite de 3 tentativas; nunca conta como enviado", async () => {
    w.transport = async () => ({ kind: "rejected", retryable: true, error: "smtp_busy" });
    w.addCampaign("c1", WS, { email_min_interval_seconds: 30 }); w.addEnrollment("e1", WS, "c1");
    const outcomes: string[] = [];
    for (let i = 0; i < 4; i++) {
      outcomes.push((await runEnrollmentStep(w.ports(), WS, "e1")).outcome);
      const e = w.enrollments.get("e1")!;
      if (e.next_send_at) w.now = new Date(Date.parse(e.next_send_at) + 1000);
    }
    expect(outcomes).toEqual(["failed_retry", "failed_retry", "failed_final", "not_active"]);
    expect(w.enrollments.get("e1")!.current_step).toBe(0);
    expect(w.logs.filter((l) => l.status === "sent")).toHaveLength(0);
  });
  it("timeout ambíguo bloqueia para revisão e não reenvia", async () => {
    w.transport = async () => ({ kind: "ambiguous", error: "email-send_no_response:AbortError" });
    w.addCampaign("c1", WS); w.addEnrollment("e1", WS, "c1");
    expect((await runEnrollmentStep(w.ports(), WS, "e1")).outcome).toBe("ambiguous");
    expect(w.enrollments.get("e1")!.status).toBe("blocked");
    Object.assign(w.enrollments.get("e1")!, { status: "sequenced", next_send_at: w.now.toISOString() }); // mesmo reactivado manualmente…
    w.transport = async () => ({ kind: "accepted", providerMessageId: "x" });
    const again = await runEnrollmentStep(w.ports(), WS, "e1");
    expect(again.outcome).toBe("blocked"); // …a tentativa ambígua não é repetida
    expect(w.sent).toHaveLength(0);
  });
  it("excepção do transporte é tratada como ambígua", async () => {
    w.transport = async () => { throw new Error("boom"); };
    w.addCampaign("c1", WS); w.addEnrollment("e1", WS, "c1");
    expect((await runEnrollmentStep(w.ports(), WS, "e1")).outcome).toBe("ambiguous");
  });
  it("canal não suportado bloqueia explicitamente (nada marcado como enviado)", async () => {
    w.addCampaign("c1", WS, {}, [{ channel: "linkedin" }]); w.addEnrollment("e1", WS, "c1");
    const r = await runEnrollmentStep(w.ports(), WS, "e1");
    expect(r).toMatchObject({ outcome: "blocked", reason: "unsupported_channel:linkedin" });
    expect(w.logs.some((l) => l.status === "sent")).toBe(false);
  });
  it("WhatsApp via GHL não é suportado na Fase 1", async () => {
    w.waThrottle[WS] = { max: 20, min: 45, maxI: 120 };
    w.addCampaign("c1", WS, { settings: { whatsapp_provider: "ghl" } }, [{ channel: "whatsapp" }]); w.addEnrollment("e1", WS, "c1");
    expect((await runEnrollmentStep(w.ports(), WS, "e1")).reason).toBe("ghl_worker_transport_not_supported_phase1");
  });
  it("WhatsApp sem throttle configurado bloqueia", async () => {
    w.addCampaign("c1", WS, {}, [{ channel: "whatsapp" }]); w.addEnrollment("e1", WS, "c1");
    expect((await runEnrollmentStep(w.ports(), WS, "e1")).reason).toBe("whatsapp_throttle_not_configured");
  });
});

describe("quota partilhada", () => {
  it("20/dia e 45 s entre envios na mesma conta WA, incluindo follow-ups de campanhas diferentes", async () => {
    w.waThrottle[WS] = { max: 2, min: 45, maxI: 120 };
    w.addCampaign("c1", WS, {}, [{ channel: "whatsapp" }]);
    w.addCampaign("c2", WS, {}, [{ channel: "whatsapp" }]);
    w.addEnrollment("e1", WS, "c1", { prospect_phone: "911111111" });
    w.addEnrollment("e2", WS, "c2", { prospect_phone: "922222222" });
    w.addEnrollment("e3", WS, "c1", { prospect_phone: "933333333" });
    expect((await runEnrollmentStep(w.ports(), WS, "e1")).outcome).toBe("sent");
    const r2 = await runEnrollmentStep(w.ports(), WS, "e2");
    expect(r2).toMatchObject({ outcome: "deferred_quota", reason: "min_interval" });
    w.now = new Date(w.now.getTime() + 46_000);
    expect((await runEnrollmentStep(w.ports(), WS, "e2")).outcome).toBe("sent");
    w.now = new Date(w.now.getTime() + 46_000);
    expect((await runEnrollmentStep(w.ports(), WS, "e3"))).toMatchObject({ outcome: "deferred_quota", reason: "daily_limit" });
    expect(w.sent).toHaveLength(2);
  });
  it("email sem limite configurado bloqueia (não inventa limites)", async () => {
    w.addCampaign("c1", WS, { email_daily_limit: null }); w.addEnrollment("e1", WS, "c1");
    expect((await runEnrollmentStep(w.ports(), WS, "e1")).reason).toBe("quota_not_configured");
  });
});

describe("isolamento de workspace (B10)", () => {
  it("inscrição de outro workspace não é encontrada nem enviada", async () => {
    w.addCampaign("c1", WS_B); w.addEnrollment("e1", WS_B, "c1");
    expect((await runEnrollmentStep(w.ports(), WS, "e1")).outcome).toBe("not_found");
    expect(w.sent).toHaveLength(0);
  });
  it("campanha de outro workspace referenciada pela inscrição é negada", async () => {
    w.addCampaign("cB", WS_B); w.addEnrollment("e1", WS, "cB");
    expect((await runEnrollmentStep(w.ports(), WS, "e1"))).toMatchObject({ outcome: "not_found", reason: "campaign" });
  });
  it("sequência de outro workspace bloqueia", async () => {
    w.addCampaign("c1", WS); w.sequences.get("seq-c1")!.workspace_id = WS_B; w.addEnrollment("e1", WS, "c1");
    expect((await runEnrollmentStep(w.ports(), WS, "e1")).reason).toBe("sequence_not_in_workspace");
  });
  it("quotas são independentes por workspace", async () => {
    w.waThrottle[WS] = { max: 1, min: 45, maxI: 120 }; w.waThrottle[WS_B] = { max: 1, min: 45, maxI: 120 };
    w.addCampaign("c1", WS, {}, [{ channel: "whatsapp" }]); w.addCampaign("c2", WS_B, {}, [{ channel: "whatsapp" }]);
    w.addEnrollment("e1", WS, "c1"); w.addEnrollment("e2", WS_B, "c2");
    expect((await runEnrollmentStep(w.ports(), WS, "e1")).outcome).toBe("sent");
    expect((await runEnrollmentStep(w.ports(), WS_B, "e2")).outcome).toBe("sent");
  });
});
