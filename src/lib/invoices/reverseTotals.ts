import { toMoney } from "@/lib/money";

export interface ReverseTotalsLine {
  quantity: number;
  unit_price: number;
  discount_percent: number;
  tax_rate: number;
}

export const round2 = (value: number) => toMoney(value).toDecimalPlaces(2).toNumber();

/** Net value of a line (quantity x price - line discount), rounded to cents. */
export function lineNet(item: ReverseTotalsLine): number {
  return round2(
    toMoney(item.quantity)
      .times(item.unit_price)
      .times(toMoney(1).minus(toMoney(item.discount_percent || 0).dividedBy(100)))
      .toNumber()
  );
}

/** Gross value of a line (net + VAT), unrounded, used for proportional weights. */
export function lineGross(item: ReverseTotalsLine): number {
  return toMoney(lineNet(item))
    .times(toMoney(1).plus(toMoney(item.tax_rate || 0).dividedBy(100)))
    .toNumber();
}

/**
 * Totals of an invoice, using exactly the same rounding rules as the
 * invoice edit dialog and the persistence layer.
 */
export function computeTotals(items: ReverseTotalsLine[], discountAmount = 0) {
  const subtotal = round2(items.reduce((sum, item) => sum + lineNet(item), 0));
  const taxAmount = round2(
    items.reduce(
      (sum, item) => sum + toMoney(lineNet(item)).times(item.tax_rate || 0).dividedBy(100).toNumber(),
      0
    )
  );
  const total = round2(subtotal + taxAmount - round2(discountAmount || 0));
  return { subtotal, taxAmount, total };
}

/** Multiplier that turns a unit price into the line gross value (per unit). */
function grossFactorPerUnit(item: ReverseTotalsLine) {
  return toMoney(item.quantity)
    .times(toMoney(1).minus(toMoney(item.discount_percent || 0).dividedBy(100)))
    .times(toMoney(1).plus(toMoney(item.tax_rate || 0).dividedBy(100)));
}

/**
 * Derive the unit price that makes a line reach the given gross (VAT included) total,
 * keeping quantity, line discount and VAT rate untouched.
 * Returns null when the line cannot be solved (quantity 0 or 100% discount).
 */
export function unitPriceFromLineTotal(
  item: ReverseTotalsLine,
  lineTotalGross: number
): number | null {
  const factor = grossFactorPerUnit(item);
  if (factor.lessThanOrEqualTo(0)) return null;
  return round2(toMoney(lineTotalGross).dividedBy(factor).toNumber());
}

export type DistributeResult<T extends ReverseTotalsLine> =
  | { ok: true; items: T[] }
  | { ok: false; reason: "no_base" | "invalid_target" };

/**
 * Adjust every line's unit price proportionally so the invoice total (VAT included,
 * after the global discount) matches `targetTotal` exactly to the cent.
 * The rounding residue is absorbed by the highest-value line.
 */
export function distributeTargetTotal<T extends ReverseTotalsLine>(
  items: T[],
  discountAmount: number,
  targetTotal: number
): DistributeResult<T> {
  if (!Number.isFinite(targetTotal) || targetTotal < 0) {
    return { ok: false, reason: "invalid_target" };
  }
  if (items.length === 0) return { ok: false, reason: "no_base" };

  const currentGross = items.reduce((sum, item) => sum + lineGross(item), 0);
  const solvable = items.filter((item) => grossFactorPerUnit(item).greaterThan(0));
  if (currentGross <= 0 || solvable.length === 0) return { ok: false, reason: "no_base" };

  const targetGross = toMoney(targetTotal).plus(round2(discountAmount || 0));
  const factor = targetGross.dividedBy(currentGross);

  let next = items.map((item) => {
    if (grossFactorPerUnit(item).lessThanOrEqualTo(0)) return item;
    return { ...item, unit_price: round2(toMoney(item.unit_price).times(factor).toNumber()) };
  });

  // Absorb the rounding residue in the highest-value solvable line.
  let anchorIndex = -1;
  let anchorGross = -Infinity;
  next.forEach((item, index) => {
    if (grossFactorPerUnit(item).lessThanOrEqualTo(0)) return;
    const gross = lineGross(item);
    if (gross > anchorGross) {
      anchorGross = gross;
      anchorIndex = index;
    }
  });

  if (anchorIndex >= 0) {
    for (let attempt = 0; attempt < 6; attempt += 1) {
      const diff = round2(computeTotals(next, discountAmount).total - round2(targetTotal));
      if (diff === 0) break;
      const anchor = next[anchorIndex];
      const perUnit = grossFactorPerUnit(anchor);
      let adjusted = round2(
        toMoney(anchor.unit_price).minus(toMoney(diff).dividedBy(perUnit)).toNumber()
      );
      if (adjusted === anchor.unit_price) {
        // The exact correction is smaller than a cent of unit price: nudge by one cent.
        adjusted = round2(anchor.unit_price + (diff > 0 ? -0.01 : 0.01));
      }
      if (adjusted < 0) break;
      const candidate = next.map((item, index) =>
        index === anchorIndex ? { ...item, unit_price: adjusted } : item
      );
      const newDiff = round2(computeTotals(candidate, discountAmount).total - round2(targetTotal));
      if (Math.abs(newDiff) >= Math.abs(diff)) break;
      next = candidate;
    }
  }


  return { ok: true, items: next };
}
