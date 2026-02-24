export type PlanTier = "free" | "basic" | "pro" | "agency";

export interface ExtensionPack {
  id: string;
  name: string;
  description: string;
  icon: string;
  modules: string[];
  requiredPlan: PlanTier;
  color: string;
}

export const EXTENSION_PACKS: ExtensionPack[] = [
  {
    id: "b2b-revenue",
    name: "B2B Revenue Pack",
    description: "Propostas, faturas e portal para clientes B2B",
    icon: "💼",
    modules: ["proposals", "invoices", "b2b-portal"],
    requiredPlan: "basic",
    color: "hsl(var(--primary))",
  },
  {
    id: "finance",
    name: "Finance Pack",
    description: "Faturação e intermediação de crédito",
    icon: "💰",
    modules: ["invoices", "credit-intermediation"],
    requiredPlan: "basic",
    color: "hsl(142 76% 36%)",
  },
  {
    id: "proposals",
    name: "Proposals Pack",
    description: "Criação e gestão de propostas comerciais",
    icon: "📝",
    modules: ["proposals"],
    requiredPlan: "basic",
    color: "hsl(221 83% 53%)",
  },
  {
    id: "education",
    name: "Education Pack",
    description: "Jornada do aluno e gestão educacional",
    icon: "🎓",
    modules: ["student-journey"],
    requiredPlan: "pro",
    color: "hsl(262 83% 58%)",
  },
  {
    id: "commerce",
    name: "Commerce Pack",
    description: "Loja online e marketplace C2C",
    icon: "🛒",
    modules: ["online-store", "c2c-marketplace"],
    requiredPlan: "pro",
    color: "hsl(25 95% 53%)",
  },
  {
    id: "advanced-intelligence",
    name: "Advanced Intelligence",
    description: "Enriquecimento de leads, prospeção e SEO avançado",
    icon: "🧠",
    modules: ["lead-enricher", "prospecting-pro", "seo-growth"],
    requiredPlan: "pro",
    color: "hsl(340 82% 52%)",
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
  const tierOrder: PlanTier[] = ["free", "basic", "pro", "agency"];
  return tierOrder.indexOf(currentPlan) >= tierOrder.indexOf(pack.requiredPlan);
}
