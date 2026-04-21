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

export interface PitchSlideProps {
  tokens: PitchTokens;
  pageNumber: number;
  total: number;
}

export interface PitchSlideMeta {
  id: string;
  title: string;
  component: ComponentType<PitchSlideProps>;
  /** Required slides cannot be disabled (Cover + Closing). */
  required?: boolean;
}

export const PITCH_SLIDES: PitchSlideMeta[] = [
  { id: 'cover', title: 'Capa', component: Slide01Cover, required: true },
  { id: 'problem', title: 'O Problema', component: Slide02Problem },
  { id: 'opportunity', title: 'Oportunidade', component: Slide03Opportunity },
  { id: 'method-pare', title: 'Método PARE', component: SlideMethodPare },
  { id: 'intro', title: 'O que é o FastCRM', component: Slide04Intro },
  { id: 'how', title: 'Como funciona', component: Slide05HowItWorks },
  { id: 'crm', title: 'CRM unificado', component: Slide06CRM },
  { id: 'ai-sdr', title: 'AI SDR & Outbound', component: Slide07AISDR },
  { id: 'inbox', title: 'Inbox omnichannel', component: Slide08Inbox },
  { id: 'pipeline', title: 'Pipeline & Faturação', component: Slide09Pipeline },
  { id: 'marketplace', title: 'Loja & Marketplace', component: Slide10Marketplace },
  { id: 'diff', title: 'Diferenciadores', component: Slide11Differentiators },
  { id: 'results', title: 'Resultados', component: Slide12Results },
  { id: 'pricing', title: 'Investimento', component: Slide13Pricing },
  { id: 'onboarding', title: 'Onboarding', component: Slide14Onboarding },
  { id: 'next', title: 'Próximos passos', component: Slide15Next, required: true },

  /* Módulos opcionais (off por defeito — ativar via "Módulos do pitch") */
  { id: 'mod-revenue', title: 'Controlo de Receita', component: makeModuleSlide('mod-revenue', 'Controlo de Receita') },
  { id: 'mod-procurement', title: 'Compras & Fornecedores', component: makeModuleSlide('mod-procurement', 'Compras') },
  { id: 'mod-shop', title: 'Loja Online B2C', component: makeModuleSlide('mod-shop', 'Loja Online') },
  { id: 'mod-renewals', title: 'Renovações & Subscrições', component: makeModuleSlide('mod-renewals', 'Renovações') },
  { id: 'mod-support', title: 'Suporte & Atendimento', component: makeModuleSlide('mod-support', 'Suporte') },
  { id: 'mod-knowledge', title: 'Base de Conhecimento', component: makeModuleSlide('mod-knowledge', 'Conhecimento') },
];

export const ALL_SLIDE_IDS = PITCH_SLIDES.map((s) => s.id);

/** Returns slides filtered by tokens.enabledSlides; required slides are always kept. */
export function getActiveSlides(enabledSlides?: string[]): PitchSlideMeta[] {
  if (!enabledSlides) return PITCH_SLIDES;
  const set = new Set(enabledSlides);
  return PITCH_SLIDES.filter((s) => s.required || set.has(s.id));
}
