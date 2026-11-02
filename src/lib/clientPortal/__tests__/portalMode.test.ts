import { describe, it, expect } from "vitest";
import { portalModeFor, isAllowedInServicesPortal } from "../portalMode";

describe("portal do cliente por tipo de workspace", () => {
  it("Método PARE usa o portal de serviços e a Pharliss o de loja", () => {
    expect(portalModeFor("d9e3d0ae-5893-41e9-97f3-7d7ce6a06f0f")).toBe("services");
    expect(portalModeFor("0662fc16-6286-4156-a908-08c7dfec0fb7")).toBe("store");
    expect(portalModeFor(null)).toBe("store");
  });
  it("o portal de serviços nunca mostra loja nem diagnóstico", () => {
    for (const p of ["/client/dashboard", "/client/catalog", "/client/cart", "/client/orders", "/client/diagnosis", "/client/protocol/1"]) {
      expect(isAllowedInServicesPortal(p)).toBe(false);
    }
    expect(isAllowedInServicesPortal("/client/work")).toBe(true);
    expect(isAllowedInServicesPortal("/client/support/abc")).toBe(true);
  });
});
