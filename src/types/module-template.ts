// Module Template Types - Complete Template for Creating Modules
// ==============================================================
// This file defines the complete template structure for marketplace modules

import { 
  ModuleCategory, 
  ModuleInternalType, 
  ModulePricingType, 
  ModuleAccessMethod,
  ModuleStatus,
  DataPermission,
  ModulePermissions,
  ModulePricing,
  EmbeddedAppConfig
} from './marketplace';

// === ROLE-BASED ACCESS ===

export type UserRole = "admin" | "manager" | "sales" | "support" | "viewer";

export interface RolePermissions {
  role: UserRole;
  can_access: boolean;
  can_configure: boolean;
  can_view_usage: boolean;
}

// === AI CONFIGURATION ===

export type AICapability = 
  | "classify"     // Classificar dados
  | "suggest"      // Sugerir ações
  | "predict"      // Prever resultados
  | "generate"     // Gerar conteúdo
  | "analyze"      // Analisar padrões
  | "summarize"    // Resumir informação
  | "translate";   // Traduzir

export type AIExecutionMode = 
  | "suggest_only"     // IA apenas sugere, humano decide
  | "auto_with_review" // IA executa, humano revê
  | "fully_automatic"; // IA executa sem revisão (apenas para ações de baixo risco)

export interface AIConfiguration {
  uses_ai: boolean;
  capabilities: AICapability[];
  execution_mode: AIExecutionMode;
  requires_human_validation: boolean;
  
  // Model configuration
  model_preference?: "fast" | "balanced" | "accurate";
  max_tokens_per_request?: number;
  
  // Safety settings
  content_filtering: boolean;
  pii_detection: boolean;
}

// === MODULE SETTINGS SCHEMA ===

export type SettingType = 
  | "text" 
  | "number" 
  | "boolean" 
  | "select" 
  | "multiselect" 
  | "range" 
  | "json";

export interface ModuleSettingDefinition {
  key: string;
  label: string;
  description: string;
  type: SettingType;
  default_value: unknown;
  required: boolean;
  
  // For select/multiselect
  options?: { label: string; value: string }[];
  
  // For number/range
  min?: number;
  max?: number;
  step?: number;
  
  // Visibility
  visible_to_admin_only: boolean;
}

export interface ModuleSettingsSchema {
  settings: ModuleSettingDefinition[];
  groups?: {
    id: string;
    label: string;
    description?: string;
    setting_keys: string[];
  }[];
}

// === CRM INTEGRATION ===

export type CRMEntity = 
  | "leads"
  | "contacts"
  | "companies"
  | "opportunities"
  | "products"
  | "proposals"
  | "invoices"
  | "conversations"
  | "templates"
  | "automations"
  | "notes"
  | "activities";

export type CRMTrigger = 
  | "on_create"
  | "on_update"
  | "on_delete"
  | "on_status_change"
  | "on_stage_change"
  | "on_assignment"
  | "on_conversion"
  | "on_scheduled";

export interface CRMIntegration {
  // Entities affected
  entities_affected: CRMEntity[];
  
  // Fields created/used
  custom_fields_created?: {
    entity: CRMEntity;
    field_name: string;
    field_type: string;
  }[];
  
  // Triggers
  triggers_on: CRMTrigger[];
  
  // Validation
  validates_data: boolean;
  creates_activities: boolean;
}

// === UX PLACEMENT ===

export type ModulePlacement = 
  | "standalone_page"    // Página própria no menu
  | "embed_panel"        // Painel embebido
  | "contextual_action"  // Ação contextual em entidades
  | "sidebar_widget"     // Widget na sidebar
  | "dashboard_widget"   // Widget no dashboard
  | "modal";             // Modal popup

export interface UXConfiguration {
  placement: ModulePlacement;
  
  // Menu location
  menu_section?: "prospecting" | "sales" | "service" | "analytics" | "settings" | "tools";
  menu_label: string;
  menu_icon: string;
  
  // For contextual actions
  context_entities?: CRMEntity[];
  action_label?: string;
  
  // For widgets
  widget_size?: "small" | "medium" | "large";
  
  // Primary actions
  primary_actions: {
    label: string;
    icon: string;
    description: string;
  }[];
}

// === BILLING BEHAVIOR ===

export interface BillingBehavior {
  // What consumes credits
  credit_consumption: {
    action: string;
    credits_per_action: number;
    description: string;
  }[];
  
