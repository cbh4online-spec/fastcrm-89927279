import { describe, it, expect } from "vitest";
import {
  classifyInboundEvent,
  detectOptOut,
  evaluateSendGuards,
  resolveSendMode,
  type GuardInput,
} from "../../../supabase/functions/_shared/outreach-guards";

const base: GuardInput = {
  channel: "whatsapp",
  phone: "+351912345678",
  validation: { is_validated: true, legal_basis: "legitimate_interest", allowed_channels: ["whatsapp"] },
  suppressions: [],
  draft: { id: "d1", status: "reviewed", body: "Olá" },
  usage: { todayCount: 0, companyCount: 0, lastContactAt: null },
  limits: { daily_limit: 20, per_company_limit: 2, cooldown_days: 14 },
};

describe("guardas de envio outreach", () => {
  it("permite quando todos os checks passam", () => {
    expect(evaluateSendGuards(base).allowed).toBe(true);
  });

  it("bloqueia sem validação e sem base legal", () => {
    const r = evaluateSendGuards({ ...base, validation: { is_validated: false, legal_basis: null, allowed_channels: [] } });
    expect(r.allowed).toBe(false);
    expect(r.failures.map((f) => f.id)).toEqual(
      expect.arrayContaining(["validated", "legal_basis", "channel_allowed"]),
    );
  });

  it("bloqueia com rascunho não revisto", () => {
    const r = evaluateSendGuards({ ...base, draft: { id: "d1", status: "draft", body: "Olá" } });
    expect(r.failures.some((f) => f.id === "reviewed")).toBe(true);
  });

  it("bloqueia com supressão activa (opt-out, resposta ou bloqueio)", () => {
    for (const reason of ["opt_out", "replied", "blocked", "manual"]) {
      const r = evaluateSendGuards({ ...base, suppressions: [{ reason }] });
      expect(r.allowed).toBe(false);
      expect(r.failures.some((f) => f.id === "suppression")).toBe(true);
    }
  });

  it("bloqueia dentro do cooldown e liberta depois", () => {
    const recent = new Date(Date.now() - 3 * 24 * 3600 * 1000).toISOString();
    expect(evaluateSendGuards({ ...base, usage: { ...base.usage, lastContactAt: recent } }).allowed).toBe(false);
    const old = new Date(Date.now() - 30 * 24 * 3600 * 1000).toISOString();
    expect(evaluateSendGuards({ ...base, usage: { ...base.usage, lastContactAt: old } }).allowed).toBe(true);
  });

  it("bloqueia por limite diário e por empresa", () => {
    expect(evaluateSendGuards({ ...base, usage: { ...base.usage, todayCount: 20 } }).allowed).toBe(false);
    expect(evaluateSendGuards({ ...base, usage: { ...base.usage, companyCount: 2 } }).allowed).toBe(false);
  });

  it("bloqueia telefone inválido no canal WhatsApp", () => {
    expect(evaluateSendGuards({ ...base, phone: "123" }).allowed).toBe(false);
  });
});

describe("modo do adaptador (bloqueado por defeito)", () => {
  const guardsOk = { allowed: true, failures: [] };

  it("bloqueia sem ligação configurada", () => {
    expect(resolveSendMode({ guards: guardsOk, link: null }).action).toBe("blocked");
  });

  it("bloqueia com ligação desactivada ou em modo disabled", () => {
    expect(resolveSendMode({ guards: guardsOk, link: { enabled: false, mode: "live" } }).action).toBe("blocked");
    expect(resolveSendMode({ guards: guardsOk, link: { enabled: true, mode: "disabled" } }).action).toBe("blocked");
  });

  it("simula quando em modo simulação", () => {
    expect(resolveSendMode({ guards: guardsOk, link: { enabled: true, mode: "simulation" } }).action).toBe("simulated");
  });

  it("bloqueia modo live sem instância conectada", () => {
    const r = resolveSendMode({ guards: guardsOk, link: { enabled: true, mode: "live" }, connectionStatus: "disconnected" });
    expect(r.action).toBe("blocked");
    expect(r.reason).toBe("provider_not_connected");
  });

  it("nunca permite envio quando os guardas falham, mesmo em live", () => {
    const r = resolveSendMode({
      guards: { allowed: false, failures: [{ id: "opt_out", reason: "x" }] },
      link: { enabled: true, mode: "live" },
      connectionStatus: "connected",
    });
    expect(r.action).toBe("blocked");
  });
});

describe("webhook — classificação de eventos inbound", () => {
  it("deteta opt-out em português e inglês", () => {
    expect(detectOptOut("Não quero receber mais mensagens")).toBe(true);
    expect(detectOptOut("STOP")).toBe(true);
    expect(detectOptOut("Bom dia, obrigado")).toBe(false);
  });

  it("resposta normal gera supressão 'replied'", () => {
    expect(classifyInboundEvent({ type: "message", text: "Bom dia" }).suppression).toBe("replied");
  });

  it("opt-out gera supressão 'opt_out'", () => {
    expect(classifyInboundEvent({ type: "message", text: "unsubscribe" }).suppression).toBe("opt_out");
  });

  it("bloqueio gera supressão 'blocked'", () => {
    expect(classifyInboundEvent({ type: "block" }).suppression).toBe("blocked");
  });

  it("eventos de estado não criam supressão", () => {
    expect(classifyInboundEvent({ type: "status", status: "DELIVERED" }).suppression).toBeNull();
  });
});

describe("fail-closed — envio real desativado", () => {
  const guardsOk = { allowed: true, failures: [] };

  it("bloqueia modo ausente ou desconhecido", () => {
    expect(resolveSendMode({ guards: guardsOk, link: { enabled: true, mode: undefined as never } }).action).toBe("blocked");
    expect(resolveSendMode({ guards: guardsOk, link: { enabled: true, mode: "LIVE" as never } }).action).toBe("blocked");
  });

  it("bloqueia enabled não booleano verdadeiro", () => {
    expect(resolveSendMode({ guards: guardsOk, link: { enabled: "true" as never, mode: "live" } }).action).toBe("blocked");
  });

  it("nunca despacha para a Z-API com a flag de envio real desligada", async () => {
    const src = await import("node:fs").then((fs) =>
      fs.readFileSync("supabase/functions/outreach-zapi-send/index.ts", "utf8"),
    );
    expect(src).toContain("const LIVE_DISPATCH_ENABLED = false;");
    expect(src).not.toContain("zapiCall");
    expect(src).not.toContain("send-text");
  });

  it("o webhook não aceita segredos em query string", async () => {
    const src = await import("node:fs").then((fs) =>
      fs.readFileSync("supabase/functions/outreach-zapi-webhook/index.ts", "utf8"),
    );
    expect(src).toContain("secret_in_query_string_not_allowed");
    expect(src).not.toContain("searchParams.get('secret')");
  });
});
