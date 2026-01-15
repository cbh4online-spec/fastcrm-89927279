// SaaS Management Types

export type SubscriptionPlan = "free" | "basic" | "pro" | "agency";
export type SubscriptionStatus = "active" | "trialing" | "past_due" | "canceled" | "incomplete" | "suspended";

export interface PlanFeature {
  id: string;
  plan: SubscriptionPlan;
  feature_key: string;
  enabled: boolean;
  limit_value: number | null;
}

export interface UsageQuota {
  resource_type: string;
  current: number;
  limit: number;
  percent: number;
  allowed: boolean;
}

export interface WorkspaceUsage {
  leads_count: number;
  contacts_count: number;
  companies_count: number;
  opportunities_count: number;
  templates_count: number;
  automations_count: number;
  members_count: number;
  emails_sent: number;
  whatsapp_sent: number;
  instagram_sent: number;
  ai_calls_used: number;
}

export interface WorkspaceSubscription {
  id: string;
  workspace_id: string;
  plan: SubscriptionPlan;
  status: SubscriptionStatus;
  stripe_customer_id: string | null;
  stripe_subscription_id: string | null;
  stripe_price_id: string | null;
  current_period_start: string | null;
  current_period_end: string | null;
  cancel_at_period_end: boolean;
  trial_started_at: string | null;
  trial_ends_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface UsageAlert {
  id: string;
  workspace_id: string;
  alert_type: "warning" | "critical" | "limit_reached";
  resource_type: string;
  threshold_percent: number;
  current_usage: number;
  limit_value: number;
  message: string;
  is_dismissed: boolean;
  dismissed_at: string | null;
  created_at: string;
}

export interface BillingEvent {
  id: string;
  workspace_id: string;
  event_type: string;
  stripe_event_id: string | null;
  data: Record<string, unknown>;
  processed: boolean;
  processed_at: string | null;
  error_message: string | null;
  created_at: string;
}

export interface PlanInfo {
  name: string;
  price: number;
  yearlyPrice?: number;
  description: string;
  features: string[];
  highlighted?: boolean;
  badge?: string;
}

export interface PlanLimits {
  max_users: number;
  max_leads: number;
  max_contacts: number;
  max_companies: number;
  max_opportunities: number;
  max_templates: number;
  max_automations: number;
  max_ai_calls: number;
  max_emails_month: number;
  max_whatsapp_month: number;
  max_instagram_month: number;
}

export interface FeatureFlags {
  inbox_enabled: boolean;
  automations_enabled: boolean;
  form_studio_enabled: boolean;
  templates_enabled: boolean;
  proposals_enabled: boolean;
  ai_suggestions_enabled: boolean;
  ai_insights_enabled: boolean;
  landing_pages_enabled: boolean;
  integrations_enabled: boolean;
  dashboard_customization: boolean;
  sidebar_customization: boolean;
  white_label: boolean;
}

// Plan information for display
export const PLAN_DISPLAY_INFO: Record<SubscriptionPlan, PlanInfo> = {
  free: {
    name: "Free",
    price: 0,
    description: "Para experimentar o FastCRM",
    features: [
      "1 utilizador",
      "50 leads",
      "25 contactos",
      "Formulários básicos",
      "50 emails/mês",
    ],
  },
  basic: {
    name: "Basic",
    price: 29,
    yearlyPrice: 290,
    description: "Para equipas pequenas",
    features: [
      "Até 3 utilizadores",
      "500 leads",
      "250 contactos",
      "Inbox completo",
      "5 automações",
      "Propostas e checkout",
      "500 emails/mês",
    ],
  },
  pro: {
    name: "Pro",
    price: 79,
    yearlyPrice: 790,
    description: "Para equipas em crescimento",
    highlighted: true,
    badge: "Mais popular",
    features: [
      "Até 10 utilizadores",
      "5000 leads",
      "50 automações",
      "IA Sugestões & Insights",
      "Dashboards personalizáveis",
      "500 chamadas IA/mês",
      "5000 emails/mês",
    ],
  },
  agency: {
    name: "Agency",
    price: 199,
    yearlyPrice: 1990,
    description: "Para agências e empresas",
    badge: "Enterprise",
    features: [
      "Utilizadores ilimitados",
      "Leads ilimitados",
      "Automações ilimitadas",
      "White-label branding",
      "5000 chamadas IA/mês",
      "Emails ilimitados",
      "Suporte prioritário",
    ],
  },
};

// Feature keys that map to module access
export const FEATURE_MODULES: Record<string, { name: string; description: string; icon: string }> = {
  inbox_enabled: {
    name: "Inbox",
    description: "Email, WhatsApp e Instagram",
    icon: "Inbox",
  },
  automations_enabled: {
    name: "Automações",
    description: "Workflows automáticos",
    icon: "Zap",
  },
  form_studio_enabled: {
    name: "Form Studio",
    description: "Formulários inteligentes",
    icon: "FileText",
  },
  templates_enabled: {
    name: "Templates",
    description: "Mensagens reutilizáveis",
    icon: "Copy",
  },
  proposals_enabled: {
    name: "Propostas",
    description: "Propostas e checkout",
    icon: "FileCheck",
  },
  ai_suggestions_enabled: {
    name: "IA Sugestões",
    description: "Sugestões automáticas",
    icon: "Sparkles",
  },
  ai_insights_enabled: {
    name: "IA Insights",
    description: "Análise inteligente",
    icon: "Brain",
  },
  landing_pages_enabled: {
    name: "Landing Pages",
    description: "Páginas de captura",
    icon: "Globe",
  },
  integrations_enabled: {
    name: "Integrações",
    description: "Conectar ferramentas",
    icon: "Plug",
  },
  dashboard_customization: {
    name: "Dashboards Personalizáveis",
    description: "Personalizar visualização",
    icon: "LayoutDashboard",
  },
  sidebar_customization: {
    name: "Sidebar Personalizável",
    description: "Personalizar navegação",
    icon: "PanelLeft",
  },
  white_label: {
    name: "White Label",
    description: "Marca própria",
    icon: "Palette",
  },
};

// Resource types for quotas
export const RESOURCE_TYPES = {
  leads: { name: "Leads", icon: "Users" },
  contacts: { name: "Contactos", icon: "Contact" },
  companies: { name: "Empresas", icon: "Building2" },
  opportunities: { name: "Oportunidades", icon: "Target" },
  templates: { name: "Templates", icon: "Copy" },
  automations: { name: "Automações", icon: "Zap" },
  users: { name: "Utilizadores", icon: "UserPlus" },
  emails_month: { name: "Emails/mês", icon: "Mail" },
  whatsapp_month: { name: "WhatsApp/mês", icon: "MessageCircle" },
  instagram_month: { name: "Instagram/mês", icon: "Instagram" },
  ai_calls: { name: "Chamadas IA/mês", icon: "Brain" },
} as const;
