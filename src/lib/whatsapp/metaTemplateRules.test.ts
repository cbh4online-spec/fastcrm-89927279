import { describe, it, expect } from "vitest";
import { validateMetaTemplate, toMetaTemplateName, buildMetaComponents } from "../../../supabase/functions/_shared/metaTemplateRules";

const base = { name: "aviso_fatura", category: "UTILITY" as const, language: "pt_PT", body: "Olá {{1}}, a sua fatura {{2}} já está disponível na sua área de cliente. Obrigado.", examples: ["Ana", "FT 2026/12"] };

describe("modelos Meta", () => {
  it("aceita um modelo válido", () => expect(validateMetaTemplate(base)).toEqual([]));
  it("exige exemplo por variável", () => expect(validateMetaTemplate({ ...base, examples: ["Ana"] }).length).toBeGreaterThan(0));
  it("recusa nome com maiúsculas", () => expect(validateMetaTemplate({ ...base, name: "Aviso" }).length).toBeGreaterThan(0));
  it("recusa variáveis saltadas", () => expect(validateMetaTemplate({ ...base, body: base.body.replace("{{2}}", "{{3}}"), examples: ["a", "b", "c"] }).length).toBeGreaterThan(0));
  it("converte nome", () => expect(toMetaTemplateName("Confirmação Reunião")).toBe("confirmacao_reuniao"));
  it("inclui exemplos no corpo", () => expect(buildMetaComponents(base)[0]).toMatchObject({ type: "BODY", example: { body_text: [["Ana", "FT 2026/12"]] } }));
});

import { validateMetaTemplateFields as vf, buildMetaComponents as bc, canSendTemplate } from "../../../supabase/functions/_shared/metaTemplateRules";
describe("gestor de modelos Meta", () => {
  const base = { name: "aviso", category: "UTILITY" as const, language: "pt_PT", body: "Olá, a sua encomenda já seguiu e chega em breve.", examples: [] };
  it("rejeita resposta rápida com mais de 25 caracteres", () => {
    expect(vf({ ...base, buttons: [{ type: "QUICK_REPLY", text: "x".repeat(26) }] }).buttons?.length).toBeGreaterThan(0);
  });
  it("rejeita mais de 2 botões de website", () => {
    const u = { type: "URL" as const, url: "https://a.pt" };
    expect(vf({ ...base, buttons: [{ ...u, text: "A" }, { ...u, text: "B" }, { ...u, text: "C" }] }).buttons).toContain("No máximo 2 botões de website.");
  });
  it("exige ficheiro para cabeçalho de imagem", () => {
    expect(vf({ ...base, headerType: "IMAGE" }).header).toBeTruthy();
    expect(vf({ ...base, headerType: "IMAGE", headerHandle: "h1" }).header).toBeUndefined();
  });
  it("autenticação usa botão OTP e não texto livre", () => {
    const c = bc({ ...base, category: "AUTHENTICATION", body: "" }) as any[];
    expect(c.find((x) => x.type === "BUTTONS").buttons[0].type).toBe("OTP");
  });
  it("bloqueia envio de modelo não aprovado", () => {
    expect(canSendTemplate({ status: "PENDING", category: "UTILITY", optedOut: false, marketingConsent: true }).ok).toBe(false);
  });
  it("bloqueia marketing sem consentimento e permite utilidade", () => {
    expect(canSendTemplate({ status: "APPROVED", category: "MARKETING", optedOut: false, marketingConsent: false }).ok).toBe(false);
    expect(canSendTemplate({ status: "APPROVED", category: "UTILITY", optedOut: false, marketingConsent: false }).ok).toBe(true);
  });
  it("bloqueia contacto com opt-out", () => {
    expect(canSendTemplate({ status: "APPROVED", category: "UTILITY", optedOut: true, marketingConsent: true }).ok).toBe(false);
  });
});

import { metaTemplateDeletePath } from "../../../supabase/functions/_shared/metaTemplateRules";
describe("apagar modelo na Meta", () => {
  it("com ID apaga só esse idioma", () => {
    expect(metaTemplateDeletePath("aviso_fatura", "123")).toBe("/message_templates?hsm_id=123&name=aviso_fatura");
  });
  it("sem ID usa só o nome", () => {
    expect(metaTemplateDeletePath("aviso_fatura", null)).toBe("/message_templates?name=aviso_fatura");
  });
});
