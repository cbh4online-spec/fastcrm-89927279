import { describe, it, expect } from "vitest";
import { countsAsBilledRevenue } from "@/hooks/useWorkspaceFinancials";

describe("countsAsBilledRevenue", () => {
  it("conta faturas FT e faturas-recibo FR", () => {
    expect(countsAsBilledRevenue("invoice")).toBe(true);
    expect(countsAsBilledRevenue("receipt")).toBe(true);
  });
  it("exclui notas de débito e de crédito", () => {
    expect(countsAsBilledRevenue("debit_note")).toBe(false);
    expect(countsAsBilledRevenue("credit_note")).toBe(false);
  });
});
