/**
 * Catálogo unificado de módulos para a página de comparação.
 *
 * Combina metadata dos slides (id, título, categoria) com os preços de
 * `DEFAULT_MODULE_PRICES` e adiciona limites operacionais e notas comerciais
 * pensadas para a venda de bundles.
 *
 * NOTA: a verdade dos preços continua em `slideContent.ts`. Este ficheiro
 * apenas enriquece com limites/notas que são específicos da página de
 * comparação e do discurso comercial — não afetam o pitch principal.
 */

import { PITCH_SLIDES, type PitchSlideCategory } from '@/components/pitch/slides';
import { DEFAULT_MODULE_PRICES } from './slideContent';

export type ModuleCategory = Exclude<PitchSlideCategory, 'core'>;

export interface ModuleLimits {
  /** Limite no plano Grow (ex: "10 utilizadores", "1.000 docs"). */
  grow: string;
  /** Limite no plano Pro. */
  pro: string;
  /** Limite no plano Enterprise. */
  enterprise: string;
}

export interface ComparableModule {
  id: string;
  title: string;
  category: ModuleCategory;
  /** Preço base em EUR/mês (para cálculo de bundle). */
  basePriceEur: number;
  /** Texto curto do preço (vindo de DEFAULT_MODULE_PRICES). */
  priceLabel: string;
  /** Nota associada ao preço (ex: "por agente"). */
  priceNote?: string;
  /** Limites operacionais por tier. */
  limits: ModuleLimits;
  /** Nota comercial (diferenciador / o que está incluído). */
  note: string;
  /** Tags/keywords curtas para filtro rápido. */
  tags: string[];
}

/* ------------------------------------------------------------------ */
/* Limites e notas por módulo                                          */
/* ------------------------------------------------------------------ */

