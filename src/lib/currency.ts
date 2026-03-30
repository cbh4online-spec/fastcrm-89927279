import currency from "currency.js";

const EUR_OPTS: currency.Options = {
  symbol: "€",
  separator: ".",
  decimal: ",",
  pattern: "# !",
  negativePattern: "-# !",
  precision: 2,
};

/** Create a currency.js instance configured for EUR. */
export function EUR(value: currency.Any): currency {
  return currency(value, EUR_OPTS);
}

/** Format a number as EUR string, e.g. "1.234,56 €" */
export function formatEUR(value: currency.Any): string {
  return EUR(value).format();
}

/** Parse a EUR-formatted string back to cents (integer). */
export function eurToCents(value: currency.Any): number {
  return EUR(value).intValue;
}
