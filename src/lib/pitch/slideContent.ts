/**
 * Default editable content for each pitch slide.
 * Slides read from `tokens.slideOverrides[id]` with fallback to these defaults.
 *
 * Field conventions:
 *  - eyebrow / title / subtitle : SlideHeader strings
 *  - heroText / heroSubtitle    : large central / cover text
 *  - imageUrl                   : optional data URL or remote image (slide-specific use)
 *  - items[]                    : list of {title, text} cards / steps
 *  - bullets[]                  : list of strings
 *  - stats[]                    : list of {value, label, sub}
 *  - extraText                  : free-form trailing block
 */

export interface SlideItem {
  title: string;
  text: string;
}
export interface SlideStat {
  value: string;
  label: string;
  sub?: string;
}

export interface SlideContent {
  eyebrow?: string;
  title?: string;
  subtitle?: string;
  heroText?: string;
  heroSubtitle?: string;
  imageUrl?: string;
  items?: SlideItem[];
  bullets?: string[];
  stats?: SlideStat[];
  extraText?: string;
}

export type SlideContentMap = Record<string, SlideContent>;

/** Schema describing which fields each slide exposes in the editor. */
export interface SlideEditorSchema {
  id: string;
  title: string;
  fields: {
    eyebrow?: boolean;
    title?: boolean;
    subtitle?: boolean;
    heroText?: boolean;
    heroSubtitle?: boolean;
    imageUrl?: boolean;
    items?: { count: number; titleLabel?: string; textLabel?: string };
    bullets?: { count: number };
    stats?: { count: number };
    extraText?: { label?: string; multiline?: boolean };
  };
}

/* ---------------- DEFAULTS PER SLIDE ---------------- */

