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

export interface MarketplaceModuleRow {
  slug: string;
  name: string;
  category: string | null;
  status: string | null;
}

export const EDGE_FUNCTION_CATEGORIES: Record<string, string[]> = {
  "IA & Machine Learning": [
    "ai-agent-client", "ai-agent-lifecycle", "ai-agent-opportunity", "ai-agent-orchestrator",
    "ai-agent-processor", "ai-agent-scheduler", "ai-analyze-entity", "ai-analyze-lead",
    "ai-auto-tags", "ai-automation-explainer", "ai-automation-suggestions", "ai-contextual-automation",
    "ai-copilot", "ai-credit-analysis", "ai-dashboard-insights", "ai-diagnostic-assistant",
    "ai-entity-insights", "ai-field-suggestions", "ai-followup-draft", "ai-generate-automation",
    "ai-growth-insights", "ai-inbox-actions", "ai-inbox-reply", "ai-kpi-analysis",
    "ai-member-priorities", "ai-memory-embedder", "ai-memory-manager", "ai-onboarding-setup",
    "ai-opportunity-coach", "ai-pricing-optimizer", "ai-product-assistant", "ai-proposal-assistant",
    "ai-template-copilot", "ai-translate-email", "ai-c2c-listing-assistant", "ai-store-offers"
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
    "stripe-webhook", "subscription-webhook", "test-stripe-connection",
    "create-store-checkout", "create-sponsor-checkout"
  ],
  "Módulos & Marketplace": [
    "module-check-credits", "module-checkout", "module-consume-credits",
    "module-context-bridge", "module-purchase-credits", "module-sso-generate-token",
    "module-sso-validate-token", "module-subscribe", "module-usage-stats"
  ],
  "Knowledge Base & RAG": [
    "knowledge-document-process", "knowledge-document-trigger", "knowledge-embedding", "knowledge-process",
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
    "professional-prospecting-search", "generate-prospecting-message"
  ],
  "Utilitários": [
    "figma-extract", "firecrawl-search", "process-form-submission",
    "productivity-coach", "robots-txt", "suggest-labor-estimate",
    "suggest-products-for-entity", "suggest-proposal-products"
  ],
  "São João Copilot": [
    "sj-copilot", "sj-course-recommendations", "sj-daily-automation"
  ],
  "Loja Online": [
    "store-ai-advisor", "store-webhook", "store-capture-lead",
    "store-cart-abandonment", "store-classify-visitor", "store-visual-search",
    "detect-abandoned-carts"
  ],
  "Notas de Encomenda": [
    "order-note-notify", "order-note-submit"
  ],
  "Portal do Cliente": [
    "create-client-auth-user", "send-client-invitation", "activate-client-invite"
  ],
  "Vídeo & Reuniões": [
    "create-video-meeting", "video-auth-url", "video-oauth-callback"
  ],
  "Admin & Gestão": [
    "admin-module-margin", "admin-user-management"
  ],
  "Produtos & Embeddings": [
    "generate-product-embeddings", "product-embedding", "product-semantic-search",
    "process-product-alerts", "compare-prices", "auto-price-monitor"
  ],
  "Áudio & Voz": [
    "elevenlabs-proposal-token"
  ],
  "Comunidade & FastClub": [
    "community-ai-category", "community-ai-suggest-title",
    "generate-community-banner", "send-community-invite"
  ],
  "Marketplace C2C": [
    "activate-c2c-seller-invite", "c2c-webhook", "create-c2c-boost-checkout",
    "create-c2c-checkout", "send-c2c-seller-email", "send-c2c-seller-invite"
  ],
  "Financeiro": [
    "saft-export", "process-refund"
  ],
  "Envios & Notificações": [
    "calculate-shipping", "send-order-status-notification", "send-tracking-notification"
  ]
};

