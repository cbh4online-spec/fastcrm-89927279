/**
 * Catálogo de planos comerciais usado no site marketing.
 * Reaproveita os defaults do pitch deck para garantir consistência narrativa.
 */
import { DEFAULT_PRICING_PLANS, type PitchPricingPlan } from "@/lib/pitch/tokens";

export interface MarketingPricingPlan extends PitchPricingPlan {
  slug: string;
  description: string;
  ctaLabel: string;
  ctaHref: string;
  badge?: string;
}

export const MARKETING_PLANS: MarketingPricingPlan[] = DEFAULT_PRICING_PLANS.map((p) => {
  if (p.name === "Start") {
    return {
      ...p,
      slug: "start",
      description: "Para equipas que estão a começar a estruturar o comercial.",
      ctaLabel: "Começar Start",
      ctaHref: "/contacto?plano=start",
    };
  }
  if (p.name === "Grow") {
    return {
      ...p,
      slug: "grow",
      description: "Para equipas que querem acelerar com IA e automação.",
      ctaLabel: "Pedir demo Grow",
      ctaHref: "/contacto?plano=grow",
      badge: "Mais escolhido",
    };
  }
  return {
    ...p,
    slug: "pro",
    description: "Para operações comerciais maduras e multi-canal.",
    ctaLabel: "Falar com vendas",
    ctaHref: "/contacto?plano=pro",
  };
});

export const ENTERPRISE_PLAN = {
  slug: "enterprise",
  name: "Enterprise",
  description:
    "Implementação dedicada, SLA premium, integrações à medida e onboarding completo da equipa.",
  features: [
    "Tudo do Pro",
    "SLA dedicado e gestor de conta",
    "Integrações personalizadas (ERP, BI)",
    "Onboarding com consultoria PARE",
    "Créditos IA personalizados",
    "Single Sign-On (SSO) e auditoria avançada",
  ],
  ctaLabel: "Falar com a equipa",
  ctaHref: "/contacto?plano=enterprise",
};
