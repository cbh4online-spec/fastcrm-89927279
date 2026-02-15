export interface VerticalConfig {
  slug: string;
  nome: string;
  dor_principal: string;
  resultado_prometido: string;
  dores: string[];
  modulos_ativos: { nome: string; desc: string; icon: string }[];
  antes_depois: { antes: string[]; depois: string[] };
  roi_exemplo: { clientes_extra: number; valor_medio: number; periodo: string };
  cores: { primaria: string; accent: string };
  cta_principal: string;
  cta_secundario: string;
  ai_persona_nome: string;
  seo: { title: string; description: string; canonical: string };
}

export const verticalConfigs: Record<string, VerticalConfig> = {
  clinicas: {
    slug: "clinicas",
    nome: "Clínicas",
    dor_principal: "Perdem pacientes por falta de follow-up e processos manuais",
    resultado_prometido: "escalar sem perder qualidade no atendimento",
    dores: [
      "Pacientes esquecem consultas e não há follow-up automático",
      "Recepção sobrecarregada com agendamentos manuais e confirmações",
      "Sem visibilidade sobre taxa de retorno e lifetime value por paciente",
      "Comunicação fragmentada entre WhatsApp pessoal, email e telefone",
    ],
    modulos_ativos: [
      { nome: "CRM Core", desc: "Gestão de pacientes, histórico e pipeline clínico", icon: "Users" },
      { nome: "Automações", desc: "Follow-up pós-consulta, lembretes e reativação", icon: "Zap" },
      { nome: "Comunicação Omnicanal", desc: "WhatsApp, email e SMS num único inbox", icon: "MessageSquare" },
      { nome: "AI Assistants", desc: "Triagem inteligente e sugestões de tratamento", icon: "Brain" },
      { nome: "Relatórios & KPIs", desc: "Taxa de retorno, NPS e revenue por especialidade", icon: "BarChart3" },
      { nome: "Agendamento", desc: "Calendário inteligente com confirmação automática", icon: "Clock" },
    ],
    antes_depois: {
      antes: [
        "Agendamentos por telefone e papel",
        "Follow-up manual (ou inexistente)",
        "Sem dados sobre retenção de pacientes",
        "Comunicação dispersa em múltiplos canais",
      ],
      depois: [
        "Agendamento online com confirmação automática",
        "IA faz follow-up 24/7 personalizado",
        "Dashboard com métricas de retenção em tempo real",
        "Inbox unificado com histórico completo",
      ],
    },
    roi_exemplo: { clientes_extra: 15, valor_medio: 120, periodo: "mês" },
    cores: { primaria: "hsl(168, 76%, 42%)", accent: "hsl(168, 80%, 50%)" },
    cta_principal: "Agendar Diagnóstico Estratégico",
    cta_secundario: "Receber Plano Personalizado",
    ai_persona_nome: "AI CRM Clínicas Specialist",
    seo: {
      title: "FastCRM para Clínicas — Sistema com IA para Gestão Clínica",
      description: "CRM com IA para clínicas: agendamento automático, follow-up inteligente e comunicação omnicanal. Aumente a retenção de pacientes.",
      canonical: "https://fastcrm.metodopare.ai/clinicas",
    },
  },
  imobiliarias: {
    slug: "imobiliarias",
    nome: "Imobiliárias",
    dor_principal: "Perdem negócios por falta de rapidez no follow-up",
    resultado_prometido: "fechar mais negócios com menos esforço comercial",
    dores: [
      "Leads de portais imobiliários perdem-se sem resposta rápida",
      "Consultores não registam interações e perdem contexto",
      "Pipeline de vendas invisível — sem previsibilidade de fecho",
      "Propostas e documentação dispersas em emails e pastas",
    ],
    modulos_ativos: [
      { nome: "CRM Core", desc: "Pipeline imobiliário com etapas de venda e arrendamento", icon: "Users" },
      { nome: "Automações", desc: "Resposta automática a leads e nurturing por email", icon: "Zap" },
      { nome: "Comunicação Omnicanal", desc: "WhatsApp, email e portal integrados", icon: "MessageSquare" },
      { nome: "AI Assistants", desc: "Qualificação automática e matching de imóveis", icon: "Brain" },
      { nome: "Relatórios & KPIs", desc: "Conversão por consultor, tempo médio de fecho", icon: "BarChart3" },
      { nome: "Portal do Cliente", desc: "Área do cliente com documentos e estado do processo", icon: "Shield" },
    ],
    antes_depois: {
      antes: [
        "Leads respondem após horas ou dias",
        "Excel para controlar pipeline",
        "Sem métricas por consultor ou canal",
        "Documentos enviados por email sem controlo",
      ],
      depois: [
        "Resposta automática em menos de 2 minutos",
        "Pipeline visual com drag & drop e probabilidades",
        "Dashboard de performance por equipa em tempo real",
        "Portal com documentos assinados e tracking",
      ],
    },
    roi_exemplo: { clientes_extra: 5, valor_medio: 3000, periodo: "mês" },
    cores: { primaria: "hsl(24, 95%, 53%)", accent: "hsl(24, 100%, 60%)" },
    cta_principal: "Agendar Diagnóstico Estratégico",
    cta_secundario: "Receber Plano Personalizado",
    ai_persona_nome: "AI CRM Imobiliário Strategist",
    seo: {
      title: "FastCRM para Imobiliárias — Pipeline Inteligente com IA",
      description: "CRM para imobiliárias com pipeline visual, resposta automática a leads e IA para qualificação. Feche mais negócios.",
      canonical: "https://fastcrm.metodopare.ai/imobiliarias",
    },
  },
  formacao: {
    slug: "formacao",
    nome: "Centros de Formação",
    dor_principal: "Turmas com vagas por preencher e processos administrativos pesados",
    resultado_prometido: "preencher turmas mais rápido e automatizar a gestão",
    dores: [
      "Inscrições manuais com formulários desconectados do CRM",
      "Sem follow-up automático após pedido de informação",
      "Gestão de turmas, formandos e certificados em Excel",
      "Falta de visibilidade sobre taxa de conversão por curso",
    ],
    modulos_ativos: [
      { nome: "CRM Core", desc: "Pipeline de inscrições com etapas por curso", icon: "Users" },
      { nome: "Automações", desc: "Nurturing de leads e lembretes de início de curso", icon: "Zap" },
      { nome: "Comunicação Omnicanal", desc: "Email, WhatsApp e notificações integradas", icon: "MessageSquare" },
      { nome: "AI Assistants", desc: "Recomendação de cursos e FAQ automático", icon: "Brain" },
      { nome: "Relatórios & KPIs", desc: "Ocupação por turma, ROI por canal de captação", icon: "BarChart3" },
    ],
    antes_depois: {
      antes: [
        "Inscrições por email e telefone",
        "Sem nurturing — lead esquece o curso",
        "Certificados e presença em ficheiros manuais",
        "Sem dados sobre qual canal traz mais inscritos",
      ],
      depois: [
        "Formulário inteligente que cria lead automaticamente",
        "Sequência de emails e WhatsApp até inscrição",
        "Gestão de turmas com acompanhamento integrado",
        "Dashboard de captação com ROI por canal",
      ],
    },
    roi_exemplo: { clientes_extra: 20, valor_medio: 350, periodo: "mês" },
    cores: { primaria: "hsl(250, 83%, 60%)", accent: "hsl(250, 90%, 68%)" },
    cta_principal: "Agendar Diagnóstico Estratégico",
    cta_secundario: "Receber Plano Personalizado",
    ai_persona_nome: "AI CRM Formação Architect",
    seo: {
      title: "FastCRM para Formação — Gestão de Inscrições com IA",
      description: "CRM para centros de formação: pipeline de inscrições, nurturing automático e gestão de turmas com inteligência artificial.",
      canonical: "https://fastcrm.metodopare.ai/formacao",
    },
  },
  condominios: {
    slug: "condominios",
    nome: "Gestão de Condomínios",
    dor_principal: "Comunicação caótica com condóminos e processos burocráticos",
    resultado_prometido: "gerir condomínios com eficiência e transparência",
    dores: [
      "Reclamações e pedidos perdidos em emails e chamadas",
      "Assembleias sem seguimento das decisões",
      "Faturação e cobranças manuais sem controlo centralizado",
      "Sem portal para condóminos consultarem informação",
    ],
    modulos_ativos: [
      { nome: "CRM Core", desc: "Gestão de condomínios, proprietários e fornecedores", icon: "Users" },
      { nome: "Automações", desc: "Cobranças automáticas e notificações de assembleia", icon: "Zap" },
      { nome: "Comunicação Omnicanal", desc: "Notificações por email, SMS e WhatsApp", icon: "MessageSquare" },
      { nome: "Portal do Cliente", desc: "Área do condómino com documentos e pagamentos", icon: "Shield" },
      { nome: "Relatórios & KPIs", desc: "Balanço por condomínio e taxa de cobrança", icon: "BarChart3" },
    ],
    antes_depois: {
      antes: [
        "Pedidos por telefone sem registo",
        "Atas em PDF enviadas por email",
        "Cobranças manuais com dificuldade de tracking",
        "Condóminos sem acesso a informação",
      ],
      depois: [
        "Tickets centralizados com histórico completo",
        "Documentação acessível no portal 24/7",
        "Faturação automática com lembretes de pagamento",
        "Portal self-service para cada condómino",
      ],
    },
    roi_exemplo: { clientes_extra: 3, valor_medio: 800, periodo: "mês" },
    cores: { primaria: "hsl(200, 80%, 50%)", accent: "hsl(200, 85%, 58%)" },
    cta_principal: "Agendar Diagnóstico Estratégico",
    cta_secundario: "Receber Plano Personalizado",
    ai_persona_nome: "AI CRM Condomínios Specialist",
    seo: {
      title: "FastCRM para Condomínios — Gestão Inteligente com Portal",
      description: "CRM para gestão de condomínios: portal do condómino, cobranças automáticas e comunicação centralizada com IA.",
      canonical: "https://fastcrm.metodopare.ai/condominios",
    },
  },
  agencias: {
    slug: "agencias",
    nome: "Agências",
    dor_principal: "Sem visibilidade sobre rentabilidade de clientes e projetos",
    resultado_prometido: "escalar a operação sem perder controlo financeiro",
    dores: [
      "Pipeline de novos clientes sem processo estruturado",
      "Gestão de projetos e entregas fragmentada",
      "Sem métricas de rentabilidade por cliente ou serviço",
      "Comunicação com clientes dispersa em múltiplas ferramentas",
    ],
    modulos_ativos: [
      { nome: "CRM Core", desc: "Pipeline de vendas e gestão de contas", icon: "Users" },
      { nome: "Automações", desc: "Onboarding de clientes e follow-up comercial", icon: "Zap" },
      { nome: "Comunicação Omnicanal", desc: "Email, WhatsApp e inbox centralizado", icon: "MessageSquare" },
      { nome: "AI Assistants", desc: "Análise de oportunidades e previsão de churn", icon: "Brain" },
      { nome: "Relatórios & KPIs", desc: "Revenue por cliente, margem e forecast", icon: "BarChart3" },
      { nome: "Portal do Cliente", desc: "Área do cliente com briefings e aprovações", icon: "Shield" },
    ],
    antes_depois: {
      antes: [
        "Vendas dependem de networking pessoal",
        "Projetos geridos em ferramentas separadas",
        "Sem dados sobre quais clientes são rentáveis",
        "Briefings e aprovações por email sem tracking",
      ],
      depois: [
        "Pipeline estruturado com qualificação por IA",
        "Gestão integrada de vendas e delivery",
        "Dashboard de rentabilidade por conta",
        "Portal do cliente com aprovações e timeline",
      ],
    },
    roi_exemplo: { clientes_extra: 3, valor_medio: 2500, periodo: "mês" },
    cores: { primaria: "hsl(340, 82%, 52%)", accent: "hsl(340, 88%, 60%)" },
    cta_principal: "Agendar Diagnóstico Estratégico",
    cta_secundario: "Receber Plano Personalizado",
    ai_persona_nome: "AI CRM Agências Strategist",
    seo: {
      title: "FastCRM para Agências — Pipeline e Rentabilidade com IA",
      description: "CRM para agências: pipeline de vendas, gestão de contas e análise de rentabilidade com inteligência artificial.",
      canonical: "https://fastcrm.metodopare.ai/agencias",
    },
  },
  empresas: {
    slug: "empresas",
    nome: "Empresas",
    dor_principal: "Operação comercial desorganizada e sem previsibilidade",
    resultado_prometido: "ter controlo total sobre vendas, clientes e operações",
    dores: [
      "Equipa comercial sem processo padronizado de vendas",
      "Dados de clientes espalhados entre ferramentas desconectadas",
      "Sem previsibilidade de receita ou pipeline visível",
      "Comunicação interna e externa caótica e sem histórico",
    ],
    modulos_ativos: [
      { nome: "CRM Core", desc: "Pipeline completo com multi-workspace", icon: "Users" },
      { nome: "Automações", desc: "Workflows de vendas, onboarding e retenção", icon: "Zap" },
      { nome: "Comunicação Omnicanal", desc: "Email, WhatsApp, SMS e inbox unificado", icon: "MessageSquare" },
      { nome: "AI Assistants", desc: "Coaching de vendas e previsão de conversão", icon: "Brain" },
      { nome: "Relatórios & KPIs", desc: "Forecast, metas e performance de equipa", icon: "BarChart3" },
      { nome: "Vendas & Faturação", desc: "Propostas, faturas e catálogo integrado", icon: "DollarSign" },
    ],
    antes_depois: {
      antes: [
        "Cada vendedor usa o seu próprio método",
        "CRM anterior abandonado por falta de adoção",
        "Reuniões semanais sem dados concretos",
        "Clientes recebem experiências inconsistentes",
      ],
      depois: [
        "Processo de vendas padronizado com IA",
        "CRM que a equipa realmente usa (UX premium)",
        "Dashboard executivo com forecast em tempo real",
        "Experiência omnicanal consistente para cada cliente",
      ],
    },
    roi_exemplo: { clientes_extra: 8, valor_medio: 1500, periodo: "mês" },
    cores: { primaria: "hsl(221, 83%, 53%)", accent: "hsl(250, 83%, 60%)" },
    cta_principal: "Agendar Diagnóstico Estratégico",
    cta_secundario: "Receber Plano Personalizado",
    ai_persona_nome: "AI CRM Enterprise Strategist",
    seo: {
      title: "FastCRM para Empresas — Infraestrutura Digital com IA",
      description: "CRM empresarial com IA: pipeline de vendas, automações, comunicação omnicanal e relatórios executivos numa única plataforma.",
      canonical: "https://fastcrm.metodopare.ai/empresas",
    },
  },
};

export function getVerticalBySlug(slug: string): VerticalConfig | undefined {
  return verticalConfigs[slug];
}

export const verticalSlugs = Object.keys(verticalConfigs);
