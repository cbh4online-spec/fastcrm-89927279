export type PlanTier = "starter" | "growth" | "scale";

export interface ExtensionPack {
  id: string;
  name: string;
  description: string;
  icon: string;
  modules: string[];
  requiredPlan: PlanTier;
  color: string;
  priceMonthly?: number;
}

export const EXTENSION_PACKS: ExtensionPack[] = [
  {
    id: "b2b-revenue",
    name: "B2B Revenue Pack",
    description: "Proposals, invoices and B2B client portal",
    icon: "💼",
    modules: ["proposals", "invoices", "b2b-portal"],
    requiredPlan: "growth",
    color: "hsl(var(--primary))",
    priceMonthly: 29,
  },
  {
    id: "finance",
    name: "Finance Pack",
    description: "Invoicing and credit intermediation",
    icon: "💰",
    modules: ["invoices", "credit-intermediation"],
    requiredPlan: "growth",
    color: "hsl(142 76% 36%)",
    priceMonthly: 19,
  },
  {
    id: "proposals",
    name: "Proposals Pack",
    description: "Create and manage commercial proposals",
    icon: "📝",
    modules: ["proposals"],
    requiredPlan: "growth",
    color: "hsl(221 83% 53%)",
    priceMonthly: 19,
  },
  {
    id: "education",
    name: "Education Pack",
    description: "Student journey and education management",
    icon: "🎓",
    modules: ["student-journey"],
    requiredPlan: "growth",
    color: "hsl(262 83% 58%)",
    priceMonthly: 19,
  },
  {
    id: "commerce",
    name: "Commerce Pack",
    description: "Online store and C2C marketplace",
    icon: "🛒",
    modules: ["online-store", "marketplace-c2c"],
    requiredPlan: "growth",
    color: "hsl(25 95% 53%)",
    priceMonthly: 29,
  },
  {
    id: "advanced-intelligence",
    name: "Advanced Intelligence",
    description: "Lead enrichment, prospecting and advanced SEO",
    icon: "🧠",
    modules: ["lead-enricher", "prospecting-pro", "seo-growth"],
    requiredPlan: "growth",
    color: "hsl(340 82% 52%)",
    priceMonthly: 29,
  },
];

// Map business types to recommended extension packs
export const BUSINESS_TO_PACKS: Record<string, string[]> = {
  education: ["education"],
  formacao: ["education"],
  escola: ["education"],
  retail: ["commerce"],
  ecommerce: ["commerce"],
  loja: ["commerce"],
  b2b: ["b2b-revenue"],
  services: ["b2b-revenue"],
  consulting: ["b2b-revenue", "proposals"],
  consultoria: ["b2b-revenue", "proposals"],
  marketing: ["advanced-intelligence", "proposals"],
  agencia: ["advanced-intelligence", "b2b-revenue"],
  agency: ["advanced-intelligence", "b2b-revenue"],
  saas: ["b2b-revenue", "finance"],
  contabilidade: ["finance"],
  accounting: ["finance"],
  financeiro: ["finance"],
};

export function getRecommendedPacks(businessType: string): ExtensionPack[] {
  const key = businessType.toLowerCase();
  for (const [keyword, packIds] of Object.entries(BUSINESS_TO_PACKS)) {
    if (key.includes(keyword)) {
      return EXTENSION_PACKS.filter((p) => packIds.includes(p.id));
    }
  }
  return [EXTENSION_PACKS[0]]; // Default to B2B Revenue
}

export function canInstallPack(pack: ExtensionPack, currentPlan: PlanTier): boolean {
  const tierOrder: PlanTier[] = ["starter", "growth", "scale"];
  return tierOrder.indexOf(currentPlan) >= tierOrder.indexOf(pack.requiredPlan);
}

// ── Onboarding Bundles ──

import type { OnboardingSegment } from "./onboardingSegments";

export interface OnboardingBundle {
  id: string;
  name: string;
  description: string;
  icon: string;
  segments: OnboardingSegment[];
  modules: string[]; // marketplace module slugs
  highlights: string[];
  pricing: {
    individual_total: number;
    bundle_price: number;
    discount_percent: number;
  };
}

export const ONBOARDING_BUNDLES: OnboardingBundle[] = [
  {
    id: "startup-growth",
    name: "Startup Growth Bundle",
    description: "Everything you need to scale sales fast",
    icon: "🚀",
    segments: ["startup_saas"],
    modules: ["proposals"],
    highlights: [
      "Integrated commercial proposals",
      "Advanced intelligence scoring",
      "Automatic follow-up templates",
    ],
    pricing: {
      individual_total: 19,
      bundle_price: 19,
      discount_percent: 0,
    },
  },
  {
    id: "smb-revenue",
    name: "SMB Revenue Bundle",
    description: "Complete sales and invoicing management",
    icon: "💼",
    segments: ["smb_traditional", "generic"],
    modules: ["proposals", "invoices"],
    highlights: [
      "Integrated proposals & invoicing",
      "Overdue invoice alerts",
      "Pipeline optimized for short cycles",
    ],
    pricing: {
      individual_total: 38,
      bundle_price: 29,
      discount_percent: 24,
    },
  },
  {
    id: "b2b-revenue",
    name: "B2B Revenue Bundle",
    description: "Advanced pipeline for complex B2B sales",
    icon: "🏢",
    segments: ["b2b_complex"],
    modules: ["proposals", "invoices", "b2b-portal"],
    highlights: [
      "Orders with approvals",
      "Advanced forecast benchmarks",
      "Complex sales pipeline",
    ],
    pricing: {
      individual_total: 67,
      bundle_price: 49,
      discount_percent: 27,
    },
  },
];

export function getBundleForSegment(segment: OnboardingSegment): OnboardingBundle | undefined {
  return ONBOARDING_BUNDLES.find((b) => b.segments.includes(segment));
}