const LIMITS_AND_NOTES: Record<string, { limits: ModuleLimits; note: string; tags: string[] }> = {
  // ---- Módulos opcionais base ----
  'mod-revenue': {
    limits: { grow: 'Incluído', pro: 'Incluído + cohorts', enterprise: 'Multi-empresa + API' },
    note: 'MRR, churn e reconciliação bancária em tempo real.',
    tags: ['finanças', 'mrr', 'reconciliação'],
  },
  'mod-procurement': {
    limits: { grow: '50 fornecedores', pro: '500 fornecedores', enterprise: 'Ilimitado' },
    note: 'Comparação automática de preços e proteção de margem.',
    tags: ['compras', 'fornecedores', 'stock'],
  },
  'mod-shop': {
    limits: { grow: '500 SKUs', pro: '10.000 SKUs', enterprise: 'Ilimitado' },
    note: 'Loja DL 24/2014, RGPD e Omnibus por defeito.',
    tags: ['loja', 'b2c', 'pagamentos'],
  },
  'mod-renewals': {
    limits: { grow: 'Incluído', pro: 'Incluído + churn IA', enterprise: 'Playbooks custom' },
    note: 'Alertas D-90/D-60/D-30 e faturação recorrente AT.',
    tags: ['renovações', 'mrr', 'retenção'],
  },
  'mod-support': {
    limits: { grow: '3 agentes', pro: '15 agentes', enterprise: 'Ilimitado + SLA' },
    note: 'Inbox unificada, SLA monitorizado e CSAT pós-resolução.',
    tags: ['suporte', 'tickets', 'sla'],
  },
  'mod-knowledge': {
    limits: { grow: '1.000 docs', pro: '10.000 docs', enterprise: 'Ilimitado + APIs' },
    note: 'RAG vetorial, respostas com fontes e indexação automática.',
    tags: ['conhecimento', 'rag', 'ia'],
  },

  // ---- Verticais ----
  'vert-clinics': {
    limits: { grow: '3 profissionais', pro: '15 profissionais', enterprise: 'Multi-clínica' },
    note: 'Agenda, ficha clínica, lembretes WhatsApp e RGPD.',
    tags: ['saúde', 'agenda', 'rgpd'],
  },
  'vert-realestate': {
    limits: { grow: '500 imóveis', pro: '5.000 imóveis', enterprise: 'Multi-agência' },
    note: 'Matching IA imóvel↔lead, CPCV e comissões partilhadas.',
    tags: ['imobiliário', 'matching', 'cpcv'],
  },
  'vert-training': {
    limits: { grow: '50 turmas/ano', pro: '500 turmas/ano', enterprise: 'Ilimitado + SIGO' },
    note: 'Inscrições, certificados auto e financiamento IEFP.',
    tags: ['formação', 'iefp', 'certificados'],
  },
  'vert-condos': {
    limits: { grow: '20 condomínios', pro: '200 condomínios', enterprise: 'Multi-administração' },
    note: 'Quotas, atas e ocorrências num portal do condómino.',
    tags: ['condomínios', 'quotas', 'atas'],
  },
  'vert-agencies': {
    limits: { grow: '20 retainers', pro: '100 retainers', enterprise: 'Multi-agência' },
    note: 'Time-tracking, briefings e margem por cliente em tempo real.',
    tags: ['agências', 'retainers', 'time-tracking'],
  },
  'vert-restaurants': {
    limits: { grow: '1 estabelecimento', pro: '5 estabelecimentos', enterprise: 'Cadeia ilimitada' },
    note: 'Reservas, fidelização, reviews e WhatsApp ordering.',
    tags: ['restauração', 'reservas', 'whatsapp'],
  },
  'vert-auto': {
    limits: { grow: '1 oficina', pro: '5 oficinas', enterprise: 'Rede ilimitada' },
    note: 'OS digital, lembretes IPO e fidelização por viatura.',
    tags: ['auto', 'os', 'ipo'],
  },
  'vert-gyms': {
    limits: { grow: '500 sócios', pro: '5.000 sócios', enterprise: 'Multi-unidade' },
    note: 'Mensalidades SEPA, anti-churn IA e check-in QR.',
    tags: ['ginásio', 'sócios', 'sepa'],
  },
  'vert-beauty': {
    limits: { grow: '5 profissionais', pro: '20 profissionais', enterprise: 'Multi-salão' },
    note: 'Packs de sessões, fichas e fidelização por pontos.',
    tags: ['beleza', 'agenda', 'packs'],
  },
  'vert-events': {
    limits: { grow: '20 eventos/ano', pro: '200 eventos/ano', enterprise: 'Ilimitado' },
    note: 'RSVP digital, fornecedores e staffing por turnos.',
    tags: ['eventos', 'catering', 'rsvp'],
  },
  'vert-construction': {
    limits: { grow: '20 obras/ano', pro: '100 obras/ano', enterprise: 'Ilimitado' },
    note: 'Orçamentos por fase, autos digitais e subempreitadas.',
    tags: ['construção', 'autos', 'fases'],
  },
  'vert-legal': {
    limits: { grow: '5 advogados', pro: '20 advogados', enterprise: 'Multi-escritório' },
    note: 'Timesheet, conflitos e prazos processuais com alertas.',
    tags: ['advocacia', 'timesheet', 'prazos'],
  },

  // ---- Packs funcionais ----
  'pack-billing-pt': {
    limits: { grow: 'Até 3.000 docs/ano', pro: 'Até 30.000 docs/ano', enterprise: 'Ilimitado' },
    note: 'SAF-T, ATCUD, QR Code e comunicação à AT.',
    tags: ['faturação', 'at', 'saft'],
  },
  'pack-b2b-portal': {
    limits: { grow: '20 clientes B2B', pro: '200 clientes B2B', enterprise: 'Ilimitado' },
    note: 'Catálogo por cliente, crédito e aprovações.',
    tags: ['b2b', 'portal', 'crédito'],
  },
  'pack-hr': {
    limits: { grow: '10 colaboradores', pro: '50 colaboradores', enterprise: 'Ilimitado' },
    note: 'Férias, recibos e onboarding digitalizados.',
    tags: ['rh', 'férias', 'recibos'],
  },
  'pack-analytics': {
    limits: { grow: '10 dashboards', pro: 'Ilimitado', enterprise: 'API + Power BI' },
    note: 'Dashboards, alertas KPI e exports automáticos.',
    tags: ['bi', 'dashboards', 'kpi'],
  },
  'pack-omnichannel': {
    limits: { grow: '3 agentes', pro: '15 agentes', enterprise: 'Ilimitado' },
    note: '6+ canais numa só inbox com macros e roteamento.',
    tags: ['omnichannel', 'inbox', 'whatsapp'],
  },
  'pack-automations': {
    limits: { grow: '20 fluxos', pro: 'Ilimitado', enterprise: 'Ilimitado + APIs' },
    note: 'Workflows no-code, gatilhos e fallback com logs.',
    tags: ['automações', 'no-code', 'workflows'],
  },
  'pack-marketplace-c2c': {
    limits: { grow: '500 anúncios', pro: '5.000 anúncios', enterprise: 'Ilimitado + API' },
    note: 'Múltiplos vendedores, reputação, boost e comissões.',
    tags: ['marketplace', 'c2c', 'comissão'],
  },
  'pack-lives': {
    limits: { grow: '10 lives/mês', pro: '50 lives/mês', enterprise: 'Ilimitado + Mux dedicado' },
    note: 'Streaming Mux com governance e tracking server-side.',
    tags: ['lives', 'streaming', 'mux'],
  },
  'pack-ai-sdr-deep': {
    limits: { grow: '1 SDR', pro: '5 SDRs', enterprise: 'Ilimitado + IA dedicada' },
    note: 'Sequências multi-canal com Gemini e A/B automático.',
    tags: ['sdr', 'outbound', 'ia'],
  },
  'pack-pipeline-risk': {
    limits: { grow: 'Incluído', pro: 'Alertas + playbooks', enterprise: 'Modelo treinado workspace' },
    note: 'Deteta negócios estagnados e quebras de cadência.',
    tags: ['risco', 'pipeline', 'ia'],
  },
  'pack-compliance-rgpd': {
    limits: { grow: 'Templates base', pro: 'Incluído', enterprise: 'DPO outsourcing' },
    note: 'RoPA, consentimentos, DSAR e auditoria de PII.',
    tags: ['rgpd', 'compliance', 'pii'],
  },
  'pack-procurement-pro': {
    limits: { grow: 'Indisponível', pro: '200 fornecedores', enterprise: 'Ilimitado + EDI' },
    note: 'EDI, multi-armazém e reconciliação 3-way.',
    tags: ['compras', 'edi', 'stock'],
  },
  'pack-knowledge-rag': {
    limits: { grow: 'Indisponível', pro: '5.000 docs', enterprise: 'Ilimitado + tenant dedicado' },
    note: 'RAG avançado com reranking e citações verificáveis.',
    tags: ['rag', 'ia', 'docs'],
  },
  'pack-saas-billing': {
    limits: { grow: '50 subscritores', pro: '500 subscritores', enterprise: 'Ilimitado + Stripe Connect' },
    note: 'Trial 14d, dunning, upgrades e MRR consolidado.',
    tags: ['saas', 'billing', 'subscrições'],
  },
  'pack-events-rsvp': {
    limits: { grow: '5 eventos/mês', pro: '50 eventos/mês', enterprise: 'Ilimitado' },
    note: 'Convites únicos, restrições e check-in QR.',
    tags: ['eventos', 'rsvp', 'qr'],
  },
  'pack-loyalty': {
    limits: { grow: 'Programa simples', pro: 'Tiers + cupões', enterprise: 'Multi-marca + API' },
    note: 'Pontos, tiers, cupões e segmentação avançada.',
    tags: ['fidelização', 'cupões', 'pontos'],
  },
};

