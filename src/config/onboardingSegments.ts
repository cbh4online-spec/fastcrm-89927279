export type OnboardingSegment = "startup_saas" | "smb_traditional" | "b2b_complex" | "generic";

export interface SegmentProfile {
  id: OnboardingSegment;
  label: string;
  labelPt: string;
  description: string;
  bundleId: string;
  pipelineHints: { stageCount: number; complexity: string };
  intelligenceDefaults: { enableBenchmarks: boolean; enableForecast: boolean };
}

export const SEGMENT_PROFILES: Record<OnboardingSegment, SegmentProfile> = {
  startup_saas: {
    id: "startup_saas",
    label: "Startup SaaS",
    labelPt: "Startup SaaS",
    description: "Fast-moving SaaS with subscription revenue",
    bundleId: "startup-growth",
    pipelineHints: { stageCount: 5, complexity: "medium" },
    intelligenceDefaults: { enableBenchmarks: true, enableForecast: true },
  },
  smb_traditional: {
    id: "smb_traditional",
    label: "SMB Traditional",
    labelPt: "PME Tradicional",
    description: "Small/medium business with direct sales",
    bundleId: "smb-revenue",
    pipelineHints: { stageCount: 4, complexity: "simple" },
    intelligenceDefaults: { enableBenchmarks: false, enableForecast: true },
  },
  b2b_complex: {
    id: "b2b_complex",
    label: "B2B Complex",
    labelPt: "B2B Vendas Complexas",
    description: "Complex B2B sales with multiple stakeholders",
    bundleId: "b2b-revenue",
    pipelineHints: { stageCount: 7, complexity: "complex" },
    intelligenceDefaults: { enableBenchmarks: true, enableForecast: true },
  },
  generic: {
    id: "generic",
    label: "Generic",
    labelPt: "Personalizado",
    description: "Generic CRM setup",
    bundleId: "smb-revenue",
    pipelineHints: { stageCount: 5, complexity: "medium" },
    intelligenceDefaults: { enableBenchmarks: false, enableForecast: false },
  },
};

interface SegmentInput {
  businessType: string;
  revenueModel?: string;
  teamSize?: string;
  salesComplexity?: string;
}

export function resolveSegment(input: SegmentInput): OnboardingSegment {
  const { businessType, revenueModel, teamSize, salesComplexity } = input;
  const bt = businessType?.toLowerCase() || "";

  // SaaS + subscription → startup_saas
  if (
    (bt === "saas" || bt.includes("software")) &&
    (revenueModel === "subscription" || revenueModel === "mixed")
  ) {
    return "startup_saas";
  }

  // B2B / consulting + complex cycle + larger team → b2b_complex
  if (
    (bt === "consulting" || bt === "b2b" || bt === "services" || bt === "agency") &&
    salesComplexity === "complex"
  ) {
    return "b2b_complex";
  }

  // Larger team + complex → b2b_complex regardless of type
  if (
    (teamSize === "6-20" || teamSize === "20+") &&
    salesComplexity === "complex"
  ) {
    return "b2b_complex";
  }

  // SaaS without subscription still startup
  if (bt === "saas") {
    return "startup_saas";
  }

  // Everything else with small team or simple/medium cycle → smb
  if (
    bt === "ecommerce" || bt === "retail" || bt === "education" ||
    bt === "accounting" || bt === "other" ||
    teamSize === "solo" || teamSize === "2-5"
  ) {
    return "smb_traditional";
  }

  // Services/consulting without complex → smb
  if (bt === "consulting" || bt === "services" || bt === "agency") {
    return "smb_traditional";
  }

  return "generic";
}

export function getSegmentProfile(segment: OnboardingSegment): SegmentProfile {
  return SEGMENT_PROFILES[segment];
}
