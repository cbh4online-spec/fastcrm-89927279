import { SettingsCategory } from "./SettingsNavigation";

export interface SearchableItem {
  id: string;
  category: SettingsCategory;
  sectionTitle: string;
  sectionDescription: string;
  itemTitle?: string;
  itemDescription?: string;
  keywords: string[];
}

export const settingsSearchData: SearchableItem[] = [
  // Workspace & Team
  {
    id: "workspace-info",
    category: "workspace",
    sectionTitle: "Informação do Workspace",
    sectionDescription: "Dados básicos do seu espaço de trabalho",
    itemTitle: "Nome do Workspace",
    itemDescription: "URL do Workspace",
    keywords: ["nome", "url", "slug", "workspace", "espaço"],
  },
  {
    id: "workspace-users",
    category: "workspace",
    sectionTitle: "Utilizadores",
    sectionDescription: "Gerir membros da equipa e convites",
    itemTitle: "Convidar membro",
    itemDescription: "Gerir utilizadores da equipa",
    keywords: ["utilizadores", "membros", "equipa", "convidar", "users", "team"],
  },
  {
    id: "workspace-roles",
    category: "workspace",
    sectionTitle: "Cargos & Permissões",
    sectionDescription: "Configurar o que cada cargo pode fazer",
    keywords: ["cargos", "permissões", "roles", "owner", "admin", "agent", "viewer"],
  },
  {
    id: "workspace-branding",
    category: "workspace",
    sectionTitle: "Marca & Aparência",
    sectionDescription: "Personalizar cores e logótipo",
    itemTitle: "Logótipo",
    itemDescription: "Cores da marca",
    keywords: ["marca", "branding", "logo", "logótipo", "cores", "aparência"],
  },

  // Channels & Sources
  {
    id: "channels-email",
    category: "channels",
    sectionTitle: "Email",
    sectionDescription: "Configurar integração de email para comunicação",
    itemTitle: "Integração SMTP",
    itemDescription: "Templates de Email, Assinaturas",
    keywords: ["email", "smtp", "templates", "assinaturas", "correio"],
  },
  {
    id: "channels-whatsapp-instagram",
    category: "channels",
    sectionTitle: "WhatsApp & Instagram",
    sectionDescription: "Canais de mensagens diretas",
    keywords: ["whatsapp", "instagram", "mensagens", "dm", "diretas", "social"],
  },
  {
    id: "channels-forms",
    category: "channels",
    sectionTitle: "Formulários",
    sectionDescription: "Captura de leads via formulários web",
    itemTitle: "Formulários Incorporados",
    itemDescription: "Landing Pages",
    keywords: ["formulários", "forms", "captura", "landing", "pages", "incorporar"],
  },
  {
    id: "channels-chat",
    category: "channels",
    sectionTitle: "Chat ao Vivo",
    sectionDescription: "Widget de chat para o seu website",
    itemTitle: "Widget de Chat",
    itemDescription: "Respostas Automáticas",
    keywords: ["chat", "widget", "vivo", "live", "automático", "respostas"],
  },
  {
    id: "channels-social",
    category: "channels",
    sectionTitle: "Redes Sociais",
    sectionDescription: "Conectar páginas e perfis sociais",
    itemTitle: "Facebook Pages",
    itemDescription: "LinkedIn",
    keywords: ["facebook", "linkedin", "social", "redes", "páginas"],
  },
  {
    id: "channels-webhooks",
    category: "channels",
    sectionTitle: "Webhooks de Entrada",
    sectionDescription: "Receber leads de fontes externas",
    itemTitle: "URL de Webhook",
    itemDescription: "Mapeamento de Campos",
    keywords: ["webhook", "entrada", "api", "externas", "mapeamento"],
  },

  // CRM & Data
  {
    id: "crm-contacts",
    category: "crm",
    sectionTitle: "Contactos & Oportunidades",
    sectionDescription: "Configurações gerais das entidades do CRM",
    itemTitle: "Campos Obrigatórios",
    itemDescription: "Valores Predefinidos, Estados de Lead",
    keywords: ["contactos", "oportunidades", "obrigatórios", "predefinidos", "estados", "lead"],
  },
  {
    id: "crm-custom-fields",
    category: "crm",
    sectionTitle: "Campos Personalizados",
    sectionDescription: "Criar e gerir campos customizados para cada entidade",
    keywords: ["campos", "personalizados", "custom", "fields", "customizados"],
  },
  {
    id: "crm-pipelines",
    category: "crm",
    sectionTitle: "Pipelines",
    sectionDescription: "Configurar etapas do pipeline de vendas",
    itemTitle: "Pipeline Principal",
    itemDescription: "Pipelines Múltiplos, Probabilidades",
    keywords: ["pipeline", "etapas", "vendas", "funil", "probabilidades"],
  },
  {
    id: "crm-tags",
    category: "crm",
    sectionTitle: "Etiquetas (Tags)",
    sectionDescription: "Organizar registos com etiquetas coloridas",
    itemTitle: "Gerir Etiquetas",
    itemDescription: "Etiquetas Automáticas",
    keywords: ["tags", "etiquetas", "labels", "coloridas", "organizar"],
  },
  {
    id: "crm-deduplication",
    category: "crm",
    sectionTitle: "Deduplicação",
    sectionDescription: "Regras para evitar e fundir registos duplicados",
    itemTitle: "Regras de Duplicação",
    itemDescription: "Fundir Duplicados",
    keywords: ["duplicados", "deduplicação", "fundir", "merge", "duplicação"],
  },
  {
    id: "crm-import-export",
    category: "crm",
    sectionTitle: "Importação & Exportação",
    sectionDescription: "Importar dados de outras ferramentas ou exportar",
    itemTitle: "Importar Dados",
    itemDescription: "Exportar Dados",
    keywords: ["importar", "exportar", "csv", "excel", "dados", "migração"],
  },

  // Templates
  {
    id: "templates-library",
    category: "templates",
    sectionTitle: "Biblioteca de Templates",
    sectionDescription: "Templates de mensagens e propostas reutilizáveis",
    itemTitle: "Criar Template",
    itemDescription: "Email, WhatsApp, Instagram DM, Propostas",
    keywords: ["templates", "mensagens", "propostas", "email", "whatsapp", "instagram", "biblioteca"],
  },
  {
    id: "templates-variables",
    category: "templates",
    sectionTitle: "Variáveis de Template",
    sectionDescription: "Personalização dinâmica com variáveis",
    itemTitle: "Lead, Oportunidade, Empresa",
    itemDescription: "{{lead.first_name}}, {{opportunity.value}}",
    keywords: ["variáveis", "personalização", "dinâmico", "lead", "oportunidade", "merge tags"],
  },
  {
    id: "templates-types",
    category: "templates",
    sectionTitle: "Tipos de Template",
    sectionDescription: "Email, WhatsApp, Instagram DM, Proposta, SMS",
    itemTitle: "Canais de Mensagem",
    itemDescription: "Templates por canal",
    keywords: ["email", "whatsapp", "instagram", "dm", "sms", "proposta", "canal"],
  },
  {
    id: "templates-goals",
    category: "templates",
    sectionTitle: "Objetivos de Template",
    sectionDescription: "Qualificação, Follow-up, Agendamento, Fecho",
    itemTitle: "Categorização por Objetivo",
    itemDescription: "Organizar templates por finalidade",
    keywords: ["objetivo", "qualificação", "follow-up", "agendamento", "fecho", "suporte"],
  },
  {
    id: "templates-versions",
    category: "templates",
    sectionTitle: "Histórico de Versões",
    sectionDescription: "Manter histórico de alterações dos templates",
    itemTitle: "Versões Anteriores",
    itemDescription: "Restaurar Versão",
    keywords: ["versões", "histórico", "alterações", "restaurar", "backup"],
  },

  // Automation & AI
  {
    id: "automation-rules",
    category: "automation",
    sectionTitle: "Regras de Automação",
    sectionDescription: "Criar fluxos de trabalho automáticos",
    itemTitle: "Gerir Automações",
    itemDescription: "Templates de Automação",
    keywords: ["automação", "regras", "fluxos", "workflow", "automático"],
  },
  {
    id: "automation-fields",
    category: "automation",
    sectionTitle: "Automações por Campo",
    sectionDescription: "Ações automáticas quando campos são alterados",
    itemTitle: "Triggers por Campo",
    itemDescription: "Validações Automáticas",
    keywords: ["triggers", "campos", "validações", "automáticas", "alterações"],
  },
  {
    id: "automation-lead-scoring",
    category: "automation",
    sectionTitle: "Lead Scoring",
    sectionDescription: "Pontuar leads automaticamente",
    itemTitle: "Regras de Pontuação",
    itemDescription: "Modelo de ML",
    keywords: ["scoring", "pontuação", "leads", "qualidade", "ml", "machine learning"],
  },
  {
    id: "automation-ai-suggestions",
    category: "automation",
    sectionTitle: "Sugestões de IA",
    sectionDescription: "Configurar como a IA sugere melhorias",
    itemTitle: "Sugestões de Campos",
    itemDescription: "Insights de Negócio",
    keywords: ["ia", "ai", "sugestões", "inteligência", "artificial", "insights"],
  },
  {
    id: "automation-logs",
    category: "automation",
    sectionTitle: "Logs de Automação",
    sectionDescription: "Histórico de execuções de automações",
    itemTitle: "Ver Histórico",
    itemDescription: "Exportar Logs",
    keywords: ["logs", "histórico", "execuções", "erros", "debug"],
  },

  // Experience & Interface
  {
    id: "experience-dashboards",
    category: "experience",
    sectionTitle: "Dashboards",
    sectionDescription: "Configurar painéis de controlo e métricas",
    itemTitle: "Dashboard Principal",
    itemDescription: "KPIs por Entidade, Dashboards Personalizados",
    keywords: ["dashboard", "painéis", "métricas", "kpi", "widgets"],
  },
  {
    id: "experience-role-views",
    category: "experience",
    sectionTitle: "Vistas por Cargo",
    sectionDescription: "Definir o que cada cargo vê por defeito",
    itemTitle: "Vista de Agente",
    itemDescription: "Vista de Administrador, Vista de Visualizador",
    keywords: ["vistas", "cargo", "agente", "admin", "visualizador", "permissões"],
  },
  {
    id: "experience-layout",
    category: "experience",
    sectionTitle: "Personalização de Layout",
    sectionDescription: "Configurar listas, boards e barras laterais",
    itemTitle: "Colunas de Tabela",
    itemDescription: "Módulos da Sidebar",
    keywords: ["layout", "tabela", "colunas", "sidebar", "boards", "kanban"],
  },
  {
    id: "experience-homepage",
    category: "experience",
    sectionTitle: "Página Inicial",
    sectionDescription: "Configurar o que os utilizadores veem ao entrar",
    itemTitle: "Página Inicial Padrão",
    itemDescription: "Widgets Rápidos",
    keywords: ["homepage", "página", "inicial", "login", "padrão"],
  },
  {
    id: "experience-templates",
    category: "experience",
    sectionTitle: "Templates de Vista",
    sectionDescription: "Guardar e partilhar configurações de vista",
    itemTitle: "Vistas Guardadas",
    itemDescription: "Templates do Workspace",
    keywords: ["templates", "vistas", "guardar", "partilhar", "configurações"],
  },

  // Security & Compliance
  {
    id: "security-permissions",
    category: "security",
    sectionTitle: "Permissões Avançadas",
    sectionDescription: "Controle granular sobre acessos",
    itemTitle: "Permissões por Objeto",
    itemDescription: "Permissões por Campo, Restrições por IP",
    keywords: ["permissões", "granular", "acesso", "ip", "campo", "objeto"],
  },
  {
    id: "security-audit",
    category: "security",
    sectionTitle: "Logs de Auditoria",
    sectionDescription: "Histórico de todas as ações no sistema",
    itemTitle: "Ver Logs",
    itemDescription: "Exportar Auditoria, Retenção de Logs",
    keywords: ["auditoria", "audit", "logs", "histórico", "ações", "retenção"],
  },
  {
    id: "security-access",
    category: "security",
    sectionTitle: "Gestão de Acessos",
    sectionDescription: "Sessões ativas e autenticação",
    itemTitle: "Sessões Ativas",
    itemDescription: "2FA, Políticas de Password",
    keywords: ["sessões", "2fa", "password", "autenticação", "segurança"],
  },
  {
    id: "security-sso",
    category: "security",
    sectionTitle: "Single Sign-On (SSO)",
    sectionDescription: "Autenticação empresarial centralizada",
    itemTitle: "SAML 2.0",
    itemDescription: "OAuth / OpenID, Domínios Verificados",
    keywords: ["sso", "saml", "oauth", "openid", "domínios", "enterprise"],
  },
  {
    id: "security-data-protection",
    category: "security",
    sectionTitle: "Proteção de Dados",
    sectionDescription: "RGPD e compliance",
    itemTitle: "Consentimentos",
    itemDescription: "Direito ao Esquecimento, Exportar Dados Pessoais",
    keywords: ["rgpd", "gdpr", "proteção", "dados", "consentimento", "compliance"],
  },

  // Integrations & API
  {
    id: "integrations-stripe",
    category: "integrations",
    sectionTitle: "Stripe",
    sectionDescription: "Pagamentos, faturas e subscrições",
    itemTitle: "Webhook Settings",
    itemDescription: "Produtos & Preços",
    keywords: ["stripe", "pagamentos", "faturas", "subscrições", "checkout"],
  },
  {
    id: "integrations-video",
    category: "integrations",
    sectionTitle: "Videoconferência",
    sectionDescription: "Criar reuniões Zoom e Google Meet automaticamente",
    itemTitle: "Zoom & Google Meet",
    itemDescription: "Configurar credenciais por workspace",
    keywords: ["zoom", "google meet", "video", "videoconferência", "reunião", "meeting", "conferência"],
  },
  {
    id: "integrations-api",
    category: "integrations",
    sectionTitle: "API & Webhooks",
    sectionDescription: "Acesso programático ao seu CRM",
    itemTitle: "Chaves de API",
    itemDescription: "Documentação, Webhooks de Saída",
    keywords: ["api", "webhooks", "chaves", "rest", "programático", "developer"],
  },
  {
    id: "integrations-external",
    category: "integrations",
    sectionTitle: "Integrações Externas",
    sectionDescription: "Conectar com outras ferramentas",
    itemTitle: "Zapier",
    itemDescription: "Make (Integromat)",
    keywords: ["zapier", "make", "integromat", "integrações", "conectar", "apps"],
  },
  {
    id: "integrations-variables",
    category: "integrations",
    sectionTitle: "Variáveis & Segredos",
    sectionDescription: "Variáveis de ambiente e configurações",
    itemTitle: "Variáveis de Ambiente",
    itemDescription: "Segredos",
    keywords: ["variáveis", "ambiente", "segredos", "secrets", "tokens", "chaves"],
  },
];

export function searchSettings(query: string): {
  matchedItems: SearchableItem[];
  matchedCategories: Set<SettingsCategory>;
  matchedSections: Set<string>;
} {
  const normalizedQuery = query.toLowerCase().trim();
  
  if (!normalizedQuery) {
    return {
      matchedItems: settingsSearchData,
      matchedCategories: new Set(["workspace", "channels", "crm", "templates", "automation", "experience", "security", "integrations"]),
      matchedSections: new Set(settingsSearchData.map(item => item.id)),
    };
  }

  const matchedItems = settingsSearchData.filter(item => {
    const searchableText = [
      item.sectionTitle,
      item.sectionDescription,
      item.itemTitle || "",
      item.itemDescription || "",
      ...item.keywords,
    ].join(" ").toLowerCase();

    return searchableText.includes(normalizedQuery);
  });

  const matchedCategories = new Set<SettingsCategory>(
    matchedItems.map(item => item.category)
  );

  const matchedSections = new Set<string>(
    matchedItems.map(item => item.id)
  );

  return { matchedItems, matchedCategories, matchedSections };
}
