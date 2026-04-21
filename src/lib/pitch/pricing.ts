/**
 * Pricing utilities for the pitch deck.
 *
 * - Parses module price strings such as "€29 /mês", "€499 setup + €19/mês",
 *   "+ 0,9% por venda", "€4 /mês".
 * - Converts currency between EUR / USD / GBP / BRL using static rates.
 * - Converts the billing interval between monthly and annual (annual = 10x
 *   the monthly value, i.e. "2 months free" — the industry standard).
 *
 * Static rates are fine for a pitch deck — these are indicative numbers used
 * during a sales conversation, not transactional prices.
 */

export type PitchCurrency = 'EUR' | 'USD' | 'GBP' | 'BRL';
export type PitchBillingInterval = 'monthly' | 'annual';

interface CurrencyMeta {
  code: PitchCurrency;
  symbol: string;
  /** Multiplier from EUR. */
  rate: number;
  /** Locale used to format numbers. */
  locale: string;
  /** Where to place the symbol relative to the number. */
  symbolPosition: 'before' | 'after';
  label: string;
}

export const CURRENCIES: Record<PitchCurrency, CurrencyMeta> = {
  EUR: { code: 'EUR', symbol: '€',  rate: 1,    locale: 'pt-PT', symbolPosition: 'before', label: 'Euro (€)' },
  USD: { code: 'USD', symbol: '$',  rate: 1.08, locale: 'en-US', symbolPosition: 'before', label: 'US Dollar ($)' },
  GBP: { code: 'GBP', symbol: '£',  rate: 0.85, locale: 'en-GB', symbolPosition: 'before', label: 'British Pound (£)' },
  BRL: { code: 'BRL', symbol: 'R$', rate: 5.95, locale: 'pt-BR', symbolPosition: 'before', label: 'Real Brasileiro (R$)' },
};

const INTERVAL_LABEL: Record<PitchBillingInterval, { short: string; long: string; multiplier: number }> = {
  monthly: { short: '/mês',  long: 'por mês', multiplier: 1 },
  // 2 months free on annual: 10 monthly payments billed yearly
  annual:  { short: '/ano',  long: 'por ano · 2 meses grátis', multiplier: 10 },
};

/** Format a numeric amount for a given currency. */
export function formatPrice(amount: number, currency: PitchCurrency): string {
  const meta = CURRENCIES[currency];
  const rounded = amount >= 100 ? Math.round(amount) : Math.round(amount * 10) / 10;
  const formatted = new Intl.NumberFormat(meta.locale, {
    minimumFractionDigits: rounded % 1 === 0 ? 0 : 1,
    maximumFractionDigits: 1,
  }).format(rounded);
  return meta.symbolPosition === 'before' ? `${meta.symbol}${formatted}` : `${formatted} ${meta.symbol}`;
}

/**
 * Replace every occurrence of "€NN" / "€NN.NN" / "€NN,NN" in a string with the
 * converted price in the target currency, applying the billing-interval
 * multiplier and rewriting "/mês" → "/ano" when applicable.
 *
 * Strings that don't carry a euro amount are returned unchanged.
 */
export function convertPriceString(
  input: string | undefined,
  currency: PitchCurrency,
  interval: PitchBillingInterval
): string | undefined {
  if (!input) return input;
  const meta = CURRENCIES[currency];
  const intervalMeta = INTERVAL_LABEL[interval];

  // Match a euro amount: € optionally followed by digits with . or , as decimals.
  const re = /€\s*(\d+(?:[.,]\d+)?)/g;
  let out = input.replace(re, (_full, raw: string) => {
    const value = parseFloat(raw.replace(',', '.'));
    if (!isFinite(value)) return _full;
    const converted = value * meta.rate * intervalMeta.multiplier;
    return formatPrice(converted, currency);
  });

  // Rewrite the interval suffix when annual.
  if (interval === 'annual') {
    out = out.replace(/\/\s*m[êe]s\b/gi, intervalMeta.short);
    out = out.replace(/\bpor\s+m[êe]s\b/gi, 'por ano');
  }

  return out;
}

/** Build a short interval label (e.g. "Mensal", "Anual — 2 meses grátis"). */
export function intervalLabel(interval: PitchBillingInterval): string {
  return interval === 'monthly' ? 'Mensal' : 'Anual · 2 meses grátis';
}

/** Re-export for convenience. */
export const BILLING_INTERVALS: PitchBillingInterval[] = ['monthly', 'annual'];
