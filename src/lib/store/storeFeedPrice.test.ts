import { describe, it, expect } from 'vitest';
import { storeFeedPrice } from '../../../supabase/functions/_shared/storeFeedPrice';

describe('public Meta catalogue price', () => {
  it('keeps a 100 EUR consumer price at 100, not 123', () => {
    expect(storeFeedPrice(100)).toBe('100.00');
  });
  it('matches promotional base price and cent rounding', () => {
    expect(storeFeedPrice(35.42)).toBe('35.42');
    expect(storeFeedPrice(0)).toBe('0.00');
    expect(() => storeFeedPrice(NaN)).toThrow();
  });
});