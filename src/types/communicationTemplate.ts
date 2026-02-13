export type TemplateChannel = 'email' | 'whatsapp' | 'inbox' | 'note';

export type TemplateStructure = 'AIDA' | 'PAS' | 'BAB' | 'FourP' | 'AIDAShort' | 'ObjectionHandling' | 'DemoInvite' | 'FollowUp' | 'ColdOutreach' | 'custom';

export type JourneyContext = 
  | 'onboarding'
  | 'em_consumo'
  | 'lembrete_sessao'
  | 'consumo_terminar'
  | 'upsell'
  | 'reativacao'
  | 'conclusao'
  | 'followup';

export type TemplateTone = 'professional' | 'human' | 'empathetic' | 'commercial';

export type PersonalizationLevel = 'basic' | 'contextual' | 'predictive';

export interface CommunicationTemplate {
  id: string;
  workspaceId: string;
  name: string;
  channel: TemplateChannel;
  language: string;
  journeyContexts: JourneyContext[];
  subject?: string;
  body: string;
  bodyHtml?: string;
  tone: TemplateTone;
  structureType: TemplateStructure;
  cta?: string;
  isActive: boolean;
  usageCount: number;
  conversionCount: number;
  responseRate?: number;
  isDynamic: boolean;
  dynamicRules: Record<string, unknown>;
  dynamicSchema?: Record<string, unknown>;
  allowedChannels?: string[];
  defaultTone?: string;
  status?: string;
  personalizationLevel: PersonalizationLevel;
  structureFamilies: string[];
  brandConstraints: Record<string, unknown>;
  maxLengthByChannel: Record<string, number>;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

export interface TemplateUsageLog {
  id: string;
  workspaceId: string;
  templateId: string;
  entityType: 'contact' | 'company' | 'lead';
  entityId: string;
  channel: TemplateChannel;
  usedBy: string;
  automationId?: string;
  responseReceived: boolean;
  converted: boolean;
  usedAt: string;
}

export interface TemplateVariable {
  key: string;
  label: string;
  description: string;
  example: string;
}

// Available template variables
export const TEMPLATE_VARIABLES: TemplateVariable[] = [
  { key: 'nome_cliente', label: 'Nome do Cliente', description: 'Nome completo do cliente', example: 'João Silva' },
  { key: 'primeiro_nome', label: 'Primeiro Nome', description: 'Primeiro nome do cliente', example: 'João' },
  { key: 'produto_nome', label: 'Nome do Produto', description: 'Nome do produto adquirido', example: 'Pack 10 Sessões' },
  { key: 'consumo_atual', label: 'Consumo Atual', description: 'Quantidade já consumida', example: '7' },
  { key: 'consumo_total', label: 'Consumo Total', description: 'Quantidade total comprada', example: '10' },
  { key: 'sessoes_restantes', label: 'Sessões Restantes', description: 'Sessões ainda disponíveis', example: '3' },
  { key: 'data_ultima_sessao', label: 'Data Última Sessão', description: 'Data da última interação', example: '15/01/2026' },
  { key: 'proxima_acao', label: 'Próxima Ação', description: 'Ação sugerida pela IA', example: 'Agendar sessão de follow-up' },
  { key: 'responsavel_nome', label: 'Nome do Responsável', description: 'Nome do responsável pela conta', example: 'Maria Costa' },
  { key: 'empresa_nome', label: 'Nome da Empresa', description: 'Nome da sua empresa', example: 'Minha Empresa' },
  // CRM extended variables
  { key: 'first_name', label: 'Primeiro Nome (CRM)', description: 'Primeiro nome do lead/contacto', example: 'João' },
  { key: 'company_name', label: 'Empresa (CRM)', description: 'Nome da empresa do lead', example: 'TechCorp' },
  { key: 'industry', label: 'Indústria', description: 'Setor de atividade', example: 'Tecnologia' },
  { key: 'pipeline_stage', label: 'Fase Pipeline', description: 'Fase atual no pipeline', example: 'Proposta' },
  { key: 'lead_score', label: 'Lead Score', description: 'Pontuação do lead', example: '75' },
  { key: 'potential_value', label: 'Valor Potencial', description: 'Valor estimado da oportunidade', example: '5000' },
  { key: 'assigned_user', label: 'Responsável', description: 'Utilizador atribuído', example: 'Maria Costa' },
  { key: 'city', label: 'Cidade', description: 'Cidade do lead/contacto', example: 'Lisboa' },
  { key: 'days_since_last_contact', label: 'Dias sem Contacto', description: 'Dias desde último contacto', example: '5' },
];

export const SMART_VARIABLES: TemplateVariable[] = [
  { key: 'urgency_level', label: 'Nível de Urgência', description: 'low, medium ou high — calculado por IA', example: 'medium' },
  { key: 'business_maturity', label: 'Maturidade do Negócio', description: 'early, growth ou scale — calculado por IA', example: 'growth' },
  { key: 'digital_readiness', label: 'Prontidão Digital', description: 'low, medium ou high — calculado por IA', example: 'medium' },
  { key: 'conversion_probability', label: 'Probabilidade Conversão', description: '0-100 — calculado por IA', example: '72' },
  { key: 'recommended_tone', label: 'Tom Recomendado', description: 'direct, consultative ou strategic — calculado por IA', example: 'consultative' },
];

// Labels and configuration
export const CHANNEL_LABELS: Record<TemplateChannel, string> = {
  email: 'Email',
  whatsapp: 'WhatsApp',
  inbox: 'Mensagem Inbox',
  note: 'Nota Interna'
};

export const CHANNEL_ICONS: Record<TemplateChannel, string> = {
  email: 'Mail',
  whatsapp: 'MessageCircle',
  inbox: 'Inbox',
  note: 'StickyNote'
};

export const JOURNEY_CONTEXT_LABELS: Record<JourneyContext, string> = {
  onboarding: 'Início / Onboarding',
  em_consumo: 'Em Consumo',
  lembrete_sessao: 'Lembrete de Sessão',
  consumo_terminar: 'Consumo a Terminar',
  upsell: 'Upsell / Upgrade',
  reativacao: 'Reativação',
  conclusao: 'Conclusão de Produto',
  followup: 'Follow-up Manual'
};

export const TONE_LABELS: Record<TemplateTone, string> = {
  professional: 'Profissional',
  human: 'Humano',
  empathetic: 'Empático',
  commercial: 'Comercial Suave'
};

export const STRUCTURE_LABELS: Record<TemplateStructure, string> = {
  AIDA: 'AIDA',
  PAS: 'PAS',
  BAB: 'BAB — Before/After/Bridge',
  FourP: '4P — Promise/Picture/Proof/Push',
  AIDAShort: 'AIDA Short (WhatsApp)',
  ObjectionHandling: 'Objeção',
  DemoInvite: 'Convite Demo',
  FollowUp: 'Follow-Up',
  ColdOutreach: 'Cold Outreach',
  custom: 'Personalizado'
};

export const PERSONALIZATION_LABELS: Record<PersonalizationLevel, string> = {
  basic: 'Básico',
  contextual: 'Contextual',
  predictive: 'Preditivo',
};

export const STRUCTURE_PLACEHOLDERS: Record<TemplateStructure, string> = {
  AIDA: '**Atenção**\n[Capte a atenção do leitor]\n\n**Interesse**\n[Desperte curiosidade]\n\n**Desejo**\n[Crie vontade de agir]\n\n**Ação**\n[Call-to-action claro]',
  PAS: '**Problema**\n[Identifique a dor]\n\n**Agitação**\n[Amplifique o impacto]\n\n**Solução**\n[Apresente a solução]',
  BAB: '**Before**\n[Situação atual]\n\n**After**\n[Como seria com o problema resolvido]\n\n**Bridge**\n[Como chegar lá + CTA]',
  FourP: '**Promise**\n[Promessa de valor]\n\n**Picture**\n[Cenário do resultado]\n\n**Proof**\n[Evidência]\n\n**Push**\n[Urgência + CTA]',
  AIDAShort: '**Hook**\n[Uma frase de impacto]\n\n**Insight**\n[Valor/benefício curto]\n\n**CTA**\n[Pergunta simples]',
  ObjectionHandling: '**Acknowledge**\n[Validar objeção]\n\n**Reframe**\n[Recontextualizar]\n\n**Evidence**\n[Prova concreta]\n\n**CTA**\n[Próximo passo]',
  DemoInvite: '**Hook Personalizado**\n[Referência ao lead]\n\n**Value Prop**\n[Benefício da demo]\n\n**CTA Simples**\n[Agendar ou confirmar]',
  FollowUp: '**Contexto**\n[Retome a conversa anterior]\n\n**Valor**\n[Reforce o benefício]\n\n**Próximo Passo**\n[Proponha ação concreta]',
  ColdOutreach: '**Hook**\n[Abordagem personalizada]\n\n**Credibilidade**\n[Prova social ou resultado]\n\n**Proposta**\n[Oferta clara]\n\n**CTA**\n[Ação simples]',
  custom: ''
};

export const LANGUAGE_OPTIONS = [
  { value: 'pt', label: 'Português' },
  { value: 'en', label: 'English' },
  { value: 'es', label: 'Español' },
  { value: 'fr', label: 'Français' }
];

// Helper to replace variables in template
export function renderTemplate(
  template: string, 
  variables: Record<string, string | number | undefined>
): string {
  let result = template;
  
  for (const [key, value] of Object.entries(variables)) {
    const regex = new RegExp(`\\{\\{${key}\\}\\}`, 'g');
    result = result.replace(regex, String(value ?? ''));
  }
  
  return result;
}

// Generate preview variables
export function getPreviewVariables(): Record<string, string> {
  return TEMPLATE_VARIABLES.reduce((acc, v) => {
    acc[v.key] = v.example;
    return acc;
  }, {} as Record<string, string>);
}
