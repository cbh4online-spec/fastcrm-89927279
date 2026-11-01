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

import { isRetainerBillableMonth } from "@/lib/retainers/retainerUsage";
describe("avença: mensalidade só em meses ativos", () => {
  const r = { status: "active", start_date: "2026-12-01", end_date: null };
  it("mês antes do início não tem mensalidade", () => expect(isRetainerBillableMonth(r, "2026-11")).toBe(false));
  it("mês de início tem mensalidade", () => expect(isRetainerBillableMonth(r, "2026-12")).toBe(true));
  it("depois do fim não tem mensalidade", () => expect(isRetainerBillableMonth({ ...r, end_date: "2027-03-15" }, "2027-04")).toBe(false));
  it("pausada não tem mensalidade", () => expect(isRetainerBillableMonth({ ...r, status: "paused" }, "2026-12")).toBe(false));
});

import { buildRetainerInvoiceLines, retainerInvoiceTag } from "@/lib/retainers/retainerUsage";
describe("rascunho de fatura da avença", () => {
  const r = { name: "Pharliss", monthly_fee: 300, overage_hourly_rate: 40 };
  it("inclui mensalidade e horas extra (90 min = 1,5 h × 40 €)", () => {
    const l = buildRetainerInvoiceLines(r, "2026-11", { overageMinutes: 90 }, true);
    expect(l.map((x) => [x.quantity, x.unit_price])).toEqual([[1, 300], [1.5, 40]]);
  });
  it("mês não faturável: só horas extra", () => {
    const l = buildRetainerInvoiceLines(r, "2026-11", { overageMinutes: 60 }, false);
    expect(l).toHaveLength(1); expect(l[0].unit_price).toBe(40);
  });
  it("sem extra nem mensalidade: nada a faturar", () => {
    expect(buildRetainerInvoiceLines(r, "2026-11", { overageMinutes: 0 }, false)).toEqual([]);
  });
  it("marcador é único por avença e mês", () => {
    expect(retainerInvoiceTag("a", "2026-11")).not.toBe(retainerInvoiceTag("a", "2026-12"));
  });
});

describe("IVA escolhido no rascunho", () => {
  it("aplica a taxa escolhida (6%) a todas as linhas", () => {
    const l = buildRetainerInvoiceLines({ name: "X", monthly_fee: 100, overage_hourly_rate: 40 }, "2026-11", { overageMinutes: 60 }, true, 6);
    expect(l.map((x) => x.tax_rate)).toEqual([6, 6]);
  });
  it("isento (0%) fica a 0", () => {
    const l = buildRetainerInvoiceLines({ name: "X", monthly_fee: 100, overage_hourly_rate: 40 }, "2026-11", { overageMinutes: 0 }, true, 0);
    expect(l[0].tax_rate).toBe(0);
  });
});
