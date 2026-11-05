import { describe, it, expect } from "vitest";
import { agingRisk, collectionRisk, concentrationRisk, resolveDiagRange } from "../executiveDiagnostics";

const aging = (o: Partial<Record<string, number>>) => ({ total: 0, invoices: 0, not_due: 0, d1_30: 0, d31_60: 0, d61_90: 0, d90_plus: 0, top_debtors: [], ...o });

describe("executiveDiagnostics", () => {
  it("ano corrente vai de 1 jan até amanhã (exclusive)", () => {
    expect(resolveDiagRange("ytd", "2026-11-05")).toEqual({ start: "2026-01-01", end: "2026-11-06" });
  });
  it("últimos 12 meses e ano anterior", () => {
    expect(resolveDiagRange("last_12m", "2026-11-05")).toEqual({ start: "2025-11-06", end: "2026-11-06" });
    expect(resolveDiagRange("last_year", "2026-11-05")).toEqual({ start: "2025-01-01", end: "2026-01-01" });
  });
  it("concentração: top 3 acima de 30% é aviso e acima de 50% é crítico", () => {
    expect(concentrationRisk(30)).toBe("ok");
    expect(concentrationRisk(31)).toBe("warning");
    expect(concentrationRisk(51)).toBe("critical");
  });
  it("cobrança abaixo de 95% é aviso e abaixo de 80% é crítico", () => {
    expect(collectionRisk(96)).toBe("ok");
    expect(collectionRisk(90)).toBe("warning");
    expect(collectionRisk(79)).toBe("critical");
  });
  it("saldos com mais de 60 dias acima de 20% do total são críticos", () => {
    expect(agingRisk(aging({ total: 100, d90_plus: 21 }))).toBe("critical");
    expect(agingRisk(aging({ total: 100, d61_90: 15 }))).toBe("warning");
    expect(agingRisk(aging({ total: 100, d1_30: 50 }))).toBe("ok");
  });
});

import { dormantRisk, isOverdueVsHabit, smallTicketRisk } from "../executiveDiagnostics";
describe("comportamento de compra", () => {
  it("parado há mais do dobro do intervalo habitual (mínimo 60 dias)", () => {
    expect(isOverdueVsHabit(70, 30)).toBe(true);
    expect(isOverdueVsHabit(55, 20)).toBe(false);
    expect(isOverdueVsHabit(100, 60)).toBe(false);
    expect(isOverdueVsHabit(95, null)).toBe(true);
  });
  it("faturas abaixo de 100 €: >50% aviso, >70% crítico", () => {
    const t = (small: number) => ({ count: 100, avg: 0, median: 0, buckets: [{ key: "lt100" as const, count: small, value: 0 }] });
    expect(smallTicketRisk(t(50))).toBe("ok");
    expect(smallTicketRisk(t(60))).toBe("warning");
    expect(smallTicketRisk(t(71))).toBe("critical");
  });
  it("valor em risco face à faturação: >10% aviso, >20% crítico", () => {
    expect(dormantRisk(10, 100)).toBe("ok");
    expect(dormantRisk(15, 100)).toBe("warning");
    expect(dormantRisk(25, 100)).toBe("critical");
  });
});
