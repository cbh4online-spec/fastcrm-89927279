import { describe, it, expect } from "vitest";
import { buildRevolutLink, buildManualMessage } from "@/lib/renewals/manualPayment";
describe("manualPayment", () => {
  it("acrescenta o valor a um link revolut.me base", () => {
    expect(buildRevolutLink("revolut.me/empresa", 49.9)).toBe("https://revolut.me/empresa/49.90");
  });
  it("mantém links completos", () => {
    expect(buildRevolutLink("https://checkout.revolut.com/pay/abc", 10)).toBe("https://checkout.revolut.com/pay/abc");
  });
  it("extrai o link quando se cola a mensagem da Revolut", () => {
    expect(buildRevolutLink("Jorge enviou-lhe 50 €. Pode pagar através de: https://checkout.revolut.com/pay/c87e", 50)).toBe("https://checkout.revolut.com/pay/c87e");
  });
  it("inclui título e linhas dos itens", () => {
    const m = buildManualMessage({ method: "mbway", clientName: "Ana", amountLabel: "50,00 €", reference: "AB", phone: "912", title: "Renovação mensal", lines: [{ name: "Plano Pro", qty: 1, amountLabel: "25,00 €" }] });
    expect(m.startsWith("*Renovação mensal*")).toBe(true);
    expect(m).toContain("• Plano Pro — 25,00 €");
  });
});