export const DEFAULT_SLIDE_CONTENT: SlideContentMap = {
  cover: {
    eyebrow: 'Proposta comercial',
    heroText: 'Para',
    heroSubtitle:
      'O CRM com IA que unifica vendas, marketing, faturação e atendimento — pensado para PME portuguesas que querem escalar com método.',
  },
  problem: {
    eyebrow: 'O Problema',
    title: 'O dia-a-dia das PME comerciais',
    subtitle: 'Mais tempo em tarefas operacionais do que a fechar negócios.',
    items: [
      { title: 'Leads perdidos', text: 'Equipas comerciais perdem 60% dos leads por falta de follow-up rápido e estruturado.' },
      { title: 'Dados dispersos', text: 'Excel, WhatsApp, email, formulários — informação espalhada sem uma vista única do cliente.' },
      { title: 'Sem previsibilidade', text: 'Pipeline pouco fiável, previsões de receita baseadas em sentimento e não em dados.' },
      { title: 'Operação manual', text: 'Tarefas repetitivas (mensagens, propostas, faturação) consomem o tempo de quem devia vender.' },
    ],
  },
  opportunity: {
    eyebrow: 'A Oportunidade',
    title: 'O mercado está a digitalizar — quem chega primeiro ganha quota',
    subtitle: 'A maioria das PME portuguesas ainda não tem CRM. Quem automatiza vende mais, com a mesma equipa.',
    stats: [
      { value: '€8B', label: 'Mercado SaaS B2B em PT', sub: 'crescimento médio anual de 12%' },
      { value: '74%', label: 'das PME ainda usam Excel ou ferramentas dispersas', sub: 'fonte: ANETIE 2024' },
      { value: '+38%', label: 'aumento médio de receita com CRM bem implementado', sub: 'estudos Forrester / Nucleus' },
      { value: '5x', label: 'ROI típico em 12 meses', sub: 'face ao custo da licença e onboarding' },
    ],
  },
  'method-pare': {
    eyebrow: 'A base do sistema',
    title: 'Método PARE',
    subtitle: 'A metodologia que estrutura o FastCRM — quatro pilares para transformar a forma como a sua equipa vende.',
    items: [
      { title: 'Planeamento', text: 'Estrutura comercial clara: pipeline, capacidade da equipa, metas e prioridades por consultor.' },
      { title: 'Automação', text: 'IA e workflows que eliminam tarefas repetitivas — mensagens, propostas, faturação e seguimento.' },
      { title: 'Resultados', text: 'Decisões baseadas em dados: KPIs, relatórios, previsão de receita e risco de pipeline.' },
      { title: 'Eficiência', text: 'Mais negócios fechados com menos esforço — tempo libertado para o que gera valor.' },
    ],
    extraText: 'O Método PARE é a base de todo o FastCRM — cada funcionalidade existe para servir um destes quatro pilares.',
  },
  intro: {
    eyebrow: 'O que é o FastCRM',
    heroText: 'O copiloto comercial que ajuda {company} a vender mais, com a mesma equipa.',
    heroSubtitle: 'CRM, AI SDR, Inbox omnichannel, Faturação, Loja Online e Marketplace — tudo numa única plataforma desenhada em Portugal, para PME portuguesas.',
  },
  how: {
    eyebrow: 'Como funciona',
    title: 'Em 4 passos, do lead à fatura paga',
    items: [
      { title: 'Captar', text: 'Leads chegam de formulários, loja, WhatsApp, importação ou enriquecimento automático.' },
      { title: 'Qualificar', text: 'IA classifica, enriquece e atribui ao gestor certo conforme regras de capacidade.' },
      { title: 'Engajar', text: 'AI SDR envia sequências multi-canal (Email, WhatsApp, SMS) personalizadas.' },
      { title: 'Fechar', text: 'Propostas, faturas e renovações geradas em segundos — tudo registado no CRM.' },
    ],
  },
  crm: {
    eyebrow: 'Funcionalidade #1',
    title: 'CRM unificado',
    subtitle: 'Contactos, Leads, Empresas e Negócios numa só base — com PARE Score, deduplicação e enriquecimento automático.',
    bullets: [
      'Vista 360º do cliente: histórico, conversas, faturas, ficheiros',
      'Deduplicação inteligente por NIF, email e telefone',
      'PARE Score — qualificação automática de leads (0–100)',
      'Pipeline visual estilo Kanban + previsão de receita',
      'Integrações nativas: GoHighLevel, Google, WhatsApp, SMS',
    ],
  },
  'ai-sdr': {
    eyebrow: 'Funcionalidade #2',
    title: 'AI SDR & Outbound automatizado',
    subtitle: 'Sequências multi-canal personalizadas que prospectam 24/7, qualificam, agendam reuniões e entregam ao comercial humano.',
    items: [
      { title: 'Enriquecimento automático', text: 'Cada lead é enriquecido com sector, dimensão, faturação e ICP Fit Score antes de entrar na sequência.' },
      { title: 'Mensagens personalizadas com IA', text: 'Gemini gera o copy adaptado ao destinatário, à conta-alvo e ao timing certo.' },
      { title: 'A/B testing automático', text: 'Compara templates e escolhe o vencedor — mede taxa de abertura, resposta e meeting booked.' },
      { title: 'Hand-off para humano', text: 'Quando o lead responde positivamente, é entregue ao comercial com contexto completo.' },
    ],
    extraText: '+62% de meetings booked vs outbound manual',
  },
  inbox: {
    eyebrow: 'Funcionalidade #3',
    title: 'Inbox omnichannel',
    subtitle: 'Todos os canais num só inbox — nada se perde, tudo fica registado no CRM.',
    items: [
      { title: 'WhatsApp Business', text: 'QR + Evolution API. Templates aprovados, envio em 1 clique.' },
      { title: 'Email integrado', text: 'Sequências, tracking de abertura e resposta unificada na inbox.' },
      { title: 'SMS (Twilio)', text: 'Notificações transaccionais e campanhas com signature validation.' },
      { title: 'Telegram', text: 'Bot @ + grupos sincronizados, com webhook resiliente.' },
      { title: 'Instagram DM', text: 'Conversas geridas no mesmo inbox, via GoHighLevel.' },
      { title: 'Facebook Messenger', text: 'Atendimento centralizado, atribuído ao gestor certo.' },
    ],
  },
  pipeline: {
    eyebrow: 'Funcionalidade #4',
    title: 'Pipeline, Propostas e Faturação',
    subtitle: 'Do primeiro contacto à fatura paga — sem mudar de plataforma.',
    items: [
      { title: '📄 Propostas em 1 clique', text: 'Templates dinâmicos, assinatura digital e tracking de abertura.' },
      { title: '🧾 Faturação certificada', text: 'Faturas e recibos em conformidade com a AT, com pagamento integrado.' },
      { title: '🔁 Renovações & MRR', text: 'Contratos recorrentes, alertas de churn e MRR em tempo real.' },
    ],
  },
  marketplace: {
    eyebrow: 'Funcionalidade #5',
    title: 'Loja, Marketplace e Lead Magnets',
    subtitle: 'Vender online não devia exigir 5 ferramentas. O FastCRM inclui-as todas.',
    items: [
      { title: 'Loja Online B2C', text: 'Catálogo, checkout, métodos de pagamento (Stripe, MB Way, multibanco) e cumprimento legal PT (DL 24/2014).' },
      { title: 'Marketplace C2C / B2B', text: 'Múltiplos vendedores, reputação, reviews, boost de anúncios, pagamentos divididos.' },
      { title: 'Ebooks & Lead Magnets', text: 'Captura de leads via gating de ebooks, com nome/email/telefone integrado no CRM.' },
    ],
    extraText: '💡 Cada venda na loja, ebook descarregado ou anúncio publicado vira automaticamente uma oportunidade no CRM — fluxo end-to-end sem integrações externas.',
  },
  diff: {
    eyebrow: 'Diferenciadores',
    title: 'Porque é que o FastCRM ganha',
    bullets: [
      'CRM + Faturação + Loja num só produto',
      'AI SDR nativo (sem integrações externas)',
      'Pensado para o mercado e legislação PT',
      'Inbox omnichannel (WhatsApp, Email, SMS, IG, FB)',
      'Marketplace C2C / Portal B2B incluídos',
      'Ebooks & Lead Magnets nativos',
      'Pricing transparente, sem custos por contacto',
      'Onboarding com método estruturado (PARE)',
    ],
  },
  results: {
    eyebrow: 'Resultados esperados',
    title: 'O que {company} pode esperar',
    subtitle: 'Indicadores médios em PME com 5 a 50 utilizadores nos primeiros 90 dias.',
    stats: [
      { value: '+38%', label: 'Receita por comercial', sub: 'média nos primeiros 6 meses' },
      { value: '−65%', label: 'Tempo em tarefas operacionais', sub: 'follow-ups, propostas, faturação' },
      { value: '×3,1', label: 'Conversão lead → cliente', sub: 'graças ao AI SDR e ao PARE Score' },
      { value: '4,9/5', label: 'Satisfação das equipas', sub: 'após 90 dias de uso' },
    ],
  },
  pricing: {
    eyebrow: 'Investimento',
    title: 'Planos e investimento',
    subtitle: 'Proposta dimensionada para {company} — sem custos de instalação no primeiro ano.',
  },
  onboarding: {
    eyebrow: 'Roadmap',
    title: 'Onboarding em 4 semanas',
    subtitle: '{presenter} acompanha todo o processo do dia 1 ao dia 30.',
    items: [
      { title: 'Setup & Importação', text: 'Configuração do workspace, importação de contactos, ligação a WhatsApp/Email/Calendário.' },
      { title: 'Formação da equipa', text: 'Workshops práticos com comerciais e gestores. Vídeos e manuais personalizados ao processo.' },
      { title: 'Automações & AI SDR', text: 'Configuração de pipelines, sequências, templates e regras de atribuição automática.' },
      { title: 'Optimização & KPIs', text: 'Revisão de métricas, refinamento de templates e definição de cadência mensal.' },
    ],
  },
  next: {
    eyebrow: 'Próximos passos',
    heroText: 'Vamos avançar com {company}?',
    items: [
      { title: 'Trial de 14 dias', text: 'Acesso completo, sem compromisso e sem cartão.' },
      { title: 'Workshop de descoberta', text: '60 min com a equipa para alinhar processos e dores.' },
      { title: 'Setup em 48h', text: 'Importação de dados, ligação de canais e ativação.' },
    ],
  },
};

