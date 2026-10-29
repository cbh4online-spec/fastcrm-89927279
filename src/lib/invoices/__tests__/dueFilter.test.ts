import { describe, it, expect } from "vitest";
import { matchesDueFilter } from "../dueFilter";
const now = new Date("2026-10-29T12:00:00Z");
describe("matchesDueFilter", () => {
  it("vencida", () => expect(matchesDueFilter({ total: 100, amount_paid: 0, due_date: "2026-10-28" }, "overdue", now)).toBe(true));
  it("dentro do prazo (vence hoje)", () => {
    const inv = { total: 100, amount_paid: 20, due_date: "2026-10-29" };
    expect(matchesDueFilter(inv, "not_due", now)).toBe(true);
    expect(matchesDueFilter(inv, "overdue", now)).toBe(false);
  });
  it("paga não é dívida", () => {
    const inv = { total: 100, amount_paid: 100, due_date: "2026-01-01" };
    expect(matchesDueFilter(inv, "overdue", now)).toBe(false);
    expect(matchesDueFilter(inv, "paid", now)).toBe(true);
  });
  it("nota de crédito excluída", () =>
    expect(matchesDueFilter({ total: 50, amount_paid: 0, due_date: "2026-01-01", document_type: "credit_note" }, "overdue", now)).toBe(false));
});
