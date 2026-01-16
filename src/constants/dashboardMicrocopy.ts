/**
 * Dashboard Microcopy System
 * Sistema unificado de textos para dashboards por role
 * 
 * Princípios:
 * - Claro, humano, orientado à ação
 * - Tom: profissional, próximo, encorajador
 * - IA aconselha, utilizador decide
 * 
 * Nunca usar: "Erro", "Falha", "Sistema", "Obrigatório"
 * Usar sempre: "Sugiro", "Talvez", "Podes", "Vale a pena"
 */

// ────────────────────────────────────────────────────────────
// 1) HEADER INTELIGENTE (TODOS OS ROLES)
// ────────────────────────────────────────────────────────────

export const headerMicrocopy = {
  // Saudações por período do dia
  greetings: {
    morning: 'Bom dia',
    afternoon: 'Boa tarde',
    evening: 'Boa noite',
  },
  
  // Resumos do dia (templates com variáveis)
  daySummary: {
    withMeetingsAndActions: 'Hoje tens {{meetings}} reuniões e {{actions}} ações prioritárias.',
    withMeetingsOnly: 'Hoje tens {{meetings}} reuniões agendadas.',
    withActionsOnly: 'Tens {{actions}} ações prioritárias para hoje.',
    noMeetingsNoActions: 'O teu dia está livre. Bom momento para avançar em tarefas importantes.',
    lightDay: 'Dia tranquilo pela frente. Aproveita para focar no que importa.',
  },
  
  // Estados positivos
  positiveStates: {
    onTrack: 'Estás no bom caminho para atingir a meta.',
    aheadOfGoal: 'Estás à frente do objetivo. Excelente trabalho! 🎯',
    productive: 'O teu ritmo está ótimo hoje.',
    allClear: 'Tudo em dia. Continua assim!',
    goalReached: 'Meta atingida! Parabéns pelo resultado. 🏆',
    streakGoing: 'Já são {{days}} dias consecutivos a bater metas.',
  },
  
  // Estados de alerta (nunca negativos, sempre construtivos)
  alertStates: {
    riskSignals: 'Há sinais que merecem atenção. Vamos agir cedo.',
    behindGoal: 'Ainda há caminho a percorrer, mas o mês não acabou.',
    overdueItems: 'Tens {{count}} itens que precisam de atenção.',
    urgentMatters: 'Algumas situações pedem resposta rápida.',
    needsFocus: 'Vale a pena focar nestes pontos hoje.',
  },
};

// ────────────────────────────────────────────────────────────
// 2) BLOCO "O QUE FAZER AGORA" (IA)
// ────────────────────────────────────────────────────────────

export const priorityBlockMicrocopy = {
  // Títulos e descrições
  title: 'O que deves fazer agora',
  subtitle: 'Prioridades geradas por IA',
  description: 'Estas ações têm maior impacto neste momento.',
  
  // Labels de prioridade
  priorityLabels: {
    high: 'Urgente',
    medium: 'Importante',
    low: 'Normal',
  },
  
  // Botões de ação
  actions: {
    complete: 'Concluído',
    defer: 'Adiar',
    ignore: 'Ignorar',
    viewDetails: 'Ver detalhes',
    takeAction: 'Agir agora',
  },
  
  // Feedback após ações
  feedback: {
    completed: 'Boa! Mais uma tarefa concluída. ✓',
    deferred: 'Adiado. Vou lembrar-te mais tarde.',
    ignored: 'Entendido. Não vou insistir nesta.',
  },
  
  // Confirmação ao ignorar
  ignoreConfirmation: {
    title: 'Tens a certeza?',
    message: 'Se ignorares, esta sugestão não aparecerá novamente.',
    confirm: 'Sim, ignorar',
    cancel: 'Cancelar',
  },
  
  // Estados vazios
  emptyStates: {
    allDone: 'Tudo em dia!',
    allDoneDescription: 'Não tens ações prioritárias pendentes.',
    noSuggestions: 'Sem sugestões de momento.',
    noSuggestionsDescription: 'A IA está a analisar os teus dados.',
  },
  
  // Tipos de ação
  actionTypes: {
    follow_up: 'Follow-up',
    meeting_prep: 'Preparar reunião',
    message: 'Responder mensagem',
    call: 'Ligar',
    close_deal: 'Fechar negócio',
    task: 'Tarefa',
    review: 'Rever',
    approve: 'Aprovar',
  },
};

// ────────────────────────────────────────────────────────────
// 3) DASHBOARD — ROLE COMERCIAL
// ────────────────────────────────────────────────────────────

