import type { SlideContentMap } from './slideContent';
import type { PitchCurrency, PitchBillingInterval, PitchTier, CurrencyMeta } from './pricing';

export type PitchTone = 'tu' | 'voce';

export interface PitchPricingPlan {
  name: string;
  price: string;
  sub: string;
  features: string[];
  highlight: boolean;
}

export interface PitchTokens {
  contactName: string;
  contactRole: string;
  companyName: string;
  companyLogoUrl: string; // data URL or empty
  industry: string;
  meetingDate: string; // ISO date (yyyy-mm-dd)
  presenterName: string;
  presenterEmail: string;
  presenterPhone: string;
  tone: PitchTone;
  pricingPlans: PitchPricingPlan[];
  /** Per-slide content overrides keyed by slide id. */
  slideOverrides?: SlideContentMap;
  /** Slides included in the deck. If empty/undefined, all slides are shown. */
  enabledSlides?: string[];
  /** Display currency for module prices. Defaults to EUR. */
  currency?: PitchCurrency;
  /** Billing interval used to compute module prices. Defaults to monthly. */
  billingInterval?: PitchBillingInterval;
  /** Pricing tier applied to module prices (Grow / Pro / Enterprise). */
  tier?: PitchTier;
  /**
   * User-defined currencies registered for this pitch (e.g. CAD, AUD, JPY).
   * Merged into the runtime registry on panel mount; built-in currencies
   * (EUR/USD/GBP/BRL) are immutable and cannot be overridden.
   */
  customCurrencies?: CurrencyMeta[];
}

export const DEFAULT_PRICING_PLANS: PitchPricingPlan[] = [
  {
    name: 'Start',
    price: '€39',
    sub: '/utilizador/mês · até 3 utilizadores',
    features: [
      'CRM completo (Contactos, Leads, Empresas)',
      'Pipeline & Negócios',
      'Inbox unificada (Email + WhatsApp QR)',
      'Calendário & Tarefas',
      '500 créditos IA / mês',
      'Suporte por email',
    ],
    highlight: false,
  },
  {
    name: 'Grow',
    price: '€79',
    sub: '/utilizador/mês · até 10 utilizadores',
    features: [
      'Tudo do Start',
      'AI SDR & Sequências outbound',
      'Enriquecimento de leads',
      'Propostas & Faturação',
      'Loja online B2C',
      '2.500 créditos IA / mês',
      'Integrações (GHL, Twilio, Telegram)',
    ],
    highlight: true,
  },
  {
    name: 'Pro',
    price: '€149',
    sub: '/utilizador/mês · ilimitado',
    features: [
      'Tudo do Grow',
      'Marketplace C2C & Portal B2B',
      'Renovações & MRR',
      'Account Brief & Lead Enricher Pro',
      'Pipeline Risk Engine',
      '10.000 créditos IA / mês',
      'Suporte prioritário & onboarding VIP',
    ],
    highlight: false,
  },
];

export const DEFAULT_TOKENS: PitchTokens = {
  contactName: '',
  contactRole: '',
  companyName: '',
  companyLogoUrl: '',
  industry: '',
  meetingDate: new Date().toISOString().slice(0, 10),
  presenterName: '',
  presenterEmail: '',
  presenterPhone: '',
  tone: 'voce',
  pricingPlans: DEFAULT_PRICING_PLANS,
  slideOverrides: {},
  enabledSlides: undefined,
  currency: 'EUR',
  billingInterval: 'monthly',
  tier: 'grow',
};

export function fillToken(value: string, fallback: string): string {
  const v = (value || '').trim();
  return v.length > 0 ? v : fallback;
}

export function formatMeetingDate(iso: string): string {
  if (!iso) return '';
  try {
    const d = new Date(iso + 'T00:00:00');
    return d.toLocaleDateString('pt-PT', { day: '2-digit', month: 'long', year: 'numeric' });
  } catch {
    return iso;
  }
}

export interface PitchHistoryEntry {
  contactName: string;
  companyName: string;
  savedAt: string; // ISO datetime
  tokens: PitchTokens;
}
