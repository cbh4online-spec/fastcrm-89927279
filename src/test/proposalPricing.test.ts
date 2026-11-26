import { describe, expect, it } from 'vitest';
import { proposalNetUnitPrice, proposalTotals } from '@/lib/pricing/proposalPricing';

describe('catalogue VAT in proposals', () => {
  const starter = { base_price: 19.90, tax_included: true, tax_rate_estimate_pct: 23 };
  it('keeps the advertised 19.90 EUR total including VAT', () => {
    const unit_price = proposalNetUnitPrice(starter);
    expect(proposalTotals([{ unit_price, quantity: 1, product: starter }])).toEqual({ subtotal: 16.18, vat: 3.72, total: 19.90 });
  });
  it('does not remove VAT from an exclusive catalogue price', () => {
    expect(proposalNetUnitPrice({ ...starter, tax_included: false })).toBe(19.90);
  });
  it('matches the stored two-decimal unit price when selling ten units', () => {
    expect(proposalTotals([{ unit_price: proposalNetUnitPrice(starter), quantity: 10, product: starter }])).toEqual({ subtotal: 161.80, vat: 37.21, total: 199.01 });
  });
  it('applies a discount once, before converting the catalogue price', () => {
    expect(proposalTotals([{ unit_price: proposalNetUnitPrice(starter, undefined, 10), quantity: 1, product: starter }]).total).toBe(17.91);
  });
  it('respects zero and reduced product VAT rates and disabled rows', () => {
    expect(proposalTotals([
      { unit_price: 100, quantity: 1, product: { tax_rate_estimate_pct: 6 } },
      { unit_price: 20, quantity: 1, product: { tax_rate_estimate_pct: 0 } },
      { unit_price: 999, quantity: 1, is_enabled: false },
    ])).toEqual({ subtotal: 120, vat: 6, total: 126 });
  });
});