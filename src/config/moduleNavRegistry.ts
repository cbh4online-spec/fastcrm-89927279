/**
 * Module Navigation Registry
 * 
 * Maps marketplace module slugs to their sidebar navigation entries.
 * When a module is installed (active in workspace_modules), its nav items
 * are automatically injected into the sidebar grouped by category.
 */
import {
  Briefcase, Receipt, FileText, ShoppingCart, Shield, Target,
  TrendingUp, Link2, Search, MapPin, Instagram, UserPlus,
  Home, Mail, MessageSquare, Users, Zap, BookOpen, Brain,
  Sparkles, ScanText, UserCircle, Lightbulb, MessageSquareText,
  Package, Store, ShoppingBag, Building2, Landmark, Phone, Bot,
  type LucideIcon,
} from "lucide-react";

export interface ModuleNavEntry {
  slug: string;
  label: string;
  icon: LucideIcon;
  href: string;
  category: ModuleNavCategory;
  /** Optional sub-items for modules with multiple pages */
  children?: { label: string; href: string; icon: LucideIcon }[];
}

export type ModuleNavCategory =
  | "intelligence"
  | "marketing"
  | "sales"
  | "operations"
  | "finance"
  | "prospecting"
  | "communication"
  | "ai"
  | "integrations"
  | "education"
  | "real_estate";

export const categoryLabels: Record<ModuleNavCategory, string> = {
  intelligence: "Inteligência",
  marketing: "Marketing",
  sales: "Vendas & Comércio",
  operations: "Operações",
  finance: "Financeiro",
  prospecting: "Prospecção",
  communication: "Comunicação",
  ai: "Automação & IA",
  integrations: "Integrações",
  education: "Educação",
  real_estate: "Imobiliário",
};

export const categorySortOrder: ModuleNavCategory[] = [
  "intelligence",
  "prospecting",
  "sales",
  "marketing",
  "finance",
  "operations",
  "communication",
  "ai",
  "integrations",
  "education",
  "real_estate",
];

/**
 * Registry of all modules that have navigable pages.
 * Modules without a `href` (e.g. pure AI capabilities) are excluded
 * since they don't have standalone pages.
 */
export const moduleNavRegistry: ModuleNavEntry[] = [
  // ── Intelligence ──
  {
    slug: "account-brief",
    label: "Account Brief",
    icon: Briefcase,
    href: "/dashboard/account-brief",
    category: "intelligence",
  },
  {
    slug: "metodo-vision",
    label: "Método Vision",
    icon: Target,
    href: "/dashboard/metodo-vision",
    category: "intelligence",
  },

  // ── Prospecting ──
  {
    slug: "lead-enricher",
    label: "Lead Enricher",
    icon: Search,
    href: "/dashboard/lead-enricher",
    category: "prospecting",
  },
  {
    slug: "instagram-looter",
    label: "Instagram Looter",
    icon: Instagram,
    href: "/dashboard/instagram-looter",
    category: "prospecting",
  },
  {
    slug: "google-local-services",
    label: "Google Local",
    icon: MapPin,
    href: "/dashboard/google-local",
    category: "prospecting",
  },
  {
    slug: "prospecting-pro",
    label: "Prospecção Pro",
    icon: UserPlus,
    href: "/dashboard/prospecting",
    category: "prospecting",
  },

  // ── Sales ──
  {
    slug: "proposals",
    label: "Propostas",
    icon: FileText,
    href: "/dashboard/proposals",
    category: "sales",
  },
  {
    slug: "online-store",
    label: "Loja Online",
    icon: ShoppingBag,
    href: "/dashboard/store",
    category: "sales",
  },
  {
    slug: "marketplace-c2c",
    label: "Marketplace C2C",
    icon: Store,
    href: "/dashboard/marketplace-c2c",
    category: "sales",
  },
  {
    slug: "b2b-portal",
    label: "Portal B2B",
    icon: Building2,
    href: "/dashboard/b2b",
    category: "sales",
  },

  // ── Marketing ──
  {
    slug: "bio-os",
    label: "Bio OS",
    icon: Link2,
    href: "/dashboard/bio",
    category: "marketing",
  },
  {
    slug: "email-campaigns",
    label: "Email Marketing",
    icon: Mail,
    href: "/dashboard/email-campaigns",
    category: "marketing",
  },
  {
    slug: "seo-growth",
    label: "SEO & Growth",
    icon: TrendingUp,
    href: "/dashboard/seo",
    category: "marketing",
  },

  // ── Finance ──
  {
    slug: "invoices",
    label: "Faturas",
    icon: Receipt,
    href: "/dashboard/invoices",
    category: "finance",
  },
  {
    slug: "credit-intermediation",
    label: "Crédito",
    icon: Landmark,
    href: "/dashboard/credit",
    category: "finance",
  },

  // ── Operations ──
  {
    slug: "procurement",
    label: "Procurement",
    icon: ShoppingCart,
    href: "/dashboard/procurement",
    category: "operations",
  },
  {
    slug: "security-ops",
    label: "Segurança",
    icon: Shield,
    href: "/dashboard/security",
    category: "operations",
  },

  // ── Communication ──
  {
    slug: "fastclub",
    label: "Comunidade",
    icon: Users,
    href: "/dashboard/community",
    category: "communication",
  },
  {
    slug: "whatsapp-business",
    label: "WhatsApp",
    icon: MessageSquare,
    href: "/dashboard/whatsapp",
    category: "communication",
  },

  // ── AI (only modules with dedicated pages) ──
  {
    slug: "knowledge-base",
    label: "Knowledge Base",
    icon: BookOpen,
    href: "/dashboard/knowledge-base",
    category: "ai",
  },
  {
    slug: "ai-assistants",
    label: "Assistentes IA",
    icon: Bot,
    href: "/dashboard/ai-assistants",
    category: "ai",
  },

  // ── Education ──
  {
    slug: "student-journey",
    label: "Student Journey",
    icon: Package,
    href: "/dashboard/student-journey",
    category: "education",
  },

  // ── Real Estate ──
  {
    slug: "imo-ai",
    label: "IMO AI",
    icon: Home,
    href: "/dashboard/imo",
    category: "real_estate",
  },

  // ── Integrations ──
  {
    slug: "zapier-integration",
    label: "Zapier",
    icon: Zap,
    href: "/dashboard/integrations/zapier",
    category: "integrations",
  },
];

/**
 * Given a list of installed module slugs, returns the nav entries
 * grouped by category, sorted by category priority.
 */
export function getInstalledModuleNav(
  installedSlugs: string[]
): { category: ModuleNavCategory; label: string; items: ModuleNavEntry[] }[] {
  const installed = new Set(installedSlugs);
  const activeEntries = moduleNavRegistry.filter((e) => installed.has(e.slug));

  // Group by category
  const grouped = new Map<ModuleNavCategory, ModuleNavEntry[]>();
  for (const entry of activeEntries) {
    const list = grouped.get(entry.category) || [];
    list.push(entry);
    grouped.set(entry.category, list);
  }

  // Sort by category priority
  return categorySortOrder
    .filter((cat) => grouped.has(cat))
    .map((cat) => ({
      category: cat,
      label: categoryLabels[cat],
      items: grouped.get(cat)!,
    }));
}