export const comercialMicrocopy = {
  // A) Reuniões de hoje
  meetings: {
    title: 'Reuniões de hoje',
    subtitle: 'O teu calendário para hoje',
    emptyState: {
      title: 'Sem reuniões hoje',
      description: 'Dia livre para prospeção ou follow-ups.',
    },
    ctas: {
      join: 'Entrar',
      prepare: 'Preparar',
      reschedule: 'Reagendar',
      viewAll: 'Ver todas',
      addMeeting: 'Agendar reunião',
    },
    status: {
      upcoming: 'Em breve',
      inProgress: 'A decorrer',
      completed: 'Concluída',
      cancelled: 'Cancelada',
    },
    aiTips: {
      prepareReminder: 'Sugiro rever as notas antes desta reunião.',
      followUpNeeded: 'Esta reunião pode precisar de follow-up.',
      highPriority: 'Cliente prioritário. Vale a pena preparar bem.',
    },
  },
  
  // B) Follow-ups pendentes
  followUps: {
    title: 'Follow-ups pendentes',
    subtitle: 'Contactos que aguardam resposta',
    description: 'Leads e clientes que precisam do teu contacto.',
    emptyState: {
      title: 'Nenhum follow-up pendente',
      description: 'Estás em dia com os teus contactos. Ótimo!',
    },
    ctas: {
      contact: 'Contactar',
      markDone: 'Marcar como feito',
      snooze: 'Adiar',
    },
    alerts: {
      overdue: 'Já passaram {{days}} dias desde o último contacto.',
      atRisk: 'Este lead pode estar a arrefecer.',
      hotLead: 'Lead quente. Vale a pena contactar hoje.',
      bestTime: 'Melhor hora para contactar: {{time}}',
    },
    aiInsights: {
      contactSuggestion: 'Sugiro contactar {{name}} — última interação há {{days}} dias.',
      riskWarning: 'Este contacto pode precisar de atenção.',
      patternDetected: 'Este cliente responde melhor por {{channel}}.',
    },
  },
  
  // C) Oportunidades em risco
  opportunities: {
    title: 'Oportunidades',
    subtitle: 'O teu pipeline ativo',
    atRiskTitle: 'Oportunidades que precisam de atenção',
    description: 'Negócios que merecem foco imediato.',
    emptyState: {
      title: 'Pipeline saudável',
      description: 'Todas as oportunidades estão a avançar bem.',
    },
    ctas: {
      viewDetails: 'Ver detalhes',
      takeAction: 'Agir',
      updateStage: 'Atualizar fase',
    },
    riskMessages: {
      stalled: 'Parado há {{days}} dias. Vale a pena reativar?',
      noActivity: 'Sem atividade recente. Sugiro um contacto.',
      competitorRisk: 'Pode haver concorrência. Não deixes arrefecer.',
      closingSoon: 'Data de fecho próxima. Hora de fechar!',
    },
    reactivation: {
      suggestion: 'Que tal enviar uma proposta atualizada?',
      callToAction: 'Reativar agora',
      reminder: 'Este negócio tem potencial. Não o deixes escapar.',
    },
  },
  
  // D) Meta & Progresso
  goals: {
    title: 'Meta & Progresso',
    subtitle: 'O teu desempenho este período',
    labels: {
      daily: 'Hoje',
      weekly: 'Esta semana',
      monthly: 'Este mês',
      quarterly: 'Este trimestre',
    },
    progress: {
      onTrack: 'No caminho certo',
      ahead: 'À frente da meta',
      behind: 'A recuperar',
      achieved: 'Meta atingida! 🎉',
    },
    coaching: {
      encouragement: 'Estás a {{percentage}}% da meta. Continua!',
      pushNeeded: 'Precisas de mais {{value}} para atingir a meta.',
      celebrate: 'Parabéns! Superaste o objetivo em {{percentage}}%.',
      suggestion: 'Sugiro focar em {{action}} para acelerar.',
    },
    emptyState: {
      title: 'Sem metas definidas',
      description: 'Fala com o teu gestor para definir objetivos.',
    },
  },
};

// ────────────────────────────────────────────────────────────
// 4) DASHBOARD — ROLE GESTOR
// ────────────────────────────────────────────────────────────

