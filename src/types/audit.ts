export interface AuditMetrics {
  routes: number;
  tables: number;
  edgeFunctions: number;
  components: number;
  hooks: number;
  modules: number;
  rlsPolicies: number;
  storageBuckets: number;
  triggers: number;
}

export interface TableInfo {
  name: string;
  rowCount: number;
  hasRls: boolean;
  policyCount: number;
}

export interface EdgeFunctionInfo {
  name: string;
  category: string;
  description: string;
}

export interface AuditModule {
  name: string;
  objective: string;
  components: string[];
  status: "implemented" | "partial" | "planned";
}

export interface AuditData {
  metrics: AuditMetrics;
  tables: TableInfo[];
  edgeFunctions: EdgeFunctionInfo[];
  modules: AuditModule[];
  lastUpdated: Date;
  version: string;
}

export const EDGE_FUNCTION_CATEGORIES: Record<string, string[]> = {
  "IA & Machine Learning": [
    "ai-agent-client", "ai-agent-lifecycle", "ai-agent-opportunity", "ai-agent-orchestrator",
    "ai-agent-processor", "ai-agent-scheduler", "ai-analyze-entity", "ai-analyze-lead",
    "ai-auto-tags", "ai-automation-explainer", "ai-automation-suggestions", "ai-contextual-automation",
    "ai-copilot", "ai-credit-analysis", "ai-dashboard-insights", "ai-entity-insights",
    "ai-field-suggestions", "ai-followup-draft", "ai-generate-automation", "ai-growth-insights",
    "ai-inbox-actions", "ai-inbox-reply", "ai-kpi-analysis", "ai-member-priorities",
    "ai-memory-embedder", "ai-memory-manager", "ai-onboarding-setup", "ai-opportunity-coach",
    "ai-pricing-optimizer", "ai-product-assistant", "ai-template-copilot", "ai-translate-email"
  ],
  "Email & Comunicação": [
    "email-connect", "email-disconnect", "email-fetch", "email-fetch-zoho",
    "email-send", "email-update", "email-webhook", "marketing-campaign-insights",
    "marketing-send-campaign", "marketing-webhook"
  ],
  "Instagram & Social": [
    "instagram-ai-analyze", "instagram-api-proxy", "instagram-auth-url",
    "instagram-oauth-callback", "instagram-send-message", "instagram-webhook",
    "analyze-linkedin", "analyze-entity-linkedin", "analyze-social-complete",
    "analyze-social-hybrid", "analyze-social-manual", "social-media-analysis"
  ],
  "GoHighLevel (GHL)": [
    "ghl-send-message", "ghl-sync-contacts", "ghl-sync-conversations",
    "ghl-webhook-contact", "ghl-webhook-message"
  ],
  "Pagamentos & Billing": [
    "billing-assistant", "bundle-checkout", "create-checkout", "customer-portal",
    "check-renewals", "check-subscription", "proposal-checkout", "proposal-webhook",
    "stripe-webhook", "subscription-webhook", "test-stripe-connection"
  ],
  "Módulos & Marketplace": [
    "module-check-credits", "module-checkout", "module-consume-credits",
    "module-context-bridge", "module-purchase-credits", "module-sso-generate-token",
    "module-sso-validate-token", "module-subscribe", "module-usage-stats"
  ],
  "Knowledge Base & RAG": [
    "knowledge-document-process", "knowledge-embedding", "knowledge-process",
    "knowledge-query", "knowledge-semantic-search", "rag-index-outcome", "rag-search"
  ],
  "Enriquecimento de Dados": [
    "company-enrich", "company-insights", "contact-enrich", "contact-insights",
    "enrich-company-data", "enrich-instagram-profile", "google-local-search",
    "google-places-enrich", "lookup-company-nif"
  ],
  "Workflows & Automação": [
    "workflow-processor", "workflow-trigger", "trigger-dispatch", "trigger-webhook",
    "flow-engine", "parallel-dispatch"
  ],
  "Geração de Conteúdo": [
    "generate-blueprint", "generate-form-schema", "generate-keyword-ideas",
    "generate-pipeline", "generate-proposal-copy", "generate-proposal-from-prompt",
    "generate-seo-content", "generate-sitemap", "generate-smart-form",
    "generate-template", "landing-page-copy", "refine-blueprint"
  ],
  "Conversação & Chat": [
    "chat-widget", "classify-conversation", "conversation-intelligence",
    "conversation-summary"
  ],
  "Leads & Prospects": [
    "create-demo-lead", "create-public-lead", "professional-prospecting-analyze",
    "professional-prospecting-search"
  ],
  "Utilitários": [
    "figma-extract", "firecrawl-search", "process-form-submission",
    "productivity-coach", "robots-txt", "suggest-labor-estimate",
    "suggest-products-for-entity", "suggest-proposal-products"
  ],
  "São João Copilot": [
    "sj-copilot", "sj-course-recommendations", "sj-daily-automation"
  ]
};

export const AUDIT_MODULES: AuditModule[] = [
  {
    name: "CRM Core",
    objective: "Gestão de leads, contactos, empresas e oportunidades",
    components: ["LeadsList", "ContactsPage", "CompaniesPage", "OpportunitiesPage", "Pipeline"],
    status: "implemented"
  },
  {
    name: "Vendas & Faturação",
    objective: "Propostas, faturas e catálogo de produtos",
    components: ["ProposalsPage", "InvoicesPage", "ProductsPage", "PriceCalculator"],
    status: "implemented"
  },
  {
    name: "Automações",
    objective: "Motor de automação trigger-condition-action",
    components: ["AutomationBuilder", "AutomationRules", "AutomationLogs"],
    status: "implemented"
  },
  {
    name: "IA & Assistentes",
    objective: "Personas de IA, knowledge base e análise inteligente",
    components: ["AIPersonas", "KnowledgeBase", "AIChat", "AIFieldSuggestions"],
    status: "implemented"
  },
  {
    name: "Calendário & Agendamento",
    objective: "Gestão de calendários, eventos e disponibilidade",
    components: ["CalendarPage", "BookingPage", "AvailabilitySettings"],
    status: "implemented"
  },
  {
    name: "Comunicação",
    objective: "Email, WhatsApp, templates e inbox unificado",
    components: ["InboxPage", "EmailComposer", "WhatsAppIntegration", "Templates"],
    status: "implemented"
  },
  {
    name: "Intermediação de Crédito",
    objective: "Propostas de crédito, simulador e parcerias bancárias",
    components: ["CreditProposals", "CreditSimulator", "BankPartners"],
    status: "implemented"
  },
  {
    name: "SEO & Growth",
    objective: "Geração dinâmica de conteúdo SEO",
    components: ["KeywordsPage", "BlogPage", "GlossaryPage", "SitemapGenerator"],
    status: "implemented"
  },
  {
    name: "Marketplace de Módulos",
    objective: "Instalação e gestão de módulos adicionais",
    components: ["MarketplacePage", "ModuleInstaller", "WorkspaceModules"],
    status: "implemented"
  },
  {
    name: "Super Admin",
    objective: "Gestão global SaaS, workspaces e utilizadores",
    components: ["SuperAdmin", "WorkspacesSection", "UsersSection", "PlansSection"],
    status: "implemented"
  }
];