/* ---------------- EDITOR SCHEMAS ---------------- */

export const SLIDE_EDITOR_SCHEMAS: SlideEditorSchema[] = [
  { id: 'cover', title: 'Capa', fields: { eyebrow: true, heroText: true, heroSubtitle: true } },
  { id: 'problem', title: 'O Problema', fields: { eyebrow: true, title: true, subtitle: true, items: { count: 4 } } },
  { id: 'opportunity', title: 'Oportunidade', fields: { eyebrow: true, title: true, subtitle: true, stats: { count: 4 } } },
  { id: 'method-pare', title: 'Método PARE', fields: { eyebrow: true, title: true, subtitle: true, items: { count: 4, titleLabel: 'Pilar', textLabel: 'Descrição' }, extraText: { label: 'Frase de fecho' } } },
  { id: 'intro', title: 'O que é o FastCRM', fields: { eyebrow: true, heroText: true, heroSubtitle: true } },
  { id: 'how', title: 'Como funciona', fields: { eyebrow: true, title: true, items: { count: 4, titleLabel: 'Passo', textLabel: 'Descrição' } } },
  { id: 'crm', title: 'CRM unificado', fields: { eyebrow: true, title: true, subtitle: true, bullets: { count: 5 } } },
  { id: 'ai-sdr', title: 'AI SDR & Outbound', fields: { eyebrow: true, title: true, subtitle: true, items: { count: 4 }, extraText: { label: 'KPI destacado' } } },
  { id: 'inbox', title: 'Inbox omnichannel', fields: { eyebrow: true, title: true, subtitle: true, items: { count: 6, titleLabel: 'Canal' } } },
  { id: 'pipeline', title: 'Pipeline & Faturação', fields: { eyebrow: true, title: true, subtitle: true, items: { count: 3 } } },
  { id: 'marketplace', title: 'Loja & Marketplace', fields: { eyebrow: true, title: true, subtitle: true, items: { count: 3 }, extraText: { label: 'Caixa de destaque', multiline: true } } },
  { id: 'diff', title: 'Diferenciadores', fields: { eyebrow: true, title: true, bullets: { count: 8 } } },
  { id: 'results', title: 'Resultados', fields: { eyebrow: true, title: true, subtitle: true, stats: { count: 4 } } },
  { id: 'pricing', title: 'Investimento', fields: { eyebrow: true, title: true, subtitle: true } },
  { id: 'onboarding', title: 'Onboarding', fields: { eyebrow: true, title: true, subtitle: true, items: { count: 4, titleLabel: 'Tema', textLabel: 'Descrição' } } },
  { id: 'next', title: 'Próximos passos', fields: { eyebrow: true, heroText: true, items: { count: 3 } } },
];

