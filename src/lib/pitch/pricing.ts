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

/**
 * Currency code is an arbitrary uppercase ISO-like string (e.g. "EUR", "CAD",
 * "JPY"). The set of supported codes is extensible at runtime — see
 * `registerCurrency()` and the "Gerir moedas" UI in the pitch customization
 * panel. Built-in defaults below; users may add more without code changes.
 */
export type PitchCurrency = string;
export type PitchBillingInterval = 'monthly' | 'annual';
export type PitchTier = 'grow' | 'pro' | 'enterprise';

interface TierMeta {
  code: PitchTier;
  label: string;
  shortLabel: string;
  multiplier: number;
  description: string;
}

export const TIERS: Record<PitchTier, TierMeta> = {
  grow:       { code: 'grow',       label: 'Grow',       shortLabel: 'Grow',       multiplier: 1,    description: 'PME até 10 utilizadores' },
  pro:        { code: 'pro',        label: 'Pro',        shortLabel: 'Pro',        multiplier: 1.6,  description: 'Equipas comerciais 10–50' },
  enterprise: { code: 'enterprise', label: 'Enterprise', shortLabel: 'Enterprise', multiplier: 2.5,  description: 'Operações multi-equipa, SLA' },
};

export const PITCH_TIERS: PitchTier[] = ['grow', 'pro', 'enterprise'];

export function getTierMultiplier(tier: PitchTier | undefined): number {
  return TIERS[tier ?? 'grow'].multiplier;
}

export function tierLabel(tier: PitchTier | undefined): string {
  return TIERS[tier ?? 'grow'].label;
}

