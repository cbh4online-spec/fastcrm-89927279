import { describe, it, expect } from "vitest";
import { shortDocKey } from "../useWorkspaceFinancials";

describe("shortDocKey", () => {
  it("SAF-T e cópia sincronizada dão a mesma chave", () => {
    expect(shortDocKey("FT V100.02/4630")).toBe("V100/4630");
    expect(shortDocKey("V100/4630")).toBe("V100/4630");
  });
  it("séries diferentes não coincidem", () => {
    expect(shortDocKey("FT V102.01/119")).not.toBe(shortDocKey("V100/119"));
  });
});
