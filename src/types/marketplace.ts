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
  | "integrations"     // Integrações
  | "education";       // Educação

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
  },
  education: {
    id: "education",
    name: "Educação",
    description: "Gestão educacional e jornada do aluno",
    icon: "GraduationCap",
    color: "text-teal-500"
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
    id: "prospecting-pro",
    slug: "prospecting-pro",
    name: "Prospecção Profissional",
    tagline: "Descobrir e qualificar profissionais",
    description: "Descubra profissionais (médicos, dentistas, advogados) através de redes sociais e qualifique-os automaticamente com análise de perfil Instagram. Lead score inteligente baseado em engajamento e presença digital.",
    category: "prospecting",
    icon: "UserPlus",
    target_audience: "Equipas B2B que vendem a profissionais liberais",
    expected_results: [
      "+500 leads qualificados/mês",
      "Análise automática de perfis Instagram",
      "Lead score inteligente",
      "Conversão direta para CRM"
    ],
    use_cases: [
      "Encontrar médicos/dentistas",
      "Analisar perfis Instagram",
      "Qualificar leads automaticamente",
      "Converter para CRM"
    ],
    internal_type: "ai_service",
    status: "active",
    version: "1.0.0",
    permissions: {
      data_permissions: [
        { entity: "leads", read: true, write: true, delete: false }
      ],
      workspace_isolation: true,
      can_send_emails: false,
      can_send_whatsapp: false,
      can_create_activities: true,
      can_trigger_automations: true
    },
    pricing: {
      type: "credits",
      base_price: 79,
      currency: "EUR",
      credits_included: 500,
      price_per_credit: 0.15,
      trial_days: 7,
      trial_credits: 50
    },
    publisher: "FastCRM",
    is_featured: true,
    is_new: true,
    rating: undefined,
    reviews_count: 0,
    installs_count: 0,
    created_at: "2025-01-21T00:00:00Z",
    updated_at: "2025-01-21T00:00:00Z",
    published_at: "2025-01-21T00:00:00Z"
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
  },
  {
    id: "student-journey",
    slug: "student-journey",
    name: "Student Journey",
    tagline: "Gestão completa do ciclo de vida do aluno",
    description: "Módulo vertical para instituições de ensino. Acompanhe leads educacionais desde o primeiro contacto até à conclusão do curso, com gestão de inscrições, turmas, pagamentos e comunicação automatizada.",
    category: "education",
    icon: "GraduationCap",
    cover_image: "/modules/student-journey-cover.png",
    target_audience: "Escolas, centros de formação, universidades e academias",
    expected_results: [
      "Visão 360º do aluno em tempo real",
      "Redução de 50% no churn de alunos",
      "Automação do funil de captação",
      "Diagnóstico de risco com IA"
    ],
    use_cases: [
      "Gerir candidaturas e inscrições",
      "Acompanhar progresso e assiduidade",
      "Identificar alunos em risco de abandono",
      "Automatizar comunicações por etapa",
      "Converter leads em alunos matriculados"
    ],
    internal_type: "native_feature",
    status: "active",
    version: "1.0.0",
    permissions: {
      data_permissions: [
        { entity: "leads", read: true, write: true, delete: false },
        { entity: "contacts", read: true, write: true, delete: false },
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
      base_price: 99,
      currency: "EUR",
      trial_days: 14
    },
    publisher: "FastCRM",
    is_featured: true,
    is_new: true,
    rating: 4.8,
    reviews_count: 0,
    installs_count: 0,
    created_at: "2025-01-24T00:00:00Z",
    updated_at: "2025-01-24T00:00:00Z",
    published_at: "2025-01-24T00:00:00Z"
  },
  {
    id: "online-store",
    slug: "online-store",
    name: "Loja Online",
    tagline: "A sua loja online integrada no CRM",
    description: "Venda produtos e serviços com loja pública, carrinho de compras, checkout Stripe e gestão de encomendas — tudo sem sair do CRM.",
    category: "sales",
    icon: "ShoppingBag",
    target_audience: "PMEs, freelancers e negócios com produtos/serviços online",
    expected_results: [
      "Loja operacional em minutos",
      "Checkout seguro com Stripe",
      "Gestão centralizada de encomendas no CRM"
    ],
    use_cases: [
      "Vender produtos físicos ou digitais",
      "Criar catálogo público com preços",
      "Processar pagamentos online",
      "Gerir encomendas e envios"
    ],
    internal_type: "native_feature",
    status: "active",
    version: "1.0.0",
    permissions: {
      data_permissions: [
        { entity: "products", read: true, write: true, delete: true },
        { entity: "contacts", read: true, write: true, delete: false },
        { entity: "invoices", read: true, write: true, delete: false }
      ],
      workspace_isolation: true,
      can_send_emails: true,
      can_send_whatsapp: false,
      can_create_activities: true,
      can_trigger_automations: true
    },
    pricing: {
      type: "fixed_monthly",
      base_price: 49,
      currency: "EUR",
      trial_days: 14
    },
    publisher: "FastCRM",
    is_featured: true,
    is_new: true,
    rating: 4.7,
    reviews_count: 0,
    installs_count: 0,
    created_at: "2025-02-01T00:00:00Z",
    updated_at: "2025-02-01T00:00:00Z",
    published_at: "2025-02-01T00:00:00Z"
  },
  {
    id: "marketplace-c2c",
    slug: "marketplace-c2c",
    name: "Marketplace C2C",
    tagline: "Marketplace entre membros da sua comunidade",
    description: "Permita que os membros comprem e vendam entre si. Anúncios com moderação automática, chat direto, comissões configuráveis e sistema de reputação integrado.",
    category: "sales",
    icon: "Store",
    target_audience: "Comunidades, associações e redes de membros",
    expected_results: [
      "Marketplace operacional em minutos",
      "Comissões automáticas por transação",
      "Sistema de reputação para confiança"
    ],
    use_cases: [
      "Criar marketplace entre membros",
      "Moderar anúncios automaticamente",
      "Cobrar comissões por venda",
      "Chat direto entre comprador e vendedor"
    ],
    internal_type: "native_feature",
    status: "active",
    version: "1.0.0",
    permissions: {
      data_permissions: [
        { entity: "products", read: true, write: true, delete: true },
        { entity: "contacts", read: true, write: true, delete: false },
        { entity: "conversations", read: true, write: true, delete: false }
      ],
      workspace_isolation: true,
      can_send_emails: true,
      can_send_whatsapp: false,
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
    is_featured: true,
    is_new: true,
    rating: 4.6,
    reviews_count: 0,
    installs_count: 0,
    created_at: "2025-02-01T00:00:00Z",
    updated_at: "2025-02-01T00:00:00Z",
    published_at: "2025-02-01T00:00:00Z"
  },
  {
    id: "fastclub",
    slug: "fastclub",
    name: "FastClub (Comunidade)",
    tagline: "Comunidade privada para os seus clientes",
    description: "Crie uma comunidade exclusiva com fórum de discussão, eventos, canais temáticos e gate de acesso com aprovação. Ideal para fidelização e networking.",
    category: "communication",
    icon: "Users",
    target_audience: "Marcas, coaches, formadores e negócios com base de clientes fiéis",
    expected_results: [
      "Comunidade privada operacional em minutos",
      "Engagement e retenção de clientes",
      "Networking entre membros com moderação"
    ],
    use_cases: [
      "Criar comunidade exclusiva para clientes",
      "Organizar eventos e meetups",
      "Fórum de discussão com canais temáticos",
      "Gate de acesso com aprovação manual"
    ],
    internal_type: "native_feature",
    status: "active",
    version: "1.0.0",
    permissions: {
      data_permissions: [
        { entity: "contacts", read: true, write: true, delete: false },
        { entity: "conversations", read: true, write: true, delete: false }
      ],
      workspace_isolation: true,
      can_send_emails: true,
      can_send_whatsapp: false,
      can_create_activities: true,
      can_trigger_automations: false
    },
    pricing: {
      type: "fixed_monthly",
      base_price: 59,
      currency: "EUR",
      trial_days: 14
    },
    publisher: "FastCRM",
    is_featured: true,
    is_new: true,
    rating: 4.8,
    reviews_count: 0,
    installs_count: 0,
    created_at: "2025-02-01T00:00:00Z",
    updated_at: "2025-02-01T00:00:00Z",
    published_at: "2025-02-01T00:00:00Z"
  },
  {
    id: "b2b-portal",
    slug: "b2b-portal",
    name: "Portal B2B",
    tagline: "Portal de vendas para clientes empresariais",
    description: "Crie um portal self-service para os seus clientes B2B. Catálogo de produtos, encomendas recorrentes, preços personalizados e gestão de contas empresariais.",
    category: "sales",
    icon: "Building2",
    target_audience: "Empresas B2B, distribuidores e grossistas",
    expected_results: [
      "Portal operacional em minutos",
      "Encomendas self-service 24/7",
      "Preços personalizados por cliente"
    ],
    use_cases: [
      "Portal de encomendas para clientes",
      "Catálogo B2B com preços diferenciados",
      "Gestão de contas empresariais",
      "Histórico de encomendas e faturas"
    ],
    internal_type: "native_feature",
    status: "active",
    version: "1.0.0",
    permissions: {
      data_permissions: [
        { entity: "products", read: true, write: true, delete: false },
        { entity: "contacts", read: true, write: true, delete: false },
        { entity: "companies", read: true, write: true, delete: false },
        { entity: "invoices", read: true, write: true, delete: false }
      ],
      workspace_isolation: true,
      can_send_emails: true,
      can_send_whatsapp: false,
      can_create_activities: true,
      can_trigger_automations: true
    },
    pricing: {
      type: "fixed_monthly",
      base_price: 89,
      currency: "EUR",
      trial_days: 14
    },
    publisher: "FastCRM",
    is_featured: true,
    is_new: true,
    rating: 4.7,
    reviews_count: 0,
    installs_count: 0,
    created_at: "2025-02-01T00:00:00Z",
    updated_at: "2025-02-01T00:00:00Z",
    published_at: "2025-02-01T00:00:00Z"
  },
  {
    id: "instagram-looter",
    slug: "instagram-looter",
    name: "Instagram Looter",
    tagline: "Extraia leads qualificados do Instagram",
    description: "Pesquise perfis Instagram por hashtag, localização ou concorrentes. Extraia seguidores, emails e dados de contacto para converter em leads no CRM.",
    category: "prospecting",
    icon: "Instagram",
    target_audience: "Equipas de marketing e vendas que prospectam via redes sociais",
    expected_results: [
      "+1000 leads/mês via Instagram",
      "Extração automática de contactos",
      "Conversão direta para CRM"
    ],
    use_cases: [
      "Extrair seguidores de concorrentes",
      "Pesquisar por hashtags relevantes",
      "Obter emails de perfis públicos",
      "Converter perfis em leads qualificados"
    ],
    internal_type: "ai_service",
    status: "active",
    version: "1.0.0",
    permissions: {
      data_permissions: [
        { entity: "leads", read: true, write: true, delete: false },
        { entity: "contacts", read: true, write: true, delete: false }
      ],
      workspace_isolation: true,
      can_send_emails: false,
      can_send_whatsapp: false,
      can_create_activities: true,
      can_trigger_automations: true
    },
    pricing: {
      type: "credits",
      base_price: 59,
      currency: "EUR",
      credits_included: 500,
      price_per_credit: 0.12,
      trial_days: 7,
      trial_credits: 50
    },
    publisher: "FastCRM",
    is_featured: true,
    is_new: true,
    rating: undefined,
    reviews_count: 0,
    installs_count: 0,
    created_at: "2025-02-01T00:00:00Z",
    updated_at: "2025-02-01T00:00:00Z",
    published_at: "2025-02-01T00:00:00Z"
  },
  // ============================
  // AI MODULES
  // ============================
  {
    id: "ai-copilot",
    slug: "ai-copilot",
    name: "AI Copilot",
    tagline: "Classificação de intenções, sugestões e resumos com IA",
    description: "O seu co-piloto inteligente dentro do CRM. Classifica intenções de mensagens, sugere respostas contextuais, resume conversas longas e recomenda próximas ações — tudo em tempo real.",
    category: "ai",
    icon: "Sparkles",
    target_audience: "Equipas de vendas e suporte que lidam com alto volume de conversas",
    expected_results: [
      "Respostas 3x mais rápidas",
      "Resumos automáticos de conversas",
      "Sugestões contextuais em tempo real",
      "Classificação automática de intenções"
    ],
    use_cases: [
      "Sugerir respostas durante conversas",
      "Resumir conversas longas num clique",
      "Classificar intenções de mensagens",
      "Recomendar próximas ações"
    ],
    internal_type: "ai_service",
    status: "active",
    version: "1.0.0",
    permissions: {
      data_permissions: [
        { entity: "conversations", read: true, write: false, delete: false },
        { entity: "leads", read: true, write: false, delete: false },
        { entity: "contacts", read: true, write: false, delete: false }
      ],
      workspace_isolation: true,
      can_send_emails: false,
      can_send_whatsapp: false,
      can_create_activities: true,
      can_trigger_automations: false
    },
    pricing: {
      type: "fixed_monthly",
      base_price: 59,
      currency: "EUR",
      trial_days: 14
    },
    publisher: "FastCRM",
    is_featured: false,
    is_new: true,
    rating: 4.8,
    reviews_count: 0,
    installs_count: 0,
    created_at: "2025-02-10T00:00:00Z",
    updated_at: "2025-02-10T00:00:00Z",
    published_at: "2025-02-10T00:00:00Z"
  },
  {
    id: "ai-assistants",
    slug: "ai-assistants",
    name: "AI Assistants",
    tagline: "Agentes IA multi-canal com personas e knowledge base",
    description: "Crie agentes IA dedicados por canal (WhatsApp, Widget, Instagram, Email). Cada agente tem a sua persona, base de conhecimento e regras — funciona 24/7 em autopilot.",
    category: "ai",
    icon: "Bot",
    target_audience: "Empresas com atendimento multi-canal que querem automação inteligente",
    expected_results: [
      "Atendimento 24/7 automatizado",
      "Redução de 60% no tempo de resposta",
      "Agentes especializados por canal",
      "Handoff inteligente para humanos"
    ],
    use_cases: [
      "Agente WhatsApp para suporte",
      "Widget de chat no site com IA",
      "Respostas automáticas no Instagram",
      "Atendimento por email com IA"
    ],
    internal_type: "native_feature",
    status: "active",
    version: "1.0.0",
    permissions: {
      data_permissions: [
        { entity: "conversations", read: true, write: true, delete: false },
        { entity: "contacts", read: true, write: true, delete: false },
        { entity: "leads", read: true, write: true, delete: false }
      ],
      workspace_isolation: true,
      can_send_emails: true,
      can_send_whatsapp: true,
      can_create_activities: true,
      can_trigger_automations: true
    },
    pricing: {
      type: "fixed_monthly",
      base_price: 99,
      currency: "EUR",
      trial_days: 14
    },
    publisher: "FastCRM",
    is_featured: true,
    is_new: true,
    rating: 4.9,
    reviews_count: 0,
    installs_count: 0,
    created_at: "2025-02-10T00:00:00Z",
    updated_at: "2025-02-10T00:00:00Z",
    published_at: "2025-02-10T00:00:00Z"
  },
  {
    id: "conversational-engine",
    slug: "conversational-engine",
    name: "Conversational Engine",
    tagline: "Motor conversacional com perfis Vibe e autopilot",
    description: "O cérebro conversacional da sua IA. Configure perfis Vibe (tom, formalidade, estilo), defina regras de conversa (DO/DON'T/STOP/REDIRECT), objetivos e modo autopilot completo.",
    category: "ai",
    icon: "MessageSquareText",
    target_audience: "Equipas que querem controlo total sobre o comportamento da IA nas conversas",
    expected_results: [
      "Controlo total do tom e estilo da IA",
      "Regras de conversa configuráveis",
      "Autopilot inteligente com limites",
      "Consistência na comunicação"
    ],
    use_cases: [
      "Configurar tom formal/informal por canal",
      "Definir regras DO/DON'T para a IA",
      "Ativar autopilot com horários",
      "Criar objetivos de conversa"
    ],
    internal_type: "native_feature",
    status: "active",
    version: "1.0.0",
    permissions: {
      data_permissions: [
        { entity: "conversations", read: true, write: true, delete: false }
      ],
      workspace_isolation: true,
      can_send_emails: false,
      can_send_whatsapp: false,
      can_create_activities: false,
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
    is_new: true,
    rating: 4.7,
    reviews_count: 0,
    installs_count: 0,
    created_at: "2025-02-10T00:00:00Z",
    updated_at: "2025-02-10T00:00:00Z",
    published_at: "2025-02-10T00:00:00Z"
  },
  {
    id: "ai-profiles",
    slug: "ai-profiles",
    name: "AI Profiles",
    tagline: "Personas IA com tom de voz e comportamento configurável",
    description: "Crie personas IA personalizadas com tom de voz, estilo de linguagem, profundidade técnica e comportamento. Cada persona pode ser associada a agentes e canais diferentes.",
    category: "ai",
    icon: "UserCircle",
    target_audience: "Empresas que querem IA com personalidade consistente e diferenciada",
    expected_results: [
      "Personas IA únicas por contexto",
      "Tom de voz consistente",
      "Comportamento configurável",
      "Múltiplas personas por workspace"
    ],
    use_cases: [
      "Criar persona de suporte empático",
      "Persona comercial directa",
      "Persona técnica consultiva",
      "Personalizar por idioma e canal"
    ],
    internal_type: "native_feature",
    status: "active",
    version: "1.0.0",
    permissions: {
      data_permissions: [
        { entity: "conversations", read: true, write: false, delete: false }
      ],
      workspace_isolation: true,
      can_send_emails: false,
      can_send_whatsapp: false,
      can_create_activities: false,
      can_trigger_automations: false
    },
    pricing: {
      type: "fixed_monthly",
      base_price: 39,
      currency: "EUR",
      trial_days: 14
    },
    publisher: "FastCRM",
    is_featured: false,
    is_new: true,
    rating: 4.6,
    reviews_count: 0,
    installs_count: 0,
    created_at: "2025-02-10T00:00:00Z",
    updated_at: "2025-02-10T00:00:00Z",
    published_at: "2025-02-10T00:00:00Z"
  },
  {
    id: "knowledge-base",
    slug: "knowledge-base",
    name: "Knowledge Base AI",
    tagline: "Base de conhecimento inteligente para alimentar a IA",
    description: "Carregue documentos, FAQs e conteúdos para criar uma base de conhecimento que alimenta os seus agentes IA. Suporta PDF, texto, URLs e categorização automática.",
    category: "ai",
    icon: "BookOpen",
    target_audience: "Empresas que querem IA informada com conhecimento específico do negócio",
    expected_results: [
      "IA com conhecimento do seu negócio",
      "Respostas precisas baseadas em docs",
      "Categorização automática de conteúdo",
      "Redução de respostas incorretas"
    ],
    use_cases: [
      "Carregar manuais e FAQs",
      "Alimentar agentes com docs internos",
      "Criar base de produto/serviço",
      "Treinar IA com conteúdo específico"
    ],
    internal_type: "native_feature",
    status: "active",
    version: "1.0.0",
    permissions: {
      data_permissions: [
        { entity: "conversations", read: true, write: false, delete: false }
      ],
      workspace_isolation: true,
      can_send_emails: false,
      can_send_whatsapp: false,
      can_create_activities: false,
      can_trigger_automations: false
    },
    pricing: {
      type: "fixed_monthly",
      base_price: 49,
      currency: "EUR",
      trial_days: 14
    },
    publisher: "FastCRM",
    is_featured: false,
    is_new: true,
    rating: 4.7,
    reviews_count: 0,
    installs_count: 0,
    created_at: "2025-02-10T00:00:00Z",
    updated_at: "2025-02-10T00:00:00Z",
    published_at: "2025-02-10T00:00:00Z"
  },
  {
    id: "ai-suggestions",
    slug: "ai-suggestions",
    name: "AI Suggestions",
    tagline: "Sugestões inteligentes em tempo real no CRM",
    description: "Receba sugestões automáticas para campos, ações e decisões em todo o CRM. A IA analisa o contexto e propõe preenchimentos, classificações e próximos passos.",
    category: "ai",
    icon: "Lightbulb",
    target_audience: "Utilizadores de CRM que querem produtividade máxima com assistência IA",
    expected_results: [
      "Preenchimento inteligente de campos",
      "Sugestões de ações contextuais",
      "Classificação automática de dados",
      "+30% produtividade no CRM"
    ],
    use_cases: [
      "Auto-preencher campos de leads",
      "Sugerir próximas ações em deals",
      "Classificar leads por potencial",
      "Recomendar templates de email"
    ],
    internal_type: "ai_service",
    status: "active",
    version: "1.0.0",
    permissions: {
      data_permissions: [
        { entity: "leads", read: true, write: true, delete: false },
        { entity: "contacts", read: true, write: true, delete: false },
        { entity: "opportunities", read: true, write: true, delete: false }
      ],
      workspace_isolation: true,
      can_send_emails: false,
      can_send_whatsapp: false,
      can_create_activities: true,
      can_trigger_automations: false
    },
    pricing: {
      type: "fixed_monthly",
      base_price: 29,
      currency: "EUR",
      trial_days: 14
    },
    publisher: "FastCRM",
    is_featured: false,
    is_new: true,
    rating: 4.5,
    reviews_count: 0,
    installs_count: 0,
    created_at: "2025-02-10T00:00:00Z",
    updated_at: "2025-02-10T00:00:00Z",
    published_at: "2025-02-10T00:00:00Z"
  },
  {
    id: "ai-document-ocr",
    slug: "ai-document-ocr",
    name: "AI Document OCR",
    tagline: "Extração automática de dados de documentos com IA",
    description: "Extraia automaticamente dados de faturas, contratos, cartões de visita e documentos de identificação. A IA reconhece campos, valida informações e preenche o CRM.",
    category: "ai",
    icon: "ScanText",
    target_audience: "Empresas que processam documentos físicos ou digitalizados",
    expected_results: [
      "Extração automática de dados",
      "95% de precisão no OCR",
      "Processamento em segundos",
      "Redução de entrada manual de dados"
    ],
    use_cases: [
      "Digitalizar faturas e extrair dados",
      "Ler cartões de visita para leads",
      "Extrair dados de contratos",
      "Processar documentos de identificação"
    ],
    internal_type: "ai_service",
    status: "active",
    version: "1.0.0",
    permissions: {
      data_permissions: [
        { entity: "leads", read: true, write: true, delete: false },
        { entity: "contacts", read: true, write: true, delete: false },
        { entity: "invoices", read: true, write: true, delete: false }
      ],
      workspace_isolation: true,
      can_send_emails: false,
      can_send_whatsapp: false,
      can_create_activities: true,
      can_trigger_automations: true
    },
    pricing: {
      type: "fixed_monthly",
      base_price: 69,
      currency: "EUR",
      trial_days: 14
    },
    publisher: "FastCRM",
    is_featured: false,
    is_new: true,
    rating: 4.6,
    reviews_count: 0,
    installs_count: 0,
    created_at: "2025-02-10T00:00:00Z",
    updated_at: "2025-02-10T00:00:00Z",
    published_at: "2025-02-10T00:00:00Z"
  },
  {
    id: "bio-os",
    slug: "bio-os",
    name: "Bio OS",
    tagline: "Páginas Bio e micro-sites premium com tracking e IA",
    description: "Crie páginas bio modernas e micro-sites rápidos com blocos drag-and-drop, tracking automático, QR codes rastreáveis, checkout integrado e IA estratégica. Tudo multi-tenant e integrado com o CRM.",
    category: "marketing",
    icon: "Link2",
    target_audience: "Empreendedores, freelancers e equipas de marketing",
    expected_results: [
      "Página bio profissional em 5 minutos",
      "Tracking completo de cliques e conversões",
      "QR codes dinâmicos rastreáveis",
      "Captação de leads integrada com CRM"
    ],
    use_cases: [
      "Criar página link-in-bio para redes sociais",
      "Landing pages rápidas para campanhas",
      "Micro-sites com formulários e checkout",
      "QR codes para materiais impressos"
    ],
    internal_type: "native_feature",
    status: "active",
    version: "1.0.0",
    permissions: {
      data_permissions: [
        { entity: "contacts", read: true, write: true, delete: false },
        { entity: "leads", read: true, write: true, delete: false },
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
      currency: "EUR",
      trial_days: 14
    },
    publisher: "FastCRM",
    is_featured: true,
    is_new: true,
    rating: 4.7,
    reviews_count: 0,
    installs_count: 0,
    created_at: "2026-02-16T00:00:00Z",
    updated_at: "2026-02-16T00:00:00Z",
    published_at: "2026-02-16T00:00:00Z"
  }
];
