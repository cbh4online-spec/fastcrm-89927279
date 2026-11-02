import { describe, it, expect } from "vitest";
import { clientPortalUrl, safePortalNext } from "../portalUrl";
import { getPublicBaseUrl } from "@/utils/getPublicDomain";

/** Troca o host visto pela app só dentro de `run`, para testar a origem do link. */
function withHost(hostname: string, origin: string, run: () => void) {
  const original = window.location;
  const fake = { hostname, origin, href: `${origin}/`, pathname: "/", search: "", hash: "" };
  Object.defineProperty(window, "location", { configurable: true, writable: true, value: fake });
  try {
    run();
  } finally {
    Object.defineProperty(window, "location", { configurable: true, writable: true, value: original });
  }
}

describe("link do portal do cliente", () => {
  it("inclui sempre o workspace atual", () => {
    expect(clientPortalUrl("https://x.pt", "MetodoPare")).toBe("https://x.pt/client/login?workspace=metodopare&next=%2Fclient%2Fwork");
  });
  it("recusa destinos fora do portal", () => {
    expect(safePortalNext("https://evil.com")).toBe("/client/dashboard");
    expect(safePortalNext("/client/work")).toBe("/client/work");
  });
  it("usa o domínio público quando aberto em pré-visualização", () => {
    withHost("3e82dfd9-5dc3-4dce-a5e9-5df3fbacfa91.lovableproject.com", "https://3e82dfd9-5dc3-4dce-a5e9-5df3fbacfa91.lovableproject.com", () => {
      const url = clientPortalUrl(getPublicBaseUrl(), "metodopare");
      expect(url.startsWith("https://fastcrm.metodopare.ai/client/login?")).toBe(true);
      expect(url).not.toContain("lovableproject.com");
    });
  });
  it("mantém o domínio próprio quando já está no domínio customizado", () => {
    withHost("fastcrm.metodopare.ai", "https://fastcrm.metodopare.ai", () => {
      expect(clientPortalUrl(getPublicBaseUrl(), "metodopare")).toBe(
        "https://fastcrm.metodopare.ai/client/login?workspace=metodopare&next=%2Fclient%2Fwork",
      );
    });
  });
});
