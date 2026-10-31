import { describe, it, expect } from "vitest";
import {
  computeMonthMetrics,
  computeVatByRate,
  isOpenCollectionCase,
  lisbonMonthKey,
} from "../ixDashboardMetrics";

const NOW = new Date("2026-10-31T23:30:00Z"); // já é 31/10 em Lisboa (UTC+0)

describe("painel inicial — mês corrente", () => {
  it("usa o mês de Lisboa", () => {
    expect(lisbonMonthKey(new Date("2026-06-30T23:30:00Z"))).toBe("2026-07");
  });

  it("ignora anulados, rascunhos e notas de crédito/débito", () => {
    const m = computeMonthMetrics(
      [
        { status: "paid", document_type: "invoice", issue_date: "2026-10-05", total: 100, amount_paid: 100 },
        { status: "cancelled", document_type: "invoice", issue_date: "2026-10-05", total: 50, amount_paid: 0 },
        { status: "draft", document_type: "invoice", issue_date: "2026-10-05", total: 30 },
        { status: "paid", document_type: "credit_note", issue_date: "2026-10-05", total: 20, amount_paid: 20 },
        { status: "paid", document_type: "invoice", issue_date: "2026-09-30", total: 999, amount_paid: 999 },
      ],
      NOW,
    );
    expect(m).toEqual({ count: 1, total: 100, paid: 100, outstanding: 0 });
  });
});

describe("painel inicial — IVA", () => {
  it("exclui anulados e abate notas de crédito", () => {
    const v = computeVatByRate([
      { status: "paid", document_type: "invoice", issue_date: "2026-10-01", tax_rate: 23, subtotal: 100, tax_amount: 23 },
      { status: "cancelled", document_type: "invoice", issue_date: "2026-10-01", tax_rate: 23, subtotal: 100, tax_amount: 23 },
      { status: "paid", document_type: "credit_note", issue_date: "2026-10-01", tax_rate: 23, subtotal: 10, tax_amount: 2.3 },
    ]);
    expect(v.totalVat).toBeCloseTo(20.7);
    expect(v.documents).toBe(2);
  });
});

describe("painel inicial — cobranças", () => {
  it("casos pagos ou fechados não contam como abertos", () => {
    expect(isOpenCollectionCase("closed")).toBe(false);
    expect(isOpenCollectionCase("paid")).toBe(false);
    expect(isOpenCollectionCase("in_progress")).toBe(true);
  });
});
