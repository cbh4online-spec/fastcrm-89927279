import { describe, it, expect } from "vitest";
import { computeRetainerUsage, entriesInMonth, lisbonDate, parseDurationInput, type RetainerEntry } from "@/lib/retainers/retainerUsage";

const e = (p: Partial<RetainerEntry>): RetainerEntry => ({
  id: Math.random().toString(), source: "project", date: "2026-11-10", minutes: 60, billable: true,
  description: null, userId: null, parentId: "x", parentLabel: "x", ...p,
});

describe("avença: consumo mensal", () => {
  it("soma projeto e suporte contra o plafond", () => {
    const u = computeRetainerUsage([e({ minutes: 600 }), e({ source: "ticket", minutes: 120 })], 20, 40);
    expect(u.usedMinutes).toBe(720);
    expect(u.remainingMinutes).toBe(480);
    expect(u.overageMinutes).toBe(0);
  });

  it("acima do plafond continua a contar e valoriza horas extra à taxa", () => {
    const u = computeRetainerUsage([e({ minutes: 20 * 60 }), e({ source: "ticket", minutes: 90 })], 20, 40);
    expect(u.overageMinutes).toBe(90);
    expect(u.overageCost).toBe(60);
    expect(u.remainingMinutes).toBe(0);
    expect(u.level).toBe("over");
  });

  it("tempo não faturável não consome o plafond", () => {
    const u = computeRetainerUsage([e({ minutes: 300, billable: false })], 10, 40);
    expect(u.usedMinutes).toBe(0);
    expect(u.nonBillableMinutes).toBe(300);
  });

  it("sem acumulação: só conta o mês pedido", () => {
    const list = [e({ date: "2026-10-31", minutes: 600 }), e({ date: "2026-11-01", minutes: 60 })];
    expect(entriesInMonth(list, "2026-11").length).toBe(1);
  });

  it("registo às 23:30 UTC de 31/10 conta já em novembro? não — Lisboa é UTC+0 no inverno", () => {
    expect(lisbonDate("2026-10-31T23:30:00Z")).toBe("2026-10-31");
    expect(lisbonDate("2026-07-31T23:30:00Z")).toBe("2026-08-01");
  });

  it("interpreta durações", () => {
    expect(parseDurationInput("1:30")).toBe(90);
    expect(parseDurationInput("1h30")).toBe(90);
    expect(parseDurationInput("1,5")).toBe(90);
    expect(parseDurationInput("45m")).toBe(45);
    expect(parseDurationInput("abc")).toBeNull();
  });
});
