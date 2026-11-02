import { describe, it, expect } from "vitest";
import { clientPortalUrl, safePortalNext } from "../portalUrl";

describe("link do portal do cliente", () => {
  it("inclui sempre o workspace atual", () => {
    expect(clientPortalUrl("https://x.pt", "MetodoPare")).toBe("https://x.pt/client/login?workspace=metodopare&next=%2Fclient%2Fwork");
  });
  it("recusa destinos fora do portal", () => {
    expect(safePortalNext("https://evil.com")).toBe("/client/dashboard");
    expect(safePortalNext("/client/work")).toBe("/client/work");
  });
});
