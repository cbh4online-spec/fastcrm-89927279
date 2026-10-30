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
