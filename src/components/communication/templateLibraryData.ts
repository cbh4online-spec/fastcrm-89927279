import type { TemplateChannel, TemplateTone, TemplateStructure } from '@/types/communicationTemplate';

export interface LibraryTemplateField {
  name: string;
  type: 'Text' | 'List' | 'Number' | 'Date' | 'Select';
}

export type LibraryCategory = 'geral' | 'vendas' | 'sucesso' | 'produto' | 'marketing' | 'recrutamento';

export interface LibraryTemplate {
  id: string;
  name: string;
  description: string;
  category: LibraryCategory;
  channel: TemplateChannel;
  tone: TemplateTone;
  structureType: TemplateStructure;
  fields: LibraryTemplateField[];
  body: string;
  subject?: string;
}

export const LIBRARY_CATEGORIES: { id: LibraryCategory; label: string; icon: string; color: string }[] = [
  { id: 'geral', label: 'Geral', icon: 'LayoutGrid', color: 'bg-slate-500' },
  { id: 'vendas', label: 'Vendas', icon: 'TrendingUp', color: 'bg-blue-500' },
  { id: 'sucesso', label: 'Sucesso', icon: 'Heart', color: 'bg-green-500' },
  { id: 'produto', label: 'Produto', icon: 'Package', color: 'bg-purple-500' },
  { id: 'marketing', label: 'Marketing', icon: 'Megaphone', color: 'bg-orange-500' },
  { id: 'recrutamento', label: 'Recrutamento', icon: 'Users', color: 'bg-pink-500' },
];

export const CATEGORY_LABELS: Record<LibraryCategory, string> = {
  geral: 'Geral',
  vendas: 'Vendas',
  sucesso: 'Sucesso',
  produto: 'Produto',
  marketing: 'Marketing',
  recrutamento: 'Recrutamento',
};

