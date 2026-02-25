/**
 * Extension Registry
 * Maps installed marketplace module slugs to capabilities they add
 * to Objects, Intelligence, and Automations pages.
 */

import { LucideIcon, FileText, Receipt, Building2, ShoppingCart, GraduationCap, Landmark, Store, Users, Sparkles, Search, Globe, Instagram, BarChart3 } from "lucide-react";

export interface ExtensionObjectTab {
  key: string;
  label: string;
  icon: LucideIcon;
  /** Route to navigate when clicking on the tab (renders inline or lazy component) */
  route?: string;
  /** Lazy component path for inline rendering */
  component?: string;
}

export interface ExtensionIntelligenceCapability {
  key: string;
  label: string;
  description: string;
  icon: LucideIcon;
}

export interface ExtensionAutomationTemplate {
  key: string;
  label: string;
  description: string;
  trigger: string;
}

export type ExtensionCategory = "Vendas" | "Comércio" | "Prospecção" | "Marketing" | "Educação" | "Portal" | "Comunidade";

export interface ExtensionDefinition {
  moduleSlug: string;
  name: string;
  category: ExtensionCategory;
  /** Additional object tabs this extension adds */
  objectTabs?: ExtensionObjectTab[];
  /** Intelligence capabilities this extension provides */
  intelligenceCapabilities?: ExtensionIntelligenceCapability[];
  /** Automation templates this extension provides */
  automationTemplates?: ExtensionAutomationTemplate[];
}

/**
 * Registry of all extensions and what they contribute.
 * When a module is installed, its contributions appear dynamically.
 */
export const EXTENSION_REGISTRY: ExtensionDefinition[] = [
  {
    moduleSlug: "proposals",
    name: "Propostas",
    category: "Vendas",
    objectTabs: [
      { key: "proposals", label: "Propostas", icon: FileText, route: "/dashboard/proposals" },
    ],
    automationTemplates: [
      { key: "proposal-followup", label: "Follow-up de proposta", description: "Enviar follow-up automático após envio de proposta", trigger: "proposal.sent" },
      { key: "proposal-expiry", label: "Alerta de expiração", description: "Notificar quando proposta está a expirar", trigger: "proposal.expiring" },
    ],
  },
  {
    moduleSlug: "invoices",
    name: "Faturação",
    category: "Vendas",
    objectTabs: [
      { key: "invoices", label: "Faturação", icon: Receipt, route: "/dashboard/invoices" },
    ],
    automationTemplates: [
      { key: "invoice-overdue", label: "Fatura vencida", description: "Enviar lembrete quando fatura está vencida", trigger: "invoice.overdue" },
      { key: "invoice-paid", label: "Pagamento recebido", description: "Notificar equipa quando pagamento é recebido", trigger: "invoice.paid" },
    ],
  },
  {
    moduleSlug: "credit-intermediation",
    name: "Intermediação de Crédito",
    category: "Vendas",
    objectTabs: [
      { key: "credit", label: "Crédito", icon: Landmark, route: "/dashboard/credit" },
    ],
  },
  {
    moduleSlug: "b2b-portal",
    name: "Portal B2B",
    category: "Portal",
    objectTabs: [
      { key: "orders", label: "Notas Encomenda", icon: ShoppingCart, route: "/dashboard/order-notes" },
    ],
    intelligenceCapabilities: [
      { key: "b2b-analytics", label: "B2B Analytics", description: "Análise de padrões de compra B2B", icon: BarChart3 },
    ],
  },
  {
    moduleSlug: "online-store",
    name: "Loja Online",
    category: "Comércio",
    objectTabs: [
      { key: "store-products", label: "Produtos", icon: ShoppingCart, route: "/dashboard/store-products" },
      { key: "store-orders", label: "Encomendas", icon: Store, route: "/dashboard/store-orders" },
      { key: "store-categories", label: "Categorias", icon: FileText, route: "/dashboard/store-categories" },
    ],
  },
  {
    moduleSlug: "marketplace-c2c",
    name: "Marketplace C2C",
    category: "Comércio",
    objectTabs: [
      { key: "c2c-listings", label: "C2C Listings", icon: Store, route: "/dashboard/c2c" },
    ],
  },
  {
    moduleSlug: "student-journey",
    name: "Educação",
    category: "Educação",
    objectTabs: [
      { key: "students", label: "Alunos", icon: GraduationCap, route: "/dashboard/student-journey" },
    ],
    intelligenceCapabilities: [
      { key: "student-risk", label: "Student Risk Analysis", description: "Identificar alunos em risco de abandono", icon: GraduationCap },
    ],
    automationTemplates: [
      { key: "student-activation", label: "Ativação de aluno", description: "Sequência de ativação para novos alunos", trigger: "student.enrolled" },
    ],
  },
  {
    moduleSlug: "lead-enricher",
    name: "Lead Enricher",
    category: "Prospecção",
    objectTabs: [
      { key: "lead-enricher", label: "Lead Enricher", icon: Search, route: "/dashboard/lead-enricher" },
    ],
    intelligenceCapabilities: [
      { key: "lead-enrichment", label: "Lead Enrichment", description: "Enriquecer leads com dados empresariais automaticamente", icon: Search },
    ],
  },
  {
    moduleSlug: "google-local-services",
    name: "Google Local Prospecting",
    category: "Prospecção",
    objectTabs: [
      { key: "google-prospecting", label: "Prospecção Local", icon: Globe, route: "/dashboard/prospecting/google-local" },
    ],
  },
  {
    moduleSlug: "prospecting-pro",
    name: "Prospecção Profissional",
    category: "Prospecção",
    objectTabs: [
      { key: "pro-prospecting", label: "Prospecção Pro", icon: Search, route: "/dashboard/prospecting/professionals" },
    ],
    intelligenceCapabilities: [
      { key: "pro-prospecting", label: "Professional Prospecting", description: "Prospecção avançada com IA", icon: Search },
    ],
  },
  {
    moduleSlug: "seo-growth",
    name: "SEO & Growth",
    category: "Marketing",
    objectTabs: [
      { key: "seo-growth", label: "SEO & Growth", icon: BarChart3, route: "/dashboard/seo" },
    ],
    intelligenceCapabilities: [
      { key: "seo-analysis", label: "SEO Analysis", description: "Análise e otimização SEO com IA", icon: BarChart3 },
    ],
  },
  {
    moduleSlug: "bio-os",
    name: "Bio OS",
    category: "Marketing",
    objectTabs: [
      { key: "bio-pages", label: "Bio Pages", icon: Globe, route: "/dashboard/bio" },
    ],
  },
  {
    moduleSlug: "instagram-looter",
    name: "Instagram Looter",
    category: "Marketing",
    objectTabs: [
      { key: "instagram", label: "Instagram", icon: Instagram, route: "/dashboard/instagram-looter" },
    ],
  },
  {
    moduleSlug: "fastclub",
    name: "FastClub",
    category: "Comunidade",
    objectTabs: [
      { key: "community", label: "Comunidade", icon: Users, route: "/club/fastclub" },
    ],
  },
];

