import { toMoney } from "@/lib/money";
import { round6 } from "@/lib/invoices/reverseTotals";
import { DEFAULT_VAT_RATE } from "@/utils/productPricing";

export interface ProductLineInput {
  base_price?: number | null;
  tax_included?: boolean | null;
  tax_rate_estimate_pct?: number | null;
}

export interface ProductLineResult {
  unit_price: number;
  tax_rate: number;
}

/** Taxa de IVA a aplicar a uma linha de fatura para um produto do catálogo. */
export function productTaxRate(product: ProductLineInput): number {
  const raw = product.tax_rate_estimate_pct;
  if (raw === null || raw === undefined) return DEFAULT_VAT_RATE;
  const rate = Number(raw);
  if (!Number.isFinite(rate) || rate < 0) return DEFAULT_VAT_RATE;
  return rate;
}

/**
 * Converte o preço de catálogo de um produto na linha de fatura correspondente.
 * Quando `tax_included` é verdadeiro, o preço unitário passa a ser o valor
 * líquido (sem IVA) para que o total c/IVA da linha coincida com o catálogo.
 */
export function productInvoiceLine(product: ProductLineInput): ProductLineResult {
  const price = Number(product.base_price) || 0;
  const tax_rate = productTaxRate(product);

  if (product.tax_included && tax_rate > 0) {
    const net = toMoney(price).dividedBy(toMoney(1).plus(toMoney(tax_rate).dividedBy(100))).toNumber();
    return { unit_price: round6(net), tax_rate };
  }

  return { unit_price: round6(price), tax_rate };
}
