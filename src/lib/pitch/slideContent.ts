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

  /* ===== MÓDULOS OPCIONAIS (deep-dive) ===== */

  'mod-revenue': {
    eyebrow: 'Módulo · Finanças',
    title: 'Controlo de Receita & MRR',
    subtitle: 'Visibilidade total sobre faturação, recebimentos e receita recorrente — em tempo real.',
    stats: [
      { value: '€ MRR', label: 'em tempo real', sub: 'agregado por plano e cliente' },
      { value: '−42%', label: 'tempo a fechar mês', sub: 'reconciliação automatizada' },
      { value: '100%', label: 'conformidade AT', sub: 'faturação certificada PT' },
      { value: '0€', label: 'fugas de receita', sub: 'alertas de churn e atrasos' },
    ],
    items: [
      { title: 'Dashboard financeiro', text: 'KPIs de faturação, recebimentos, dívida ativa e cash-flow projetado.' },
      { title: 'MRR & ARR', text: 'Receita recorrente segmentada por plano, cliente e cohort, com churn rate.' },
      { title: 'Reconciliação automática', text: 'Match entre faturas, recibos e movimentos bancários (SIBS, Stripe, MB Way).' },
      { title: 'Alertas inteligentes', text: 'Avisos de faturas em atraso, contratos a renovar e contas em risco.' },
    ],
    extraText: 'Decisões financeiras suportadas em dados reais — não em folhas de Excel desatualizadas.',
  },

  'mod-procurement': {
    eyebrow: 'Módulo · Operações',
    title: 'Compras & Fornecedores',
    subtitle: 'Centralize encomendas, preços e fornecedores — proteja margem com inteligência de preços.',
    stats: [
      { value: '−18%', label: 'custo de aquisição', sub: 'pesquisa de preços automatizada' },
      { value: '3x', label: 'velocidade de encomenda', sub: 'fluxo aprovação → fornecedor' },
      { value: '100%', label: 'rastreabilidade', sub: 'do pedido à receção' },
      { value: '24/7', label: 'monitorização preços', sub: 'alertas de variação' },
    ],
    items: [
      { title: 'Catálogo de fornecedores', text: 'Base unificada com condições, prazos, históricos de qualidade e preços por SKU.' },
      { title: 'Encomendas & aprovações', text: 'Fluxo de aprovação multi-nível, geração automática de PO e envio direto.' },
      { title: 'Inteligência de preços', text: 'Comparação automática entre fornecedores e proteção de margem em tempo real.' },
      { title: 'Receção & stock', text: 'Conferência por código de barras, atualização automática de inventário.' },
    ],
  },

  'mod-shop': {
    eyebrow: 'Módulo · E-commerce',
    title: 'Loja Online B2C',
    subtitle: 'Loja completa pronta a vender — com cumprimento legal PT e integração nativa com o CRM.',
    stats: [
      { value: '15min', label: 'para publicar', sub: 'tema + catálogo + pagamentos' },
      { value: '+27%', label: 'conversão checkout', sub: 'vs. plataformas genéricas' },
      { value: '6+', label: 'métodos de pagamento', sub: 'Stripe, MB Way, Multibanco, …' },
      { value: 'DL 24', label: '/2014 + RGPD', sub: 'cumprimento legal PT' },
    ],
    items: [
      { title: 'Catálogo & variantes', text: 'Produtos com variantes, bundles, stock por armazém e categorias unificadas.' },
      { title: 'Checkout otimizado', text: 'One-page, com Stripe, MB Way, Multibanco, transferência e pagamentos divididos.' },
      { title: 'Cumprimento legal PT', text: 'DL 7/2004, DL 24/2014, DL 84/2021, RGPD e Diretiva Omnibus aplicados por defeito.' },
      { title: 'Carrinhos abandonados', text: 'Recuperação automática multi-canal (Email, WhatsApp, SMS) com cupões dinâmicos.' },
    ],
    extraText: '🛒 Cada venda gera automaticamente uma oportunidade no CRM e uma fatura certificada.',
  },

  'mod-renewals': {
    eyebrow: 'Módulo · Retenção',
    title: 'Renovações & Subscrições',
    subtitle: 'Motor completo para gerir contratos recorrentes, renovações e prevenir churn.',
    stats: [
      { value: '+24%', label: 'taxa de renovação', sub: 'com alertas e playbooks' },
      { value: '−31%', label: 'churn voluntário', sub: 'após 6 meses de uso' },
      { value: 'D-90', label: 'antecipação alertas', sub: 'tempo para agir' },
      { value: 'Auto', label: 'faturação recorrente', sub: 'sem intervenção manual' },
    ],
    items: [
      { title: 'Ciclo de vida do contrato', text: 'Datas de início, renovação, fim e índice de revisão de preço por cliente.' },
      { title: 'Alertas D-90/D-60/D-30', text: 'Notificações automáticas ao gestor de conta com playbook de retenção.' },
      { title: 'Faturação recorrente', text: 'Geração automática de faturas, recibos e recibos verdes em conformidade AT.' },
      { title: 'Risco de churn', text: 'Score preditivo baseado em uso, sentimento e atividade comercial.' },
    ],
  },

  'mod-support': {
    eyebrow: 'Módulo · Atendimento',
    title: 'Suporte & Atendimento ao Cliente',
    subtitle: 'Centralize tickets, conversas e SLA — todos os canais, uma única vista do cliente.',
    stats: [
      { value: '−54%', label: 'tempo 1ª resposta', sub: 'inbox unificada + macros IA' },
      { value: '4,9/5', label: 'CSAT médio', sub: 'inquéritos pós-resolução' },
      { value: '24/7', label: 'cobertura', sub: 'IA + escalonamento humano' },
      { value: 'SLA', label: 'monitorização ativa', sub: 'alertas antes de quebrar' },
    ],
    items: [
      { title: 'Inbox unificada', text: 'WhatsApp, Email, IG, FB, SMS e Telegram numa única caixa de entrada.' },
      { title: 'Tickets & SLA', text: 'Atribuição automática, prioridades, SLA por plano e escalonamento configurável.' },
      { title: 'Base de conhecimento', text: 'Artigos, FAQs e respostas sugeridas por IA com base no histórico do cliente.' },
      { title: 'CSAT & NPS', text: 'Inquéritos automáticos pós-resolução com análise de sentimento.' },
    ],
  },

  'mod-knowledge': {
    eyebrow: 'Módulo · Conhecimento',
    title: 'Base de Conhecimento com IA',
    subtitle: 'Toda a informação da empresa pesquisável e respondida em linguagem natural.',
    stats: [
      { value: 'RAG', label: 'arquitetura vetorial', sub: 'embeddings + reranking' },
      { value: '−68%', label: 'tempo a procurar info', sub: 'colaboradores e suporte' },
      { value: '∞', label: 'documentos suportados', sub: 'PDF, DOCX, web, vídeo' },
      { value: 'PT', label: 'modelo otimizado', sub: 'língua portuguesa' },
    ],
    items: [
      { title: 'Indexação automática', text: 'Carregue documentos, sites, vídeos e emails — IA indexa e mantém atualizado.' },
      { title: 'Pesquisa semântica', text: 'Pergunte em linguagem natural e receba respostas com fontes citadas.' },
      { title: 'Assistente interno', text: 'Copiloto para equipas comerciais, suporte e operações com contexto da empresa.' },
      { title: 'Governação & permissões', text: 'Controlo granular sobre quem acede a quê — auditoria completa de pesquisas.' },
    ],
  },

  /* ===== VERTICAIS DE MERCADO ===== */

  'vert-clinics': {
    eyebrow: 'Vertical · Saúde',
    title: 'FastCRM para Clínicas & Saúde',
    subtitle: 'Marcações, ficha clínica, lembretes WhatsApp/SMS e faturação — em conformidade com RGPD.',
    stats: [
      { value: '−42%', label: 'no-shows', sub: 'lembretes automáticos D-1' },
      { value: '×2,3', label: 'novas marcações', sub: 'reativação de pacientes inativos' },
      { value: 'RGPD', label: 'conformidade total', sub: 'consentimentos e auditoria' },
      { value: '15min', label: 'check-in médio', sub: 'reduzido em 60%' },
    ],
    items: [
      { title: 'Agenda multi-profissional', text: 'Calendário por especialista, salas e equipamentos com disponibilidade em tempo real.' },
      { title: 'Ficha clínica & histórico', text: 'Histórico completo do paciente: consultas, prescrições, exames e documentos.' },
      { title: 'Lembretes WhatsApp/SMS', text: 'Envio automático D-1 e D-0, com confirmação por 1 clique e reagendamento.' },
      { title: 'Faturação & seguros', text: 'Faturação certificada PT, recibos para subsistemas e gestão de copagamentos.' },
    ],
  },

  'vert-realestate': {
    eyebrow: 'Vertical · Imobiliário',
    title: 'FastCRM para Imobiliárias',
    subtitle: 'Angariações, matching imóvel↔lead, visitas e CPCV — do anúncio à escritura.',
    stats: [
      { value: '×3,2', label: 'matches relevantes', sub: 'IA cruza ficha vs. lead' },
      { value: '−48%', label: 'tempo até visita', sub: 'agendamento 1 clique' },
      { value: '100%', label: 'comissões rastreadas', sub: 'split por consultor' },
      { value: 'CPCV', label: 'gestão integrada', sub: 'datas, sinais, escrituras' },
    ],
    items: [
      { title: 'Angariações & portfólio', text: 'Ficha de imóvel completa: fotos, planta, vídeos, documentação e estado de processo.' },
      { title: 'Matching IA', text: 'Algoritmo cruza preferências do comprador com imóveis disponíveis e sugere visitas.' },
      { title: 'Visitas & feedback', text: 'Agendamento, app de feedback no local e relatório automático para o proprietário.' },
      { title: 'CPCV & comissões', text: 'Gestão de prazos, sinais, escrituras e divisão automática de comissões.' },
    ],
  },

  'vert-training': {
    eyebrow: 'Vertical · Formação',
    title: 'FastCRM para Formação & E-learning',
    subtitle: 'Turmas, inscrições, certificados e financiamento IEFP — gestão completa.',
    stats: [
      { value: '+58%', label: 'taxa de inscrição', sub: 'funil otimizado' },
      { value: 'Auto', label: 'certificados', sub: 'emissão pós-conclusão' },
      { value: 'IEFP', label: 'compatível', sub: 'financiamento e SIGO' },
      { value: '24/7', label: 'portal aluno', sub: 'materiais e progresso' },
    ],
    items: [
      { title: 'Turmas & calendário', text: 'Edições, formadores, salas, capacidade e lista de espera.' },
      { title: 'Inscrições online', text: 'Página da formação com checkout, pagamento parcelado e validação de pré-requisitos.' },
      { title: 'Certificados automáticos', text: 'Emissão e envio automático de certificados após conclusão e avaliação.' },
      { title: 'Financiamento IEFP', text: 'Compatível com SIGO, dossier técnico-pedagógico e reporting financeiro.' },
    ],
  },

  'vert-condos': {
    eyebrow: 'Vertical · Condomínios',
    title: 'FastCRM para Condomínios',
    subtitle: 'Frações, quotas, atas e ocorrências — comunicação organizada com condóminos.',
    stats: [
      { value: '−52%', label: 'tempo a tratar quotas', sub: 'cobrança automática' },
      { value: 'D-0', label: 'comunicação massa', sub: 'WhatsApp + Email' },
      { value: '100%', label: 'atas digitais', sub: 'arquivo pesquisável' },
      { value: '24/7', label: 'portal condómino', sub: 'pagamentos e ocorrências' },
    ],
    items: [
      { title: 'Frações & condóminos', text: 'Cadastro completo de frações, proprietários, inquilinos e quotas.' },
      { title: 'Cobrança de quotas', text: 'Geração automática de avisos, débitos diretos e gestão de incumprimentos.' },
      { title: 'Atas & documentos', text: 'Atas, regulamentos e contratos digitalizados com pesquisa e versionamento.' },
      { title: 'Ocorrências & manutenção', text: 'Registo de ocorrências, atribuição a fornecedores e tracking até resolução.' },
    ],
  },

  'vert-agencies': {
    eyebrow: 'Vertical · Agências',
    title: 'FastCRM para Agências de Marketing',
    subtitle: 'Retainers, time-tracking, aprovações e briefings — operação rentável.',
    stats: [
      { value: '+34%', label: 'margem por cliente', sub: 'tracking de horas real' },
      { value: '×2', label: 'velocidade aprovação', sub: 'fluxos digitais' },
      { value: '100%', label: 'briefings centralizados', sub: 'sem emails perdidos' },
      { value: 'MRR', label: 'visibilidade total', sub: 'retainers e projetos' },
    ],
    items: [
      { title: 'Retainers & projetos', text: 'Contratos recorrentes, scope de horas mensais e billing automático.' },
      { title: 'Time-tracking', text: 'Registo de horas por cliente/projeto/colaborador com alertas de overrun.' },
      { title: 'Aprovações & briefings', text: 'Portal cliente para briefings, aprovações e feedback assíncrono.' },
      { title: 'Rentabilidade real', text: 'Margem por cliente em tempo real — custo equipa vs. receita faturada.' },
    ],
  },

  'vert-restaurants': {
    eyebrow: 'Vertical · Restauração & Hotelaria',
    title: 'FastCRM para Restauração & Hotelaria',
    subtitle: 'Reservas, fidelização, reviews e WhatsApp ordering — experiência premium.',
    stats: [
      { value: '+47%', label: 'reservas diretas', sub: 'sem comissões a terceiros' },
      { value: '×3', label: 'reviews positivas', sub: 'pedido automático pós-visita' },
      { value: 'WA', label: 'ordering nativo', sub: 'menu QR + checkout' },
      { value: '−28%', label: 'no-shows', sub: 'confirmação 1 clique' },
    ],
    items: [
      { title: 'Reservas online', text: 'Widget de reservas para o site, gestão de mesas, lista de espera e confirmações.' },
      { title: 'Fidelização & cartões', text: 'Programa de pontos, cupões personalizados e segmentação de clientes recorrentes.' },
      { title: 'Reviews automáticas', text: 'Pedido automático pós-visita por WhatsApp/Email com push para Google e TripAdvisor.' },
      { title: 'WhatsApp ordering', text: 'Menu QR, carrinho, pagamento integrado e confirmação direta na cozinha.' },
    ],
  },

  'vert-auto': {
    eyebrow: 'Vertical · Oficinas Auto',
    title: 'FastCRM para Oficinas Auto',
    subtitle: 'Viaturas, ordens de serviço, inspeções e revisões — fidelização garantida.',
    stats: [
      { value: '+41%', label: 'taxa de retorno', sub: 'lembretes inspeção/revisão' },
      { value: 'OS', label: 'digital fim-a-fim', sub: 'do orçamento à fatura' },
      { value: '100%', label: 'histórico viatura', sub: 'todas as intervenções' },
      { value: 'Auto', label: 'lembretes IPO', sub: 'D-30 antes do fim' },
    ],
    items: [
      { title: 'Ficha de viatura', text: 'Histórico completo: matrícula, KMs, intervenções, peças e garantias.' },
      { title: 'Ordens de serviço', text: 'OS digital com check-in fotográfico, orçamento aprovado por SMS e fatura final.' },
      { title: 'Inspeções & revisões', text: 'Lembretes automáticos de IPO, revisão e mudança de pneus por WhatsApp/SMS.' },
      { title: 'Fidelização', text: 'Cupões aniversário viatura, packs manutenção e reativação de clientes inativos.' },
    ],
  },

  'vert-gyms': {
    eyebrow: 'Vertical · Ginásios & Estúdios',
    title: 'FastCRM para Ginásios & Estúdios',
    subtitle: 'Sócios, mensalidades, aulas e check-in — combate o churn com IA.',
    stats: [
      { value: '−36%', label: 'churn mensal', sub: 'alertas de inatividade' },
      { value: 'Auto', label: 'mensalidades', sub: 'débito direto SEPA' },
      { value: 'QR', label: 'check-in fluído', sub: 'app sócio integrada' },
      { value: '+52%', label: 'reservas aulas', sub: 'app + lista de espera' },
    ],
    items: [
      { title: 'Sócios & planos', text: 'Cadastro de sócios, planos, mensalidades, congelamentos e cancelamentos.' },
      { title: 'Aulas & reservas', text: 'Calendário de aulas, reservas, lista de espera e check-in por QR.' },
      { title: 'Mensalidades automáticas', text: 'Débito direto SEPA, gestão de incumprimentos e renovações automáticas.' },
      { title: 'Anti-churn IA', text: 'Score de risco baseado em frequência, alertas ao staff e campanhas de reativação.' },
    ],
  },

  'vert-beauty': {
    eyebrow: 'Vertical · Beleza & Estética',
    title: 'FastCRM para Beleza & Estética',
    subtitle: 'Agenda multi-profissional, packs de sessões e fidelização — operação fluída.',
    stats: [
      { value: '+44%', label: 'ocupação agenda', sub: 'otimização IA de horários' },
      { value: '×2,8', label: 'venda de packs', sub: 'upsell automático' },
      { value: '−35%', label: 'no-shows', sub: 'depósito + lembretes' },
      { value: 'Auto', label: 'fidelização', sub: 'pontos por visita' },
    ],
    items: [
      { title: 'Agenda multi-profissional', text: 'Calendário por profissional, serviços e duração — bloqueios e folgas configuráveis.' },
      { title: 'Packs & sessões', text: 'Venda de packs (10 sessões, etc.) com débito automático em cada visita.' },
      { title: 'Fichas de cliente', text: 'Histórico de tratamentos, fotos antes/depois, alergias e preferências.' },
      { title: 'Fidelização & cupões', text: 'Programa de pontos, aniversários, indique-amigo e ofertas personalizadas.' },
    ],
  },

  'vert-events': {
    eyebrow: 'Vertical · Eventos & Catering',
    title: 'FastCRM para Eventos & Catering',
    subtitle: 'Orçamentos, RSVP, fornecedores e staffing — eventos sem caos operacional.',
    stats: [
      { value: '×2,5', label: 'orçamentos/dia', sub: 'templates dinâmicos' },
      { value: 'RSVP', label: 'automático', sub: 'links únicos por convidado' },
      { value: '100%', label: 'staffing organizado', sub: 'turnos e checkout' },
      { value: '−40%', label: 'esquecimentos', sub: 'checklist por evento' },
    ],
    items: [
      { title: 'Orçamentos rápidos', text: 'Templates por tipo de evento (casamento, corporate, batizado) com preços dinâmicos.' },
      { title: 'RSVP digital', text: 'Convites com link único, confirmação online e gestão de restrições alimentares.' },
      { title: 'Fornecedores & timeline', text: 'Coordenação de fornecedores (música, flores, fotografia) com timeline partilhada.' },
      { title: 'Staffing & turnos', text: 'Atribuição de equipa, comunicação por WhatsApp e check-in/checkout no local.' },
    ],
  },

  'vert-construction': {
    eyebrow: 'Vertical · Construção & Obras',
    title: 'FastCRM para Construção & Obras',
    subtitle: 'Orçamentos por fase, autos de medição e subempreitadas — controlo de margem.',
    stats: [
      { value: '+22%', label: 'margem média', sub: 'pricing por fase real' },
      { value: '100%', label: 'autos digitais', sub: 'fotos + assinatura' },
      { value: 'Auto', label: 'faturação por fase', sub: 'após validação' },
      { value: '×2', label: 'velocidade orçamentos', sub: 'biblioteca de capítulos' },
    ],
    items: [
      { title: 'Orçamentos por fase', text: 'Estrutura por capítulos, materiais e mão-de-obra com biblioteca reutilizável.' },
      { title: 'Autos de medição', text: 'Registo no terreno com fotos, assinatura digital e aprovação do cliente.' },
      { title: 'Subempreitadas', text: 'Gestão de subempreiteiros, contratos, autos e faturação com retenção de garantia.' },
      { title: 'Faturação por fase', text: 'Faturação automática após aprovação do auto, com cumprimento legal PT.' },
    ],
  },

  'vert-legal': {
    eyebrow: 'Vertical · Advocacia & Consultoria',
    title: 'FastCRM para Advocacia & Consultoria',
    subtitle: 'Processos, timesheet, honorários e conflito de interesses — prática moderna.',
    stats: [
      { value: '+28%', label: 'horas faturáveis', sub: 'timesheet rigoroso' },
      { value: 'Auto', label: 'conflito interesses', sub: 'verificação ao criar processo' },
      { value: '100%', label: 'documentos seguros', sub: 'cifrados e auditados' },
      { value: 'D-0', label: 'prazos processuais', sub: 'alertas multi-nível' },
    ],
    items: [
      { title: 'Processos & matérias', text: 'Cadastro de processos, partes envolvidas, tribunal e documentação digital.' },
      { title: 'Timesheet & honorários', text: 'Registo de horas por matéria, cálculo automático de honorários e faturação.' },
      { title: 'Conflito de interesses', text: 'Verificação automática ao criar novo processo — partes, contrapartes e relacionados.' },
      { title: 'Prazos processuais', text: 'Alertas multi-nível antes de prazos críticos (D-7, D-3, D-1, D-0).' },
    ],
  },

  /* ===== PACKS FUNCIONAIS ===== */

  'pack-billing-pt': {
    eyebrow: 'Pack · Faturação PT',
    title: 'Faturação Portuguesa Certificada',
    subtitle: 'SAF-T, ATCUD, QR Code e comunicação à AT — totalmente em conformidade.',
    stats: [
      { value: 'AT', label: 'certificada', sub: 'software certificado' },
      { value: 'ATCUD', label: '+ QR Code', sub: 'em todas as faturas' },
      { value: 'SAF-T', label: 'mensal automático', sub: 'pronto para AT' },
      { value: '24/7', label: 'comunicação AT', sub: 'série, recibo, fatura' },
    ],
    items: [
      { title: 'Faturas, recibos, NCs', text: 'Tipos completos: FT, FS, NC, ND, RC, RG — séries configuráveis por workspace.' },
      { title: 'ATCUD & QR Code', text: 'Geração automática conforme regulamento AT, com validação no canto da fatura.' },
      { title: 'SAF-T mensal', text: 'Geração automática até dia 5, pronto para entrega no Portal das Finanças.' },
      { title: 'e-Fatura & SAF-PT', text: 'Comunicação automática à AT, exportação SAF-PT para contabilista.' },
    ],
  },

  'pack-b2b-portal': {
    eyebrow: 'Pack · B2B',
    title: 'Portal B2B para Clientes',
    subtitle: 'Preços por cliente, encomendas recorrentes e crédito — venda B2B profissional.',
    stats: [
      { value: '+62%', label: 'recompras', sub: 'self-service 24/7' },
      { value: '−74%', label: 'tempo a processar', sub: 'encomendas automáticas' },
      { value: 'Tabela', label: 'preço por cliente', sub: 'desconto + condições' },
      { value: 'Crédito', label: 'gestão integrada', sub: 'limite + saldo em real' },
    ],
    items: [
      { title: 'Catálogo personalizado', text: 'Cada cliente vê os seus produtos, com a sua tabela de preço e condições.' },
      { title: 'Encomendas recorrentes', text: 'Encomendas template, repetição programada e quick-reorder por código.' },
      { title: 'Limite de crédito', text: 'Gestão de limite, saldo em conta-corrente e bloqueio automático em incumprimento.' },
      { title: 'Aprovações multi-nível', text: 'Encomendas acima de X requerem aprovação interna do cliente.' },
    ],
  },

  'pack-hr': {
    eyebrow: 'Pack · RH',
    title: 'RH & People Operations',
    subtitle: 'Colaboradores, férias, recibos e onboarding — operação de RH digitalizada.',
    stats: [
      { value: '−68%', label: 'tempo em processos RH', sub: 'auto-serviço colaborador' },
      { value: '100%', label: 'recibos digitais', sub: 'envio automático mensal' },
      { value: 'App', label: 'colaborador', sub: 'férias, recibos, despesas' },
      { value: 'Auto', label: 'onboarding', sub: 'checklist + documentos' },
    ],
    items: [
      { title: 'Colaboradores & estrutura', text: 'Ficha completa, organograma, departamentos e cadeia hierárquica.' },
      { title: 'Férias & ausências', text: 'Pedidos digitais, aprovação por chefia, calendário de equipa e saldo em tempo real.' },
      { title: 'Recibos de vencimento', text: 'Geração e envio automático mensal, arquivo digital e portal do colaborador.' },
      { title: 'Onboarding & offboarding', text: 'Checklist por etapa, documentos a assinar e atribuição de equipamento/acessos.' },
    ],
  },

  'pack-analytics': {
    eyebrow: 'Pack · BI',
    title: 'Analytics & Business Intelligence',
    subtitle: 'Dashboards custom, exports e alertas — decisões baseadas em dados.',
    stats: [
      { value: '∞', label: 'dashboards', sub: 'drag & drop' },
      { value: 'Real', label: 'tempo real', sub: 'sem refresh manual' },
      { value: 'Auto', label: 'alertas KPI', sub: 'thresholds configuráveis' },
      { value: 'XLS', label: 'exports', sub: 'PDF, Excel, CSV' },
    ],
    items: [
      { title: 'Dashboards custom', text: 'Construa o seu cockpit com widgets de vendas, finanças, marketing e operações.' },
      { title: 'KPIs & alertas', text: 'Defina KPIs e thresholds — alertas automáticos por email/WhatsApp quando saem do limite.' },
      { title: 'Relatórios automáticos', text: 'Reports semanais/mensais enviados automaticamente para a direção.' },
      { title: 'Exports & API', text: 'Exportação para Excel, PDF e API para integração com Power BI ou Looker.' },
    ],
  },

  'pack-omnichannel': {
    eyebrow: 'Pack · Comunicações',
    title: 'Comunicações Omnichannel',
    subtitle: 'Email, SMS, WhatsApp, Telegram e redes sociais — uma única caixa.',
    stats: [
      { value: '6+', label: 'canais', sub: 'numa única inbox' },
      { value: '−54%', label: 'tempo 1ª resposta', sub: 'macros + IA' },
      { value: '100%', label: 'histórico no CRM', sub: 'cada conversa registada' },
      { value: 'Auto', label: 'roteamento', sub: 'gestor certo, canal certo' },
    ],
    items: [
      { title: 'Inbox unificada', text: 'WhatsApp, Email, SMS, Instagram, Facebook, Telegram numa única caixa de entrada.' },
      { title: 'Atribuição inteligente', text: 'Roteamento automático por canal, equipa, língua e regras configuráveis.' },
      { title: 'Templates & macros', text: 'Respostas pré-definidas com variáveis dinâmicas e sugestões de IA por contexto.' },
      { title: 'Audit & compliance', text: 'Histórico imutável, retenção configurável e exportação para auditoria.' },
    ],
  },

  'pack-automations': {
    eyebrow: 'Pack · Automações',
    title: 'Automações No-Code',
    subtitle: 'Triggers, condições, ações e webhooks — construa fluxos sem código.',
    stats: [
      { value: '∞', label: 'fluxos', sub: 'biblioteca de templates' },
      { value: 'No', label: 'código necessário', sub: 'editor visual drag & drop' },
      { value: '50+', label: 'triggers nativos', sub: 'qualquer evento do CRM' },
      { value: 'Webhooks', label: '+ HTTP', sub: 'integra com tudo' },
    ],
    items: [
      { title: 'Editor visual', text: 'Drag & drop de triggers, condições, ações e ramificações — sem código.' },
      { title: 'Triggers nativos', text: 'Qualquer evento: novo lead, mudança de estágio, pagamento, falta de atividade, etc.' },
      { title: 'Webhooks & API', text: 'Integre com qualquer ferramenta externa por webhook ou chamadas HTTP.' },
      { title: 'Logs & debugging', text: 'Histórico completo de execuções, erros e replay de fluxos para debug.' },
    ],
  },

  'pack-marketplace-c2c': {
    eyebrow: 'Pack · Marketplace',
    title: 'Marketplace C2C',
    subtitle: 'Anúncios, boost, reputação e mediação — marketplace pronto a lançar.',
    stats: [
      { value: 'Multi', label: 'vendedores', sub: 'reputação + reviews' },
      { value: 'Boost', label: 'créditos', sub: 'destaque pago' },
      { value: 'Stripe', label: 'split pagamentos', sub: 'comissão automática' },
      { value: 'PT', label: 'cumprimento legal', sub: 'mediação + RGPD' },
    ],
    items: [
      { title: 'Anúncios & moderação', text: 'Submissão por vendedores, moderação manual ou IA, validação de conteúdo.' },
      { title: 'Reputação & reviews', text: 'Sistema de avaliações vinculadas a transações reais — sem reviews falsas.' },
      { title: 'Boost & destaque', text: 'Carteira de créditos, pacotes de boost e algoritmo de ranking transparente.' },
      { title: 'Mediação & disputas', text: 'Fluxo de disputa entre comprador e vendedor, retenção de fundos até resolução.' },
    ],
  },

  'pack-lives': {
    eyebrow: 'Pack · Lives & Social',
    title: 'Lives & Social Selling',
    subtitle: 'Streaming Mux, comentários→leads, drops — vendas ao vivo na sua loja.',
    stats: [
      { value: 'Mux', label: 'streaming pro', sub: 'baixa latência + replays' },
      { value: '×4,2', label: 'conversão live', sub: 'vs. produto estático' },
      { value: 'Auto', label: 'comentários→leads', sub: 'IA captura intenção' },
      { value: 'Drops', label: 'edição limitada', sub: 'urgência + escassez' },
    ],
    items: [
      { title: 'Streaming profissional', text: 'Infraestrutura Mux integrada, transmissão multi-câmara e replays automáticos.' },
      { title: 'Comentários→Leads', text: 'IA analisa comentários, identifica intenção de compra e cria leads no CRM.' },
      { title: 'Drops & flash sales', text: 'Lançamentos limitados durante a live, com countdown e stock em tempo real.' },
      { title: 'Pós-live & nurturing', text: 'Sequência automática para participantes que não compraram durante a live.' },
    ],
  },

  'pack-ai-sdr-deep': {
    eyebrow: 'Pack · AI SDR Pro',
    title: 'AI SDR & Outbound Avançado',
    subtitle: 'Sequências multi-canal, enriquecimento e A/B testing — prospecção 24/7.',
    stats: [
      { value: '+62%', label: 'meetings booked', sub: 'vs. outbound manual' },
      { value: '24/7', label: 'prospecção', sub: 'sequências contínuas' },
      { value: 'IA', label: 'copy personalizado', sub: 'por destinatário' },
      { value: 'A/B', label: 'testing automático', sub: 'escolhe vencedor' },
    ],
    items: [
      { title: 'Enriquecimento de contas', text: 'Cada lead enriquecido com sector, dimensão, faturação, sinais e ICP Fit Score.' },
      { title: 'Sequências multi-canal', text: 'Email + WhatsApp + SMS + LinkedIn em cadência configurável com pausas inteligentes.' },
      { title: 'A/B testing', text: 'Compara templates, canais e horas — IA escolhe a combinação vencedora.' },
      { title: 'Hand-off humano', text: 'Quando lead responde positivamente, é entregue ao comercial com contexto completo.' },
    ],
  },

  'pack-pipeline-risk': {
    eyebrow: 'Pack · Pipeline IA',
    title: 'Pipeline Risk Engine',
    subtitle: 'Stale deals, win-rate AI e próximas ações — pipeline que se gere a si mesmo.',
    stats: [
      { value: '+24%', label: 'win-rate', sub: 'após 90 dias de uso' },
      { value: '−48%', label: 'deals stale', sub: 'alertas proativos' },
      { value: 'AI', label: 'next-best-action', sub: 'sugerida em cada negócio' },
      { value: 'Diário', label: 'briefing comercial', sub: 'foco do dia' },
    ],
    items: [
      { title: 'Score de risco', text: 'Cada negócio recebe score baseado em atividade, sentimento e estágio vs. tempo médio.' },
      { title: 'Alertas de stale', text: 'Deals sem atividade há +5 dias são sinalizados ao gestor com sugestão de ação.' },
      { title: 'Win-rate por estágio', text: 'IA identifica gargalos no pipeline e sugere ações de melhoria por estágio.' },
      { title: 'Briefing diário', text: 'Cada manhã, comercial recebe top 5 ações prioritárias do dia.' },
    ],
  },

  'pack-compliance-rgpd': {
    eyebrow: 'Pack · Compliance',
    title: 'Compliance & RGPD',
    subtitle: 'Consentimentos, retenção, direito ao esquecimento — privacy by design.',
    stats: [
      { value: 'RGPD', label: 'by design', sub: 'desde o dia 1' },
      { value: 'Auto', label: 'retenção', sub: 'políticas por entidade' },
      { value: '100%', label: 'consentimentos', sub: 'rastreáveis e auditáveis' },
      { value: 'D-30', label: 'esquecimento', sub: 'fluxo automatizado' },
    ],
    items: [
      { title: 'Gestão de consentimentos', text: 'Cada consentimento registado com timestamp, IP, canal e finalidade — auditável.' },
      { title: 'Políticas de retenção', text: 'Retenção configurável por tipo de dado, com purga automática após o prazo.' },
      { title: 'Direito ao esquecimento', text: 'Fluxo digital: pedido → validação → anonimização → relatório — em 30 dias.' },
      { title: 'DPO & relatórios', text: 'Dashboard para o DPO com pedidos, incidentes e relatórios de conformidade.' },
    ],
  },

  'pack-procurement-pro': {
    eyebrow: 'Pack · Compras Pro',
    title: 'Compras & Fornecedores Pro',
    subtitle: 'RFQ, aprovação multi-nível, 3-way match — compras profissionais.',
    stats: [
      { value: '−22%', label: 'custo de aquisição', sub: 'RFQ multi-fornecedor' },
      { value: '3-way', label: 'match automático', sub: 'PO + receção + fatura' },
      { value: 'Multi', label: 'aprovações', sub: 'por valor e categoria' },
      { value: '100%', label: 'auditoria', sub: 'cada decisão rastreável' },
    ],
    items: [
      { title: 'RFQ multi-fornecedor', text: 'Pedidos de cotação enviados a vários fornecedores em simultâneo, comparação lado-a-lado.' },
      { title: 'Aprovação multi-nível', text: 'Fluxos por valor (até X = chefia, +X = direção, +Y = administração) configuráveis.' },
      { title: '3-way matching', text: 'Validação automática entre PO, guia de receção e fatura — bloqueio em divergências.' },
      { title: 'Catálogo & contratos', text: 'Catálogo aprovado com preços negociados, contratos e prazos por fornecedor.' },
    ],
  },

  'pack-knowledge-rag': {
    eyebrow: 'Pack · Knowledge IA',
    title: 'Knowledge Base com RAG',
    subtitle: 'Pesquisa vetorial, AI answers e fontes citadas — copiloto interno.',
    stats: [
      { value: 'RAG', label: 'arquitetura vetorial', sub: 'embeddings + reranking' },
      { value: '−68%', label: 'tempo procurar info', sub: 'colaboradores e suporte' },
      { value: '∞', label: 'documentos', sub: 'PDF, DOCX, web, vídeo' },
      { value: 'PT', label: 'modelo otimizado', sub: 'língua portuguesa' },
    ],
    items: [
      { title: 'Indexação automática', text: 'Carregue documentos, sites, vídeos e emails — IA indexa e mantém atualizado.' },
      { title: 'Pesquisa semântica', text: 'Pergunte em linguagem natural e receba respostas com fontes citadas.' },
      { title: 'Assistente interno', text: 'Copiloto para equipas comerciais, suporte e operações com contexto da empresa.' },
      { title: 'Governação & permissões', text: 'Controlo granular sobre quem acede a quê — auditoria completa de pesquisas.' },
    ],
  },

  'pack-saas-billing': {
    eyebrow: 'Pack · SaaS Billing',
    title: 'SaaS Billing & Subscriptions',
    subtitle: 'Trials, dunning, proration e MRR — economia SaaS profissional.',
    stats: [
      { value: 'MRR/ARR', label: 'em tempo real', sub: 'cohorts + previsão' },
      { value: 'Auto', label: 'dunning inteligente', sub: 'recupera 35% falhados' },
      { value: 'Prorated', label: 'upgrades', sub: 'cálculo automático' },
      { value: 'Stripe', label: 'integração nativa', sub: 'sem perder dados' },
    ],
    items: [
      { title: 'Trials & conversão', text: 'Gestão de trials, in-app upgrade prompts e nurturing automático até conversão.' },
      { title: 'Dunning inteligente', text: 'Retry de pagamentos falhados, comunicação multi-canal e recuperação 30% superior.' },
      { title: 'Proration & upgrades', text: 'Upgrades, downgrades e mudanças de plano com cálculo proporcional automático.' },
      { title: 'MRR/ARR & cohorts', text: 'Análise de receita recorrente, retenção por cohort e previsão para 6 meses.' },
    ],
  },

  'pack-events-rsvp': {
    eyebrow: 'Pack · Eventos',
    title: 'Eventos & RSVP',
    subtitle: 'Convites, RSVP, check-in e seguimento — eventos profissionais.',
    stats: [
      { value: '+58%', label: 'taxa de confirmação', sub: 'convites personalizados' },
      { value: 'QR', label: 'check-in fluído', sub: 'app no telemóvel' },
      { value: 'Auto', label: 'seguimento', sub: 'comunicação pós-evento' },
      { value: 'Real', label: 'tempo real', sub: 'dashboard de presenças' },
    ],
    items: [
      { title: 'Convites & landing', text: 'Página de evento com agenda, oradores, mapa e formulário de inscrição.' },
      { title: 'RSVP & lembretes', text: 'Confirmação 1 clique, lembretes D-7/D-1 e gestão de lista de espera.' },
      { title: 'Check-in QR', text: 'App de check-in no telemóvel, dashboard de presenças em tempo real.' },
      { title: 'Pós-evento', text: 'Inquérito automático, certificados de presença e nurturing dos participantes.' },
    ],
  },

  'pack-loyalty': {
    eyebrow: 'Pack · Fidelização',
    title: 'Fidelização & Cupões',
    subtitle: 'Programa de pontos, cupões e cartões digitais — fidelização que mede.',
    stats: [
      { value: '+38%', label: 'frequência compra', sub: 'membros do programa' },
      { value: '×2,4', label: 'ticket médio', sub: 'vs. não-membros' },
      { value: 'App', label: 'cartão digital', sub: 'Apple/Google Wallet' },
      { value: 'Auto', label: 'cupões personalizados', sub: 'IA + comportamento' },
    ],
    items: [
      { title: 'Programa de pontos', text: 'Regras flexíveis (X€ = Y pontos), níveis (silver/gold/platinum) e expiração configurável.' },
      { title: 'Cupões inteligentes', text: 'IA gera cupões personalizados por cliente baseados em histórico e comportamento.' },
      { title: 'Cartão digital', text: 'Cartão de fidelização em Apple Wallet e Google Pay — sem app extra para instalar.' },
      { title: 'Analytics fidelização', text: 'Dashboard com membros ativos, redenção, ROI do programa e CLV por segmento.' },
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

  /* Módulos opcionais */
  { id: 'mod-revenue', title: 'Controlo de Receita', fields: { eyebrow: true, title: true, subtitle: true, stats: { count: 4 }, items: { count: 4 }, extraText: { label: 'Frase de fecho' } } },
  { id: 'mod-procurement', title: 'Compras & Fornecedores', fields: { eyebrow: true, title: true, subtitle: true, stats: { count: 4 }, items: { count: 4 } } },
  { id: 'mod-shop', title: 'Loja Online B2C', fields: { eyebrow: true, title: true, subtitle: true, stats: { count: 4 }, items: { count: 4 }, extraText: { label: 'Caixa de destaque' } } },
  { id: 'mod-renewals', title: 'Renovações & Subscrições', fields: { eyebrow: true, title: true, subtitle: true, stats: { count: 4 }, items: { count: 4 } } },
  { id: 'mod-support', title: 'Suporte & Atendimento', fields: { eyebrow: true, title: true, subtitle: true, stats: { count: 4 }, items: { count: 4 } } },
  { id: 'mod-knowledge', title: 'Base de Conhecimento', fields: { eyebrow: true, title: true, subtitle: true, stats: { count: 4 }, items: { count: 4 } } },

  /* Verticais de mercado */
  { id: 'vert-clinics', title: 'Clínicas & Saúde', fields: { eyebrow: true, title: true, subtitle: true, stats: { count: 4 }, items: { count: 4 } } },
  { id: 'vert-realestate', title: 'Imobiliárias', fields: { eyebrow: true, title: true, subtitle: true, stats: { count: 4 }, items: { count: 4 } } },
  { id: 'vert-training', title: 'Formação', fields: { eyebrow: true, title: true, subtitle: true, stats: { count: 4 }, items: { count: 4 } } },
  { id: 'vert-condos', title: 'Condomínios', fields: { eyebrow: true, title: true, subtitle: true, stats: { count: 4 }, items: { count: 4 } } },
  { id: 'vert-agencies', title: 'Agências', fields: { eyebrow: true, title: true, subtitle: true, stats: { count: 4 }, items: { count: 4 } } },
  { id: 'vert-restaurants', title: 'Restauração & Hotelaria', fields: { eyebrow: true, title: true, subtitle: true, stats: { count: 4 }, items: { count: 4 } } },
  { id: 'vert-auto', title: 'Oficinas Auto', fields: { eyebrow: true, title: true, subtitle: true, stats: { count: 4 }, items: { count: 4 } } },
  { id: 'vert-gyms', title: 'Ginásios & Estúdios', fields: { eyebrow: true, title: true, subtitle: true, stats: { count: 4 }, items: { count: 4 } } },
  { id: 'vert-beauty', title: 'Beleza & Estética', fields: { eyebrow: true, title: true, subtitle: true, stats: { count: 4 }, items: { count: 4 } } },
  { id: 'vert-events', title: 'Eventos & Catering', fields: { eyebrow: true, title: true, subtitle: true, stats: { count: 4 }, items: { count: 4 } } },
  { id: 'vert-construction', title: 'Construção & Obras', fields: { eyebrow: true, title: true, subtitle: true, stats: { count: 4 }, items: { count: 4 } } },
  { id: 'vert-legal', title: 'Advocacia & Consultoria', fields: { eyebrow: true, title: true, subtitle: true, stats: { count: 4 }, items: { count: 4 } } },

  /* Packs funcionais */
  { id: 'pack-billing-pt', title: 'Faturação PT', fields: { eyebrow: true, title: true, subtitle: true, stats: { count: 4 }, items: { count: 4 } } },
  { id: 'pack-b2b-portal', title: 'Portal B2B', fields: { eyebrow: true, title: true, subtitle: true, stats: { count: 4 }, items: { count: 4 } } },
  { id: 'pack-hr', title: 'RH & People Ops', fields: { eyebrow: true, title: true, subtitle: true, stats: { count: 4 }, items: { count: 4 } } },
  { id: 'pack-analytics', title: 'Analytics & BI', fields: { eyebrow: true, title: true, subtitle: true, stats: { count: 4 }, items: { count: 4 } } },
  { id: 'pack-omnichannel', title: 'Comunicações Omnichannel', fields: { eyebrow: true, title: true, subtitle: true, stats: { count: 4 }, items: { count: 4 } } },
  { id: 'pack-automations', title: 'Automações No-Code', fields: { eyebrow: true, title: true, subtitle: true, stats: { count: 4 }, items: { count: 4 } } },
  { id: 'pack-marketplace-c2c', title: 'Marketplace C2C', fields: { eyebrow: true, title: true, subtitle: true, stats: { count: 4 }, items: { count: 4 } } },
  { id: 'pack-lives', title: 'Lives & Social Selling', fields: { eyebrow: true, title: true, subtitle: true, stats: { count: 4 }, items: { count: 4 } } },
  { id: 'pack-ai-sdr-deep', title: 'AI SDR Pro', fields: { eyebrow: true, title: true, subtitle: true, stats: { count: 4 }, items: { count: 4 } } },
  { id: 'pack-pipeline-risk', title: 'Pipeline Risk', fields: { eyebrow: true, title: true, subtitle: true, stats: { count: 4 }, items: { count: 4 } } },
  { id: 'pack-compliance-rgpd', title: 'Compliance & RGPD', fields: { eyebrow: true, title: true, subtitle: true, stats: { count: 4 }, items: { count: 4 } } },
  { id: 'pack-procurement-pro', title: 'Compras Pro', fields: { eyebrow: true, title: true, subtitle: true, stats: { count: 4 }, items: { count: 4 } } },
  { id: 'pack-knowledge-rag', title: 'Knowledge RAG', fields: { eyebrow: true, title: true, subtitle: true, stats: { count: 4 }, items: { count: 4 } } },
  { id: 'pack-saas-billing', title: 'SaaS Billing', fields: { eyebrow: true, title: true, subtitle: true, stats: { count: 4 }, items: { count: 4 } } },
  { id: 'pack-events-rsvp', title: 'Eventos & RSVP', fields: { eyebrow: true, title: true, subtitle: true, stats: { count: 4 }, items: { count: 4 } } },
  { id: 'pack-loyalty', title: 'Fidelização & Cupões', fields: { eyebrow: true, title: true, subtitle: true, stats: { count: 4 }, items: { count: 4 } } },
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
