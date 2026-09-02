import { describe, it, expect } from "vitest";
import { productInvoiceLine } from "@/lib/invoices/productLine";
import { computeTotals } from "@/lib/invoices/reverseTotals";

const line = (p: Parameters<typeof productInvoiceLine>[0]) => {
  const r = productInvoiceLine(p);
  return { quantity: 1, unit_price: r.unit_price, discount_percent: 0, tax_rate: r.tax_rate };
};

describe("productInvoiceLine", () => {
  it("preço com IVA incluído mantém o total do catálogo", () => {
    const l = line({ base_price: 500, tax_included: true, tax_rate_estimate_pct: null });
    expect(l.tax_rate).toBe(23);
    const totals = computeTotals([l], 0);
    expect(totals.total).toBe(500);
    expect(totals.subtotal).toBe(406.5);
    expect(totals.taxAmount).toBe(93.5);
  });

  it("preço sem IVA acrescenta a taxa por omissão", () => {
    const l = line({ base_price: 32.44, tax_included: false, tax_rate_estimate_pct: null });
    expect(l.unit_price).toBe(32.44);
    expect(computeTotals([l], 0).total).toBe(39.9);
  });

  it("respeita a taxa definida no produto", () => {
    const l = line({ base_price: 106, tax_included: true, tax_rate_estimate_pct: 6 });
    expect(l.tax_rate).toBe(6);
    expect(computeTotals([l], 0).total).toBe(106);
  });
});
