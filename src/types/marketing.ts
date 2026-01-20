// FastCRM Marketing Module Types

export interface MarketingSettings {
  id: string;
  workspaceId: string;
  isEnabled: boolean;
  monthlyEmailLimit: number;
  activeContactsLimit: number;
  activeCampaignsLimit: number;
  defaultFromName?: string;
  defaultReplyTo?: string;
  unsubscribePageUrl?: string;
  customFooter?: string;
  createdAt: string;
  updatedAt: string;
}

export interface MarketingSegment {
  id: string;
  workspaceId: string;
  name: string;
  description?: string;
  filterRules: SegmentFilterRules;
  contactCount: number;
  isDynamic: boolean;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

export interface SegmentFilterRules {
  logic: 'AND' | 'OR';
  conditions: SegmentCondition[];
}

export interface SegmentCondition {
  field: string;
  operator: 'equals' | 'not_equals' | 'contains' | 'not_contains' | 'is_empty' | 'is_not_empty' | 'in_list';
  value?: string | string[];
}

export interface MarketingTemplate {
  id: string;
  workspaceId: string;
  name: string;
  description?: string;
  subject?: string;
  bodyHtml: string;
  bodyText?: string;
  thumbnailUrl?: string;
  category: string;
  isSystem: boolean;
  isActive: boolean;
  usageCount: number;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

export type CampaignStatus = 'draft' | 'scheduled' | 'sending' | 'sent' | 'paused' | 'cancelled';

export interface MarketingCampaign {
  id: string;
  workspaceId: string;
  name: string;
  subject: string;
  previewText?: string;
  fromName: string;
  replyTo?: string;
  bodyHtml: string;
  bodyText?: string;
  templateId?: string;
  segmentId?: string;
  status: CampaignStatus;
  scheduledAt?: string;
  startedAt?: string;
  completedAt?: string;
  totalRecipients: number;
  sentCount: number;
  deliveredCount: number;
  openedCount: number;
  clickedCount: number;
  bouncedCount: number;
  complainedCount: number;
  unsubscribedCount: number;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
  // Computed
  segment?: MarketingSegment;
  template?: MarketingTemplate;
}

export type RecipientStatus = 'pending' | 'sent' | 'delivered' | 'opened' | 'clicked' | 'bounced' | 'complained' | 'unsubscribed' | 'failed';

export interface MarketingRecipient {
  id: string;
  workspaceId: string;
  campaignId: string;
  contactId?: string;
  leadId?: string;
  email: string;
  name?: string;
  status: RecipientStatus;
  resendId?: string;
  sentAt?: string;
  deliveredAt?: string;
  openedAt?: string;
  clickedAt?: string;
  bouncedAt?: string;
  bounceType?: string;
  bounceReason?: string;
  errorMessage?: string;
  metadata?: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
}

export type EventType = 'sent' | 'delivered' | 'opened' | 'clicked' | 'bounced' | 'complained' | 'unsubscribed';

export interface MarketingEvent {
  id: string;
  workspaceId: string;
  campaignId?: string;
  recipientId?: string;
  eventType: EventType;
  email?: string;
  linkUrl?: string;
  userAgent?: string;
  ipAddress?: string;
  metadata?: Record<string, unknown>;
  occurredAt: string;
  createdAt: string;
}

export type SubscriptionStatus = 'subscribed' | 'unsubscribed' | 'bounced' | 'complained';

export interface MarketingSubscription {
  id: string;
  workspaceId: string;
  contactId?: string;
  leadId?: string;
  email: string;
  status: SubscriptionStatus;
  consentSource?: string;
  subscribedAt?: string;
  unsubscribedAt?: string;
  unsubscribeReason?: string;
  createdAt: string;
  updatedAt: string;
}

export interface MarketingUsage {
  id: string;
  workspaceId: string;
  periodStart: string;
  periodEnd: string;
  emailsSent: number;
  emailsLimit: number;
  activeContacts: number;
  contactsLimit: number;
  activeCampaigns: number;
  campaignsLimit: number;
  createdAt: string;
  updatedAt: string;
}

export interface MarketingLink {
  id: string;
  workspaceId: string;
  campaignId: string;
  originalUrl: string;
  trackingCode: string;
  clickCount: number;
  createdAt: string;
}

// Campaign Stats
export interface CampaignStats {
  totalRecipients: number;
  sentCount: number;
  deliveredCount: number;
  openedCount: number;
  clickedCount: number;
  bouncedCount: number;
  complainedCount: number;
  unsubscribedCount: number;
  // Computed rates
  deliveryRate: number;
  openRate: number;
  clickRate: number;
  bounceRate: number;
  unsubscribeRate: number;
}

// Labels and configs
export const CAMPAIGN_STATUS_LABELS: Record<CampaignStatus, string> = {
  draft: 'Rascunho',
  scheduled: 'Agendada',
  sending: 'A Enviar',
  sent: 'Enviada',
  paused: 'Pausada',
  cancelled: 'Cancelada',
};

export const CAMPAIGN_STATUS_COLORS: Record<CampaignStatus, string> = {
  draft: 'bg-muted text-muted-foreground',
  scheduled: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
  sending: 'bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200',
  sent: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
  paused: 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200',
  cancelled: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200',
};

export const RECIPIENT_STATUS_LABELS: Record<RecipientStatus, string> = {
  pending: 'Pendente',
  sent: 'Enviado',
  delivered: 'Entregue',
  opened: 'Aberto',
  clicked: 'Clicado',
  bounced: 'Devolvido',
  complained: 'Spam',
  unsubscribed: 'Cancelado',
  failed: 'Falhou',
};

export const EVENT_TYPE_LABELS: Record<EventType, string> = {
  sent: 'Enviado',
  delivered: 'Entregue',
  opened: 'Aberto',
  clicked: 'Clicado',
  bounced: 'Devolvido',
  complained: 'Spam',
  unsubscribed: 'Cancelado',
};

export const TEMPLATE_CATEGORIES = [
  { value: 'general', label: 'Geral' },
  { value: 'newsletter', label: 'Newsletter' },
  { value: 'promotional', label: 'Promocional' },
  { value: 'transactional', label: 'Transacional' },
  { value: 'welcome', label: 'Boas-vindas' },
];

// Helper to calculate campaign stats
export function calculateCampaignStats(campaign: MarketingCampaign): CampaignStats {
  const total = campaign.totalRecipients || 1;
  const delivered = campaign.deliveredCount || 0;
  
  return {
    totalRecipients: campaign.totalRecipients,
    sentCount: campaign.sentCount,
    deliveredCount: campaign.deliveredCount,
    openedCount: campaign.openedCount,
    clickedCount: campaign.clickedCount,
    bouncedCount: campaign.bouncedCount,
    complainedCount: campaign.complainedCount,
    unsubscribedCount: campaign.unsubscribedCount,
    deliveryRate: total > 0 ? (delivered / campaign.sentCount) * 100 : 0,
    openRate: delivered > 0 ? (campaign.openedCount / delivered) * 100 : 0,
    clickRate: delivered > 0 ? (campaign.clickedCount / delivered) * 100 : 0,
    bounceRate: total > 0 ? (campaign.bouncedCount / campaign.sentCount) * 100 : 0,
    unsubscribeRate: delivered > 0 ? (campaign.unsubscribedCount / delivered) * 100 : 0,
  };
}

// Default email templates
export const DEFAULT_TEMPLATES = [
  {
    name: 'Simples',
    description: 'Template limpo e minimalista',
    category: 'general',
    bodyHtml: `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
  <h1 style="color: #1a1a1a;">{{subject}}</h1>
  <p>Olá {{primeiro_nome}},</p>
  <p>{{conteudo}}</p>
  <p style="margin-top: 30px;">Com os melhores cumprimentos,<br>{{empresa_nome}}</p>
</body>
</html>`,
  },
  {
    name: 'Newsletter',
    description: 'Template para newsletters regulares',
    category: 'newsletter',
    bodyHtml: `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 0; background-color: #f5f5f5;">
  <div style="background-color: #1a1a1a; padding: 20px; text-align: center;">
    <h1 style="color: #fff; margin: 0;">{{empresa_nome}}</h1>
  </div>
  <div style="background-color: #fff; padding: 30px;">
    <h2 style="color: #1a1a1a;">{{subject}}</h2>
    <p>Olá {{primeiro_nome}},</p>
    <p>{{conteudo}}</p>
  </div>
  <div style="background-color: #f0f0f0; padding: 20px; text-align: center; font-size: 12px; color: #666;">
    <p>{{empresa_nome}} | {{empresa_endereco}}</p>
    <p><a href="{{unsubscribe_url}}" style="color: #666;">Cancelar subscrição</a></p>
  </div>
</body>
</html>`,
  },
  {
    name: 'Promocional',
    description: 'Template para ofertas e promoções',
    category: 'promotional',
    bodyHtml: `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 0;">
  <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 40px 20px; text-align: center;">
    <h1 style="color: #fff; margin: 0; font-size: 28px;">{{subject}}</h1>
  </div>
  <div style="background-color: #fff; padding: 30px; text-align: center;">
    <p style="font-size: 18px;">Olá {{primeiro_nome}},</p>
    <p style="font-size: 16px;">{{conteudo}}</p>
    <a href="{{cta_url}}" style="display: inline-block; background-color: #667eea; color: #fff; padding: 15px 30px; text-decoration: none; border-radius: 5px; margin-top: 20px; font-weight: bold;">{{cta_texto}}</a>
  </div>
  <div style="padding: 20px; text-align: center; font-size: 12px; color: #666;">
    <p><a href="{{unsubscribe_url}}" style="color: #666;">Cancelar subscrição</a></p>
  </div>
</body>
</html>`,
  },
  {
    name: 'Boas-vindas',
    description: 'Template para novos contactos',
    category: 'welcome',
    bodyHtml: `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
  <div style="text-align: center; padding: 30px 0;">
    <h1 style="color: #10b981; margin: 0;">🎉 Bem-vindo!</h1>
  </div>
  <div style="background-color: #f0fdf4; padding: 30px; border-radius: 10px;">
    <p style="font-size: 18px;">Olá {{primeiro_nome}},</p>
    <p>Estamos muito felizes por te ter connosco!</p>
    <p>{{conteudo}}</p>
    <p style="margin-top: 30px;">Se tiveres alguma questão, não hesites em contactar-nos.</p>
  </div>
  <div style="padding: 20px; text-align: center; font-size: 12px; color: #666;">
    <p>{{empresa_nome}}</p>
    <p><a href="{{unsubscribe_url}}" style="color: #666;">Cancelar subscrição</a></p>
  </div>
</body>
</html>`,
  },
];
