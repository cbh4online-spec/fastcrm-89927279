import { describe, expect, it } from "vitest";
import { portalRetainerUsage } from "../retainerSummary";

describe("saldo mensal do portal", () => {
  it("projetos e suporte partilham as 30 horas da avença", () => {
    const usage = portalRetainerUsage({ id: "r", name: "Campanhas", included_hours: 30,
      entries: [{ source: "project", minutes: 120, billable: true }, { source: "ticket", minutes: 60, billable: true }] });
    expect(usage.usedMinutes).toBe(180);
    expect(usage.remainingMinutes).toBe(1620);
  });
  it("tempo não faturável não abate no plafond", () => {
    expect(portalRetainerUsage({ id: "r", name: "Campanhas", included_hours: 30,
      entries: [{ source: "project", minutes: 60, billable: false }] }).remainingMinutes).toBe(1800);
  });
  it("horas acima do plafond aparecem como extra, sem saldo negativo", () => {
    const usage = portalRetainerUsage({ id: "r", name: "Campanhas", included_hours: 30,
      entries: [{ source: "ticket", minutes: 1860, billable: true }] });
    expect(usage.remainingMinutes).toBe(0);
    expect(usage.overageMinutes).toBe(60);
  });
});