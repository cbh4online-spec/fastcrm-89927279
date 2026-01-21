// Marketplace Types - Business Module Abstraction
// ================================================
// Modules are business capabilities, NOT technical implementations
// The internal type is NEVER shown to customers

// === CORE TYPES ===

export type ModuleCategory = 
  | "prospecting"      // Prospecção
  | "real_estate"      // Imobiliário
  | "customer_service" // Atendimento
  | "sales"            // Vendas
  | "marketing"        // Marketing
  | "finance"          // Financeiro
  | "analytics"        // Análise
  | "communication"    // Comunicação
  | "automation"       // Automação
  | "ai"               // Inteligência Artificial
  | "integrations";    // Integrações

// Internal implementation types (NEVER shown to customer)
export type ModuleInternalType = 
  | "connector"       // External API connection
  | "ai_service"      // AI-powered service
  | "embedded_app"    // Full application (iframe/redirect)
  | "native_feature"; // Built-in FastCRM feature

export type ModulePricingType = 
  | "free"
  | "fixed_monthly"
  | "usage_based"
  | "credits"
  | "custom";

export type ModuleStatus = 
  | "active"
  | "inactive"
  | "pending_approval"
  | "suspended"
  | "deprecated";

export type ModuleAccessMethod = 
  | "embed"                 // iframe inside CRM
  | "redirect_authenticated" // SSO redirect
  | "api_only"              // Backend integration only
  | "native";               // Native CRM feature

// === DATA PERMISSIONS ===

export interface DataPermission {
  entity: "leads" | "contacts" | "companies" | "opportunities" | "products" | "proposals" | "invoices" | "conversations" | "templates" | "automations";
  read: boolean;
  write: boolean;
  delete: boolean;
  fields?: string[]; // Specific fields allowed (null = all)
}

export interface ModulePermissions {
  data_permissions: DataPermission[];
  workspace_isolation: boolean; // Must be true for security
  can_send_emails: boolean;
  can_send_whatsapp: boolean;
  can_create_activities: boolean;
  can_trigger_automations: boolean;
}

// === PRICING & BILLING ===

export interface ModulePricing {
  type: ModulePricingType;
  base_price: number; // Monthly fixed price (if applicable)
  currency: string;
  
  // Usage-based pricing
  usage_unit?: string; // "call", "record", "message", etc.
  price_per_unit?: number;
  included_units?: number;
  
  // Credits system
  credits_included?: number;
  price_per_credit?: number;
  
  // Trial
  trial_days?: number;
  trial_credits?: number;
}

export interface ModuleUsage {
  module_id: string;
  workspace_id: string;
  period_start: string;
  period_end: string;
  
  // Metrics
  total_calls: number;
  total_records_created: number;
  total_records_updated: number;
  credits_used: number;
  credits_remaining: number;
  
  // Impact tracking
  leads_created: number;
  contacts_created: number;
  opportunities_created: number;
  revenue_attributed: number;
}

// === EMBEDDED APP CONFIGURATION ===

export interface EmbeddedAppConfig {
  app_url: string;
  access_method: ModuleAccessMethod;
  
  // SSO Configuration
  sso_enabled: boolean;
  sso_provider?: "jwt" | "oauth2" | "saml";
  
  // Context passed to app
  context_includes: {
    workspace_id: boolean;
    user_id: boolean;
    user_email: boolean;
    user_role: boolean;
    permissions: boolean;
    theme: boolean;
    language: boolean;
  };
  
  // Iframe settings (if embed)
  iframe_settings?: {
    allow_fullscreen: boolean;
    allow_camera: boolean;
    allow_microphone: boolean;
    sandbox_flags: string[];
  };
}

// === MAIN MODULE INTERFACE ===

export interface MarketplaceModule {
  id: string;
  slug: string;
  
  // Display info (shown to customer)
  name: string;
  tagline: string;
  description: string;
  category: ModuleCategory;
  icon: string; // Lucide icon name
  cover_image?: string;
  screenshots?: string[];
  video_url?: string;
  
  // Business value (shown to customer)
  target_audience: string;
  expected_results: string[];
  use_cases: string[];
  
  // Technical (HIDDEN from customer)
  internal_type: ModuleInternalType;
  status: ModuleStatus;
  version: string;
  
  // App configuration (for embedded apps)
  embedded_config?: EmbeddedAppConfig;
  
  // Permissions
  permissions: ModulePermissions;
  
  // Pricing
  pricing: ModulePricing;
  
