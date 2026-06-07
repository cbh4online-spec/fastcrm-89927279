export type ProductLayer =
  | "core_product"
  | "entry_offer"
  | "core_module"
  | "optional_module"
  | "vertical_module"
  | "internal_capability"
  | "future_module";

export type CommercialVisibility =
  | "primary_offer"
  | "secondary_offer"
  | "addon"
  | "hidden"
  | "internal_only";

export type ProductStatus = "active" | "planned" | "review" | "future" | "deprecated";

export interface ProductArchitectureNode {
  id: string;
  name: string;
  layer: ProductLayer;
  visibility: CommercialVisibility;
  status: ProductStatus;
  purpose: string;
  commercialMessage: string;
  targetAudience?: string[];
  dependsOn?: string[];
  publicRoute?: string;
  notes?: string;
}

/**
 * FastCRM official product architecture.
 *
 * Principle:
 * FastCRM is the platform.
 * FastCRM WhatsApp Sales is the primary entry offer.
 * Modules support the offer but must not compete with it in public positioning.
 */
export const FASTCRM_PRODUCT_ARCHITECTURE: ProductArchitectureNode[] = [
  {
    id: "fastcrm-platform",
    name: "FastCRM",
    layer: "core_product",
    visibility: "primary_offer",
    status: "active",
    purpose: "The main platform and business operating system with AI for commercial operations.",
    commercialMessage:
      "FastCRM é o sistema comercial inteligente para organizar leads, conversas, oportunidades, reuniões, follow-ups e decisões comerciais.",
    targetAudience: ["PME", "microempresas", "equipas comerciais", "serviços", "clínicas", "formação"],
    publicRoute: "/",
  },
  {
    id: "fastcrm-whatsapp-sales",
    name: "FastCRM WhatsApp Sales",
    layer: "entry_offer",
    visibility: "primary_offer",
    status: "active",
    purpose: "Primary commercial entry offer focused on WhatsApp, leads, meetings and follow-up.",
    commercialMessage:
      "Transforme o WhatsApp num canal organizado de vendas com leads, pipeline, tarefas, reuniões e IA comercial.",
    targetAudience: ["clínicas", "estética", "terapeutas", "formação", "consultores", "imobiliário", "serviços locais"],
    dependsOn: ["contacts", "leads", "pipeline", "inbox", "tasks-followup", "meetings", "commercial-ai", "dashboard"],
    publicRoute: "/fastcrm-whatsapp-sales",
  },

  // Core modules required by the primary offer
  {
    id: "contacts",
    name: "Contactos e Empresas",
    layer: "core_module",
    visibility: "secondary_offer",
    status: "active",
    purpose: "Centralize people, companies and relationship history.",
    commercialMessage: "Cada lead e cliente fica identificado, organizado e ligado ao histórico comercial.",
    dependsOn: ["fastcrm-platform"],
  },
  {
    id: "leads",
    name: "Leads",
    layer: "core_module",
    visibility: "secondary_offer",
    status: "active",
    purpose: "Capture and qualify commercial opportunities from multiple sources.",
    commercialMessage: "Cada contacto interessado passa a ter origem, estado, prioridade e próxima ação.",
    dependsOn: ["contacts"],
  },
  {
    id: "pipeline",
    name: "Pipeline Comercial",
    layer: "core_module",
    visibility: "secondary_offer",
    status: "active",
    purpose: "Track opportunities from first contact to close.",
    commercialMessage: "Veja em que fase está cada oportunidade e o que falta fazer para fechar.",
    dependsOn: ["leads"],
  },
  {
    id: "inbox",
    name: "Inbox Comercial",
    layer: "core_module",
    visibility: "secondary_offer",
    status: "active",
    purpose: "Organize sales conversations and connect them to contacts and deals.",
    commercialMessage: "Centralize conversas comerciais e reduza perdas por falta de resposta ou contexto.",
    dependsOn: ["contacts", "leads"],
  },
  {
    id: "tasks-followup",
    name: "Tarefas e Follow-up",
    layer: "core_module",
    visibility: "secondary_offer",
    status: "active",
    purpose: "Ensure every opportunity has an owner, next step and due date.",
    commercialMessage: "Nunca mais deixe uma oportunidade morrer por esquecimento.",
    dependsOn: ["leads", "pipeline"],
  },
  {
    id: "meetings",
    name: "Reuniões e Agendamento",
    layer: "core_module",
    visibility: "secondary_offer",
    status: "active",
    purpose: "Convert conversations into scheduled meetings and sales actions.",
    commercialMessage: "Transforme conversas em reuniões marcadas com controlo de próximos passos.",
    dependsOn: ["contacts", "leads", "tasks-followup"],
  },
  {
    id: "commercial-ai",
    name: "IA Comercial",
    layer: "core_module",
    visibility: "secondary_offer",
    status: "active",
    purpose: "Summarize conversations, suggest next actions and prioritize leads.",
    commercialMessage: "Use IA para resumir conversas, sugerir respostas e priorizar oportunidades.",
    dependsOn: ["contacts", "leads", "pipeline", "inbox"],
  },
  {
    id: "dashboard",
    name: "Dashboard Comercial",
    layer: "core_module",
    visibility: "secondary_offer",
    status: "active",
    purpose: "Provide simple visibility over leads, meetings, pipeline and revenue opportunities.",
    commercialMessage: "Tenha uma visão clara de leads, reuniões, oportunidades e vendas previstas.",
    dependsOn: ["leads", "pipeline", "meetings"],
  },
  {
    id: "automations",
    name: "Automações Comerciais",
    layer: "core_module",
    visibility: "addon",
    status: "active",
    purpose: "Automate repetitive sales, follow-up and notification workflows.",
    commercialMessage: "Automatize lembretes, tarefas e fluxos comerciais sem perder controlo humano.",
    dependsOn: ["tasks-followup", "pipeline", "commercial-ai"],
  },

  // Optional modules
  {
    id: "client-portal",
    name: "Portal Cliente",
    layer: "optional_module",
    visibility: "addon",
    status: "active",
    purpose: "Allow clients to access orders, invoices, tickets, contracts and information.",
    commercialMessage: "Dê aos seus clientes uma área organizada para acompanhamento e suporte.",
    dependsOn: ["contacts"],
    notes: "Should be sold as an add-on, not as the main FastCRM promise.",
  },
  {
    id: "store",
    name: "Loja Online",
    layer: "optional_module",
    visibility: "addon",
    status: "review",
    purpose: "Enable product sales, checkout and digital assets inside the FastCRM ecosystem.",
    commercialMessage: "Venda produtos, serviços ou ativos digitais quando fizer sentido para o modelo do cliente.",
    dependsOn: ["contacts", "pipeline"],
    notes: "Do not position publicly as a primary product while WhatsApp Sales is the current entry offer.",
  },
  {
    id: "marketplace",
    name: "Marketplace",
    layer: "optional_module",
    visibility: "hidden",
    status: "review",
    purpose: "Support multi-seller, listing and marketplace scenarios.",
    commercialMessage: "Ative modelos de marketplace apenas em projetos específicos.",
    dependsOn: ["store", "contacts"],
    notes: "Keep hidden from main public positioning until a dedicated marketplace strategy exists.",
  },
  {
    id: "seo-hub",
    name: "SEO Hub",
    layer: "optional_module",
    visibility: "addon",
    status: "active",
    purpose: "Generate SEO pages, templates, guides and content hubs for acquisition.",
    commercialMessage: "Crie autoridade e captação orgânica com conteúdos, guias, templates e ferramentas.",
    dependsOn: ["fastcrm-platform"],
  },
  {
    id: "fastclub",
    name: "FastClub / Comunidade",
    layer: "optional_module",
    visibility: "hidden",
    status: "review",
    purpose: "Community, learning and member engagement layer.",
    commercialMessage: "Crie uma comunidade ou área de membros quando isso fizer parte do modelo de negócio.",
    dependsOn: ["contacts"],
    notes: "Must not compete with FastCRM public commercial navigation.",
  },
  {
    id: "procurement",
    name: "Compras / Procurement",
    layer: "optional_module",
    visibility: "hidden",
    status: "review",
    purpose: "Manage suppliers, purchase workflows and procurement operations.",
    commercialMessage: "Organize compras e fornecedores em empresas com operação mais avançada.",
    dependsOn: ["contacts"],
    notes: "Not part of the current primary entry offer.",
  },
  {
    id: "invoicing",
    name: "Faturação",
    layer: "optional_module",
    visibility: "addon",
    status: "review",
    purpose: "Support invoices, payments and financial workflows.",
    commercialMessage: "Ligue oportunidades comerciais a faturação e pagamentos quando necessário.",
    dependsOn: ["contacts", "pipeline"],
    notes: "Position only after the commercial CRM promise is understood.",
  },
  {
    id: "performance-gamification",
    name: "Performance e Gamificação",
    layer: "optional_module",
    visibility: "hidden",
    status: "review",
    purpose: "Support sales performance, rankings and team motivation.",
    commercialMessage: "Acompanhe desempenho comercial e crie incentivos para equipas.",
    dependsOn: ["dashboard", "pipeline"],
    notes: "Do not sell early unless the client has an active sales team.",
  },

  // Verticals
  {
    id: "vertical-clinicas",
    name: "FastCRM Clínicas",
    layer: "vertical_module",
    visibility: "secondary_offer",
    status: "planned",
    purpose: "Vertical package for clinics, aesthetics and therapeutic services.",
    commercialMessage: "Organize pedidos, marcações, follow-ups e oportunidades em clínicas e serviços de estética.",
    targetAudience: ["clínicas", "estética", "terapia capilar", "bem-estar"],
    dependsOn: ["fastcrm-whatsapp-sales"],
  },
  {
    id: "vertical-formacao",
    name: "FastCRM Formação",
    layer: "vertical_module",
    visibility: "secondary_offer",
    status: "planned",
    purpose: "Vertical package for academies, courses, workshops and training businesses.",
    commercialMessage: "Acompanhe leads de masterclasses, inscrições, reuniões e upsells de formação.",
    targetAudience: ["formadores", "academias", "cursos online", "escolas profissionais"],
    dependsOn: ["fastcrm-whatsapp-sales"],
  },
  {
    id: "vertical-imobiliario",
    name: "FastCRM Imobiliário",
    layer: "vertical_module",
    visibility: "secondary_offer",
    status: "future",
    purpose: "Vertical package for real estate lead follow-up and deal management.",
    commercialMessage: "Acompanhe leads imobiliários, visitas, follow-ups e oportunidades por consultor.",
    targetAudience: ["consultores imobiliários", "agências imobiliárias"],
    dependsOn: ["fastcrm-whatsapp-sales"],
  },
];

export function getProductArchitecture() {
  return FASTCRM_PRODUCT_ARCHITECTURE;
}

export function getPrimaryOffer() {
  return FASTCRM_PRODUCT_ARCHITECTURE.find((node) => node.id === "fastcrm-whatsapp-sales");
}

export function getModulesByLayer(layer: ProductLayer) {
  return FASTCRM_PRODUCT_ARCHITECTURE.filter((node) => node.layer === layer);
}

export function getCommerciallyVisibleModules() {
  return FASTCRM_PRODUCT_ARCHITECTURE.filter((node) =>
    ["primary_offer", "secondary_offer", "addon"].includes(node.visibility),
  );
}

export function getHiddenOrInternalModules() {
  return FASTCRM_PRODUCT_ARCHITECTURE.filter((node) =>
    ["hidden", "internal_only"].includes(node.visibility),
  );
}
