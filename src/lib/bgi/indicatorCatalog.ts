/**
 * Business Growth Intelligence — catálogo central de indicadores e templates de negócio.
 * Fórmulas são identificadores fixos (calculados por SQL/código), nunca expressões livres
 * nem IA. Templates são apenas configuração.
 */

export type IndicatorUnit = "eur" | "count" | "percent" | "days" | "hours";
export type IndicatorAggregation = "sum" | "count" | "avg" | "ratio" | "last";
export type IndicatorPeriod = "day" | "month" | "quarter" | "year";
export type IndicatorSource =
  | "invoices" | "invoice_payments" | "opportunities" | "leads" | "contacts"
  | "companies" | "subscriptions" | "student_journey" | "projects" | "time_entries"
  | "products" | "orders";

/** Fórmulas permitidas (whitelist). Nunca executar código arbitrário. */
export const ALLOWED_FORMULAS = [
  "sum_invoiced_net", "sum_amount_paid", "sum_open_balance", "gross_margin_pct",
  "count_active_customers", "repeat_purchase_rate", "count_orders", "avg_order_value",
  "count_new_leads", "lead_to_customer_rate", "sum_pipeline_value", "weighted_pipeline",
  "mrr", "arr", "churn_rate", "count_enrollments", "class_occupancy_pct",
  "revenue_per_course", "billable_hours", "count_active_projects",
  "count_listings", "count_closed_deals", "sum_commissions",
] as const;
export type IndicatorFormula = (typeof ALLOWED_FORMULAS)[number];

export interface IndicatorDefinition {
  id: string;
  name: string;
  unit: IndicatorUnit;
  formula: IndicatorFormula;
  source: IndicatorSource;
  aggregation: IndicatorAggregation;
  period: IndicatorPeriod;
  /** Natureza financeira, para nunca misturar faturado, recebido, pipeline e previsão. */
  kind?: "invoiced" | "received" | "pipeline" | "forecast" | "operational";
  capability?: string;
}

const d = (x: IndicatorDefinition) => x;

export const INDICATORS: Record<string, IndicatorDefinition> = Object.fromEntries(
  [
    d({ id: "revenue_invoiced", name: "Faturação", unit: "eur", formula: "sum_invoiced_net", source: "invoices", aggregation: "sum", period: "month", kind: "invoiced" }),
    d({ id: "revenue_received", name: "Recebimentos", unit: "eur", formula: "sum_amount_paid", source: "invoice_payments", aggregation: "sum", period: "month", kind: "received" }),
    d({ id: "open_balance", name: "Em aberto", unit: "eur", formula: "sum_open_balance", source: "invoices", aggregation: "last", period: "month", kind: "invoiced" }),
    d({ id: "gross_margin", name: "Margem bruta", unit: "percent", formula: "gross_margin_pct", source: "invoices", aggregation: "ratio", period: "month" }),
    d({ id: "active_customers", name: "Clientes ativos", unit: "count", formula: "count_active_customers", source: "invoices", aggregation: "count", period: "month", kind: "operational" }),
    d({ id: "repeat_rate", name: "Taxa de recompra", unit: "percent", formula: "repeat_purchase_rate", source: "invoices", aggregation: "ratio", period: "quarter" }),
    d({ id: "orders", name: "Encomendas", unit: "count", formula: "count_orders", source: "orders", aggregation: "count", period: "month", kind: "operational" }),
    d({ id: "avg_order", name: "Valor médio por encomenda", unit: "eur", formula: "avg_order_value", source: "orders", aggregation: "avg", period: "month" }),
    d({ id: "new_leads", name: "Leads novas", unit: "count", formula: "count_new_leads", source: "leads", aggregation: "count", period: "month", kind: "operational" }),
    d({ id: "lead_conversion", name: "Conversão lead → cliente", unit: "percent", formula: "lead_to_customer_rate", source: "leads", aggregation: "ratio", period: "month" }),
    d({ id: "pipeline_value", name: "Valor em pipeline", unit: "eur", formula: "sum_pipeline_value", source: "opportunities", aggregation: "last", period: "month", kind: "pipeline" }),
    d({ id: "weighted_forecast", name: "Previsão ponderada", unit: "eur", formula: "weighted_pipeline", source: "opportunities", aggregation: "last", period: "month", kind: "forecast" }),
    d({ id: "mrr", name: "MRR", unit: "eur", formula: "mrr", source: "subscriptions", aggregation: "last", period: "month", kind: "invoiced" }),
    d({ id: "arr", name: "ARR", unit: "eur", formula: "arr", source: "subscriptions", aggregation: "last", period: "year", kind: "invoiced" }),
    d({ id: "churn", name: "Churn", unit: "percent", formula: "churn_rate", source: "subscriptions", aggregation: "ratio", period: "month" }),
    d({ id: "enrollments", name: "Inscrições", unit: "count", formula: "count_enrollments", source: "student_journey", aggregation: "count", period: "month", kind: "operational" }),
    d({ id: "class_occupancy", name: "Ocupação de turmas", unit: "percent", formula: "class_occupancy_pct", source: "student_journey", aggregation: "ratio", period: "month" }),
    d({ id: "revenue_per_course", name: "Receita por formação", unit: "eur", formula: "revenue_per_course", source: "student_journey", aggregation: "sum", period: "quarter", kind: "invoiced" }),
    d({ id: "billable_hours", name: "Horas faturáveis", unit: "hours", formula: "billable_hours", source: "time_entries", aggregation: "sum", period: "month", kind: "operational" }),
    d({ id: "active_projects", name: "Projetos ativos", unit: "count", formula: "count_active_projects", source: "projects", aggregation: "count", period: "month", kind: "operational" }),
    d({ id: "listings", name: "Angariações", unit: "count", formula: "count_listings", source: "products", aggregation: "count", period: "month", kind: "operational" }),
    d({ id: "closed_deals", name: "Negócios concluídos", unit: "count", formula: "count_closed_deals", source: "opportunities", aggregation: "count", period: "month", kind: "operational" }),
    d({ id: "commissions", name: "Comissões", unit: "eur", formula: "sum_commissions", source: "opportunities", aggregation: "sum", period: "month", kind: "invoiced" }),
  ].map((i) => [i.id, i]),
);

