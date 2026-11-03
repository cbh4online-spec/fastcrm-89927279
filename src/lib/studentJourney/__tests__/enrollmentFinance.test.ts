import { describe, it, expect } from "vitest";
import { agreedAmount, computeEnrollmentFinance, isDuplicateEnrollment } from "../enrollmentFinance";

describe("enrollmentFinance", () => {
  it("valor acordado = base − desconto quando não definido", () => {
    expect(agreedAmount(1200, 200, null)).toBe(1000);
  });

  it("pagamento parcial: pago, vencido e em aberto separados", () => {
    const f = computeEnrollmentFinance(
      1000,
      [
        { amount: 500, paid_amount: 500, due_date: "2026-10-01" },
        { amount: 500, paid_amount: 100, due_date: "2026-10-15" },
      ],
      [],
      "2026-11-03",
    );
    expect(f).toEqual({ contracted: 1000, paid: 600, invoiced: 0, overdue: 400, open: 400 });
  });

  it("a mesma fatura não é contada duas vezes e anuladas não contam", () => {
    const f = computeEnrollmentFinance(1000, [], [
      { invoice_id: "a", allocated_amount: null, invoice_total: 600 },
      { invoice_id: "a", allocated_amount: null, invoice_total: 600 },
      { invoice_id: "b", allocated_amount: null, invoice_total: 400, invoice_status: "cancelled" },
    ], "2026-11-03");
    expect(f.invoiced).toBe(600);
  });

  it("inscrição confirmada sem pagamentos não é considerada faturada", () => {
    expect(computeEnrollmentFinance(800, [], [], "2026-11-03").invoiced).toBe(0);
  });

  it("deteta duplicado na mesma edição, mas não se a anterior foi cancelada", () => {
    const c = { profile_id: "p", cohort_id: "e1" };
    expect(isDuplicateEnrollment([{ ...c, admin_status: "confirmed" }], c)).toBe(true);
    expect(isDuplicateEnrollment([{ ...c, admin_status: "cancelled" }], c)).toBe(false);
    expect(isDuplicateEnrollment([{ profile_id: "p", cohort_id: "e2" }], c)).toBe(false);
  });
});