/** Extrai o valor numérico em EUR de uma string como "€29 /mês". */
function parseBaseEur(price: string | undefined): number {
  if (!price) return 0;
  const match = price.match(/€\s*(\d+(?:[.,]\d+)?)/);
  if (!match) return 0;
  return parseFloat(match[1].replace(',', '.'));
}

/** Catálogo final, derivado de PITCH_SLIDES + DEFAULT_MODULE_PRICES + LIMITS_AND_NOTES. */
export const COMPARABLE_MODULES: ComparableModule[] = PITCH_SLIDES
  .filter((s) => s.category !== 'core')
  .map((s) => {
    const priceInfo = DEFAULT_MODULE_PRICES[s.id] ?? { price: '€0 /mês' };
    const meta = LIMITS_AND_NOTES[s.id] ?? {
      limits: { grow: '—', pro: '—', enterprise: '—' },
      note: '',
      tags: [],
    };
    return {
      id: s.id,
      title: s.title,
      category: s.category as ModuleCategory,
      basePriceEur: parseBaseEur(priceInfo.price),
      priceLabel: priceInfo.price,
      priceNote: priceInfo.priceNote,
      limits: meta.limits,
      note: meta.note,
      tags: meta.tags,
    };
  });

export const CATEGORY_LABELS: Record<ModuleCategory, string> = {
  module: 'Módulos',
  vertical: 'Verticais',
  pack: 'Packs funcionais',
};
