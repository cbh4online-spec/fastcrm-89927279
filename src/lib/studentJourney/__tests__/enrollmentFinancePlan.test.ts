import { describe, it, expect } from "vitest";
import { allocatePayment, buildInstallmentPlan, computeEnrollmentFinance, deriveFinancialStatus, planMatchesAgreed } from "../enrollmentFinance";

describe("Fase D — plano e pagamentos", () => {
  it("divide 1000 € em 3 prestações sem perder cêntimos", () => {
    const p = buildInstallmentPlan(1000, 3, "2026-01-31");
    expect(p.map((x) => x.amount)).toEqual([333.33, 333.33, 333.34]);
    expect(p.map((x) => x.due_date)).toEqual(["2026-01-31", "2026-02-28", "2026-03-31"]);
    expect(planMatchesAgreed(p, 1000)).toBe(true);
  });
  it("pagamento parcial de 100 € numa prestação de 300 € deixa 200 € em aberto e estado Parcial", () => {
    const inst = allocatePayment([{ amount: 300, due_date: "2026-12-01" }], 100);
    expect(inst[0].paid_amount).toBe(100);
    expect(computeEnrollmentFinance(300, inst, [], "2026-11-03").open).toBe(200);
    expect(deriveFinancialStatus(inst, "2026-11-03")).toBe("parcial");
  });
  it("prestação vencida por pagar fica Em atraso", () => {
    expect(deriveFinancialStatus([{ amount: 300, paid_amount: 0, due_date: "2026-10-01" }], "2026-11-03")).toBe("em_atraso");
  });
  it("sem prestações = Sem plano", () => {
    expect(deriveFinancialStatus([], "2026-11-03")).toBe("sem_plano");
  });
  it("inscrição paga sem fatura associada mostra 0 € faturado", () => {
    const f = computeEnrollmentFinance(300, [{ amount: 300, paid_amount: 300, due_date: "2026-10-01" }], [], "2026-11-03");
    expect(f.invoiced).toBe(0);
    expect(f.paid).toBe(300);
  });
  it("fatura ligada duas vezes conta uma vez; pró-forma não conta", () => {
    const f = computeEnrollmentFinance(300, [], [
      { invoice_id: "a", allocated_amount: 300, invoice_total: 300, invoice_status: "paid" },
      { invoice_id: "a", allocated_amount: 300, invoice_total: 300, invoice_status: "paid" },
      { invoice_id: "b", allocated_amount: null, invoice_total: 50, invoice_status: "proforma" },
    ], "2026-11-03");
    expect(f.invoiced).toBe(300);
  });
});