  // Metadata
  publisher: string; // "FastCRM" or partner name
  is_featured: boolean;
  is_new: boolean;
  rating?: number;
  reviews_count?: number;
  installs_count: number;
  
  // Timestamps
  created_at: string;
  updated_at: string;
  published_at?: string;
}

// === WORKSPACE MODULE (Installed) ===

export interface WorkspaceModule {
  id: string;
  workspace_id: string;
  module_id: string;
  module: MarketplaceModule;
  
  status: "active" | "trial" | "suspended" | "canceled";
  
  // Subscription
  subscribed_at: string;
  trial_ends_at?: string;
  current_period_start: string;
  current_period_end: string;
  cancel_at_period_end: boolean;
  
  // Usage
  usage: ModuleUsage;
  
  // Custom settings per workspace
  settings: Record<string, unknown>;
}

// === CATEGORY DISPLAY INFO ===

export interface CategoryInfo {
  id: ModuleCategory;
  name: string;
  description: string;
  icon: string;
  color: string;
}

export const CATEGORY_INFO: Record<ModuleCategory, CategoryInfo> = {
  prospecting: {
    id: "prospecting",
    name: "Prospecção",
    description: "Encontrar e qualificar novos leads",
    icon: "Search",
    color: "text-blue-500"
  },
  real_estate: {
    id: "real_estate",
    name: "Imobiliário",
    description: "Soluções para o setor imobiliário",
    icon: "Home",
    color: "text-emerald-500"
  },
  customer_service: {
    id: "customer_service",
    name: "Atendimento",
    description: "Suporte e relacionamento com clientes",
    icon: "Headphones",
    color: "text-purple-500"
  },
  sales: {
    id: "sales",
    name: "Vendas",
    description: "Ferramentas para fechar negócios",
    icon: "TrendingUp",
    color: "text-green-500"
  },
  marketing: {
    id: "marketing",
    name: "Marketing",
    description: "Campanhas e geração de leads",
    icon: "Megaphone",
    color: "text-pink-500"
  },
  finance: {
    id: "finance",
    name: "Financeiro",
    description: "Faturação e pagamentos",
    icon: "DollarSign",
    color: "text-yellow-500"
  },
  analytics: {
    id: "analytics",
    name: "Análise",
    description: "Relatórios e insights",
    icon: "BarChart3",
    color: "text-cyan-500"
  },
  communication: {
    id: "communication",
    name: "Comunicação",
    description: "Email, SMS e mensagens",
    icon: "MessageSquare",
    color: "text-indigo-500"
  },
  automation: {
    id: "automation",
    name: "Automação",
    description: "Workflows automatizados",
    icon: "Zap",
    color: "text-orange-500"
  },
  ai: {
    id: "ai",
    name: "Inteligência Artificial",
    description: "IA e machine learning",
    icon: "Brain",
    color: "text-violet-500"
  },
  integrations: {
    id: "integrations",
    name: "Integrações",
    description: "Conectar com outros sistemas",
    icon: "Plug",
    color: "text-slate-500"
  }
};

// === SAMPLE MODULES (for demonstration) ===

