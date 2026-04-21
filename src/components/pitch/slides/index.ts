import { ComponentType } from 'react';
import { PitchTokens } from '@/lib/pitch/tokens';
import { Slide01Cover } from './Slide01Cover';
import { Slide02Problem } from './Slide02Problem';
import { Slide03Opportunity } from './Slide03Opportunity';
import { SlideMethodPare } from './SlideMethodPare';
import { Slide04Intro } from './Slide04Intro';
import { Slide05HowItWorks } from './Slide05HowItWorks';
import { Slide06CRM } from './Slide06CRM';
import { Slide07AISDR } from './Slide07AISDR';
import { Slide08Inbox } from './Slide08Inbox';
import { Slide09Pipeline } from './Slide09Pipeline';
import { Slide10Marketplace } from './Slide10Marketplace';
import { Slide11Differentiators } from './Slide11Differentiators';
import { Slide12Results } from './Slide12Results';
import { Slide13Pricing } from './Slide13Pricing';
import { Slide14Onboarding } from './Slide14Onboarding';
import { Slide15Next } from './Slide15Next';
import { makeModuleSlide } from './SlideModuleFeature';
import { Slide16InvestmentSummary } from './SlideInvestmentSummary';
import { SlideAiCredits } from './SlideAiCredits';

export interface PitchSlideProps {
  tokens: PitchTokens;
  pageNumber: number;
  total: number;
}

export type PitchSlideCategory = 'core' | 'module' | 'vertical' | 'pack';

export interface PitchSlideMeta {
  id: string;
  title: string;
  component: ComponentType<PitchSlideProps>;
  /** Required slides cannot be disabled (Cover + Closing). */
  required?: boolean;
  /** UI grouping. */
  category: PitchSlideCategory;
}

/** Verticais de mercado (12) */
const VERTICALS: Array<{ id: string; title: string; label: string }> = [
  { id: 'vert-clinics', title: 'Clínicas & Saúde', label: 'Clínicas' },
  { id: 'vert-realestate', title: 'Imobiliárias', label: 'Imobiliárias' },
  { id: 'vert-training', title: 'Formação & E-learning', label: 'Formação' },
  { id: 'vert-condos', title: 'Condomínios', label: 'Condomínios' },
  { id: 'vert-agencies', title: 'Agências', label: 'Agências' },
  { id: 'vert-restaurants', title: 'Restauração & Hotelaria', label: 'Restauração' },
  { id: 'vert-auto', title: 'Oficinas Auto', label: 'Auto' },
  { id: 'vert-gyms', title: 'Ginásios & Estúdios', label: 'Ginásios' },
  { id: 'vert-beauty', title: 'Beleza & Estética', label: 'Beleza' },
  { id: 'vert-events', title: 'Eventos & Catering', label: 'Eventos' },
  { id: 'vert-construction', title: 'Construção & Obras', label: 'Construção' },
  { id: 'vert-legal', title: 'Advocacia & Consultoria', label: 'Legal' },
];

/** Packs funcionais (16) */
const PACKS: Array<{ id: string; title: string; label: string }> = [
  { id: 'pack-billing-pt', title: 'Faturação PT (SAF-T/ATCUD)', label: 'Faturação PT' },
  { id: 'pack-b2b-portal', title: 'Portal B2B', label: 'Portal B2B' },
  { id: 'pack-hr', title: 'RH & People Operations', label: 'RH' },
  { id: 'pack-analytics', title: 'Analytics & BI', label: 'Analytics' },
  { id: 'pack-omnichannel', title: 'Comunicações Omnichannel', label: 'Omnichannel' },
  { id: 'pack-automations', title: 'Automações No-Code', label: 'Automações' },
  { id: 'pack-marketplace-c2c', title: 'Marketplace C2C', label: 'Marketplace' },
  { id: 'pack-lives', title: 'Lives & Social Selling', label: 'Lives' },
  { id: 'pack-ai-sdr-deep', title: 'AI SDR Pro', label: 'AI SDR Pro' },
  { id: 'pack-pipeline-risk', title: 'Pipeline Risk Engine', label: 'Pipeline Risk' },
  { id: 'pack-compliance-rgpd', title: 'Compliance & RGPD', label: 'RGPD' },
  { id: 'pack-procurement-pro', title: 'Compras & Fornecedores Pro', label: 'Compras Pro' },
  { id: 'pack-knowledge-rag', title: 'Knowledge Base RAG', label: 'Knowledge RAG' },
  { id: 'pack-saas-billing', title: 'SaaS Billing & Subscriptions', label: 'SaaS Billing' },
  { id: 'pack-events-rsvp', title: 'Eventos & RSVP', label: 'Eventos RSVP' },
  { id: 'pack-loyalty', title: 'Fidelização & Cupões', label: 'Fidelização' },
];