/** Resolve effective content for a slide: override merged with defaults. */
export function resolveSlideContent(
  id: string,
  overrides: SlideContentMap | undefined
): SlideContent {
  const base = DEFAULT_SLIDE_CONTENT[id] || {};
  const ov = overrides?.[id] || {};
  // Merge primitives + arrays (override wins, but each item in arrays merges per-index)
  const mergeItems = (a?: SlideItem[], b?: SlideItem[]) => {
    if (!a) return b;
    if (!b) return a;
    return a.map((item, i) => ({ ...item, ...(b[i] || {}) }));
  };
  const mergeStats = (a?: SlideStat[], b?: SlideStat[]) => {
    if (!a) return b;
    if (!b) return a;
    return a.map((s, i) => ({ ...s, ...(b[i] || {}) }));
  };
  const mergeBullets = (a?: string[], b?: string[]) => {
    if (!a) return b;
    if (!b) return a;
    return a.map((s, i) => (b[i] !== undefined && b[i] !== '' ? b[i] : s));
  };
  return {
    eyebrow: ov.eyebrow ?? base.eyebrow,
    title: ov.title ?? base.title,
    subtitle: ov.subtitle ?? base.subtitle,
    heroText: ov.heroText ?? base.heroText,
    heroSubtitle: ov.heroSubtitle ?? base.heroSubtitle,
    imageUrl: ov.imageUrl ?? base.imageUrl,
    items: mergeItems(base.items, ov.items),
    stats: mergeStats(base.stats, ov.stats),
    bullets: mergeBullets(base.bullets, ov.bullets),
    extraText: ov.extraText ?? base.extraText,
  };
}

/** Replace {company}, {contact}, {presenter} tokens inline. */
export function interpolate(
  text: string | undefined,
  vars: { company?: string; contact?: string; presenter?: string }
): string {
  if (!text) return '';
  return text
    .replace(/\{company\}/g, vars.company || '')
    .replace(/\{contact\}/g, vars.contact || '')
    .replace(/\{presenter\}/g, vars.presenter || '');
}