  // Limits and warnings
  warning_threshold_percent: number;
  soft_limit_behavior: "warn" | "slow_down" | "block";
  hard_limit_behavior: "block" | "upgrade_prompt";
  
  // Overage handling
  allow_overage: boolean;
  overage_price_multiplier?: number;
}

// === LOGS & GOVERNANCE ===

export type LogLevel = "info" | "warning" | "error" | "critical";

export interface LogConfiguration {
  // What to log
  log_actions: boolean;
  log_data_changes: boolean;
  log_api_calls: boolean;
  log_errors: boolean;
  log_usage: boolean;
  
  // Retention
  retention_days: number;
  
  // Alerts
  alert_on_error: boolean;
  alert_on_limit_reached: boolean;
}

// === ACTIVATION/DEACTIVATION ===

export interface ActivationBehavior {
  // On activation
  on_activate: {
    runs_setup: boolean;
    creates_default_settings: boolean;
    sends_welcome_email: boolean;
    triggers_automation?: string;
  };
  
  // On deactivation
  on_deactivate: {
    preserves_data: boolean; // Must always be true
    preserves_settings: boolean;
    sends_notification: boolean;
    cleanup_actions?: string[];
  };
  
  // Reactivation
  allows_reactivation: boolean;
  reactivation_restores_settings: boolean;
}

// === INDUSTRY COMPATIBILITY ===

export type Industry = 
  | "real_estate"
  | "insurance"
  | "banking"
  | "healthcare"
  | "retail"
  | "manufacturing"
  | "technology"
  | "consulting"
  | "education"
  | "hospitality"
  | "automotive"
  | "legal"
  | "general";

export interface IndustryConfiguration {
  recommended_industries: Industry[];
  
  // Industry-specific customizations
  industry_labels?: Record<Industry, {
    module_name?: string;
    field_labels?: Record<string, string>;
  }>;
  
  // Associated templates
  email_templates?: string[];
  automation_templates?: string[];
}

// === LAUNCH CHECKLIST (DoD) ===

export interface ChecklistItem {
  id: string;
  category: "identity" | "permissions" | "crm" | "billing" | "ux" | "logs" | "security";
  label: string;
  description: string;
  required: boolean;
  validation_fn?: string; // Function name to validate
}

export const MODULE_LAUNCH_CHECKLIST: ChecklistItem[] = [
  // Identity
  {
    id: "has_name",
    category: "identity",
    label: "Nome definido",
    description: "O módulo tem um nome comercial claro",
    required: true
  },
  {
    id: "has_description",
    category: "identity",
    label: "Descrição clara",
    description: "O módulo tem descrição orientada a benefícios",
    required: true
  },
  {
    id: "has_target_audience",
    category: "identity",
    label: "Público-alvo definido",
    description: "O público-alvo está claramente identificado",
    required: true
  },
  {
    id: "has_expected_results",
    category: "identity",
    label: "Resultados esperados",
    description: "Os resultados esperados estão documentados",
    required: true
  },
  {
    id: "has_use_cases",
    category: "identity",
    label: "Casos de uso",
    description: "Pelo menos 3 casos de uso estão descritos",
    required: true
  },
  
  // Permissions
  {
    id: "permissions_defined",
    category: "permissions",
    label: "Permissões definidas",
    description: "As permissões de dados estão explicitamente definidas",
    required: true
  },
  {
    id: "workspace_isolation",
    category: "permissions",
    label: "Isolamento por workspace",
    description: "O módulo respeita o isolamento de dados por workspace",
    required: true
  },
  {
    id: "role_permissions",
    category: "permissions",
    label: "Permissões por role",
    description: "As permissões por role estão configuradas",
    required: true
  },
  
  // CRM Integration
  {
    id: "crm_entities_defined",
    category: "crm",
    label: "Entidades CRM definidas",
    description: "As entidades CRM afetadas estão identificadas",
    required: true
  },
  {
    id: "no_orphan_data",
    category: "crm",
    label: "Sem dados órfãos",
    description: "O módulo não cria dados fora do modelo do CRM",
    required: true
  },
  
  // Billing
  {
    id: "pricing_configured",
    category: "billing",
    label: "Preço configurado",
    description: "O modelo de preços está definido",
    required: true
  },
  {
    id: "credit_consumption_defined",
    category: "billing",
    label: "Consumo de créditos",
    description: "O que consome créditos está documentado",
    required: false
  },
  {
    id: "limits_configured",
    category: "billing",
    label: "Limites configurados",
    description: "Os limites e avisos estão configurados",
    required: true
  },
  
  // UX
  {
    id: "placement_defined",
    category: "ux",
    label: "Posicionamento definido",
    description: "O local no menu está definido",
    required: true
  },
  {
    id: "primary_actions",
    category: "ux",
    label: "Ações principais",
    description: "As ações principais do utilizador estão definidas",
    required: true
  },
  {
    id: "ux_consistency",
    category: "ux",
    label: "Consistência UX",
    description: "A UX é consistente com o resto do produto",
    required: true
  },
  
  // Logs
  {
    id: "logs_configured",
    category: "logs",
    label: "Logs configurados",
    description: "O módulo gera logs de ações e erros",
    required: true
  },
  {
    id: "audit_trail",
    category: "logs",
    label: "Trilho de auditoria",
    description: "As ações são rastreáveis",
    required: true
  },
  
  // Security
  {
    id: "security_review",
    category: "security",
    label: "Revisão de segurança",
    description: "O módulo passou por revisão de segurança",
    required: true
  },
  {
    id: "no_pii_exposure",
    category: "security",
    label: "Sem exposição de PII",
    description: "O módulo não expõe dados pessoais indevidamente",
    required: true
  }
];