export const PITCH_SLIDES: PitchSlideMeta[] = [
  { id: 'cover', title: 'Capa', component: Slide01Cover, required: true, category: 'core' },
  { id: 'problem', title: 'O Problema', component: Slide02Problem, category: 'core' },
  { id: 'opportunity', title: 'Oportunidade', component: Slide03Opportunity, category: 'core' },
  { id: 'intro', title: 'O que é o FastCRM', component: Slide04Intro, category: 'core' },
  { id: 'diff', title: 'Diferenciadores', component: Slide11Differentiators, category: 'core' },
  { id: 'method-pare', title: 'Método PARE', component: SlideMethodPare, category: 'core' },
  { id: 'how', title: 'Como funciona', component: Slide05HowItWorks, category: 'core' },
  { id: 'crm', title: 'CRM unificado', component: Slide06CRM, category: 'core' },
  { id: 'inbox', title: 'Inbox omnichannel', component: Slide08Inbox, category: 'core' },
  { id: 'ai-sdr', title: 'AI SDR & Outbound', component: Slide07AISDR, category: 'core' },
  { id: 'pipeline', title: 'Pipeline & Faturação', component: Slide09Pipeline, category: 'core' },
  { id: 'marketplace', title: 'Loja & Marketplace', component: Slide10Marketplace, category: 'core' },
  { id: 'results', title: 'Resultados', component: Slide12Results, category: 'core' },
  { id: 'ai-credits', title: 'Créditos IA', component: SlideAiCredits, category: 'core' },
  { id: 'investment-summary', title: 'Resumo do investimento', component: Slide16InvestmentSummary, category: 'core' },
  { id: 'pricing', title: 'Investimento', component: Slide13Pricing, category: 'core' },
  { id: 'onboarding', title: 'Onboarding', component: Slide14Onboarding, category: 'core' },
  { id: 'next', title: 'Próximos passos', component: Slide15Next, required: true, category: 'core' },

  /* Módulos opcionais base */
  { id: 'mod-revenue', title: 'Controlo de Receita', component: makeModuleSlide('mod-revenue', 'Controlo de Receita'), category: 'module' },
  { id: 'mod-procurement', title: 'Compras & Fornecedores', component: makeModuleSlide('mod-procurement', 'Compras'), category: 'module' },
  { id: 'mod-shop', title: 'Loja Online B2C', component: makeModuleSlide('mod-shop', 'Loja Online'), category: 'module' },
  { id: 'mod-renewals', title: 'Renovações & Subscrições', component: makeModuleSlide('mod-renewals', 'Renovações'), category: 'module' },
  { id: 'mod-support', title: 'Suporte & Atendimento', component: makeModuleSlide('mod-support', 'Suporte'), category: 'module' },
  { id: 'mod-knowledge', title: 'Base de Conhecimento', component: makeModuleSlide('mod-knowledge', 'Conhecimento'), category: 'module' },

  /* Verticais */
  ...VERTICALS.map((v) => ({
    id: v.id,
    title: v.title,
    component: makeModuleSlide(v.id, v.label),
    category: 'vertical' as const,
  })),

  /* Packs */
  ...PACKS.map((p) => ({
    id: p.id,
    title: p.title,
    component: makeModuleSlide(p.id, p.label),
    category: 'pack' as const,
  })),
];

export const ALL_SLIDE_IDS = PITCH_SLIDES.map((s) => s.id);

/** Slides ativos no deck. Por defeito mostra apenas core. */
export function getActiveSlides(enabledSlides?: string[]): PitchSlideMeta[] {
  if (!enabledSlides) {
    return PITCH_SLIDES.filter((s) => s.category === 'core');
  }
  const set = new Set(enabledSlides);
  return PITCH_SLIDES.filter((s) => s.required || set.has(s.id));
}

export const DEFAULT_ENABLED_SLIDE_IDS = PITCH_SLIDES
  .filter((s) => s.category === 'core')
  .map((s) => s.id);

export const OPTIONAL_MODULE_SLIDE_IDS = PITCH_SLIDES
  .filter((s) => s.category !== 'core')
  .map((s) => s.id);

export const BASE_MODULE_SLIDE_IDS = PITCH_SLIDES
  .filter((s) => s.category === 'module')
  .map((s) => s.id);

export const VERTICAL_SLIDE_IDS = PITCH_SLIDES
  .filter((s) => s.category === 'vertical')
  .map((s) => s.id);

export const PACK_SLIDE_IDS = PITCH_SLIDES
  .filter((s) => s.category === 'pack')
  .map((s) => s.id);
