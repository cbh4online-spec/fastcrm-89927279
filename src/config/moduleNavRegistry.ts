/**
 * Module Navigation Registry
 * 
 * Maps marketplace module slugs to their sidebar navigation entries.
 * When a module is installed (active in workspace_modules), its nav items
 * appear as a flat list in the sidebar under "Módulos".
 */
import {
  Briefcase, Receipt, FileText, ShoppingCart, Shield, Target,
  TrendingUp, Link2, Search, MapPin, Instagram, UserPlus,
  Home, Mail, MessageSquare, Users, Zap, BookOpen, Brain,
  ScanText, Package, Store, ShoppingBag, Building2, Landmark, Phone, Bot,
  Facebook,
  type LucideIcon,
} from "lucide-react";

export interface ModuleNavEntry {
  slug: string;
  label: string;
  icon: LucideIcon;
  href: string;
  /** Sort order within the flat list (lower = higher) */
  order: number;
}

/**
 * Registry of all modules that have navigable pages.
 * Sorted by logical grouping order.
 */
export const moduleNavRegistry: ModuleNavEntry[] = [
  // Intelligence
  { slug: "account-brief", label: "Account Brief", icon: Briefcase, href: "/dashboard/account-brief", order: 10 },
  { slug: "metodo-vision", label: "Método Vision", icon: Target, href: "/dashboard/metodo-vision", order: 11 },

  // Prospecting
  { slug: "lead-enricher", label: "Lead Enricher", icon: Search, href: "/dashboard/lead-enricher", order: 20 },
  { slug: "instagram-looter", label: "Instagram Looter", icon: Instagram, href: "/dashboard/instagram-looter", order: 21 },
  { slug: "google-local-services", label: "Google Local", icon: MapPin, href: "/dashboard/google-local", order: 22 },
  { slug: "prospecting-pro", label: "Prospecção Pro", icon: UserPlus, href: "/dashboard/prospecting", order: 23 },

  // Sales
  { slug: "proposals", label: "Propostas", icon: FileText, href: "/dashboard/proposals", order: 30 },
  { slug: "online-store", label: "Loja Online", icon: ShoppingBag, href: "/dashboard/store", order: 31 },
  { slug: "marketplace-c2c", label: "Marketplace C2C", icon: Store, href: "/dashboard/marketplace-c2c", order: 32 },
  { slug: "b2b-portal", label: "Portal B2B", icon: Building2, href: "/dashboard/b2b", order: 33 },
  { slug: "helpdesk", label: "Helpdesk", icon: Phone, href: "/dashboard/helpdesk", order: 34 },

  // Marketing
  { slug: "bio-os", label: "Bio OS", icon: Link2, href: "/dashboard/bio", order: 40 },
  { slug: "email-campaigns", label: "Email Marketing", icon: Mail, href: "/dashboard/email-campaigns", order: 41 },
  { slug: "seo-growth", label: "SEO & Growth", icon: TrendingUp, href: "/dashboard/seo", order: 42 },
  { slug: "meta-module", label: "Meta", icon: Facebook, href: "/dashboard/meta", order: 43 },

  // Finance
  { slug: "invoices", label: "Faturas", icon: Receipt, href: "/dashboard/invoices", order: 50 },
  { slug: "credit-intermediation", label: "Crédito", icon: Landmark, href: "/dashboard/credit", order: 51 },

  // Operations
  { slug: "procurement", label: "Procurement", icon: ShoppingCart, href: "/dashboard/procurement", order: 60 },
  { slug: "security-ops", label: "Segurança", icon: Shield, href: "/dashboard/security", order: 61 },

  // Communication
  { slug: "fastclub", label: "Comunidade", icon: Users, href: "/dashboard/community", order: 70 },
  { slug: "whatsapp-business", label: "WhatsApp", icon: MessageSquare, href: "/dashboard/whatsapp", order: 71 },

  // AI
  { slug: "knowledge-base", label: "Knowledge Base", icon: BookOpen, href: "/dashboard/knowledge-base", order: 80 },
  { slug: "ai-assistants", label: "Assistentes IA", icon: Bot, href: "/dashboard/ai-assistants", order: 81 },

  // Education
  { slug: "student-journey", label: "Student Journey", icon: Package, href: "/dashboard/student-journey", order: 90 },

  // Real Estate
  { slug: "imo-ai", label: "IMO AI", icon: Home, href: "/dashboard/imo", order: 100 },

  // HR
  { slug: "hr-time-tracking", label: "Controlo de Ponto", icon: Package, href: "/dashboard/hr/time-clock", order: 105 },

  // Integrations
  { slug: "zapier-integration", label: "Zapier", icon: Zap, href: "/dashboard/integrations/zapier", order: 110 },
];

/**
 * Given a list of installed module slugs, returns the matching nav entries
 * sorted by order (flat list, no categories).
 */
export function getInstalledModuleNav(installedSlugs: string[]): ModuleNavEntry[] {
  const installed = new Set(installedSlugs);
  return moduleNavRegistry
    .filter((e) => installed.has(e.slug))
    .sort((a, b) => a.order - b.order);
}
