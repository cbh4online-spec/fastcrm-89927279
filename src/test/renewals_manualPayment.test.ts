import { describe, it, expect } from "vitest";
import { buildRevolutLink } from "@/lib/renewals/manualPayment";
describe("buildRevolutLink", () => {
  it("acrescenta o valor a um link revolut.me base", () => {
    expect(buildRevolutLink("revolut.me/empresa", 49.9)).toBe("https://revolut.me/empresa/49.90");
  });
  it("mantém links manuais completos", () => {
    expect(buildRevolutLink("https://checkout.revolut.com/pay/abc", 10)).toBe("https://checkout.revolut.com/pay/abc");
  });
});
