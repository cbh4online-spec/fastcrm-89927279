import { describe, it, expect } from "vitest";
import { decideNextBestAction, canDispatch, type EngineLeadContext } from "@/lib/whatsapp/engine/decide";
import { renderEngineMessage, assertNoUnresolvedVariables } from "@/lib/whatsapp/engine/render";
import { PLAYBOOK_SEEDS, getSeedByCode } from "@/lib/whatsapp/engine/seeds";

const NOW = new Date("2026-09-02T10:00:00.000Z");

function ctx(overrides: Partial<EngineLeadContext> = {}): EngineLeadContext {
  return {
    leadId: "lead-1",
    workspaceId: "ws-1",
    now: NOW,
    createdAt: new Date(NOW.getTime() - 18 * 60000),
    outboundCount: 0,
    hasReplied: false,
    hasPhone: true,
    optedOut: false,
    stopContact: false,
    automationActive: true,
    hasMeeting: false,
    hasProposal: false,
    isLost: false,
    ...overrides,
  };
}

const minsAgo = (m: number) => new Date(NOW.getTime() - m * 60000);

describe("decideNextBestAction — nova lead", () => {
  it("recomenda LEAD_NEW_01 para lead nova de campanha", () => {
    const d = decideNextBestAction(ctx());
    expect(d.action).toBe("SEND_MESSAGE");
    expect(d.templateCode).toBe("LEAD_NEW_01");
  });

  it("recomenda LEAD_NEW_02 após 20 minutos sem resposta", () => {
    const d = decideNextBestAction(ctx({ outboundCount: 1, lastOutboundAt: minsAgo(20) }));
    expect(d.templateCode).toBe("LEAD_NEW_02");
    expect(d.action).toBe("ASK_QUESTION");
  });

  it("aguarda quando a janela ainda não passou", () => {
    const d = decideNextBestAction(ctx({ outboundCount: 1, lastOutboundAt: minsAgo(5) }));
    expect(d.action).toBe("WAIT");
    expect(d.dueAt).toBeTruthy();
  });

  it("progride 03 → 04 → 05 conforme o tempo", () => {
    expect(decideNextBestAction(ctx({ outboundCount: 2, lastOutboundAt: minsAgo(250) })).templateCode).toBe("LEAD_NEW_03");
    expect(decideNextBestAction(ctx({ outboundCount: 3, lastOutboundAt: minsAgo(1500) })).templateCode).toBe("LEAD_NEW_04");
    expect(decideNextBestAction(ctx({ outboundCount: 4, lastOutboundAt: minsAgo(3000) })).templateCode).toBe("LEAD_NEW_05");
  });

  it("passa a nurturing depois da escada esgotada, sem eliminar a lead", () => {
    const d = decideNextBestAction(ctx({ outboundCount: 5, lastOutboundAt: minsAgo(5000) }));
    expect(d.action).toBe("REACTIVATE");
    expect(d.templateCode).toBeNull();
  });

  it('cria follow-up quando a lead diz "agora não"', () => {
    const d = decideNextBestAction(ctx({ outboundCount: 1, hasReplied: true, intent: "postpone" }));
    expect(d.templateCode).toBe("LEAD_NEW_06");
    expect(d.action).toBe("FOLLOW_UP");
  });

  it("respeita o snooze definido pela lead", () => {
    const d = decideNextBestAction(ctx({ snoozeUntil: new Date(NOW.getTime() + 86400000) }));
    expect(d.action).toBe("WAIT");
  });
});

