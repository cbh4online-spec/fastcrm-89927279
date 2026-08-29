import { describe, it, expect } from "vitest";
import {
  activeStopReason,
  buildOutreachWizard,
  resolveConnectionState,
} from "@/modules/outreach/lib/outreachWizard";
import { maskEmail, maskPhone, maskRef } from "@/modules/outreach/lib/mask";
import type { OutreachCheck, OutreachDraft, OutreachSuppression, OutreachValidation } from "@/modules/outreach/types";

const validation = {
  is_validated: true,
  legal_basis: "legitimate_interest",
  allowed_channels: ["whatsapp"],
} as unknown as OutreachValidation;

const reviewedDraft = { status: "reviewed", body: "Olá" } as unknown as OutreachDraft;

const passingChecks: OutreachCheck[] = [
  { id: "channel_allowed", label: "Canal permitido", passed: true, blocking: true },
  { id: "phone", label: "Telefone válido", passed: true, blocking: true },
];

const base = {
  channel: "whatsapp" as const,
  validation,
  draft: reviewedDraft,
  suppressions: [] as OutreachSuppression[],
  checks: passingChecks,
  lastAttemptOutcome: null,
};

describe("assistente guiado do contacto 1:1", () => {
  it("tem sempre os seis passos pela ordem definida", () => {
    const { steps } = buildOutreachWizard(base);
    expect(steps.map((s) => s.id)).toEqual([
      "validate", "legal_basis", "draft", "review", "prepare", "follow_up",
    ]);
  });

  it("marca 'preparar envio' como passo atual quando tudo está conforme", () => {
    const { currentStep, progress } = buildOutreachWizard(base);
    expect(currentStep).toBe("prepare");
    expect(progress).toBeGreaterThan(50);
  });

  it("bloqueia no primeiro passo quando a entidade não está validada", () => {
    const { steps, currentStep } = buildOutreachWizard({
      ...base,
      validation: { ...validation, is_validated: false } as OutreachValidation,
    });
    expect(currentStep).toBe("validate");
    expect(steps[0].blockedReason).toBeTruthy();
    expect(steps[1].status).toBe("pending");
  });

  it("explica a falta de base legal sem esconder a regra", () => {
    const { steps } = buildOutreachWizard({
      ...base,
      validation: { ...validation, legal_basis: null } as OutreachValidation,
    });
    expect(steps[1].status).toBe("blocked");
    expect(steps[1].blockedReason).toMatch(/base legal/i);
  });

  it("exige revisão humana antes de preparar", () => {
    const { steps } = buildOutreachWizard({
      ...base,
      draft: { status: "draft", body: "Olá" } as unknown as OutreachDraft,
    });
    expect(steps[3].status).toBe("current");
    expect(steps[4].status).toBe("pending");
  });

  it("bloqueia a preparação com opt-out, resposta ou bloqueio", () => {
    for (const reason of ["opt_out", "replied", "blocked"] as const) {
      const { steps } = buildOutreachWizard({
        ...base,
        suppressions: [{ reason } as OutreachSuppression],
      });
      expect(steps[4].status).toBe("blocked");
      expect(steps[4].blockedReason).toBeTruthy();
    }
  });

  it("bloqueia a preparação quando existem checks bloqueantes falhados", () => {
    const { steps } = buildOutreachWizard({
      ...base,
      checks: [{ id: "cooldown", label: "Cooldown", passed: false, blocking: true, detail: "Faltam 5 dias" }],
    });
    expect(steps[4].status).toBe("blocked");
    expect(steps[4].blockedReason).toContain("Faltam 5 dias");
  });

  it("conclui a preparação após uma simulação", () => {
    const { steps } = buildOutreachWizard({ ...base, lastAttemptOutcome: "simulated" });
    expect(steps[4].status).toBe("done");
    expect(steps[5].status).toBe("current");
  });

  it("traduz o motivo de paragem ativa", () => {
    expect(activeStopReason([{ reason: "opt_out" } as OutreachSuppression])).toMatch(/opt-out/i);
    expect(activeStopReason([])).toBeNull();
  });
});

describe("estado da ligação da instância", () => {
  it("não configurada sem instância ou com ligação desligada", () => {
    expect(resolveConnectionState({ linkEnabled: false, linkMode: "simulation", providerConfigured: true }).state)
      .toBe("not_configured");
    expect(resolveConnectionState({ linkEnabled: true, linkMode: "simulation", providerConfigured: false }).state)
      .toBe("not_configured");
  });

  it("pronta para simulação e ativa", () => {
    expect(resolveConnectionState({ linkEnabled: true, linkMode: "simulation", providerConfigured: true }).state)
      .toBe("ready_simulation");
    expect(resolveConnectionState({ linkEnabled: true, linkMode: "live", providerConfigured: true }).state)
      .toBe("active");
  });

  it("erro tem prioridade", () => {
    const r = resolveConnectionState({
      linkEnabled: true, linkMode: "live", providerConfigured: true, lastProviderError: "timeout",
    });
    expect(r.state).toBe("error");
    expect(r.hint).not.toContain("timeout");
  });
});

describe("mascaramento de dados", () => {
  it("mascara telefone, email e referência", () => {
    expect(maskPhone("+351912345678")).not.toContain("2345");
    expect(maskPhone(null)).toBe("—");
    expect(maskEmail("pessoa@exemplo.pt")).toBe("pe••••••@exemplo.pt");
    expect(maskRef("3F3D9135633E21E013156627BE24201D")).toBe("••••201D");
    expect(maskRef(null)).toBe("não configurada");
  });
});