export const gestorMicrocopy = {
  // A) Pipeline da equipa
  teamPipeline: {
    title: 'Pipeline da Equipa',
    subtitle: 'Visão geral dos negócios em curso',
    description: 'Estado agregado de todas as oportunidades.',
    emptyState: {
      title: 'Pipeline vazio',
      description: 'Ainda não há oportunidades registadas.',
    },
    metrics: {
      totalValue: 'Valor total',
      avgDealSize: 'Ticket médio',
      conversionRate: 'Taxa de conversão',
      avgCycleTime: 'Tempo médio de fecho',
    },
    insights: {
      healthy: 'O pipeline está saudável e equilibrado.',
      needsAttention: 'Algumas fases precisam de atenção.',
      topHeavy: 'Muitos negócios em fase inicial. Sugiro acelerar qualificação.',
      bottomHeavy: 'Boa quantidade em fecho. Momento de fechar!',
    },
  },
  
  // B) Performance por membro
  teamPerformance: {
    title: 'Performance da Equipa',
    subtitle: 'Desempenho individual dos membros',
    description: 'Como cada pessoa está a contribuir.',
    emptyState: {
      title: 'Sem dados de performance',
      description: 'Os dados aparecerão quando houver atividade.',
    },
    labels: {
      meetings: 'Reuniões',
      calls: 'Chamadas',
      deals: 'Negócios fechados',
      revenue: 'Receita gerada',
      activities: 'Atividades',
    },
    insights: {
      topPerformer: '{{name}} está a liderar este período.',
      improving: '{{name}} mostra evolução positiva.',
      needsSupport: '{{name}} pode beneficiar de apoio adicional.',
      consistent: 'A equipa mantém ritmo consistente.',
    },
    // Nunca "erros", sempre padrões e desvios
    patterns: {
      aboveAverage: 'Acima da média da equipa',
      belowAverage: 'Abaixo do padrão habitual',
      improving: 'Em crescimento',
      declining: 'A precisar de atenção',
    },
  },
  
  // C) Alertas de risco
  riskAlerts: {
    title: 'Sinais de Atenção',
    subtitle: 'Situações que merecem acompanhamento',
    description: 'A IA detetou padrões que vale a pena analisar.',
    emptyState: {
      title: 'Tudo tranquilo',
      description: 'Não há alertas de momento. A equipa está bem.',
    },
    types: {
      dealAtRisk: 'Negócio pode precisar de intervenção',
      performanceDip: 'Desvio de padrão detetado',
      missedTarget: 'Meta pode estar em risco',
      churnSignal: 'Sinal de possível churn',
    },
    ctas: {
      investigate: 'Analisar',
      assignAction: 'Atribuir ação',
      dismiss: 'Arquivar',
    },
  },
  
  // D) Previsões de resultado
  forecasts: {
    title: 'Previsão de Resultados',
    subtitle: 'Projeção baseada em dados',
    description: 'O que a IA antecipa para este período.',
    labels: {
      optimistic: 'Cenário otimista',
      realistic: 'Cenário provável',
      conservative: 'Cenário conservador',
    },
    insights: {
      onTrack: 'A equipa está no caminho para atingir {{percentage}}% da meta.',
      ahead: 'Projeção indica superação da meta em {{percentage}}%.',
      behind: 'Há risco de ficar {{percentage}}% abaixo. Ainda há tempo.',
      uncertain: 'Dados insuficientes para projeção precisa.',
    },
    recommendations: {
      accelerate: 'Sugiro acelerar fecho dos negócios em fase final.',
      pipeline: 'Vale a pena reforçar o pipeline com novas oportunidades.',
      focus: 'Focar nos {{count}} negócios com maior probabilidade.',
    },
  },
};

// ────────────────────────────────────────────────────────────
// 5) DASHBOARD — ROLE SUPORTE
// ────────────────────────────────────────────────────────────