// Core module enrichment map for known modules
const CORE_MODULE_ENRICHMENT: Record<string, { objective: string; components: string[]; status: AuditModule["status"] }> = {
  "crm-core": {
    objective: "Gestão de leads, contactos, empresas e oportunidades",
    components: ["LeadsList", "ContactsPage", "CompaniesPage", "OpportunitiesPage", "Pipeline"],
    status: "implemented"
  },
  "vendas-faturacao": {
    objective: "Propostas, faturas e catálogo de produtos",
    components: ["ProposalsPage", "InvoicesPage", "ProductsPage", "PriceCalculator"],
    status: "implemented"
  },
  "automacoes": {
    objective: "Motor de automação trigger-condition-action",
    components: ["AutomationBuilder", "AutomationRules", "AutomationLogs"],
    status: "implemented"
  },
  "ia-assistentes": {
    objective: "Personas de IA, knowledge base e análise inteligente",
    components: ["AIPersonas", "KnowledgeBase", "AIChat", "AIFieldSuggestions"],
    status: "implemented"
  },
  "calendario": {
    objective: "Gestão de calendários, eventos e disponibilidade",
    components: ["CalendarPage", "BookingPage", "AvailabilitySettings"],
    status: "implemented"
  },
  "comunicacao": {
    objective: "Email, WhatsApp, templates e inbox unificado",
    components: ["InboxPage", "EmailComposer", "WhatsAppIntegration", "Templates"],
    status: "implemented"
  },
  "credito": {
    objective: "Propostas de crédito, simulador e parcerias bancárias",
    components: ["CreditProposals", "CreditSimulator", "BankPartners"],
    status: "implemented"
  },
  "seo-growth": {
    objective: "Geração dinâmica de conteúdo SEO",
    components: ["KeywordsPage", "BlogPage", "GlossaryPage", "SitemapGenerator"],
    status: "implemented"
  },
  "marketplace": {
    objective: "Instalação e gestão de módulos adicionais",
    components: ["MarketplacePage", "ModuleInstaller", "WorkspaceModules"],
    status: "implemented"
  },
  "super-admin": {
    objective: "Gestão global SaaS, workspaces e utilizadores",
    components: ["SuperAdmin", "WorkspacesSection", "UsersSection", "PlansSection"],
    status: "implemented"
  },
  "loja-online": {
    objective: "Catálogo de produtos, carrinho, checkout e gestão de loja",
    components: ["StorePage", "StoreProductPage", "StoreCheckout", "StoreCart", "StoreCategories"],
    status: "implemented"
  },
  "notas-encomenda": {
    objective: "Gestão de notas de encomenda e auditoria",
    components: ["OrderNotesPage", "OrderNoteDetail", "OrderAuditTrail"],
    status: "implemented"
  },
  "formularios": {
    objective: "Criação e gestão de formulários dinâmicos",
    components: ["SmartForms", "FormBuilder", "FormSubmissions"],
    status: "implemented"
  },
  "produtividade": {
    objective: "Dashboard de produtividade e prioridades diárias",
    components: ["ProductivityDashboard", "DailyPriorities"],
    status: "implemented"
  },
  "pacotes": {
    objective: "Gestão de pacotes de produtos e bundles",
    components: ["PackagesPage", "BundleCheckout"],
    status: "implemented"
  },
  "portal-cliente": {
    objective: "Portal self-service para clientes com autenticação própria",
    components: ["ClientPortal", "ClientUsers", "ClientEntitlements"],
    status: "implemented"
  },
  "relatorios": {
    objective: "Relatórios de performance e objetivos vs resultados",
    components: ["ReportsGoals", "GoalsVsResults"],
    status: "implemented"
  },
  "perfis-actividade": {
    objective: "Perfis configuráveis por tipo de entidade",
    components: ["ActivityProfiles", "EntityProfileData"],
    status: "implemented"
  },
  "video-reunioes": {
    objective: "Criação e gestão de videochamadas",
    components: ["VideoMeetings", "CreateVideoMeeting"],
    status: "implemented"
  },
  "landing-pages": {
    objective: "Páginas públicas de captação e marketing",
    components: ["PublicLandingPage", "LandingPageCopy"],
    status: "implemented"
  },
  "student-journey": {
    objective: "Gestão de alunos, cursos e cohorts",
    components: ["SJDashboard", "SJCourses", "SJCohorts", "SJProfiles"],
    status: "implemented"
  },
  "ai-assistentes-avancados": {
    objective: "Assistentes IA com personas, vibe profiles e fluxos conversacionais",
    components: ["AIAssistants", "AIProfiles", "VibeProfiles", "ConversationalFlows"],
    status: "implemented"
  },
  "fichas-produto": {
    objective: "Fichas de produto com embeddings semânticos",
    components: ["PublicProductSheet", "ProductEmbeddings"],
    status: "implemented"
  },
  "b2b-portal": {
    objective: "Portal B2B para clientes empresariais",
    components: ["B2BPortal", "B2BCatalog", "B2BOrders"],
    status: "implemented"
  },
  "c2c-marketplace": {
    objective: "Marketplace C2C para vendas entre utilizadores",
    components: ["C2CListings", "C2CCheckout", "C2CSellers"],
    status: "implemented"
  },
  "fastclub": {
    objective: "Comunidades e programa de fidelização",
    components: ["Communities", "Channels", "FastClubDashboard"],
    status: "implemented"
  },
  "instagram-looter": {
    objective: "Extracção e análise de dados do Instagram",
    components: ["InstagramLooter", "ProfileAnalysis"],
    status: "implemented"
  },
  "ai-copilot": {
    objective: "Copilot de IA para assistência contextual",
    components: ["AICopilot", "CopilotPanel"],
    status: "implemented"
  },
  "ai-motor-conversacional": {
    objective: "Motor conversacional inteligente com fluxos",
    components: ["ConversationalEngine", "FlowEditor"],
    status: "implemented"
  },
  "ai-knowledge-base": {
    objective: "Base de conhecimento com RAG e semantic search",
    components: ["KnowledgeBase", "DocumentProcessor", "SemanticSearch"],
    status: "implemented"
  },
  "ai-sugestoes": {
    objective: "Sugestões inteligentes de campos e acções",
    components: ["FieldSuggestions", "ActionSuggestions"],
    status: "implemented"
  },
  "ai-ocr": {
    objective: "OCR e processamento inteligente de documentos",
    components: ["DocumentOCR", "InvoiceScanner"],
    status: "implemented"
  },
};

