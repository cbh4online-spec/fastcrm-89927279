interface CataloguePrice {
  base_price?: number | null;
  tax_included?: boolean | null;
  tax_rate_estimate_pct?: number | null;
}

export function proposalTaxRate(product?: CataloguePrice | null): number {
  return product?.tax_rate_estimate_pct ?? 23;
}

/** Overrides in the catalogue cart use the product's tax basis; saved items are always net. */
export function proposalNetUnitPrice(product: CataloguePrice, override?: number, discount = 0): number {
  const price = (override ?? product.base_price ?? 0) * (1 - discount / 100);
  return cents(product.tax_included ? price / (1 + proposalTaxRate(product) / 100) : price);
}

const cents = (value: number) => Math.round((value + Number.EPSILON) * 100) / 100;

export function proposalTotals(items: ReadonlyArray<{
  unit_price: number;
  quantity: number;
  is_enabled?: boolean;
  product?: CataloguePrice | null;
}>) {
  let subtotal = 0;
  let vat = 0;
  for (const item of items) {
    if (item.is_enabled === false) continue;
    const lineNet = cents(item.unit_price * item.quantity);
    subtotal += lineNet;
    vat += cents(lineNet * proposalTaxRate(item.product) / 100);
  }
  return { subtotal: cents(subtotal), vat: cents(vat), total: cents(subtotal + vat) };
}