export const suporteMicrocopy = {
  // A) Inbox prioritária
  inbox: {
    title: 'Inbox Prioritária',
    subtitle: 'Mensagens que precisam de resposta',
    description: 'Ordenado por urgência e impacto.',
    emptyState: {
      title: 'Inbox vazia',
      description: 'Todas as mensagens foram respondidas. Excelente! 🎉',
    },
    labels: {
      unread: 'Por ler',
      awaiting: 'Aguarda resposta',
      urgent: 'Urgente',
      vip: 'Cliente prioritário',
    },
    ctas: {
      reply: 'Responder',
      assign: 'Atribuir',
      resolve: 'Resolver',
      snooze: 'Adiar',
    },
    aiSuggestions: {
      suggestedReply: 'Resposta sugerida disponível',
      similarCase: 'Caso semelhante resolvido recentemente',
      escalate: 'Pode beneficiar de escalação',
    },
  },
  
  // B) SLAs em risco
  slas: {
    title: 'SLAs',
    subtitle: 'Tempo de resposta e resolução',
    atRiskTitle: 'SLAs que precisam de atenção',
    description: 'Tickets que podem ultrapassar o tempo acordado.',
    emptyState: {
      title: 'SLAs em dia',
      description: 'Todos os tickets dentro do prazo. Ótimo trabalho!',
    },
    status: {
      onTime: 'No prazo',
      atRisk: 'Em risco',
      breached: 'Ultrapassado',
    },
    alerts: {
      approaching: 'Este ticket precisa de resposta em {{time}}.',
      urgent: 'SLA em risco. Prioriza esta resposta.',
      breached: 'SLA ultrapassado. Contacta o cliente com urgência.',
    },
    ctas: {
      prioritize: 'Priorizar',
      escalate: 'Escalar',
      extend: 'Pedir extensão',
    },
  },
  
  // C) Padrões recorrentes
  patterns: {
    title: 'Padrões Detetados',
    subtitle: 'A IA encontrou tendências nos tickets',
    description: 'Oportunidades para melhorar ou automatizar.',
    emptyState: {
      title: 'Sem padrões identificados',
      description: 'A IA está a analisar os dados.',
    },
    insights: {
      frequentIssue: 'Este tema aparece {{count}} vezes esta semana.',
      automationSuggestion: 'Este tipo de pergunta pode ser automatizada.',
      faqSuggestion: 'Sugiro criar uma FAQ sobre "{{topic}}".',
      trainingNeed: 'A equipa pode beneficiar de formação em "{{topic}}".',
    },
    ctas: {
      createFaq: 'Criar FAQ',
      setupAutomation: 'Configurar automação',
      viewDetails: 'Ver detalhes',
    },
  },
  
  // Tom para reduzir stress
  supportive: {
    encouragement: 'Estás a fazer um ótimo trabalho.',
    breathing: 'Uma questão de cada vez. Vais conseguir.',
    progress: 'Já resolveste {{count}} tickets hoje.',
    almostDone: 'Quase lá. Só faltam {{count}}.',
  },
};

// ────────────────────────────────────────────────────────────
// 6) DASHBOARD — ROLE ADMIN
// ────────────────────────────────────────────────────────────

export const adminMicrocopy = {
  // A) Receita (MRR / ARR)
  revenue: {
    title: 'Receita',
    subtitle: 'Visão financeira do negócio',
    labels: {
      mrr: 'MRR',
      arr: 'ARR',
      growth: 'Crescimento',
      newRevenue: 'Nova receita',
      churnedRevenue: 'Receita perdida',
      netRevenue: 'Receita líquida',
    },
    insights: {
      growing: 'Receita em crescimento de {{percentage}}%.',
      stable: 'Receita estável. Base sólida.',
      declining: 'Tendência de queda. Vale a pena investigar.',
      milestone: 'Parabéns! Atingiste {{value}} de MRR. 🎯',
    },
    emptyState: {
      title: 'Sem dados de receita',
      description: 'Os dados aparecerão quando houver faturação.',
    },
  },
  
  // B) Marketplace & consumo
  marketplace: {
    title: 'Marketplace & Módulos',
    subtitle: 'Uso e adoção dos módulos',
    description: 'Como os clientes estão a usar a plataforma.',
    labels: {
      activeModules: 'Módulos ativos',
      usage: 'Utilização',
      adoption: 'Adoção',
      topModule: 'Mais usado',
    },
    insights: {
      highAdoption: '{{module}} tem alta adoção ({{percentage}}%).',
      lowAdoption: '{{module}} pode beneficiar de promoção.',
      growingUsage: 'O uso de {{module}} cresceu {{percentage}}%.',
      unusedModule: '{{module}} não está a ser utilizado.',
    },
    recommendations: {
      promote: 'Sugiro destacar {{module}} para novos clientes.',
      bundle: 'Pode fazer sentido criar um bundle com {{modules}}.',
      retire: 'Talvez valha a pena rever a utilidade de {{module}}.',
    },
  },
  
  // C) Risco de churn
  churn: {
    title: 'Risco de Churn',
    subtitle: 'Clientes que podem precisar de atenção',
    description: 'Sinais precoces identificados pela IA.',
    emptyState: {
      title: 'Sem sinais de churn',
      description: 'Os clientes parecem satisfeitos. Continua assim!',
    },
    riskLevels: {
      high: 'Risco elevado',
      medium: 'Risco moderado',
      low: 'Risco baixo',
    },
    signals: {
      inactivity: 'Sem login há {{days}} dias.',
      decreasedUsage: 'Uso diminuiu {{percentage}}%.',
      supportTickets: 'Aumento de tickets de suporte.',
      paymentIssue: 'Problema de pagamento recente.',
    },
    ctas: {
      reachOut: 'Contactar',
      offerHelp: 'Oferecer suporte',
      schedule: 'Agendar chamada',
      viewHistory: 'Ver histórico',
    },
    recommendations: {
      proactive: 'Uma chamada proativa pode fazer a diferença.',
      training: 'Sugiro oferecer uma sessão de formação.',
      discount: 'Talvez um incentivo ajude a reter.',
    },
  },
  
  // D) Saúde do sistema
  systemHealth: {
    title: 'Saúde do Sistema',
    subtitle: 'Estado técnico da plataforma',
    description: 'Performance e estabilidade.',
    labels: {
      uptime: 'Uptime',
      performance: 'Performance',
      errors: 'Incidentes',
      latency: 'Latência',
    },
    status: {
      healthy: 'Tudo a funcionar bem',
      degraded: 'Performance ligeiramente afetada',
      issues: 'Alguns serviços precisam de atenção',
    },
    emptyState: {
      title: 'Monitorização ativa',
      description: 'Sem problemas detetados. Sistema estável.',
    },
  },
};

