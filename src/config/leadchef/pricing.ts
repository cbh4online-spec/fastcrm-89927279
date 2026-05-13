/**
 * LeadChef — Tabela de pricing pública.
 * Preços com IVA NÃO incluído (a confirmar com o utilizador antes de venda).
 */

export interface LeadChefPlan {
  slug: "starter" | "growth";
  name: string;
  tagline: string;
  monthlyPrice: number; // EUR/mês
  clientsLimit: number | null; // null = sem limite
  highlighted?: boolean;
  features: string[];
}

export const LEADCHEF_PLANS: LeadChefPlan[] = [
  {
    slug: "starter",
    name: "LeadChef Starter",
    tagline: "Para começar — até 50 clientes ativos",
    monthlyPrice: 4.99,
    clientsLimit: 50,
    features: [
      "Até 50 clientes ativos",
      "Gestão de leads, agenda e cliclo PARE",
      "Templates e mensagens WhatsApp manuais",
      "Calculadora de poupança e ganhos",
      "App mobile (PWA) para o agente",
      "Suporte por email",
    ],
  },
  {
    slug: "growth",
    name: "LeadChef Growth",
    tagline: "Quando ultrapassas os 50 clientes — ativação automática",
    monthlyPrice: 6.99,
    clientsLimit: null,
    highlighted: true,
    features: [
      "Clientes ilimitados",
      "Tudo do Starter",
      "IA para próximas ações e classificação de leads",
      "Sequências automáticas pós-demo",
      "Relatórios avançados de performance",
      "Suporte prioritário",
    ],
  },
];

export const WHATSAPP_ADDON = {
  slug: "whatsapp",
  name: "Integração WhatsApp",
  monthlyPrice: 29.99,
  description:
    "Envio e receção automatizados via Z-API ligados ao teu número, com agendamentos pós-demo, lembretes e respostas registadas no histórico do lead.",
  features: [
    "Ligação ao teu número WhatsApp",
    "Envio automático pós-demo (com janela de cancelamento)",
    "Lembretes e follow-ups agendados",
    "Conversas registadas na timeline do lead",
    "Templates aprovados prontos a usar",
  ],
};

/** Desconto anual = 2 meses grátis → preço anual = mensal × 10. */
export const ANNUAL_FREE_MONTHS = 2;
export const ANNUAL_PAID_MONTHS = 12 - ANNUAL_FREE_MONTHS;

export function annualPrice(monthly: number): number {
  return monthly * ANNUAL_PAID_MONTHS;
}

export function effectiveMonthlyOnAnnual(monthly: number): number {
  return annualPrice(monthly) / 12;
}

export const formatEuro = (v: number) =>
  v.toLocaleString("pt-PT", {
    style: "currency",
    currency: "EUR",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
