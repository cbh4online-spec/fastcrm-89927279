/** Public B2C catalogue and checkout use base_price as-is, including promotions. */
export function storeFeedPrice(basePrice: number): string {
  if (!Number.isFinite(basePrice) || basePrice < 0) throw new Error('Invalid catalogue price');
  return basePrice.toFixed(2);
}