// === COMPLETE MODULE TEMPLATE ===

export interface ModuleTemplate {
  // === 1. IDENTITY ===
  id?: string;
  slug: string;
  name: string;
  tagline: string; // 1 frase orientada a benefício
  description: string; // Descrição longa com casos de uso
  category: ModuleCategory;
  icon: string;
  cover_image?: string;
  screenshots?: string[];
  video_url?: string;
  
  // === 2. INTERNAL TYPE (Hidden) ===
  internal_type: ModuleInternalType;
  status: ModuleStatus;
  version: string;
  
  // === 3. CAPABILITIES ===
  capabilities: {
    creates_data: boolean;
    reads_data: boolean;
    updates_data: boolean;
    generates_insights: boolean;
    triggers_automations: boolean;
  };
  capabilities_description: string; // Human-readable description
  
  // === 4. CRM INTEGRATION ===
  crm_integration: CRMIntegration;
  
  // === 5. PERMISSIONS ===
  permissions: ModulePermissions;
  role_permissions: RolePermissions[];
  
  // === 6. UX ===
  ux: UXConfiguration;
  
  // === 7. AI (if applicable) ===
  ai?: AIConfiguration;
  
  // === 8. SETTINGS ===
  settings_schema?: ModuleSettingsSchema;
  
  // === 9. BILLING ===
  pricing: ModulePricing;
  billing_behavior?: BillingBehavior;
  
  // === 10. LOGS & GOVERNANCE ===
  logs: LogConfiguration;
  
  // === 11. ACTIVATION ===
  activation: ActivationBehavior;
  
  // === 12. INDUSTRY ===
  industry?: IndustryConfiguration;
  
  // === 13. EMBEDDED APP (if type is embedded_app) ===
  embedded_config?: EmbeddedAppConfig;
  
  // === 14. BUSINESS VALUE ===
  target_audience: string;
  expected_results: string[];
  use_cases: string[];
  
  // === 15. METADATA ===
  publisher: string;
  is_featured: boolean;
  is_new: boolean;
  
  // === 16. CHECKLIST STATUS ===
  checklist_status?: Record<string, boolean>;
  
  // === 17. TIMESTAMPS ===
  created_at?: string;
  updated_at?: string;
  published_at?: string;
}

// === DEFAULT TEMPLATE ===

export const DEFAULT_MODULE_TEMPLATE: Partial<ModuleTemplate> = {
  status: "pending_approval",
  version: "1.0.0",
  capabilities: {
    creates_data: false,
    reads_data: true,
    updates_data: false,
    generates_insights: false,
    triggers_automations: false
  },
  permissions: {
    data_permissions: [],
    workspace_isolation: true,
    can_send_emails: false,
    can_send_whatsapp: false,
    can_create_activities: false,
    can_trigger_automations: false
  },
  role_permissions: [
    { role: "admin", can_access: true, can_configure: true, can_view_usage: true },
    { role: "manager", can_access: true, can_configure: false, can_view_usage: true },
    { role: "sales", can_access: true, can_configure: false, can_view_usage: false },
    { role: "support", can_access: true, can_configure: false, can_view_usage: false },
    { role: "viewer", can_access: false, can_configure: false, can_view_usage: false }
  ],
  logs: {
    log_actions: true,
    log_data_changes: true,
    log_api_calls: true,
    log_errors: true,
    log_usage: true,
    retention_days: 90,
    alert_on_error: true,
    alert_on_limit_reached: true
  },
  activation: {
    on_activate: {
      runs_setup: true,
      creates_default_settings: true,
      sends_welcome_email: true
    },
    on_deactivate: {
      preserves_data: true,
      preserves_settings: true,
      sends_notification: true
    },
    allows_reactivation: true,
    reactivation_restores_settings: true
  },
  publisher: "FastCRM",
  is_featured: false,
  is_new: true
};

