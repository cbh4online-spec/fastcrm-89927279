import { CrmBlueprint } from '@/types/blueprint';

export interface BlueprintTemplate {
  id: string;
  name: string;
  description: string;
  industry: string;
  icon: string;
  tags: string[];
  blueprint: Omit<CrmBlueprint, 'id' | 'metadata'>;
}

export const blueprintTemplates: BlueprintTemplate[] = [
  {
    id: 'real-estate',
    name: 'Imobiliária',
    description: 'CRM para agências imobiliárias: leads de visitas, preferências de imóveis, orçamento e negociação.',
    industry: 'Imobiliário',
    icon: '🏠',
    tags: ['imóveis', 'visitas', 'propriedades', 'compra', 'arrendamento'],
    blueprint: {
      version: 1,
      name: 'Blueprint Imobiliária',
      description: 'Configuração CRM para agências imobiliárias',
      entityType: 'lead',
      customFields: [
        { name: 'Tipo de Interesse', type: 'select', required: true, options: [
          { label: 'Compra', value: 'compra' },
          { label: 'Arrendamento', value: 'arrendamento' },
          { label: 'Investimento', value: 'investimento' },
        ]},
        { name: 'Tipo de Imóvel', type: 'multiselect', required: true, options: [
          { label: 'Apartamento', value: 'apartamento' },
          { label: 'Moradia', value: 'moradia' },
          { label: 'Terreno', value: 'terreno' },
          { label: 'Comercial', value: 'comercial' },
        ]},
        { name: 'Orçamento Mínimo', type: 'currency', required: false },
        { name: 'Orçamento Máximo', type: 'currency', required: true },
        { name: 'Localização Preferida', type: 'text', required: true },
        { name: 'Tipologia', type: 'select', required: false, options: [
          { label: 'T0', value: 't0' },
          { label: 'T1', value: 't1' },
          { label: 'T2', value: 't2' },
          { label: 'T3', value: 't3' },
          { label: 'T4+', value: 't4_plus' },
        ]},
        { name: 'Data Pretendida Mudança', type: 'date', required: false },
        { name: 'Notas da Visita', type: 'textarea', required: false },
      ],
      sections: [
        { id: 'contact', name: 'Informação de Contacto', fields: ['name', 'email', 'phone'] },
        { id: 'preferences', name: 'Preferências do Imóvel', fields: ['Tipo de Interesse', 'Tipo de Imóvel', 'Tipologia', 'Localização Preferida'] },
        { id: 'budget', name: 'Orçamento', fields: ['Orçamento Mínimo', 'Orçamento Máximo'] },
        { id: 'timeline', name: 'Cronograma', fields: ['Data Pretendida Mudança'] },
        { id: 'notes', name: 'Notas', fields: ['Notas da Visita'] },
      ],
      pipelineStages: [
        { name: 'Novo Contacto', color: '#3B82F6', position: 0 },
        { name: 'Qualificação', color: '#8B5CF6', position: 1 },
        { name: 'Visitas Agendadas', color: '#F59E0B', position: 2 },
        { name: 'Proposta Enviada', color: '#EC4899', position: 3 },
        { name: 'Negociação', color: '#10B981', position: 4 },
        { name: 'Fechado Ganho', color: '#22C55E', position: 5 },
        { name: 'Fechado Perdido', color: '#EF4444', position: 6 },
      ],
      automations: [
        {
          name: 'Boas-vindas novo lead',
          description: 'Envia notificação quando um novo lead é criado',
          trigger: 'lead_created',
          conditions: [],
          actions: [{ type: 'notify_user', config: { message: 'Novo lead imobiliário recebido!' } }],
        },
        {
          name: 'Follow-up após visita',
          description: 'Criar tarefa de follow-up 2 dias após visita',
          trigger: 'custom_field_updated',
          conditions: [{ field: 'Notas da Visita', operator: 'is_not_empty', value: '' }],
          actions: [{ type: 'create_task', config: { title: 'Follow-up após visita', dueInDays: 2 } }],
        },
      ],
      dedupeRules: [
        { field: 'email', priority: 1, matchType: 'exact' },
        { field: 'phone', priority: 2, matchType: 'normalized' },
      ],
      mappingRules: [],
    },
  },
  {
    id: 'saas-sales',
    name: 'Vendas SaaS',
    description: 'CRM para empresas SaaS: demos, trials, onboarding e conversão de clientes.',
    industry: 'Tecnologia',
    icon: '💻',
    tags: ['software', 'demo', 'trial', 'subscriptions', 'b2b'],
    blueprint: {
      version: 1,
      name: 'Blueprint SaaS Sales',
      description: 'Configuração CRM para vendas de software SaaS',
      entityType: 'lead',
      customFields: [
        { name: 'Empresa', type: 'text', required: true },
        { name: 'Cargo', type: 'text', required: false },
        { name: 'Tamanho da Empresa', type: 'select', required: true, options: [
          { label: '1-10 funcionários', value: '1-10' },
          { label: '11-50 funcionários', value: '11-50' },
          { label: '51-200 funcionários', value: '51-200' },
          { label: '201-500 funcionários', value: '201-500' },
          { label: '500+ funcionários', value: '500+' },
        ]},
        { name: 'Plano de Interesse', type: 'select', required: false, options: [
          { label: 'Starter', value: 'starter' },
          { label: 'Professional', value: 'professional' },
          { label: 'Enterprise', value: 'enterprise' },
        ]},
        { name: 'Orçamento Mensal', type: 'currency', required: false },
        { name: 'Use Case Principal', type: 'text', required: false },
        { name: 'Ferramentas Atuais', type: 'textarea', required: false },
        { name: 'Data Demo', type: 'datetime', required: false },
        { name: 'Trial Ativo', type: 'boolean', required: false },
        { name: 'Website', type: 'url', required: false },
      ],
      sections: [
        { id: 'contact', name: 'Contacto', fields: ['name', 'email', 'phone'] },
        { id: 'company', name: 'Empresa', fields: ['Empresa', 'Cargo', 'Tamanho da Empresa', 'Website'] },
        { id: 'opportunity', name: 'Oportunidade', fields: ['Plano de Interesse', 'Orçamento Mensal', 'Use Case Principal'] },
        { id: 'qualification', name: 'Qualificação', fields: ['Ferramentas Atuais', 'Data Demo', 'Trial Ativo'] },
      ],
      pipelineStages: [
        { name: 'Lead', color: '#3B82F6', position: 0 },
        { name: 'MQL', color: '#8B5CF6', position: 1 },
        { name: 'SQL', color: '#F59E0B', position: 2 },
        { name: 'Demo Agendada', color: '#EC4899', position: 3 },
        { name: 'Trial Ativo', color: '#06B6D4', position: 4 },
        { name: 'Proposta', color: '#10B981', position: 5 },
        { name: 'Negociação', color: '#84CC16', position: 6 },
        { name: 'Fechado Ganho', color: '#22C55E', position: 7 },
        { name: 'Fechado Perdido', color: '#EF4444', position: 8 },
      ],
      automations: [
        {
          name: 'Qualificar MQL',
          description: 'Move para MQL quando empresa é preenchida',
          trigger: 'lead_updated',
          conditions: [{ field: 'Empresa', operator: 'is_not_empty', value: '' }],
          actions: [{ type: 'add_tag', config: { tag: 'MQL' } }],
        },
        {
          name: 'Lembrete Demo',
          description: 'Criar tarefa 1 dia antes da demo',
          trigger: 'custom_field_updated',
          conditions: [{ field: 'Data Demo', operator: 'is_not_empty', value: '' }],
          actions: [{ type: 'create_task', config: { title: 'Preparar demo', dueInDays: -1 } }],
        },
        {
          name: 'Trial iniciado',
          description: 'Notificar quando trial é ativado',
          trigger: 'custom_field_updated',
          conditions: [{ field: 'Trial Ativo', operator: 'equals', value: 'true' }],
          actions: [{ type: 'notify_user', config: { message: 'Trial ativado! Agendar onboarding.' } }],
        },
      ],
      dedupeRules: [
        { field: 'email', priority: 1, matchType: 'exact' },
        { field: 'Empresa', priority: 2, matchType: 'fuzzy' },
      ],
      mappingRules: [],
    },
  },
  {
    id: 'ecommerce',
    name: 'E-commerce',
    description: 'CRM para lojas online: leads de carrinho abandonado, pedidos de orçamento e suporte.',
    industry: 'Retail',
    icon: '🛒',
    tags: ['loja', 'vendas', 'carrinho', 'orçamento', 'online'],
    blueprint: {
      version: 1,
      name: 'Blueprint E-commerce',
      description: 'Configuração CRM para lojas online',
      entityType: 'lead',
      customFields: [
        { name: 'Origem do Lead', type: 'select', required: true, options: [
          { label: 'Carrinho Abandonado', value: 'cart_abandoned' },
          { label: 'Pedido de Orçamento', value: 'quote_request' },
          { label: 'Newsletter', value: 'newsletter' },
          { label: 'Suporte', value: 'support' },
          { label: 'Redes Sociais', value: 'social' },
        ]},
        { name: 'Valor do Carrinho', type: 'currency', required: false },
        { name: 'Produtos de Interesse', type: 'textarea', required: false },
        { name: 'Código Cupão Usado', type: 'text', required: false },
        { name: 'Já é Cliente', type: 'boolean', required: false },
        { name: 'Histórico Compras', type: 'number', required: false },
      ],
      sections: [
        { id: 'contact', name: 'Contacto', fields: ['name', 'email', 'phone'] },
        { id: 'source', name: 'Origem', fields: ['Origem do Lead', 'Código Cupão Usado'] },
        { id: 'purchase', name: 'Interesse de Compra', fields: ['Valor do Carrinho', 'Produtos de Interesse'] },
        { id: 'history', name: 'Histórico', fields: ['Já é Cliente', 'Histórico Compras'] },
      ],
      pipelineStages: [
        { name: 'Novo Lead', color: '#3B82F6', position: 0 },
        { name: 'Contactado', color: '#8B5CF6', position: 1 },
        { name: 'Interessado', color: '#F59E0B', position: 2 },
        { name: 'Orçamento Enviado', color: '#EC4899', position: 3 },
        { name: 'Compra Realizada', color: '#22C55E', position: 4 },
        { name: 'Perdido', color: '#EF4444', position: 5 },
      ],
      automations: [
        {
          name: 'Recuperar carrinho',
          description: 'Criar tarefa urgente para carrinhos abandonados',
          trigger: 'lead_created',
          conditions: [{ field: 'Origem do Lead', operator: 'equals', value: 'cart_abandoned' }],
          actions: [{ type: 'create_task', config: { title: 'Recuperar carrinho abandonado', dueInDays: 0 } }],
        },
        {
          name: 'Cliente VIP',
          description: 'Marcar como VIP quando histórico > 5 compras',
          trigger: 'custom_field_updated',
          conditions: [{ field: 'Histórico Compras', operator: 'greater_than', value: '5' }],
          actions: [{ type: 'add_tag', config: { tag: 'VIP' } }],
        },
      ],
      dedupeRules: [
        { field: 'email', priority: 1, matchType: 'exact' },
      ],
      mappingRules: [],
    },
  },
  {
    id: 'consulting',
    name: 'Consultoria',
    description: 'CRM para empresas de consultoria: pedidos de proposta, reuniões e gestão de projetos.',
    industry: 'Serviços',
    icon: '📊',
    tags: ['consultoria', 'projetos', 'propostas', 'reuniões', 'b2b'],
    blueprint: {
      version: 1,
      name: 'Blueprint Consultoria',
      description: 'Configuração CRM para empresas de consultoria',
      entityType: 'lead',
      customFields: [
        { name: 'Empresa', type: 'text', required: true },
        { name: 'Cargo', type: 'text', required: false },
        { name: 'Área de Interesse', type: 'multiselect', required: true, options: [
          { label: 'Estratégia', value: 'strategy' },
          { label: 'Operações', value: 'operations' },
          { label: 'Tecnologia', value: 'technology' },
          { label: 'Marketing', value: 'marketing' },
          { label: 'Finanças', value: 'finance' },
          { label: 'RH', value: 'hr' },
        ]},
        { name: 'Orçamento do Projeto', type: 'currency', required: false },
        { name: 'Prazo Pretendido', type: 'date', required: false },
        { name: 'Descrição do Desafio', type: 'textarea', required: true },
        { name: 'Urgência', type: 'select', required: false, options: [
          { label: 'Baixa', value: 'low' },
          { label: 'Média', value: 'medium' },
          { label: 'Alta', value: 'high' },
          { label: 'Crítica', value: 'critical' },
        ]},
        { name: 'Website', type: 'url', required: false },
      ],
      sections: [
        { id: 'contact', name: 'Contacto', fields: ['name', 'email', 'phone'] },
        { id: 'company', name: 'Empresa', fields: ['Empresa', 'Cargo', 'Website'] },
        { id: 'project', name: 'Projeto', fields: ['Área de Interesse', 'Descrição do Desafio'] },
        { id: 'details', name: 'Detalhes', fields: ['Orçamento do Projeto', 'Prazo Pretendido', 'Urgência'] },
      ],
      pipelineStages: [
        { name: 'Pedido Recebido', color: '#3B82F6', position: 0 },
        { name: 'Descoberta', color: '#8B5CF6', position: 1 },
        { name: 'Proposta em Preparação', color: '#F59E0B', position: 2 },
        { name: 'Proposta Enviada', color: '#EC4899', position: 3 },
        { name: 'Negociação', color: '#06B6D4', position: 4 },
        { name: 'Contrato Assinado', color: '#22C55E', position: 5 },
        { name: 'Projeto em Curso', color: '#10B981', position: 6 },
        { name: 'Concluído', color: '#84CC16', position: 7 },
        { name: 'Perdido', color: '#EF4444', position: 8 },
      ],
      automations: [
        {
          name: 'Urgência crítica',
          description: 'Notificar imediatamente para urgência crítica',
          trigger: 'lead_created',
          conditions: [{ field: 'Urgência', operator: 'equals', value: 'critical' }],
          actions: [{ type: 'notify_user', config: { message: 'Lead urgente recebido!' } }],
        },
        {
          name: 'Agendar descoberta',
          description: 'Criar tarefa de reunião de descoberta',
          trigger: 'lead_created',
          conditions: [],
          actions: [{ type: 'create_task', config: { title: 'Agendar reunião de descoberta', dueInDays: 1 } }],
        },
      ],
      dedupeRules: [
        { field: 'email', priority: 1, matchType: 'exact' },
        { field: 'Empresa', priority: 2, matchType: 'fuzzy' },
      ],
      mappingRules: [],
    },
  },
  {
    id: 'healthcare',
    name: 'Saúde & Clínicas',
    description: 'CRM para clínicas e consultórios: agendamentos, pacientes e seguimento.',
    industry: 'Saúde',
    icon: '🏥',
    tags: ['saúde', 'clínica', 'pacientes', 'agendamento', 'consultas'],
    blueprint: {
      version: 1,
      name: 'Blueprint Clínica',
      description: 'Configuração CRM para clínicas e consultórios',
      entityType: 'contact',
      customFields: [
        { name: 'Data de Nascimento', type: 'date', required: true },
        { name: 'Género', type: 'select', required: false, options: [
          { label: 'Masculino', value: 'male' },
          { label: 'Feminino', value: 'female' },
          { label: 'Outro', value: 'other' },
        ]},
        { name: 'Número Utente', type: 'text', required: false },
        { name: 'Seguro de Saúde', type: 'text', required: false },
        { name: 'Especialidade Pretendida', type: 'select', required: true, options: [
          { label: 'Medicina Geral', value: 'general' },
          { label: 'Dermatologia', value: 'dermatology' },
          { label: 'Cardiologia', value: 'cardiology' },
          { label: 'Ortopedia', value: 'orthopedics' },
          { label: 'Pediatria', value: 'pediatrics' },
          { label: 'Psicologia', value: 'psychology' },
        ]},
        { name: 'Motivo Consulta', type: 'textarea', required: false },
        { name: 'Data Preferida', type: 'datetime', required: false },
        { name: 'Consentimento RGPD', type: 'boolean', required: true },
      ],
      sections: [
        { id: 'personal', name: 'Dados Pessoais', fields: ['name', 'Data de Nascimento', 'Género'] },
        { id: 'contact', name: 'Contacto', fields: ['email', 'phone'] },
        { id: 'health', name: 'Informação de Saúde', fields: ['Número Utente', 'Seguro de Saúde'] },
        { id: 'appointment', name: 'Consulta', fields: ['Especialidade Pretendida', 'Motivo Consulta', 'Data Preferida'] },
        { id: 'consent', name: 'Consentimento', fields: ['Consentimento RGPD'] },
      ],
      automations: [
        {
          name: 'Confirmar agendamento',
          description: 'Criar tarefa para confirmar consulta',
          trigger: 'contact_created',
          conditions: [{ field: 'Data Preferida', operator: 'is_not_empty', value: '' }],
          actions: [{ type: 'create_task', config: { title: 'Confirmar agendamento de consulta', dueInDays: 0 } }],
        },
        {
          name: 'Lembrete RGPD',
          description: 'Notificar se consentimento não foi dado',
          trigger: 'contact_created',
          conditions: [{ field: 'Consentimento RGPD', operator: 'equals', value: 'false' }],
          actions: [{ type: 'notify_user', config: { message: 'Atenção: Contacto sem consentimento RGPD' } }],
        },
      ],
      dedupeRules: [
        { field: 'email', priority: 1, matchType: 'exact' },
        { field: 'phone', priority: 2, matchType: 'normalized' },
        { field: 'Número Utente', priority: 3, matchType: 'exact' },
      ],
      mappingRules: [],
    },
  },
  {
    id: 'education',
    name: 'Educação & Cursos',
    description: 'CRM para escolas e centros de formação: inscrições, leads e acompanhamento.',
    industry: 'Educação',
    icon: '🎓',
    tags: ['escola', 'cursos', 'formação', 'inscrições', 'alunos'],
    blueprint: {
      version: 1,
      name: 'Blueprint Educação',
      description: 'Configuração CRM para instituições de ensino',
      entityType: 'lead',
      customFields: [
        { name: 'Curso de Interesse', type: 'select', required: true, options: [
          { label: 'MBA', value: 'mba' },
          { label: 'Pós-Graduação', value: 'postgrad' },
          { label: 'Licenciatura', value: 'degree' },
          { label: 'Curso Profissional', value: 'professional' },
          { label: 'Workshop', value: 'workshop' },
        ]},
        { name: 'Área de Estudo', type: 'multiselect', required: false, options: [
          { label: 'Gestão', value: 'management' },
          { label: 'Tecnologia', value: 'technology' },
          { label: 'Marketing', value: 'marketing' },
          { label: 'Design', value: 'design' },
          { label: 'Finanças', value: 'finance' },
        ]},
        { name: 'Horário Preferido', type: 'select', required: false, options: [
          { label: 'Diurno', value: 'day' },
          { label: 'Pós-laboral', value: 'evening' },
          { label: 'Fim de semana', value: 'weekend' },
          { label: 'Online', value: 'online' },
        ]},
        { name: 'Data Início Pretendida', type: 'date', required: false },
        { name: 'Experiência Profissional', type: 'number', required: false },
        { name: 'Motivação', type: 'textarea', required: false },
        { name: 'Financiamento', type: 'boolean', required: false },
      ],
      sections: [
        { id: 'contact', name: 'Contacto', fields: ['name', 'email', 'phone'] },
        { id: 'course', name: 'Curso', fields: ['Curso de Interesse', 'Área de Estudo'] },
        { id: 'schedule', name: 'Disponibilidade', fields: ['Horário Preferido', 'Data Início Pretendida'] },
        { id: 'background', name: 'Background', fields: ['Experiência Profissional', 'Motivação'] },
        { id: 'finance', name: 'Financiamento', fields: ['Financiamento'] },
      ],
      pipelineStages: [
        { name: 'Pedido de Info', color: '#3B82F6', position: 0 },
        { name: 'Contactado', color: '#8B5CF6', position: 1 },
        { name: 'Entrevista Agendada', color: '#F59E0B', position: 2 },
        { name: 'Candidatura Submetida', color: '#EC4899', position: 3 },
        { name: 'Admitido', color: '#10B981', position: 4 },
        { name: 'Inscrito', color: '#22C55E', position: 5 },
        { name: 'Não Elegível', color: '#EF4444', position: 6 },
      ],
      automations: [
        {
          name: 'Boas-vindas candidato',
          description: 'Criar tarefa de follow-up inicial',
          trigger: 'lead_created',
          conditions: [],
          actions: [{ type: 'create_task', config: { title: 'Contactar candidato - enviar brochura', dueInDays: 0 } }],
        },
        {
          name: 'Financiamento solicitado',
          description: 'Notificar equipa financeira',
          trigger: 'custom_field_updated',
          conditions: [{ field: 'Financiamento', operator: 'equals', value: 'true' }],
          actions: [{ type: 'notify_user', config: { message: 'Candidato precisa de financiamento' } }],
        },
      ],
      dedupeRules: [
        { field: 'email', priority: 1, matchType: 'exact' },
        { field: 'phone', priority: 2, matchType: 'normalized' },
      ],
      mappingRules: [],
    },
  },
];

export function getTemplateById(id: string): BlueprintTemplate | undefined {
  return blueprintTemplates.find(t => t.id === id);
}

export function searchTemplates(query: string): BlueprintTemplate[] {
  const lowerQuery = query.toLowerCase();
  return blueprintTemplates.filter(t =>
    t.name.toLowerCase().includes(lowerQuery) ||
    t.description.toLowerCase().includes(lowerQuery) ||
    t.industry.toLowerCase().includes(lowerQuery) ||
    t.tags.some(tag => tag.toLowerCase().includes(lowerQuery))
  );
}
