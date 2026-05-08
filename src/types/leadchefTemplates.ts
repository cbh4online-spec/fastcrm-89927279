import type { LeadChefTemplateCategory } from "@/utils/leadchef/templates";

export interface LeadChefMessageTemplate {
  id: string;
  workspace_id: string;
  name: string;
  category: LeadChefTemplateCategory;
  channel: string; // 'whatsapp'
  body: string;
  variables: string[];
  is_default: boolean;
  is_active: boolean;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface LeadChefAutomationRule {
  id: string;
  workspace_id: string;
  key: string;
  name: string;
  description: string | null;
  trigger_type: string;
  action_type: string;
  config: Record<string, unknown>;
  is_enabled: boolean;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export type LeadChefAlertSeverity = "info" | "warning" | "critical";

export interface LeadChefActionableAlert {
  id: string;
  type: string;
  severity: LeadChefAlertSeverity;
  title: string;
  description?: string;
  entityType: "lead" | "client" | "referral" | "appointment";
  entityId: string;
  actionLabel?: string;
  actionHref?: string;
  templateCategory?: LeadChefTemplateCategory;
  suggestedAction?: string;
  ruleKey?: string;
}

export interface LeadChefNextActionSuggestion {
  id: string;
  title: string;
  description: string;
  type: string; // activity type
  whenLabel: string;
  whenISO: string; // suggested datetime
  templateCategory?: LeadChefTemplateCategory;
}