/**
 * Get all extension object tabs for installed modules (flat list).
 */
export function getExtensionObjectTabs(installedModuleIds: string[]): ExtensionObjectTab[] {
  return EXTENSION_REGISTRY
    .filter(ext => installedModuleIds.includes(ext.moduleSlug))
    .flatMap(ext => ext.objectTabs || []);
}

/**
 * Get extension object tabs grouped by category for installed modules.
 */
export function getExtensionObjectTabsGrouped(installedModuleIds: string[]): { category: ExtensionCategory; tabs: ExtensionObjectTab[] }[] {
  const categoryOrder: ExtensionCategory[] = ["Vendas", "Comércio", "Prospecção", "Marketing", "Educação", "Portal", "Comunidade"];
  const grouped = new Map<ExtensionCategory, ExtensionObjectTab[]>();

  for (const ext of EXTENSION_REGISTRY) {
    if (!installedModuleIds.includes(ext.moduleSlug)) continue;
    const tabs = (ext.objectTabs || []).filter(t => t.route);
    if (tabs.length === 0) continue;
    if (!grouped.has(ext.category)) grouped.set(ext.category, []);
    grouped.get(ext.category)!.push(...tabs);
  }

  return categoryOrder
    .filter(cat => grouped.has(cat))
    .map(cat => ({ category: cat, tabs: grouped.get(cat)! }));
}

/**
 * Get all extension intelligence capabilities for installed modules.
 */
export function getExtensionIntelligenceCapabilities(installedModuleIds: string[]): ExtensionIntelligenceCapability[] {
  return EXTENSION_REGISTRY
    .filter(ext => installedModuleIds.includes(ext.moduleSlug))
    .flatMap(ext => ext.intelligenceCapabilities || []);
}

/**
 * Get all extension automation templates for installed modules.
 */
export function getExtensionAutomationTemplates(installedModuleIds: string[]): ExtensionAutomationTemplate[] {
  return EXTENSION_REGISTRY
    .filter(ext => installedModuleIds.includes(ext.moduleSlug))
    .flatMap(ext => ext.automationTemplates || []);
}