export type BusinessTemplateId = "commerce" | "education" | "saas" | "services" | "real_estate" | "custom";

export interface BusinessTemplate {
  id: BusinessTemplateId;
  name: string;
  indicators: string[];
}

const CORE = ["revenue_invoiced", "revenue_received", "open_balance", "pipeline_value", "weighted_forecast"];

export const BUSINESS_TEMPLATES: Record<BusinessTemplateId, BusinessTemplate> = {
  commerce: { id: "commerce", name: "Comércio e distribuição", indicators: [...CORE, "gross_margin", "orders", "avg_order", "active_customers", "repeat_rate"] },
  education: { id: "education", name: "Formação e educação", indicators: [...CORE, "enrollments", "class_occupancy", "revenue_per_course", "new_leads", "lead_conversion"] },
  saas: { id: "saas", name: "SaaS e subscrições", indicators: [...CORE, "mrr", "arr", "churn", "active_customers", "lead_conversion"] },
  services: { id: "services", name: "Serviços e consultoria", indicators: [...CORE, "billable_hours", "active_projects", "gross_margin", "active_customers"] },
  real_estate: { id: "real_estate", name: "Imobiliário", indicators: [...CORE, "listings", "new_leads", "closed_deals", "commissions"] },
  custom: { id: "custom", name: "Modelo personalizado", indicators: [] },
};

/**
 * Indicadores visíveis para um workspace. Sem templates → null (manter comportamento atual).
 * Vários templates são combinados sem duplicados; ids desconhecidos são ignorados.
 */
export function resolveWorkspaceIndicators(
  templateIds: string[] | null | undefined,
  customIndicatorIds: string[] = [],
): IndicatorDefinition[] | null {
  const valid = (templateIds ?? []).filter((t): t is BusinessTemplateId => t in BUSINESS_TEMPLATES);
  if (valid.length === 0 && customIndicatorIds.length === 0) return null;
  const ids = new Set<string>();
  for (const t of valid) BUSINESS_TEMPLATES[t].indicators.forEach((i) => ids.add(i));
  if (valid.includes("custom") || valid.length === 0) customIndicatorIds.forEach((i) => ids.add(i));
  return [...ids].filter((id) => INDICATORS[id]).map((id) => INDICATORS[id]);
}

export function isAllowedFormula(f: string): f is IndicatorFormula {
  return (ALLOWED_FORMULAS as readonly string[]).includes(f);
}