export interface CurrencyMeta {
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

/** Built-in currencies shipped with the app. */
export const BUILT_IN_CURRENCIES: Record<string, CurrencyMeta> = {
  EUR: { code: 'EUR', symbol: '€',  rate: 1,    locale: 'pt-PT', symbolPosition: 'before', label: 'Euro (€)' },
  USD: { code: 'USD', symbol: '$',  rate: 1.08, locale: 'en-US', symbolPosition: 'before', label: 'US Dollar ($)' },
  GBP: { code: 'GBP', symbol: '£',  rate: 0.85, locale: 'en-GB', symbolPosition: 'before', label: 'British Pound (£)' },
  BRL: { code: 'BRL', symbol: 'R$', rate: 5.95, locale: 'pt-BR', symbolPosition: 'before', label: 'Real Brasileiro (R$)' },
};

/**
 * Runtime currency registry. Starts as a shallow copy of the built-ins; the
 * customization panel calls `registerCurrency()` at mount to inject any
 * user-defined currencies stored in the pitch tokens. Code that needs a
 * currency meta must use `getCurrencyMeta()` (with EUR fallback) instead of
 * indexing this map directly.
 */
export const CURRENCIES: Record<string, CurrencyMeta> = { ...BUILT_IN_CURRENCIES };

/** Register or replace a currency at runtime. Returns the normalized code. */
export function registerCurrency(meta: CurrencyMeta): string {
  const code = (meta.code || '').trim().toUpperCase();
  if (!code) return '';
  CURRENCIES[code] = { ...meta, code };
  return code;
}

/** Remove a custom currency. Built-ins are protected. */
export function unregisterCurrency(code: string): void {
  const c = (code || '').trim().toUpperCase();
  if (!c || BUILT_IN_CURRENCIES[c]) return;
  delete CURRENCIES[c];
}

/** True if the code is one of the immutable defaults. */
export function isBuiltInCurrency(code: string): boolean {
  return Boolean(BUILT_IN_CURRENCIES[(code || '').toUpperCase()]);
}

/** Safe lookup with fallback to EUR for unknown codes. */
export function getCurrencyMeta(code: PitchCurrency | undefined): CurrencyMeta {
  if (!code) return CURRENCIES.EUR;
  return CURRENCIES[code] || CURRENCIES.EUR;
}

/** All currently registered currency codes (built-ins first, then custom). */
export function listCurrencyCodes(): string[] {
  const builtIns = Object.keys(BUILT_IN_CURRENCIES);
  const custom = Object.keys(CURRENCIES).filter((c) => !BUILT_IN_CURRENCIES[c]);
  return [...builtIns, ...custom.sort()];
}

const INTERVAL_LABEL: Record<PitchBillingInterval, { short: string; long: string; multiplier: number }> = {
  monthly: { short: '/mês',  long: 'por mês', multiplier: 1 },
  // 2 months free on annual: 10 monthly payments billed yearly
  annual:  { short: '/ano',  long: 'por ano · 2 meses grátis', multiplier: 10 },
};

/** Format a numeric amount for a given currency. */
export function formatPrice(amount: number, currency: PitchCurrency): string {
  const meta = getCurrencyMeta(currency);
  const rounded = amount >= 100 ? Math.round(amount) : Math.round(amount * 10) / 10;
  const formatted = new Intl.NumberFormat(meta.locale, {
    minimumFractionDigits: rounded % 1 === 0 ? 0 : 1,
    maximumFractionDigits: 1,
  }).format(rounded);
  return meta.symbolPosition === 'before' ? `${meta.symbol}${formatted}` : `${formatted} ${meta.symbol}`;
}

/* ============================================================
 * Segmented price parsing
 *
 * Module price strings can mix several kinds of charges:
 *   "€499 setup + €19/mês"        → one-time setup + recurring monthly
 *   "€29 /mês"                    → recurring monthly only
 *   "€290 /ano"                   → already annual (don't re-multiply)
 *   "€99 setup"                   → one-time only
 *   "+ 0,9% por venda"            → variable, no €
 *
 * We split the string into segments and tag each one. Setup amounts are
 * NEVER multiplied by the annual factor — they are charged once. Annual
 * amounts already expressed as "/ano" are also kept untouched on the
 * monthly multiplier (only the tier and FX rate apply).
 * ============================================================ */

export type PriceSegmentKind = 'monthly' | 'annual' | 'setup' | 'variable';

export interface PriceSegment {
  /** Kind of charge — drives multipliers and totals. */
  kind: PriceSegmentKind;
  /** Original euro value (before tier/FX/interval). 0 for variable. */
  amountEur: number;
  /** Raw text of the segment, useful for debugging. */
  raw: string;
}

export interface PriceBreakdown {
  segments: PriceSegment[];
  /** Sum of recurring monthly euros (in EUR, before tier/FX). */
  monthlyEur: number;
  /** Sum of one-time setup euros (in EUR, before tier/FX). */
  setupEur: number;
  /** Sum of explicitly-annual euros (in EUR, before tier/FX). */
  annualEur: number;
  /** True if any segment carries a € amount. */
  hasAmount: boolean;
  /** True if there is any non-zero setup. */
  hasSetup: boolean;
}

const SETUP_HINT = /\b(setup|instala[çc][ãa]o|implementa[çc][ãa]o|onboarding|ativa[çc][ãa]o|one[\s-]?time|[úu]nico)\b/i;
const ANNUAL_HINT = /(\/\s*ano\b|por\s+ano\b|anual\b|\/\s*yr\b|\/\s*year\b)/i;
const MONTHLY_HINT = /(\/\s*m[êe]s\b|por\s+m[êe]s\b|\/\s*mo\b|\/\s*month\b)/i;
const EUR_RE = /€\s*\d+(?:[.,]\d+)?/;

function classifySegment(text: string): PriceSegmentKind {
  if (SETUP_HINT.test(text)) return 'setup';
  if (ANNUAL_HINT.test(text)) return 'annual';
  if (MONTHLY_HINT.test(text)) return 'monthly';
  // Default: a bare "€NN" without an interval is treated as monthly,
  // because that's how the catalog defaults are written.
  if (EUR_RE.test(text)) return 'monthly';
  return 'variable';
}

function extractEur(text: string): number {
  const m = text.match(/€\s*(\d+(?:[.,]\d+)?)/);
  if (!m) return 0;
  const v = parseFloat(m[1].replace(',', '.'));
  return isFinite(v) ? v : 0;
}

/**
 * Parse a price string into structured segments. The string is split on
 * "+" (the convention used in the catalog for mixing charges), and each
 * fragment is classified independently.
 */
export function parsePriceBreakdown(input: string | undefined): PriceBreakdown {
  const empty: PriceBreakdown = {
    segments: [],
    monthlyEur: 0,
    setupEur: 0,
    annualEur: 0,
    hasAmount: false,
    hasSetup: false,
  };
  if (!input || typeof input !== 'string') return empty;

  // Split on " + " but keep variants like "+0,9%" together (no €).
  const parts = input.split(/\s*\+\s*/).filter(Boolean);
  const segments: PriceSegment[] = parts.map((raw) => ({
    raw,
    kind: classifySegment(raw),
    amountEur: extractEur(raw),
  }));

  let monthlyEur = 0;
  let setupEur = 0;
  let annualEur = 0;
  for (const s of segments) {
    if (s.kind === 'setup') setupEur += s.amountEur;
    else if (s.kind === 'annual') annualEur += s.amountEur;
    else if (s.kind === 'monthly') monthlyEur += s.amountEur;
  }

  return {
    segments,
    monthlyEur,
    setupEur,
    annualEur,
    hasAmount: segments.some((s) => s.amountEur > 0),
    hasSetup: setupEur > 0,
  };
}

/**
 * Convert a segmented price string respecting setup vs recurring rules:
 *  - Setup euros: tier × FX (NEVER × annual factor — paid once).
 *  - Monthly euros: tier × FX × interval factor (×1 monthly, ×10 annual).
 *    When annual, the "/mês" suffix is rewritten to "/ano".
 *  - Annual euros (already "/ano"): tier × FX, suffix kept. When the user
 *    selects "monthly" view, we display them as "/ano" still, since the
 *    catalog made an explicit yearly choice.
 *  - Variable segments (e.g. "+ 0,9% por venda") are kept verbatim.
 *
 * Strings without any € amount are returned unchanged.
 */
export function convertPriceString(
  input: string | undefined,
  currency: PitchCurrency,
  interval: PitchBillingInterval,
  tier?: PitchTier
): string | undefined {
  if (!input) return input;
  const meta = CURRENCIES[currency];
  const tierMult = getTierMultiplier(tier);
  const annualMult = INTERVAL_LABEL.annual.multiplier;

  const breakdown = parsePriceBreakdown(input);
  if (!breakdown.hasAmount) return input;

  const convertedParts = breakdown.segments.map((seg) => {
    if (seg.amountEur <= 0) return seg.raw; // variable / unparsed

    if (seg.kind === 'setup') {
      // One-time: tier × FX only.
      const value = seg.amountEur * tierMult * meta.rate;
      return seg.raw.replace(/€\s*\d+(?:[.,]\d+)?/, formatPrice(value, currency));
    }

    if (seg.kind === 'annual') {
      // Already yearly in the source — never multiply again.
      const value = seg.amountEur * tierMult * meta.rate;
      return seg.raw.replace(/€\s*\d+(?:[.,]\d+)?/, formatPrice(value, currency));
    }

    // Monthly segment.
    const factor = interval === 'annual' ? annualMult : 1;
    const value = seg.amountEur * tierMult * meta.rate * factor;
    let out = seg.raw.replace(/€\s*\d+(?:[.,]\d+)?/, formatPrice(value, currency));
    if (interval === 'annual') {
      out = out.replace(/\/\s*m[êe]s\b/gi, '/ano');
      out = out.replace(/\bpor\s+m[êe]s\b/gi, 'por ano');
    }
    return out;
  });

  return convertedParts.join(' + ');
}

/** Build a short interval label (e.g. "Mensal", "Anual — 2 meses grátis"). */
export function intervalLabel(interval: PitchBillingInterval): string {
  return interval === 'monthly' ? 'Mensal' : 'Anual · 2 meses grátis';
}

/** Re-export for convenience. */
export const BILLING_INTERVALS: PitchBillingInterval[] = ['monthly', 'annual'];