export const SAMPLE_MODULES: MarketplaceModule[] = [
  {
    id: "imo-ai",
    slug: "imo-ai",
    name: "IMO AI",
    tagline: "Inteligência artificial para imobiliárias",
    description: "Automatize a qualificação de leads imobiliários, gere descrições de imóveis e responda a clientes 24/7 com IA especializada no setor.",
    category: "real_estate",
    icon: "Home",
    target_audience: "Agências imobiliárias, corretores e promotores",
    expected_results: [
      "80% menos tempo em qualificação de leads",
      "Respostas instantâneas 24/7",
      "Descrições de imóveis em segundos"
    ],
    use_cases: [
      "Qualificar leads automaticamente",
      "Gerar descrições de imóveis",
      "Responder a perguntas frequentes",
      "Agendar visitas automaticamente"
    ],
    internal_type: "embedded_app",
    status: "active",
    version: "2.1.0",
    embedded_config: {
      app_url: "https://imo-ai.fastcrm.app",
      access_method: "embed",
      sso_enabled: true,
      sso_provider: "jwt",
      context_includes: {
        workspace_id: true,
        user_id: true,
        user_email: true,
        user_role: true,
        permissions: true,
        theme: true,
        language: true
      },
      iframe_settings: {
        allow_fullscreen: true,
        allow_camera: false,
        allow_microphone: true,
        sandbox_flags: ["allow-scripts", "allow-same-origin", "allow-forms"]
      }
    },
    permissions: {
      data_permissions: [
        { entity: "leads", read: true, write: true, delete: false },
        { entity: "contacts", read: true, write: true, delete: false },
        { entity: "opportunities", read: true, write: true, delete: false },
        { entity: "products", read: true, write: false, delete: false }
      ],
      workspace_isolation: true,
      can_send_emails: true,
      can_send_whatsapp: true,
      can_create_activities: true,
      can_trigger_automations: true
    },
    pricing: {
      type: "credits",
      base_price: 49,
      currency: "EUR",
      credits_included: 1000,
      price_per_credit: 0.05,
      trial_days: 14,
      trial_credits: 100
    },
    publisher: "FastCRM",
    is_featured: true,
    is_new: false,
    rating: 4.8,
    reviews_count: 127,
    installs_count: 1250,
    created_at: "2024-01-15T00:00:00Z",
    updated_at: "2025-01-10T00:00:00Z",
    published_at: "2024-02-01T00:00:00Z"
  },
  {
    id: "lead-enricher",
    slug: "lead-enricher",
    name: "Lead Enricher Pro",
    tagline: "Enriqueça leads com dados empresariais",
    description: "Obtenha automaticamente informações completas sobre empresas: NIF, CAE, dimensão, contactos e redes sociais a partir de um simples email ou domínio.",
    category: "prospecting",
    icon: "Search",
    target_audience: "Equipas de vendas B2B e marketing",
    expected_results: [
      "Dados completos em segundos",
      "90% de precisão nos dados",
      "+40% conversão com leads qualificados"
    ],
    use_cases: [
      "Enriquecer leads de formulários",
      "Completar dados de empresas",
      "Validar informações de contacto",
      "Identificar decisores"
    ],
    internal_type: "ai_service",
    status: "active",
    version: "1.5.0",
    permissions: {
      data_permissions: [
        { entity: "leads", read: true, write: true, delete: false },
        { entity: "contacts", read: true, write: true, delete: false },
        { entity: "companies", read: true, write: true, delete: false }
      ],
      workspace_isolation: true,
      can_send_emails: false,
      can_send_whatsapp: false,
      can_create_activities: true,
      can_trigger_automations: true
    },
    pricing: {
      type: "usage_based",
      base_price: 29,
      currency: "EUR",
      usage_unit: "enriquecimento",
      price_per_unit: 0.10,
      included_units: 200,
      trial_days: 7,
      trial_credits: 50
    },
    publisher: "FastCRM",
    is_featured: true,
    is_new: true,
    rating: 4.6,
    reviews_count: 89,
    installs_count: 890,
    created_at: "2024-06-01T00:00:00Z",
    updated_at: "2025-01-12T00:00:00Z",
    published_at: "2024-06-15T00:00:00Z"
  },
  {
    id: "whatsapp-business",
    slug: "whatsapp-business",
    name: "WhatsApp Business API",
    tagline: "WhatsApp oficial para empresas",
    description: "Conecte o WhatsApp Business API ao seu CRM. Envie mensagens em massa, automatize respostas e mantenha conversas organizadas.",
    category: "communication",
    icon: "MessageSquare",
    target_audience: "Empresas com alto volume de comunicação",
    expected_results: [
      "Mensagens ilimitadas",
      "Templates aprovados pelo WhatsApp",
      "Histórico completo no CRM"
    ],
    use_cases: [
      "Enviar notificações de pedidos",
      "Follow-ups automáticos",
      "Suporte ao cliente",
      "Campanhas de marketing"
    ],
    internal_type: "connector",
    status: "active",
    version: "3.0.0",
    permissions: {
      data_permissions: [
        { entity: "conversations", read: true, write: true, delete: false },
        { entity: "contacts", read: true, write: true, delete: false },
        { entity: "templates", read: true, write: false, delete: false }
      ],
      workspace_isolation: true,
      can_send_emails: false,
      can_send_whatsapp: true,
      can_create_activities: true,
      can_trigger_automations: true
    },
    pricing: {
      type: "fixed_monthly",
      base_price: 79,
      currency: "EUR",
      trial_days: 14
    },
    publisher: "FastCRM",
    is_featured: false,
    is_new: false,
    rating: 4.9,
    reviews_count: 234,
    installs_count: 2100,
    created_at: "2023-09-01T00:00:00Z",
    updated_at: "2025-01-08T00:00:00Z",
    published_at: "2023-09-15T00:00:00Z"
  },
  {
    id: "ai-sales-coach",
    slug: "ai-sales-coach",
    name: "AI Sales Coach",
    tagline: "O seu coach de vendas pessoal com IA",
    description: "Receba feedback em tempo real sobre suas chamadas de vendas, sugestões de resposta e análise de sentimento do cliente.",
    category: "ai",
    icon: "Brain",
    target_audience: "Equipas de vendas e gestores comerciais",
    expected_results: [
      "+25% taxa de fecho",
      "Feedback instantâneo",
      "Formação contínua da equipa"
    ],
    use_cases: [
      "Análise de chamadas",
      "Sugestões de resposta",
      "Coaching personalizado",
      "Previsão de fecho"
    ],
    internal_type: "ai_service",
    status: "active",
    version: "1.2.0",
    permissions: {
      data_permissions: [
        { entity: "opportunities", read: true, write: true, delete: false },
        { entity: "conversations", read: true, write: false, delete: false }
      ],
      workspace_isolation: true,
      can_send_emails: false,
      can_send_whatsapp: false,
      can_create_activities: true,
      can_trigger_automations: false
    },
    pricing: {
      type: "credits",
      base_price: 99,
      currency: "EUR",
      credits_included: 500,
      price_per_credit: 0.20,
      trial_days: 14,
      trial_credits: 50
    },
    publisher: "FastCRM",
    is_featured: true,
    is_new: true,
    rating: 4.7,
    reviews_count: 45,
    installs_count: 320,
    created_at: "2024-10-01T00:00:00Z",
    updated_at: "2025-01-14T00:00:00Z",
    published_at: "2024-10-15T00:00:00Z"
  },
  {
    id: "email-campaigns",
    slug: "email-campaigns",
    name: "Email Marketing Pro",
    tagline: "Campanhas de email que convertem",
    description: "Crie, envie e analise campanhas de email marketing diretamente do seu CRM. Templates profissionais e automações incluídas.",
    category: "marketing",
    icon: "Mail",
    target_audience: "Equipas de marketing e vendas",
    expected_results: [
      "Campanhas em minutos",
      "Taxas de abertura +30%",
      "Automações ilimitadas"
    ],
    use_cases: [
      "Newsletters",
      "Campanhas promocionais",
      "Sequências de nurturing",
      "Emails transacionais"
    ],
    internal_type: "native_feature",
    status: "active",
    version: "2.0.0",
    permissions: {
      data_permissions: [
        { entity: "contacts", read: true, write: false, delete: false },
        { entity: "leads", read: true, write: false, delete: false },
        { entity: "templates", read: true, write: true, delete: true }
      ],
      workspace_isolation: true,
      can_send_emails: true,
      can_send_whatsapp: false,
      can_create_activities: true,
      can_trigger_automations: true
    },
    pricing: {
      type: "usage_based",
      base_price: 19,
      currency: "EUR",
      usage_unit: "email",
      price_per_unit: 0.001,
      included_units: 5000,
      trial_days: 14
    },
    publisher: "FastCRM",
    is_featured: false,
    is_new: false,
    rating: 4.5,
    reviews_count: 178,
    installs_count: 1560,
    created_at: "2023-06-01T00:00:00Z",
    updated_at: "2025-01-05T00:00:00Z",
    published_at: "2023-06-15T00:00:00Z"
  },
  {
    id: "zapier-integration",
    slug: "zapier-integration",
    name: "Zapier",
    tagline: "Conecte milhares de aplicações",
    description: "Integre o FastCRM com mais de 5000 aplicações através do Zapier. Automatize fluxos de trabalho sem código.",
    category: "integrations",
    icon: "Zap",
    target_audience: "Qualquer utilizador que precise de integrações",
    expected_results: [
      "5000+ integrações disponíveis",
      "Sem necessidade de código",
      "Configuração em minutos"
    ],
    use_cases: [
      "Sincronizar com Google Sheets",
      "Notificações no Slack",
      "Criar tarefas no Asana",
      "Adicionar a listas de email"
    ],
    internal_type: "connector",
    status: "active",
    version: "1.0.0",
    permissions: {
      data_permissions: [
        { entity: "leads", read: true, write: true, delete: false },
        { entity: "contacts", read: true, write: true, delete: false },
        { entity: "companies", read: true, write: true, delete: false },
        { entity: "opportunities", read: true, write: true, delete: false }
      ],
      workspace_isolation: true,
      can_send_emails: false,
      can_send_whatsapp: false,
      can_create_activities: true,
      can_trigger_automations: true
    },
    pricing: {
      type: "free",
      base_price: 0,
      currency: "EUR"
    },
    publisher: "Zapier",
    is_featured: false,
    is_new: false,
    rating: 4.4,
    reviews_count: 312,
    installs_count: 3200,
    created_at: "2023-03-01T00:00:00Z",
    updated_at: "2024-12-20T00:00:00Z",
    published_at: "2023-03-15T00:00:00Z"
  },
  {
    id: "google-local-services",
    slug: "google-local-services",
    name: "Google Local Services",
    tagline: "Prospecção inteligente com dados do Google Places",
    description: "Pesquise e importe dados de empresas locais diretamente do Google. Obtenha automaticamente nome, rating, avaliações, morada, telefone, website, horários, serviços e imagens para enriquecer os seus leads e contactos.",
    category: "prospecting",
    icon: "MapPin",
    cover_image: undefined,
    screenshots: [],
    video_url: undefined,
    target_audience: "Equipas de vendas B2B, agências de marketing local e empresas de serviços",
    expected_results: [
      "Prospecção 10x mais rápida",
      "Dados de contacto verificados pelo Google",
      "Enriquecimento automático de leads",
      "+50% mais leads qualificados por mês"
    ],
    use_cases: [
      "Encontrar empresas por localização e setor",
      "Enriquecer leads com dados do Google",
      "Analisar concorrência local",
      "Importar avaliações e ratings",
      "Descobrir serviços oferecidos"
    ],
    internal_type: "connector",
    status: "active",
    version: "1.0.0",
    embedded_config: undefined,
    permissions: {
      data_permissions: [
        { entity: "leads", read: true, write: true, delete: false },
        { entity: "contacts", read: true, write: true, delete: false },
        { entity: "companies", read: true, write: true, delete: false }
      ],
      workspace_isolation: true,
      can_send_emails: false,
      can_send_whatsapp: false,
      can_create_activities: true,
      can_trigger_automations: true
    },
    pricing: {
      type: "credits",
      base_price: 39,
      currency: "EUR",
      usage_unit: "pesquisa",
      price_per_unit: 0.05,
      credits_included: 500,
      price_per_credit: 0.08,
      trial_days: 7,
      trial_credits: 50
    },
    publisher: "FastCRM",
    is_featured: true,
    is_new: true,
    rating: 4.7,
    reviews_count: 42,
    installs_count: 380,
    created_at: "2025-01-10T00:00:00Z",
    updated_at: "2025-01-16T00:00:00Z",
    published_at: "2025-01-15T00:00:00Z"
  },
  {
    id: "credit-intermediation",
    slug: "credit-intermediation",
    name: "Intermediação de Crédito",
    tagline: "Gestão completa de propostas de crédito",
    description: "Módulo especializado para intermediários de crédito. Gerencie propostas de crédito habitação, pessoal, empresarial e automóvel com análise de viabilidade por IA, simulador integrado e gestão de parcerias bancárias.",
    category: "finance",
    icon: "Landmark",
    target_audience: "Intermediários de crédito, brokers financeiros e consultores",
    expected_results: [
      "Análise de viabilidade automática com IA",
      "Matching inteligente com bancos parceiros",
      "Simulações precisas com sistema francês",
      "Gestão centralizada de propostas"
    ],
    use_cases: [
      "Avaliar viabilidade de propostas de crédito",
      "Simular prestações e TAEG",
      "Comparar condições entre bancos",
      "Acompanhar status de aprovações",
      "Extrair dados de documentos com OCR"
    ],
    internal_type: "native_feature",
    status: "active",
    version: "1.0.0",
    permissions: {
      data_permissions: [
        { entity: "leads", read: true, write: true, delete: false },
        { entity: "contacts", read: true, write: true, delete: false },
        { entity: "companies", read: true, write: true, delete: false },
        { entity: "opportunities", read: true, write: true, delete: false }
      ],
      workspace_isolation: true,
      can_send_emails: true,
      can_send_whatsapp: true,
      can_create_activities: true,
      can_trigger_automations: true
    },
    pricing: {
      type: "fixed_monthly",
      base_price: 149,
      currency: "EUR",
      trial_days: 14
    },
    publisher: "FastCRM",
    is_featured: true,
    is_new: true,
    rating: 4.9,
    reviews_count: 0,
    installs_count: 0,
    created_at: "2025-01-21T00:00:00Z",
    updated_at: "2025-01-21T00:00:00Z",
    published_at: "2025-01-21T00:00:00Z"
  }
];
