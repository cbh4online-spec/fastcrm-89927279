import { describe, it, expect } from "vitest";
import { evaluateOutreachEligibility } from "@/modules/outreach/hooks/useOutreach";
import type { OutreachDraft, OutreachValidation } from "@/modules/outreach/types";

const limits = { daily_limit: 20, per_company_limit: 2, cooldown_days: 14 };

const validation = {
  is_validated: true,
  legal_basis: "legitimate_interest",
  consent_source: "contrato",
  allowed_channels: ["email", "whatsapp"],
} as unknown as OutreachValidation;

const draft = { status: "reviewed" } as unknown as OutreachDraft;

const base = {
  channel: "email" as const,
  validation,
  suppressions: [],
  email: "pessoa@exemplo.pt",
  phone: "+351912345678",
  socialUrl: null,
  whatsappAvailable: true,
  draft,
  usage: { todayCount: 0, companyCount: 0, lastContactAt: null },
  limits,
};

describe("elegibilidade de contacto 1:1", () => {
  it("permite quando tudo está conforme", () => {
    expect(evaluateOutreachEligibility(base).allowed).toBe(true);
  });

  it("bloqueia sem validação", () => {
    const r = evaluateOutreachEligibility({
      ...base,
      validation: { ...validation, is_validated: false } as OutreachValidation,
    });
    expect(r.allowed).toBe(false);
  });

  it("bloqueia com opt-out", () => {
    const r = evaluateOutreachEligibility({
      ...base,
      suppressions: [{ reason: "opt_out" } as any],
    });
    expect(r.allowed).toBe(false);
  });

  it("bloqueia rascunho não revisto", () => {
    const r = evaluateOutreachEligibility({ ...base, draft: { status: "draft" } as any });
    expect(r.allowed).toBe(false);
  });

  it("bloqueia dentro do cooldown de 14 dias", () => {
    const r = evaluateOutreachEligibility({
      ...base,
      usage: { todayCount: 0, companyCount: 0, lastContactAt: new Date(Date.now() - 3 * 86400000).toISOString() },
    });
    expect(r.allowed).toBe(false);
  });

  it("bloqueia acima do limite diário e por empresa", () => {
    expect(evaluateOutreachEligibility({ ...base, usage: { todayCount: 20, companyCount: 0, lastContactAt: null } }).allowed).toBe(false);
    expect(evaluateOutreachEligibility({ ...base, usage: { todayCount: 0, companyCount: 2, lastContactAt: null } }).allowed).toBe(false);
  });

  it("bloqueia canal não autorizado e email inválido", () => {
    expect(evaluateOutreachEligibility({ ...base, channel: "social", socialUrl: "https://x" }).allowed).toBe(false);
    expect(evaluateOutreachEligibility({ ...base, email: "invalido" }).allowed).toBe(false);
  });

  it("WhatsApp sem canal ligado continua possível via wa.me (aviso não bloqueante)", () => {
    const r = evaluateOutreachEligibility({ ...base, channel: "whatsapp", whatsappAvailable: false });
    expect(r.allowed).toBe(true);
    expect(r.checks.find((c) => c.id === "wa_channel")?.passed).toBe(false);
  });
});
