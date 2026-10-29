import { describe, it, expect } from "vitest";
import { computeRelatedDebt } from "../relatedDebt";

describe("computeRelatedDebt", () => {
  it("soma faturas e ND em aberto, ignora NC e pagas", () => {
    const r = computeRelatedDebt(
      [
        { company_id: "b", total: 240.62, amount_paid: 0, status: "sent", document_type: "invoice", due_date: "2026-10-08" },
        { company_id: "b", total: 19.63, amount_paid: 0, status: "sent", document_type: "invoice", due_date: "2026-10-08" },
        { company_id: "b", total: 50, amount_paid: 0, status: "sent", document_type: "credit_note", due_date: null },
        { company_id: "b", total: 890, amount_paid: 890, status: "paid", document_type: "invoice", due_date: null },
      ],
      "2026-10-29",
    );
    expect(r).toHaveLength(1);
    expect(r[0].outstanding).toBeCloseTo(260.25);
    expect(r[0].overdue).toBeCloseTo(260.25);
  });
});