// === VALIDATION HELPERS ===

export function validateModuleTemplate(template: Partial<ModuleTemplate>): {
  isValid: boolean;
  errors: string[];
  warnings: string[];
  checklist: Record<string, boolean>;
} {
  const errors: string[] = [];
  const warnings: string[] = [];
  const checklist: Record<string, boolean> = {};
  
  // Check required fields
  if (!template.name) errors.push("Nome é obrigatório");
  if (!template.slug) errors.push("Slug é obrigatório");
  if (!template.tagline) errors.push("Tagline é obrigatório");
  if (!template.description) errors.push("Descrição é obrigatória");
  if (!template.category) errors.push("Categoria é obrigatória");
  if (!template.internal_type) errors.push("Tipo interno é obrigatório");
  if (!template.target_audience) errors.push("Público-alvo é obrigatório");
  
  // Check expected_results
  if (!template.expected_results || template.expected_results.length === 0) {
    errors.push("Pelo menos um resultado esperado é obrigatório");
  }
  
  // Check use_cases
  if (!template.use_cases || template.use_cases.length < 3) {
    warnings.push("Recomendado ter pelo menos 3 casos de uso");
  }
  
  // Check permissions
  if (!template.permissions?.workspace_isolation) {
    errors.push("Isolamento por workspace é obrigatório");
  }
  
  // Check pricing
  if (!template.pricing) {
    errors.push("Configuração de preços é obrigatória");
  }
  
  // Check embedded_config for embedded_app type
  if (template.internal_type === "embedded_app" && !template.embedded_config) {
    errors.push("Configuração de app embebida é obrigatória para tipo embedded_app");
  }
  
  // Build checklist
  MODULE_LAUNCH_CHECKLIST.forEach(item => {
    switch (item.id) {
      case "has_name":
        checklist[item.id] = !!template.name;
        break;
      case "has_description":
        checklist[item.id] = !!template.description && template.description.length > 50;
        break;
      case "has_target_audience":
        checklist[item.id] = !!template.target_audience;
        break;
      case "has_expected_results":
        checklist[item.id] = !!template.expected_results && template.expected_results.length > 0;
        break;
      case "has_use_cases":
        checklist[item.id] = !!template.use_cases && template.use_cases.length >= 3;
        break;
      case "permissions_defined":
        checklist[item.id] = !!template.permissions?.data_permissions?.length;
        break;
      case "workspace_isolation":
        checklist[item.id] = template.permissions?.workspace_isolation === true;
        break;
      case "role_permissions":
        checklist[item.id] = !!template.role_permissions?.length;
        break;
      case "crm_entities_defined":
        checklist[item.id] = !!template.crm_integration?.entities_affected?.length;
        break;
      case "pricing_configured":
        checklist[item.id] = !!template.pricing;
        break;
      case "placement_defined":
        checklist[item.id] = !!template.ux?.placement;
        break;
      case "logs_configured":
        checklist[item.id] = !!template.logs;
        break;
      default:
        checklist[item.id] = false;
    }
  });
  
  return {
    isValid: errors.length === 0,
    errors,
    warnings,
    checklist
  };
}

// === CATEGORY DISPLAY HELPERS ===

export const INDUSTRY_LABELS: Record<Industry, string> = {
  real_estate: "Imobiliário",
  insurance: "Seguros",
  banking: "Banca",
  healthcare: "Saúde",
  retail: "Retalho",
  manufacturing: "Indústria",
  technology: "Tecnologia",
  consulting: "Consultoria",
  education: "Educação",
  hospitality: "Hotelaria",
  automotive: "Automóvel",
  legal: "Jurídico",
  general: "Geral"
};

export const CHECKLIST_CATEGORY_LABELS: Record<string, string> = {
  identity: "Identidade",
  permissions: "Permissões",
  crm: "Integração CRM",
  billing: "Faturação",
  ux: "Experiência",
  logs: "Logs & Governança",
  security: "Segurança"
};