// ────────────────────────────────────────────────────────────
// 7) FEED & ALERTAS (TODOS OS ROLES)
// ────────────────────────────────────────────────────────────

export const feedMicrocopy = {
  title: 'Atividade Recente',
  subtitle: 'O que está a acontecer',
  
  emptyStates: {
    noActivity: {
      title: 'Sem atividade recente',
      description: 'Quando houver novidades, vão aparecer aqui.',
    },
    allClear: {
      title: 'Nada crítico por agora',
      description: 'Bom trabalho! Continua assim. 👏',
    },
    filtered: {
      title: 'Sem resultados',
      description: 'Experimenta ajustar os filtros.',
    },
  },
  
  // Tipos de atividade
  activityTypes: {
    deal_won: '🎉 Negócio fechado',
    deal_lost: 'Negócio perdido',
    meeting_scheduled: '📅 Reunião agendada',
    meeting_completed: '✓ Reunião concluída',
    task_completed: '✓ Tarefa concluída',
    note_added: '📝 Nota adicionada',
    email_sent: '✉️ Email enviado',
    call_made: '📞 Chamada realizada',
    lead_created: '🆕 Novo lead',
    opportunity_created: '💰 Nova oportunidade',
  },
  
  // Menções
  mentions: {
    title: 'Menções',
    youWereMentioned: '{{name}} mencionou-te',
    inContext: 'em {{context}}',
    cta: 'Ver',
  },
  
  // Alertas automáticos
  alerts: {
    title: 'Alertas',
    types: {
      info: 'Informação',
      warning: 'Atenção',
      success: 'Sucesso',
      urgent: 'Urgente',
    },
  },
  
  // Ações
  ctas: {
    viewAll: 'Ver tudo',
    markRead: 'Marcar como lido',
    dismiss: 'Dispensar',
    filter: 'Filtrar',
  },
};

// ────────────────────────────────────────────────────────────
// 8) COACH IA (SIDEBAR / BLOCO FIXO)
// ────────────────────────────────────────────────────────────

