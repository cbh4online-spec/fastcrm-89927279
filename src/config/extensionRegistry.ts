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

export interface ExtensionDefinition {
  moduleSlug: string;
  name: string;
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
    objectTabs: [
      { key: "proposals", label: "Proposals", icon: FileText, route: "/dashboard/proposals" },
    ],
    automationTemplates: [
      { key: "proposal-followup", label: "Follow-up de proposta", description: "Enviar follow-up automático após envio de proposta", trigger: "proposal.sent" },
      { key: "proposal-expiry", label: "Alerta de expiração", description: "Notificar quando proposta está a expirar", trigger: "proposal.expiring" },
    ],
  },
  {
    moduleSlug: "invoices",
    name: "Faturação",
    objectTabs: [
      { key: "invoices", label: "Invoices", icon: Receipt, route: "/dashboard/invoices" },
    ],
    automationTemplates: [
      { key: "invoice-overdue", label: "Fatura vencida", description: "Enviar lembrete quando fatura está vencida", trigger: "invoice.overdue" },
      { key: "invoice-paid", label: "Pagamento recebido", description: "Notificar equipa quando pagamento é recebido", trigger: "invoice.paid" },
    ],
  },
  {
    moduleSlug: "b2b-portal",
    name: "Portal B2B",
    objectTabs: [
      { key: "orders", label: "Orders", icon: ShoppingCart, route: "/dashboard/order-notes" },
    ],
    intelligenceCapabilities: [
      { key: "b2b-analytics", label: "B2B Analytics", description: "Análise de padrões de compra B2B", icon: BarChart3 },
    ],
  },
  {
    moduleSlug: "online-store",
    name: "Loja Online",
    objectTabs: [
      { key: "store-orders", label: "Store Orders", icon: Store, route: "/dashboard/store-orders" },
      { key: "store-products", label: "Products", icon: ShoppingCart, route: "/dashboard/store-products" },
    ],
  },
  {
    moduleSlug: "student-journey",
    name: "Educação",
    objectTabs: [
      { key: "students", label: "Students", icon: GraduationCap, route: "/dashboard/student-journey" },
    ],
    intelligenceCapabilities: [
      { key: "student-risk", label: "Student Risk Analysis", description: "Identificar alunos em risco de abandono", icon: GraduationCap },
    ],
    automationTemplates: [
      { key: "student-activation", label: "Ativação de aluno", description: "Sequência de ativação para novos alunos", trigger: "student.enrolled" },
    ],
  },
  {
    moduleSlug: "credit-intermediation",
    name: "Intermediação de Crédito",
    objectTabs: [
      { key: "credit", label: "Credit", icon: Landmark, route: "/dashboard/credit" },
    ],
  },
  {
    moduleSlug: "marketplace-c2c",
    name: "Marketplace C2C",
    objectTabs: [
      { key: "c2c-listings", label: "C2C Listings", icon: Store, route: "/dashboard/c2c" },
    ],
  },
  {
    moduleSlug: "fastclub",
    name: "FastClub",
    objectTabs: [
      { key: "community", label: "Community", icon: Users, route: "/club/fastclub" },
    ],
  },
  {
    moduleSlug: "lead-enricher",
    name: "Lead Enricher",
    intelligenceCapabilities: [
      { key: "lead-enrichment", label: "Lead Enrichment", description: "Enriquecer leads com dados empresariais automaticamente", icon: Search },
    ],
  },
  {
    moduleSlug: "google-local-services",
    name: "Google Local Prospecting",
    objectTabs: [
      { key: "google-prospecting", label: "Local Prospects", icon: Globe, route: "/dashboard/prospecting/google-local" },
    ],
  },
  {
    moduleSlug: "prospecting-pro",
    name: "Prospecção Profissional",
    intelligenceCapabilities: [
      { key: "pro-prospecting", label: "Professional Prospecting", description: "Prospecção avançada com IA", icon: Search },
    ],
  },
  {
    moduleSlug: "bio-os",
    name: "Bio OS",
    objectTabs: [
      { key: "bio-pages", label: "Bio Pages", icon: Globe, route: "/dashboard/bio" },
    ],
  },
  {
    moduleSlug: "seo-growth",
    name: "SEO & Growth",
    intelligenceCapabilities: [
      { key: "seo-analysis", label: "SEO Analysis", description: "Análise e otimização SEO com IA", icon: BarChart3 },
    ],
  },
  {
    moduleSlug: "instagram-looter",
    name: "Instagram Looter",
    objectTabs: [
      { key: "instagram", label: "Instagram", icon: Instagram, route: "/dashboard/instagram-looter" },
    ],
  },
];

/**
 * Get all extension object tabs for installed modules.
 */
export function getExtensionObjectTabs(installedModuleIds: string[]): ExtensionObjectTab[] {
  return EXTENSION_REGISTRY
    .filter(ext => installedModuleIds.includes(ext.moduleSlug))
    .flatMap(ext => ext.objectTabs || []);
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
