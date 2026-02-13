export type TemplateChannel = 'email' | 'whatsapp' | 'inbox' | 'note';

export type TemplateStructure = 'AIDA' | 'PAS' | 'FollowUp' | 'ColdOutreach' | 'custom';

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
  FollowUp: 'Follow-Up',
  ColdOutreach: 'Cold Outreach',
  custom: 'Personalizado'
};

export const STRUCTURE_PLACEHOLDERS: Record<TemplateStructure, string> = {
  AIDA: '**Atenção**\n[Capte a atenção do leitor]\n\n**Interesse**\n[Desperte curiosidade]\n\n**Desejo**\n[Crie vontade de agir]\n\n**Ação**\n[Call-to-action claro]',
  PAS: '**Problema**\n[Identifique a dor]\n\n**Agitação**\n[Amplifique o impacto]\n\n**Solução**\n[Apresente a solução]',
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
