export type ActivationCategory =
  | "setup_base"
  | "primeiros_dados"
  | "comunicacao_automacao"
  | "comercio_checkout";

export interface ActivationGoal {
  id: string;
  goal_key: string;
  category: ActivationCategory;
  title: string;
  description: string | null;
  cta_label: string | null;
  cta_route: string | null;
  weight: number;
  display_order: number;
  detection_type: "manual" | "auto";
  is_active: boolean;
}

export interface ActivationProgress {
  id: string;
  workspace_id: string;
  goal_key: string;
  completed_at: string | null;
  source: "manual" | "auto" | "admin";
}

export interface OnboardingState {
  workspace_id: string;
  wizard_step: number;
  wizard_completed_at: string | null;
  wizard_skipped: boolean;
  widget_dismissed: boolean;
  widget_minimized: boolean;
  first_login_at: string;
}

export interface ActivationOverview {
  workspace_id: string;
  workspace_name: string;
  workspace_created_at: string;
  days_since_signup: number;
  activation_score: number;
  goals_completed: number;
  goals_total: number;
  category_breakdown: Record<string, { completed: number; total: number }>;
  activation_status: "churn_risk" | "activated" | "engaged" | "onboarding";
  wizard_completed_at: string | null;
  wizard_skipped: boolean | null;
  first_login_at: string | null;
}

export const CATEGORY_LABELS: Record<ActivationCategory, string> = {
  setup_base: "Setup base",
  primeiros_dados: "Primeiros dados",
  comunicacao_automacao: "Comunicação & automação",
  comercio_checkout: "Comércio & checkout",
};