export const LIBRARY_TEMPLATES: LibraryTemplate[] = [
  // ── Geral ──
  {
    id: 'lib-boas-vindas',
    name: 'Boas-vindas',
    description: 'Mensagem de boas-vindas para novos contactos ou clientes',
    category: 'geral',
    channel: 'email',
    tone: 'human',
    structureType: 'AIDA',
    fields: [
      { name: 'Saudação', type: 'Text' },
      { name: 'Apresentação', type: 'Text' },
      { name: 'Próximos Passos', type: 'List' },
    ],
    subject: 'Bem-vindo(a), {{primeiro_nome}}! 🎉',
    body: '**Atenção**\nOlá {{primeiro_nome}}, é um prazer tê-lo connosco!\n\n**Interesse**\nA nossa equipa está pronta para ajudá-lo a alcançar os seus objetivos.\n\n**Desejo**\nDescubra tudo o que preparámos para si.\n\n**Ação**\nResponda a este email para agendarmos uma conversa inicial.',
  },
  {
    id: 'lib-agradecimento',
    name: 'Agradecimento',
    description: 'Template para agradecer reuniões, compras ou interações',
    category: 'geral',
    channel: 'email',
    tone: 'human',
    structureType: 'custom',
    fields: [
      { name: 'Contexto', type: 'Text' },
      { name: 'Agradecimento', type: 'Text' },
      { name: 'Próximo Passo', type: 'Text' },
    ],
    subject: 'Obrigado, {{primeiro_nome}}!',
    body: 'Olá {{primeiro_nome}},\n\nMuito obrigado pela sua disponibilidade. Foi uma conversa muito produtiva.\n\nComo combinado, envio em anexo o resumo dos pontos discutidos.\n\nQualquer dúvida, estou à disposição.\n\nCumprimentos,\n{{responsavel_nome}}',
  },
  {
    id: 'lib-confirmacao',
    name: 'Confirmação',
    description: 'Confirmar agendamentos, pedidos ou ações',
    category: 'geral',
    channel: 'whatsapp',
    tone: 'professional',
    structureType: 'custom',
    fields: [
      { name: 'Evento', type: 'Text' },
      { name: 'Data', type: 'Date' },
      { name: 'Detalhes', type: 'Text' },
    ],
    body: 'Olá {{primeiro_nome}} 👋\n\nConfirmamos o seu agendamento para o dia {{data_ultima_sessao}}.\n\nCaso precise remarcar, responda a esta mensagem.\n\nAté breve!',
  },

  // ── Vendas ──
  {
    id: 'lib-bant',
    name: 'BANT Qualification',
    description: 'Framework de qualificação com Budget, Authority, Need e Timeline',
    category: 'vendas',
    channel: 'email',
    tone: 'professional',
    structureType: 'AIDA',
    fields: [
      { name: 'Budget', type: 'Text' },
      { name: 'Authority', type: 'Text' },
      { name: 'Need', type: 'List' },
      { name: 'Timeline', type: 'Text' },
    ],
    subject: '{{company_name}} — Próximos passos para {{primeiro_nome}}',
    body: '**Atenção**\nOlá {{primeiro_nome}}, obrigado pelo interesse em conhecer as nossas soluções.\n\n**Interesse**\nPara garantirmos que conseguimos entregar o máximo valor à {{company_name}}, gostaria de entender melhor:\n\n- Qual o orçamento previsto para este projeto?\n- Quem mais participa na decisão?\n- Quais os principais desafios que pretendem resolver?\n- Qual o timeline ideal para implementação?\n\n**Desejo**\nEmpresas como a sua conseguiram reduzir custos em 30% nos primeiros 3 meses.\n\n**Ação**\nPodemos agendar 20 minutos esta semana?',
  },
  {
    id: 'lib-cold-outreach',
    name: 'Cold Outreach',
    description: 'Primeiro contacto frio com lead qualificado',
    category: 'vendas',
    channel: 'email',
    tone: 'commercial',
    structureType: 'ColdOutreach',
    fields: [
      { name: 'Hook', type: 'Text' },
      { name: 'Credibilidade', type: 'Text' },
      { name: 'Proposta', type: 'Text' },
      { name: 'CTA', type: 'Text' },
    ],
    subject: '{{primeiro_nome}}, uma ideia para a {{company_name}}',
    body: '**Hook**\nOlá {{primeiro_nome}}, reparei que a {{company_name}} está a crescer no setor de {{industry}}.\n\n**Credibilidade**\nAjudámos empresas similares a aumentar a sua conversão em 45%.\n\n**Proposta**\nGostaria de partilhar como podemos replicar esses resultados consigo.\n\n**CTA**\nTem 15 minutos esta semana para uma chamada rápida?',
  },
  {
    id: 'lib-followup-vendas',
    name: 'Follow-Up Comercial',
    description: 'Seguimento após proposta ou reunião comercial',
    category: 'vendas',
    channel: 'email',
    tone: 'professional',
    structureType: 'FollowUp',
    fields: [
      { name: 'Contexto', type: 'Text' },
      { name: 'Valor', type: 'Text' },
      { name: 'Próximo Passo', type: 'Text' },
    ],
    subject: 'Re: Proposta para {{company_name}}',
    body: '**Contexto**\n{{primeiro_nome}}, espero que esteja tudo bem. Voltando à nossa conversa da semana passada.\n\n**Valor**\nGostaria de reforçar que a nossa solução pode gerar um retorno estimado de {{potential_value}}€.\n\n**Próximo Passo**\nPodemos avançar para a fase de demonstração? Sugiro terça ou quinta às 10h.',
  },
  {
    id: 'lib-proposta',
    name: 'Envio de Proposta',
    description: 'Email formal com envio de proposta comercial',
    category: 'vendas',
    channel: 'email',
    tone: 'professional',
    structureType: 'BAB',
    fields: [
      { name: 'Situação Atual', type: 'Text' },
      { name: 'Resultado', type: 'Text' },
      { name: 'Proposta', type: 'Text' },
      { name: 'Condições', type: 'List' },
    ],
    subject: 'Proposta Comercial — {{company_name}}',
    body: '**Before**\nAtualmente, a {{company_name}} enfrenta desafios na gestão de {{industry}}.\n\n**After**\nCom a nossa solução, poderá automatizar processos e ganhar eficiência.\n\n**Bridge**\nEm anexo, encontra a proposta detalhada com condições especiais válidas até ao final do mês.\n\n**Ação**\nFicamos a aguardar o seu feedback. Qualquer dúvida, estou disponível.',
  },

  // ── Sucesso ──
  {
    id: 'lib-onboarding',
    name: 'Onboarding Cliente',
    description: 'Guia de início para novos clientes',
    category: 'sucesso',
    channel: 'email',
    tone: 'human',
    structureType: 'AIDA',
    fields: [
      { name: 'Boas-vindas', type: 'Text' },
      { name: 'Passos Iniciais', type: 'List' },
      { name: 'Recursos', type: 'List' },
      { name: 'Suporte', type: 'Text' },
    ],
    subject: '🚀 Vamos começar, {{primeiro_nome}}!',
    body: '**Atenção**\nBem-vindo(a) a bordo, {{primeiro_nome}}! Estamos entusiasmados por tê-lo connosco.\n\n**Interesse**\nPara tirar o máximo partido, preparámos um guia rápido:\n1. Configure o seu perfil\n2. Explore o dashboard\n3. Agende a sua sessão de onboarding\n\n**Desejo**\nOs nossos clientes atingem resultados nos primeiros 14 dias.\n\n**Ação**\nClique aqui para começar a sua configuração.',
  },
  {
    id: 'lib-checkin',
    name: 'Check-in Periódico',
    description: 'Ponto de situação regular com o cliente',
    category: 'sucesso',
    channel: 'email',
    tone: 'empathetic',
    structureType: 'FollowUp',
    fields: [
      { name: 'Saudação', type: 'Text' },
      { name: 'Progresso', type: 'Text' },
      { name: 'Próximos Passos', type: 'List' },
    ],
    subject: 'Como está a correr, {{primeiro_nome}}?',
    body: '**Contexto**\nOlá {{primeiro_nome}}, passaram {{days_since_last_contact}} dias desde o nosso último contacto.\n\n**Valor**\nGostaria de saber como está a correr a sua experiência e se há algo que possamos melhorar.\n\n**Próximo Passo**\nTem disponibilidade para uma chamada rápida de 10 minutos esta semana?',
  },
  {
    id: 'lib-satisfacao',
    name: 'Pesquisa de Satisfação',
    description: 'Solicitar feedback e NPS do cliente',
    category: 'sucesso',
    channel: 'email',
    tone: 'human',
    structureType: 'PAS',
    fields: [
      { name: 'Pedido', type: 'Text' },
      { name: 'Formulário', type: 'Text' },
      { name: 'Incentivo', type: 'Text' },
    ],
    subject: '{{primeiro_nome}}, a sua opinião é importante 💬',
    body: '**Problema**\nQueremos garantir que está a ter a melhor experiência possível.\n\n**Agitação**\nO seu feedback é essencial para continuarmos a evoluir.\n\n**Solução**\nPreencha este formulário rápido (2 minutos) e ajude-nos a melhorar.\n\n**Ação**\n[Link para formulário]',
  },

  // ── Produto ──
  {
    id: 'lib-lancamento',
    name: 'Lançamento de Produto',
    description: 'Anunciar novo produto ou funcionalidade',
    category: 'produto',
    channel: 'email',
    tone: 'commercial',
    structureType: 'AIDA',
    fields: [
      { name: 'Produto', type: 'Text' },
      { name: 'Benefícios', type: 'List' },
      { name: 'Disponibilidade', type: 'Date' },
      { name: 'Preço', type: 'Number' },
    ],
    subject: '🆕 Novo: Conheça o {{produto_nome}}',
    body: '**Atenção**\n{{primeiro_nome}}, temos uma novidade especial para si!\n\n**Interesse**\nApresentamos o {{produto_nome}} — desenhado para resolver os seus maiores desafios.\n\n**Desejo**\nPrincipais benefícios:\n- Mais produtividade\n- Interface intuitiva\n- Integração completa\n\n**Ação**\nExperimente gratuitamente durante 14 dias.',
  },
  {
    id: 'lib-demo',
    name: 'Convite para Demo',
    description: 'Convidar lead para demonstração do produto',
    category: 'produto',
    channel: 'email',
    tone: 'professional',
    structureType: 'ColdOutreach',
    fields: [
      { name: 'Produto', type: 'Text' },
      { name: 'Benefício', type: 'Text' },
      { name: 'Duração', type: 'Text' },
      { name: 'Horários', type: 'List' },
    ],
    subject: 'Demo personalizada para {{company_name}}',
    body: '**Hook**\nOlá {{primeiro_nome}}, preparámos uma demonstração personalizada para a {{company_name}}.\n\n**Credibilidade**\nEm 30 minutos, mostramos como empresas do setor {{industry}} estão a usar a nossa plataforma.\n\n**Proposta**\nA demo é gratuita e sem compromisso.\n\n**CTA**\nEscolha o melhor horário: [link de agendamento]',
  },
  {
    id: 'lib-feature-update',
    name: 'Feature Update',
    description: 'Informar sobre atualização de funcionalidade',
    category: 'produto',
    channel: 'email',
    tone: 'human',
    structureType: 'custom',
    fields: [
      { name: 'Feature', type: 'Text' },
      { name: 'O que muda', type: 'List' },
      { name: 'Como usar', type: 'Text' },
    ],
    subject: '✨ Nova atualização disponível',
    body: 'Olá {{primeiro_nome}},\n\nAcabámos de lançar uma atualização importante:\n\n🔹 Novo dashboard de analytics\n🔹 Exportação avançada de dados\n🔹 Integração com calendários\n\nJá está disponível na sua conta. Explore agora!\n\nQualquer dúvida, a nossa equipa está disponível.',
  },

  // ── Marketing ──
  {
    id: 'lib-newsletter',
    name: 'Newsletter',
    description: 'Newsletter periódica com conteúdos e novidades',
    category: 'marketing',
    channel: 'email',
    tone: 'human',
    structureType: 'custom',
    fields: [
      { name: 'Destaque', type: 'Text' },
      { name: 'Artigos', type: 'List' },
      { name: 'Eventos', type: 'List' },
      { name: 'CTA', type: 'Text' },
    ],
    subject: '📬 Newsletter {{empresa_nome}} — Edição de hoje',
    body: 'Olá {{primeiro_nome}},\n\nAqui está o resumo da semana:\n\n📰 Destaque: [Título do artigo principal]\n\n📚 Artigos:\n- [Artigo 1]\n- [Artigo 2]\n- [Artigo 3]\n\n📅 Próximos Eventos:\n- [Evento 1]\n- [Evento 2]\n\nBoa leitura!\nEquipa {{empresa_nome}}',
  },
  {
    id: 'lib-promocao',
    name: 'Promoção',
    description: 'Campanha promocional com oferta especial',
    category: 'marketing',
    channel: 'email',
    tone: 'commercial',
    structureType: 'FourP',
    fields: [
      { name: 'Oferta', type: 'Text' },
      { name: 'Desconto', type: 'Number' },
      { name: 'Validade', type: 'Date' },
      { name: 'Condições', type: 'Text' },
    ],
    subject: '🔥 Oferta exclusiva para si, {{primeiro_nome}}!',
    body: '**Picture**\nImagine ter acesso a todas as funcionalidades premium a um preço especial.\n\n**Promise**\nDurante esta semana, oferecemos 30% de desconto no plano anual.\n\n**Proof**\nMais de 500 empresas já aproveitaram esta oferta no último trimestre.\n\n**Push**\nAproveite agora — válido até sexta-feira.',
  },
  {
    id: 'lib-reativacao',
    name: 'Reativação',
    description: 'Reengajar leads ou clientes inativos',
    category: 'marketing',
    channel: 'email',
    tone: 'empathetic',
    structureType: 'REENGAGE',
    fields: [
      { name: 'Referência', type: 'Text' },
      { name: 'Novidade', type: 'Text' },
      { name: 'Incentivo', type: 'Text' },
    ],
    subject: 'Sentimos a sua falta, {{primeiro_nome}} 💙',
    body: '**Referência**\nOlá {{primeiro_nome}}, há algum tempo que não nos falamos.\n\n**Atualização**\nDesde a última vez, lançámos várias melhorias que acredito serem relevantes para si.\n\n**Oportunidade**\nGostaria de oferecer-lhe um mês gratuito para explorar as novidades.\n\n**Ação**\nInteressado? Responda a este email e tratamos de tudo.',
  },

  // ── Recrutamento ──
  {
    id: 'lib-entrevista',
    name: 'Convite para Entrevista',
    description: 'Convidar candidato para entrevista',
    category: 'recrutamento',
    channel: 'email',
    tone: 'professional',
    structureType: 'custom',
    fields: [
      { name: 'Cargo', type: 'Text' },
      { name: 'Data', type: 'Date' },
      { name: 'Local', type: 'Text' },
      { name: 'Entrevistador', type: 'Text' },
    ],
    subject: 'Convite para Entrevista — {{company_name}}',
    body: 'Olá {{primeiro_nome}},\n\nObrigado pelo seu interesse na posição na {{company_name}}.\n\nGostaríamos de convidá-lo(a) para uma entrevista:\n\n📅 Data: [data]\n📍 Local: [local/link videochamada]\n👤 Com: {{responsavel_nome}}\n\nPor favor, confirme a sua disponibilidade respondendo a este email.\n\nCumprimentos,\n{{responsavel_nome}}',
  },
  {
    id: 'lib-oferta',
    name: 'Oferta de Emprego',
    description: 'Proposta formal de contratação',
    category: 'recrutamento',
    channel: 'email',
    tone: 'professional',
    structureType: 'custom',
    fields: [
      { name: 'Cargo', type: 'Text' },
      { name: 'Salário', type: 'Number' },
      { name: 'Benefícios', type: 'List' },
      { name: 'Data Início', type: 'Date' },
    ],
    subject: '🎉 Proposta de Emprego — {{company_name}}',
    body: 'Olá {{primeiro_nome}},\n\nTemos o prazer de lhe apresentar uma proposta formal para a posição na {{company_name}}.\n\nDetalhes da oferta:\n- Cargo: [cargo]\n- Remuneração: [valor]\n- Benefícios: [lista]\n- Data de início prevista: [data]\n\nFicamos a aguardar a sua resposta até [prazo].\n\nCom entusiasmo,\n{{responsavel_nome}}',
  },
];