export const coachMicrocopy = {
  title: 'Coach IA',
  subtitle: 'O teu assistente pessoal',
  
  // Sugestões rápidas
  quickTips: {
    greeting: 'Olá! Aqui estão algumas dicas para hoje.',
    productivity: 'Hoje estás mais produtivo de manhã.',
    timing: 'Sugiro marcar follow-ups entre as 10h e as 11h.',
    focus: 'Foca primeiro nas tarefas de maior impacto.',
    break: 'Já trabalhas há 2h. Que tal uma pausa?',
    endOfDay: 'Bom trabalho hoje! Prepara o dia de amanhã.',
  },
  
  // Insights comportamentais
  behavioralInsights: {
    emailResponse: 'Os teus emails têm melhor resposta às {{time}}.',
    meetingEfficiency: 'As tuas reuniões de {{duration}}min são mais produtivas.',
    bestDays: '{{day}} é o teu dia mais produtivo.',
    followUpPattern: 'Follow-ups em {{days}} dias têm melhor taxa de resposta.',
    closingTime: 'Negócios fecham mais rápido quando contactas {{frequency}}.',
  },
  
  // Dicas de produtividade
  productivityTips: {
    batchTasks: 'Agrupa tarefas semelhantes para maior eficiência.',
    prioritize: 'Começa pelo que tem maior impacto.',
    delegate: 'Algumas tarefas podem ser delegadas.',
    automate: 'Este processo pode ser automatizado.',
    template: 'Cria um template para respostas frequentes.',
  },
  
  // Celebrações
  celebrations: {
    goalReached: 'Parabéns! Atingiste a meta. 🎯',
    streak: '{{days}} dias consecutivos a cumprir objetivos!',
    improvement: 'A tua performance melhorou {{percentage}}%.',
    milestone: 'Acabaste de atingir um marco importante!',
  },
  
  // Estados vazios
  emptyStates: {
    analyzing: 'A analisar os teus padrões...',
    noTips: 'Sem dicas de momento. Continua o bom trabalho!',
    learning: 'Ainda estou a aprender os teus hábitos.',
  },
  
  // CTAs
  ctas: {
    showMore: 'Ver mais dicas',
    dismiss: 'Entendido',
    apply: 'Aplicar sugestão',
    askCoach: 'Perguntar ao Coach',
  },
};

// ────────────────────────────────────────────────────────────
// 9) ESTADOS COMUNS E LOADING
// ────────────────────────────────────────────────────────────

export const commonMicrocopy = {
  // Loading states
  loading: {
    generic: 'A carregar...',
    analyzing: 'A analisar dados...',
    generating: 'A gerar insights...',
    updating: 'A atualizar...',
    syncing: 'A sincronizar...',
  },
  
  // Erros (sem usar "erro" ou "falha")
  issues: {
    connectionLost: 'Parece que perdemos a ligação. A tentar reconectar...',
    dataUnavailable: 'Dados temporariamente indisponíveis.',
    tryAgain: 'Algo não correu como esperado. Tenta novamente.',
    contactSupport: 'Se o problema persistir, fala connosco.',
  },
  
  // Confirmações
  confirmations: {
    saved: 'Guardado com sucesso',
    updated: 'Atualizado',
    deleted: 'Removido',
    sent: 'Enviado',
    scheduled: 'Agendado',
  },
  
  // Ações genéricas
  actions: {
    save: 'Guardar',
    cancel: 'Cancelar',
    confirm: 'Confirmar',
    edit: 'Editar',
    delete: 'Eliminar',
    refresh: 'Atualizar',
    export: 'Exportar',
    import: 'Importar',
    search: 'Pesquisar',
    filter: 'Filtrar',
    sort: 'Ordenar',
  },
  
  // Tempo relativo
  time: {
    justNow: 'Agora mesmo',
    minutesAgo: 'Há {{count}} minutos',
    hoursAgo: 'Há {{count}} horas',
    daysAgo: 'Há {{count}} dias',
    today: 'Hoje',
    yesterday: 'Ontem',
    tomorrow: 'Amanhã',
    thisWeek: 'Esta semana',
    lastWeek: 'Semana passada',
    thisMonth: 'Este mês',
  },
};

// ────────────────────────────────────────────────────────────
// 10) HELPER FUNCTIONS
// ────────────────────────────────────────────────────────────

/**
 * Substitui variáveis no template por valores
 * Ex: interpolate("Olá, {{name}}!", { name: "João" }) => "Olá, João!"
 */
export function interpolate(template: string, values: Record<string, string | number>): string {
  return template.replace(/\{\{(\w+)\}\}/g, (match, key) => {
    return values[key]?.toString() ?? match;
  });
}

/**
 * Retorna a saudação apropriada para a hora atual
 */
export function getGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return headerMicrocopy.greetings.morning;
  if (hour < 19) return headerMicrocopy.greetings.afternoon;
  return headerMicrocopy.greetings.evening;
}

/**
 * Retorna texto de tempo relativo
 */
export function getRelativeTime(date: Date): string {
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);
  
  if (diffMins < 1) return commonMicrocopy.time.justNow;
  if (diffMins < 60) return interpolate(commonMicrocopy.time.minutesAgo, { count: diffMins });
  if (diffHours < 24) return interpolate(commonMicrocopy.time.hoursAgo, { count: diffHours });
  if (diffDays === 1) return commonMicrocopy.time.yesterday;
  return interpolate(commonMicrocopy.time.daysAgo, { count: diffDays });
}
