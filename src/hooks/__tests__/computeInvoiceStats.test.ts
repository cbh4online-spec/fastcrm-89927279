import { describe, it, expect } from "vitest";
import { computeInvoiceStats } from "@/hooks/useDashboardInvoices";

describe("computeInvoiceStats", () => {
  it("conta todas as faturas, não só as primeiras 1000", () => {
    const invoices = Array.from({ length: 6322 }, () => ({ status: "paid", total: 1 }));
    const s = computeInvoiceStats(invoices);
    expect(s.totalPaid).toBe(6322);
    expect(s.amountPaid).toBe(6322);
  });

  it("separa por estado", () => {
    const s = computeInvoiceStats([
      { status: "draft", total: 10 },
      { status: "overdue", total: "20.5" },
      { status: "partially_paid", total: 5 },
    ]);
    expect(s.totalDraft).toBe(1);
    expect(s.amountOverdue).toBe(20.5);
    expect(s.totalPartiallyPaid).toBe(1);
    expect(s.totalPaid).toBe(0);
  });
});