describe("decideNextBestAction — qualificação e estados posteriores", () => {
  it("qualifica por ordem: objetivo → problema → consequência → timing → agendamento", () => {
    const base = ctx({ hasReplied: true, outboundCount: 1 });
    expect(decideNextBestAction(base).templateCode).toBe("QUALIFY_01");
    expect(decideNextBestAction({ ...base, objetivoCliente: "crescer" }).templateCode).toBe("QUALIFY_02");
    expect(
      decideNextBestAction({ ...base, objetivoCliente: "crescer", problemaPrincipal: "sem equipa" }).templateCode,
    ).toBe("QUALIFY_03");
    expect(
      decideNextBestAction({
        ...base,
        objetivoCliente: "crescer",
        problemaPrincipal: "sem equipa",
        consequencia: "perde vendas",
      }).templateCode,
    ).toBe("QUALIFY_04");
    const qualified = decideNextBestAction({
      ...base,
      objetivoCliente: "crescer",
      problemaPrincipal: "sem equipa",
      consequencia: "perde vendas",
      timing: "quente",
    });
    expect(qualified.action).toBe("SCHEDULE_MEETING");
    expect(qualified.templateCode).toBe("QUALIFY_05");
  });

  it("suspende prospeção quando existe reunião agendada", () => {
    expect(decideNextBestAction(ctx({ hasMeeting: true, outboundCount: 2 })).action).toBe("WAIT");
  });

  it("passa a follow-up de proposta quando existe proposta", () => {
    expect(decideNextBestAction(ctx({ hasProposal: true, hasReplied: true })).action).toBe("FOLLOW_UP_PROPOSAL");
  });

  it("para o contacto em opt-out e stop_contact", () => {
    expect(decideNextBestAction(ctx({ optedOut: true })).action).toBe("STOP_CONTACT");
    expect(decideNextBestAction(ctx({ stopContact: true })).action).toBe("STOP_CONTACT");
  });
});

describe("canDispatch — guardas anti-duplicação e anti-corrida", () => {
  it("permite envio no caminho feliz", () => {
    expect(canDispatch(ctx({ outboundCount: 1, lastOutboundAt: minsAgo(30) })).allowed).toBe(true);
  });

  it.each([
    ["lead_replied", { hasReplied: true }],
    ["meeting_scheduled", { hasMeeting: true }],
    ["opted_out", { optedOut: true }],
    ["stop_contact", { stopContact: true }],
    ["automation_paused", { automationActive: false }],
    ["lead_lost", { isLost: true }],
    ["proposal_accepted", { proposalAcceptedAt: NOW.toISOString() }],
    ["snoozed", { snoozeUntil: new Date(NOW.getTime() + 3600000) }],
    ["no_phone", { hasPhone: false }],
  ])("bloqueia por %s", (reason, override) => {
    const r = canDispatch(ctx(override as Partial<EngineLeadContext>));
    expect(r.allowed).toBe(false);
    expect(r.blockReason).toBe(reason);
  });
});

describe("renderEngineMessage", () => {
  const seed = getSeedByCode("LEAD_NEW_01")!;

  it("resolve todas as variáveis quando há contexto completo", () => {
    const r = renderEngineMessage({
      body: seed.messageBody,
      requiredVariables: seed.requiredVariables,
      fallbacks: seed.variableFallbacks,
      values: {
        primeiro_nome: "João",
        comercial: "Ana",
        empresa: "FastCRM",
        produto_interesse: "CRM",
        pergunta_qualificacao_binaria: "é para si ou para a sua equipa?",
      },
    });
    expect(r.canAutoSend).toBe(true);
    expect(r.missing).toHaveLength(0);
    expect(() => assertNoUnresolvedVariables(r.text)).not.toThrow();
    expect(r.text).toContain("João");
  });

  it("bloqueia envio automático e nunca deixa {{variavel}} na mensagem", () => {
    const r = renderEngineMessage({
      body: seed.messageBody,
      requiredVariables: seed.requiredVariables,
      fallbacks: seed.variableFallbacks,
      values: { primeiro_nome: "João" },
    });
    expect(r.canAutoSend).toBe(false);
    expect(r.missing).toContain("comercial");
    expect(r.text).not.toMatch(/\{\{/);
    expect(() => assertNoUnresolvedVariables(r.text)).not.toThrow();
  });

  it("usa fallbacks seguros do playbook", () => {
    const r = renderEngineMessage({
      body: "Sobre {{produto_interesse}}.",
      fallbacks: { produto_interesse: "o que nos pediu" },
      values: {},
    });
    expect(r.text).toBe("Sobre o que nos pediu.");
    expect(r.canAutoSend).toBe(true);
  });
});

describe("seeds do playbook", () => {
  it("tem códigos únicos e mensagens sem variáveis fora do catálogo declarado", () => {
    const codes = PLAYBOOK_SEEDS.map((s) => s.code);
    expect(new Set(codes).size).toBe(codes.length);
    expect(codes).toContain("LEAD_NEW_06");
    expect(codes).toContain("QUALIFY_05");
  });

  it("cada follow-up de nova lead introduz uma razão diferente para responder", () => {
    const bodies = PLAYBOOK_SEEDS.filter((s) => s.family === "lead_new").map((s) => s.messageBody);
    expect(new Set(bodies).size).toBe(bodies.length);
  });
});