/**
 * Build audit modules dynamically from marketplace data + core enrichment.
 * New modules added to the DB appear automatically without code changes.
 */
export function buildAuditModules(marketplaceModules: MarketplaceModuleRow[]): AuditModule[] {
  // Start with core modules that are always present (not in marketplace)
  const coreModules: AuditModule[] = [
    { name: "CRM Core", ...CORE_MODULE_ENRICHMENT["crm-core"] },
    { name: "Vendas & Faturação", ...CORE_MODULE_ENRICHMENT["vendas-faturacao"] },
    { name: "Automações", ...CORE_MODULE_ENRICHMENT["automacoes"] },
    { name: "Calendário & Agendamento", ...CORE_MODULE_ENRICHMENT["calendario"] },
    { name: "Comunicação", ...CORE_MODULE_ENRICHMENT["comunicacao"] },
    { name: "Intermediação de Crédito", ...CORE_MODULE_ENRICHMENT["credito"] },
    { name: "SEO & Growth", ...CORE_MODULE_ENRICHMENT["seo-growth"] },
    { name: "Marketplace de Módulos", ...CORE_MODULE_ENRICHMENT["marketplace"] },
    { name: "Super Admin", ...CORE_MODULE_ENRICHMENT["super-admin"] },
    { name: "Notas de Encomenda", ...CORE_MODULE_ENRICHMENT["notas-encomenda"] },
    { name: "Formulários Inteligentes", ...CORE_MODULE_ENRICHMENT["formularios"] },
    { name: "Produtividade", ...CORE_MODULE_ENRICHMENT["produtividade"] },
    { name: "Pacotes & Bundles", ...CORE_MODULE_ENRICHMENT["pacotes"] },
    { name: "Portal do Cliente", ...CORE_MODULE_ENRICHMENT["portal-cliente"] },
    { name: "Relatórios & KPIs", ...CORE_MODULE_ENRICHMENT["relatorios"] },
    { name: "Perfis de Actividade", ...CORE_MODULE_ENRICHMENT["perfis-actividade"] },
    { name: "Vídeo & Reuniões", ...CORE_MODULE_ENRICHMENT["video-reunioes"] },
    { name: "Landing Pages", ...CORE_MODULE_ENRICHMENT["landing-pages"] },
    { name: "Student Journey (São João)", ...CORE_MODULE_ENRICHMENT["student-journey"] },
    { name: "Fichas de Produto Públicas", ...CORE_MODULE_ENRICHMENT["fichas-produto"] },
  ];

  // Track slugs already used
  const usedSlugs = new Set(Object.keys(CORE_MODULE_ENRICHMENT));

  // Add marketplace modules — enrich known ones, auto-generate unknown
  marketplaceModules.forEach((mod) => {
    if (usedSlugs.has(mod.slug)) return; // skip duplicates
    usedSlugs.add(mod.slug);

    const enrichment = CORE_MODULE_ENRICHMENT[mod.slug];
    if (enrichment) {
      coreModules.push({
        name: mod.name,
        objective: enrichment.objective,
        components: enrichment.components,
        status: enrichment.status,
      });
    } else {
      // Auto-generate for unknown modules
      coreModules.push({
        name: mod.name,
        objective: `Módulo ${mod.name} — ${mod.category || "funcionalidade adicional"}`,
        components: [],
        status: "implemented",
      });
    }
  });

  return coreModules;
}
