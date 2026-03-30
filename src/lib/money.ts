import Decimal from "decimal.js";

Decimal.set({ precision: 20, rounding: Decimal.ROUND_HALF_UP });

export type Money = Decimal;

export function toMoney(value: number | string | Decimal): Money {
  return new Decimal(value);
}

export function moneyAdd(a: number | Money, b: number | Money): Money {
  return toMoney(a).plus(toMoney(b));
}

export function moneySub(a: number | Money, b: number | Money): Money {
  return toMoney(a).minus(toMoney(b));
}

export function moneyMul(a: number | Money, b: number | Money): Money {
  return toMoney(a).times(toMoney(b));
}

export function moneyDiv(a: number | Money, b: number | Money): Money {
  return toMoney(a).dividedBy(toMoney(b));
}

export function moneyMin(a: number | Money, b: number | Money): Money {
  return Decimal.min(toMoney(a), toMoney(b));
}

export function moneyMax(a: number | Money, b: number | Money): Money {
  return Decimal.max(toMoney(a), toMoney(b));
}

export function moneyToNumber(value: Money | number): number {
  if (typeof value === "number") return value;
  return value.toNumber();
}

/**
 * Format a monetary value for display.
 * Returns string like "12.50" (without currency symbol).
 */
export function formatMoney(value: Money | number, _currency?: string): string {
  return toMoney(value).toFixed(2);
}

/**
 * Format with € symbol prefix.
 */
export function formatMoneyEur(value: Money | number): string {
  return `€${formatMoney(value)}`;
}

/**
 * Calculate line total: price × quantity
 */
export function lineTotal(price: number, quantity: number): Money {
  return moneyMul(price, quantity);
}

/**
 * Calculate subtotal from an array of { price, quantity } items.
 */
export function calcSubtotal(items: { price: number; quantity: number }[]): Money {
  return items.reduce<Money>((sum, item) => moneyAdd(sum, lineTotal(item.price, item.quantity)), toMoney(0));
}
