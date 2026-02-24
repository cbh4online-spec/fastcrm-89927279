// SaaS Management Types

export type SubscriptionPlan = "starter" | "growth" | "scale";
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
  alert_type: "warning" | "critical" | "limit_reached" | "payment_failed" | "trial_ending" | "trial_expired";
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
  starter: {
    name: "Starter",
    price: 0,
    description: "For getting started",
    features: [
      "1-3 users",
      "CRM core (Objects + Inbox)",
      "Intelligence basic (health score)",
      "Basic automations",
      "1 pipeline",
      "500 emails/month",
    ],
  },
  growth: {
    name: "Growth",
    price: 49,
    yearlyPrice: 490,
    description: "For growing teams",
    highlighted: true,
    badge: "Most popular",
    features: [
      "Up to 10 users",
      "Multi-pipeline",
      "Stage benchmarks",
      "Advanced automation templates",
      "Marketplace active",
      "AI suggestions & insights",
      "5,000 emails/month",
      "500 AI calls/month",
    ],
  },
  scale: {
    name: "Scale",
    price: 149,
    yearlyPrice: 1490,
    description: "For scaling companies",
    badge: "Enterprise",
    features: [
      "Unlimited users",
      "Advanced Intelligence",
      "Advanced automations",
      "API access",
      "Advanced roles",
      "Priority support",
      "White-label branding",
      "Unlimited emails",
      "5,000 AI calls/month",
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
    name: "Automations",
    description: "Automated workflows",
    icon: "Zap",
  },
  form_studio_enabled: {
    name: "Form Studio",
    description: "Smart forms",
    icon: "FileText",
  },
  templates_enabled: {
    name: "Templates",
    description: "Reusable messages",
    icon: "Copy",
  },
  proposals_enabled: {
    name: "Proposals",
    description: "Proposals & checkout",
    icon: "FileCheck",
  },
  ai_suggestions_enabled: {
    name: "AI Suggestions",
    description: "Smart suggestions",
    icon: "Sparkles",
  },
  ai_insights_enabled: {
    name: "AI Insights",
    description: "Intelligent analysis",
    icon: "Brain",
  },
  landing_pages_enabled: {
    name: "Landing Pages",
    description: "Capture pages",
    icon: "Globe",
  },
  integrations_enabled: {
    name: "Integrations",
    description: "Connect tools",
    icon: "Plug",
  },
  dashboard_customization: {
    name: "Custom Dashboards",
    description: "Customize views",
    icon: "LayoutDashboard",
  },
  sidebar_customization: {
    name: "Custom Sidebar",
    description: "Customize navigation",
    icon: "PanelLeft",
  },
  white_label: {
    name: "White Label",
    description: "Custom branding",
    icon: "Palette",
  },
};

// Resource types for quotas
export const RESOURCE_TYPES = {
  leads: { name: "Leads", icon: "Users" },
  contacts: { name: "Contacts", icon: "Contact" },
  companies: { name: "Companies", icon: "Building2" },
  opportunities: { name: "Opportunities", icon: "Target" },
  templates: { name: "Templates", icon: "Copy" },
  automations: { name: "Automations", icon: "Zap" },
  users: { name: "Users", icon: "UserPlus" },
  emails_month: { name: "Emails/month", icon: "Mail" },
  whatsapp_month: { name: "WhatsApp/month", icon: "MessageCircle" },
  instagram_month: { name: "Instagram/month", icon: "Instagram" },
  ai_calls: { name: "AI calls/month", icon: "Brain" },
} as const;
