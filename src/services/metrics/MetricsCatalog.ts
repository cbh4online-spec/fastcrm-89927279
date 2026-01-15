// ============================================
// METRICS CATALOG - SINGLE SOURCE OF TRUTH
// ============================================
// All metrics are defined here. No module should create its own metrics.
// Each metric has a unique ID, clear definition, and specified contexts.

import { MetricDefinition, MetricCategory } from "@/types/metrics-governance";

export const METRICS_CATALOG: Record<string, MetricDefinition> = {
  // ============================================
  // LEAD METRICS
  // ============================================
  
  leads_today: {
    id: "leads_today",
    name: "Leads Hoje",
    description: "Número de leads recebidos no dia atual",
    category: "leads",
    formula: "COUNT(leads WHERE created_at >= TODAY)",
    humanFormula: "Total de novos leads criados desde a meia-noite de hoje",
    dataSource: ["leads"],
    updateFrequency: "realtime",
    contexts: [
      { module: "dashboard", displayLevel: "summary", showTrend: false, showComparison: false },
      { module: "kpis", displayLevel: "detailed", showTrend: true, showComparison: true },
      { module: "leads", displayLevel: "summary", showTrend: false, showComparison: false },
    ],
    unit: "number",
    precision: 0,
    higherIsBetter: true,
    requiredPermission: "user",
    version: "1.0.0",
    lastModified: "2024-01-15",
  },

  leads_this_week: {
    id: "leads_this_week",
    name: "Leads Esta Semana",
    description: "Número de leads recebidos na semana atual",
    category: "leads",
    formula: "COUNT(leads WHERE created_at >= WEEK_START)",
    humanFormula: "Total de novos leads desde segunda-feira",
    dataSource: ["leads"],
    updateFrequency: "realtime",
    contexts: [
      { module: "dashboard", displayLevel: "summary", showTrend: true, showComparison: true },
      { module: "kpis", displayLevel: "detailed", showTrend: true, showComparison: true },
    ],
    unit: "number",
    precision: 0,
    higherIsBetter: true,
    requiredPermission: "user",
    version: "1.0.0",
    lastModified: "2024-01-15",
  },

  leads_this_month: {
    id: "leads_this_month",
    name: "Leads Este Mês",
    description: "Número de leads recebidos no mês atual",
    category: "leads",
    formula: "COUNT(leads WHERE created_at >= MONTH_START)",
    humanFormula: "Total de novos leads desde o primeiro dia do mês",
    dataSource: ["leads"],
    updateFrequency: "realtime",
    contexts: [
      { module: "kpis", displayLevel: "detailed", showTrend: true, showComparison: true },
      { module: "reports", displayLevel: "full", showTrend: true, showComparison: true },
    ],
    unit: "number",
    precision: 0,
    higherIsBetter: true,
    requiredPermission: "user",
    version: "1.0.0",
    lastModified: "2024-01-15",
  },

  lead_to_opportunity_rate: {
    id: "lead_to_opportunity_rate",
    name: "Taxa Lead → Oportunidade",
    description: "Percentagem de leads que se tornaram oportunidades",
    category: "leads",
    formula: "(COUNT(opportunities WITH lead_id) / COUNT(leads)) * 100",
    humanFormula: "De cada 100 leads, quantos se tornam oportunidades de negócio",
    dataSource: ["leads", "opportunities"],
    updateFrequency: "hourly",
    contexts: [
      { module: "kpis", displayLevel: "detailed", showTrend: true, showComparison: true },
      { module: "dashboard", displayLevel: "summary", showTrend: true, showComparison: false },
    ],
    unit: "percentage",
    precision: 1,
    higherIsBetter: true,
    thresholds: { warning: 10, excellent: 30 },
    requiredPermission: "user",
    version: "1.0.0",
    lastModified: "2024-01-15",
  },

  avg_response_time: {
    id: "avg_response_time",
    name: "Tempo Médio de Resposta",
    description: "Tempo médio entre a criação do lead e a primeira resposta",
    category: "leads",
    formula: "AVG(first_response_time - lead_created_at)",
    humanFormula: "Em média, quanto tempo demoras a responder a um novo contacto",
    dataSource: ["leads", "conversations"],
    updateFrequency: "hourly",
    contexts: [
      { module: "kpis", displayLevel: "detailed", showTrend: true, showComparison: true },
      { module: "efficiency", displayLevel: "full", showTrend: true, showComparison: true },
    ],
    unit: "hours",
    precision: 1,
    higherIsBetter: false,
    thresholds: { warning: 24, critical: 48, excellent: 4 },
    requiredPermission: "user",
    version: "1.0.0",
    lastModified: "2024-01-15",
  },

  // ============================================
  // OPPORTUNITY METRICS
  // ============================================

  active_opportunities: {
    id: "active_opportunities",
    name: "Oportunidades Ativas",
    description: "Número de oportunidades em aberto",
    category: "opportunities",
    formula: "COUNT(opportunities WHERE status = 'open')",
    humanFormula: "Total de negócios em andamento que ainda não foram fechados",
    dataSource: ["opportunities"],
    updateFrequency: "realtime",
    contexts: [
      { module: "dashboard", displayLevel: "summary", showTrend: true, showComparison: false },
      { module: "kpis", displayLevel: "detailed", showTrend: true, showComparison: true },
      { module: "opportunities", displayLevel: "summary", showTrend: false, showComparison: false },
    ],
    unit: "number",
    precision: 0,
    requiredPermission: "user",
    version: "1.0.0",
    lastModified: "2024-01-15",
  },

  total_pipeline_value: {
    id: "total_pipeline_value",
    name: "Valor Total em Pipeline",
    description: "Soma do valor de todas as oportunidades abertas",
    category: "revenue",
    formula: "SUM(value) WHERE opportunities.status = 'open'",
    humanFormula: "Quanto dinheiro está em jogo se fechares todos os negócios ativos",
    dataSource: ["opportunities"],
    updateFrequency: "realtime",
    contexts: [
      { module: "dashboard", displayLevel: "summary", showTrend: true, showComparison: true },
      { module: "kpis", displayLevel: "detailed", showTrend: true, showComparison: true },
      { module: "financial", displayLevel: "full", showTrend: true, showComparison: true },
    ],
    unit: "currency",
    precision: 0,
    higherIsBetter: true,
    requiredPermission: "user",
    version: "1.0.0",
    lastModified: "2024-01-15",
  },

  weighted_pipeline_value: {
    id: "weighted_pipeline_value",
    name: "Valor Ponderado",
    description: "Valor do pipeline multiplicado pela probabilidade de fecho",
    category: "revenue",
    formula: "SUM(value * probability / 100) WHERE opportunities.status = 'open'",
    humanFormula: "Valor realista esperado, considerando a probabilidade de cada negócio fechar",
    dataSource: ["opportunities", "pipeline_stages"],
    updateFrequency: "realtime",
    contexts: [
      { module: "kpis", displayLevel: "detailed", showTrend: true, showComparison: true },
      { module: "financial", displayLevel: "full", showTrend: true, showComparison: true },
      { module: "forecast", displayLevel: "detailed", showTrend: true, showComparison: true },
    ],
    unit: "currency",
    precision: 0,
    higherIsBetter: true,
    requiredPermission: "user",
    version: "1.0.0",
    lastModified: "2024-01-15",
  },

  close_rate: {
    id: "close_rate",
    name: "Taxa de Fecho",
    description: "Percentagem de oportunidades ganhas vs total de fechadas",
    category: "opportunities",
    formula: "(COUNT(won) / COUNT(won + lost)) * 100",
    humanFormula: "De cada 100 negócios finalizados, quantos foram ganhos",
    dataSource: ["opportunities"],
    updateFrequency: "hourly",
    contexts: [
      { module: "kpis", displayLevel: "detailed", showTrend: true, showComparison: true },
      { module: "dashboard", displayLevel: "summary", showTrend: true, showComparison: false },
      { module: "sellers", displayLevel: "full", showTrend: true, showComparison: true },
    ],
    unit: "percentage",
    precision: 1,
    higherIsBetter: true,
    thresholds: { warning: 20, excellent: 50 },
    requiredPermission: "user",
    version: "1.0.0",
    lastModified: "2024-01-15",
  },

  avg_close_time: {
    id: "avg_close_time",
    name: "Tempo Médio até Fecho",
    description: "Dias médios desde criação até ganhar oportunidade",
    category: "opportunities",
    formula: "AVG(closed_at - created_at) WHERE status = 'won'",
    humanFormula: "Em média, quantos dias demora a fechar um negócio com sucesso",
    dataSource: ["opportunities"],
    updateFrequency: "daily",
    contexts: [
      { module: "kpis", displayLevel: "detailed", showTrend: true, showComparison: true },
      { module: "forecast", displayLevel: "full", showTrend: true, showComparison: true },
    ],
    unit: "days",
    precision: 0,
    higherIsBetter: false,
    thresholds: { warning: 60, critical: 90, excellent: 14 },
    requiredPermission: "user",
    version: "1.0.0",
    lastModified: "2024-01-15",
  },

  // ============================================
  // EFFICIENCY METRICS
  // ============================================

  stale_opportunities: {
    id: "stale_opportunities",
    name: "Oportunidades Paradas",
    description: "Oportunidades sem atividade há mais de 7 dias",
    category: "efficiency",
    formula: "COUNT(opportunities WHERE status = 'open' AND days_since_activity > 7)",
    humanFormula: "Negócios que podem estar esquecidos e precisam de atenção",
    dataSource: ["opportunities"],
    updateFrequency: "daily",
    contexts: [
      { module: "kpis", displayLevel: "detailed", showTrend: true, showComparison: false },
      { module: "efficiency", displayLevel: "full", showTrend: true, showComparison: true },
      { module: "alerts", displayLevel: "summary", showTrend: false, showComparison: false },
    ],
    unit: "number",
    precision: 0,
    higherIsBetter: false,
    thresholds: { warning: 5, critical: 10, excellent: 0 },
    requiredPermission: "user",
    version: "1.0.0",
    lastModified: "2024-01-15",
  },

  overdue_followups: {
    id: "overdue_followups",
    name: "Follow-ups em Atraso",
    description: "Tarefas de follow-up com data ultrapassada",
    category: "efficiency",
    formula: "COUNT(tasks WHERE due_at < NOW AND status != 'done')",
    humanFormula: "Tarefas que deviam ter sido feitas mas ainda estão pendentes",
    dataSource: ["tasks"],
    updateFrequency: "realtime",
    contexts: [
      { module: "kpis", displayLevel: "detailed", showTrend: true, showComparison: false },
      { module: "dashboard", displayLevel: "summary", showTrend: false, showComparison: false },
      { module: "alerts", displayLevel: "summary", showTrend: false, showComparison: false },
    ],
    unit: "number",
    precision: 0,
    higherIsBetter: false,
    thresholds: { warning: 3, critical: 10, excellent: 0 },
    requiredPermission: "user",
    version: "1.0.0",
    lastModified: "2024-01-15",
  },

  active_automations: {
    id: "active_automations",
    name: "Automações Ativas",
    description: "Número de regras de automação ligadas",
    category: "efficiency",
    formula: "COUNT(automation_rules WHERE is_active = true)",
    humanFormula: "Quantas automações estão a trabalhar por ti",
    dataSource: ["automation_rules"],
    updateFrequency: "realtime",
    contexts: [
      { module: "kpis", displayLevel: "summary", showTrend: false, showComparison: false },
      { module: "automations", displayLevel: "detailed", showTrend: true, showComparison: false },
    ],
    unit: "number",
    precision: 0,
    higherIsBetter: true,
    requiredPermission: "user",
    version: "1.0.0",
    lastModified: "2024-01-15",
  },

  time_saved_hours: {
    id: "time_saved_hours",
    name: "Tempo Poupado",
    description: "Estimativa de horas poupadas por automações",
    category: "efficiency",
    formula: "active_automations * 2",
    humanFormula: "Estimativa conservadora de horas poupadas semanalmente",
    dataSource: ["automation_rules"],
    updateFrequency: "daily",
    contexts: [
      { module: "kpis", displayLevel: "detailed", showTrend: true, showComparison: true },
      { module: "automations", displayLevel: "full", showTrend: true, showComparison: true },
    ],
    unit: "hours",
    precision: 0,
    higherIsBetter: true,
    requiredPermission: "user",
    version: "1.0.0",
    lastModified: "2024-01-15",
  },

  // ============================================
  // REVENUE & FORECAST METRICS
  // ============================================

  forecast_30d: {
    id: "forecast_30d",
    name: "Previsão 30 Dias",
    description: "Receita prevista para os próximos 30 dias",
    category: "revenue",
    formula: "SUM(weighted_value WHERE expected_close <= 30d)",
    humanFormula: "Quanto esperas faturar nos próximos 30 dias, baseado nas oportunidades atuais",
    dataSource: ["opportunities", "pipeline_stages"],
    updateFrequency: "daily",
    contexts: [
      { module: "kpis", displayLevel: "detailed", showTrend: true, showComparison: true },
      { module: "financial", displayLevel: "full", showTrend: true, showComparison: true },
      { module: "dashboard", displayLevel: "summary", showTrend: true, showComparison: false },
    ],
    unit: "currency",
    precision: 0,
    higherIsBetter: true,
    requiredPermission: "user",
    version: "1.0.0",
    lastModified: "2024-01-15",
  },

  forecast_60d: {
    id: "forecast_60d",
    name: "Previsão 60 Dias",
    description: "Receita prevista para os próximos 60 dias",
    category: "revenue",
    formula: "SUM(weighted_value WHERE expected_close <= 60d)",
    humanFormula: "Quanto esperas faturar nos próximos 60 dias",
    dataSource: ["opportunities", "pipeline_stages"],
    updateFrequency: "daily",
    contexts: [
      { module: "kpis", displayLevel: "detailed", showTrend: true, showComparison: true },
      { module: "financial", displayLevel: "full", showTrend: true, showComparison: true },
    ],
    unit: "currency",
    precision: 0,
    higherIsBetter: true,
    requiredPermission: "user",
    version: "1.0.0",
    lastModified: "2024-01-15",
  },

  forecast_90d: {
    id: "forecast_90d",
    name: "Previsão 90 Dias",
    description: "Receita prevista para os próximos 90 dias",
    category: "revenue",
    formula: "SUM(weighted_value WHERE expected_close <= 90d)",
    humanFormula: "Quanto esperas faturar nos próximos 90 dias",
    dataSource: ["opportunities", "pipeline_stages"],
    updateFrequency: "daily",
    contexts: [
      { module: "kpis", displayLevel: "detailed", showTrend: true, showComparison: true },
      { module: "financial", displayLevel: "full", showTrend: true, showComparison: true },
    ],
    unit: "currency",
    precision: 0,
    higherIsBetter: true,
    requiredPermission: "user",
    version: "1.0.0",
    lastModified: "2024-01-15",
  },

  // ============================================
  // PIPELINE HEALTH METRICS
  // ============================================

  pipeline_health_score: {
    id: "pipeline_health_score",
    name: "Saúde do Pipeline",
    description: "Score de saúde geral do pipeline (0-100)",
    category: "opportunities",
    formula: "100 - (bottleneck_penalty) - (stale_penalty)",
    humanFormula: "Indicador de quão saudável está o teu funil de vendas",
    dataSource: ["opportunities", "pipeline_stages"],
    updateFrequency: "hourly",
    contexts: [
      { module: "kpis", displayLevel: "detailed", showTrend: true, showComparison: false },
      { module: "dashboard", displayLevel: "summary", showTrend: true, showComparison: false },
    ],
    unit: "number",
    precision: 0,
    higherIsBetter: true,
    thresholds: { warning: 60, critical: 40, excellent: 85 },
    requiredPermission: "user",
    version: "1.0.0",
    lastModified: "2024-01-15",
  },

  // ============================================
  // PERFORMANCE METRICS (SELLERS)
  // ============================================

  seller_conversion_rate: {
    id: "seller_conversion_rate",
    name: "Taxa de Conversão (Vendedor)",
    description: "Taxa de conversão individual do vendedor",
    category: "performance",
    formula: "(won_by_seller / total_closed_by_seller) * 100",
    humanFormula: "De cada 100 negócios que este vendedor finalizou, quantos foram ganhos",
    dataSource: ["opportunities"],
    updateFrequency: "daily",
    contexts: [
      { module: "sellers", displayLevel: "detailed", showTrend: true, showComparison: true },
      { module: "performance", displayLevel: "full", showTrend: true, showComparison: true },
    ],
    unit: "percentage",
    precision: 1,
    higherIsBetter: true,
    requiredPermission: "manager",
    version: "1.0.0",
    lastModified: "2024-01-15",
  },

  seller_revenue: {
    id: "seller_revenue",
    name: "Receita por Vendedor",
    description: "Total de receita gerada pelo vendedor",
    category: "performance",
    formula: "SUM(value) WHERE owner_id = seller AND status = 'won'",
    humanFormula: "Quanto este vendedor já faturou",
    dataSource: ["opportunities"],
    updateFrequency: "daily",
    contexts: [
      { module: "sellers", displayLevel: "detailed", showTrend: true, showComparison: true },
      { module: "financial", displayLevel: "full", showTrend: true, showComparison: true },
    ],
    unit: "currency",
    precision: 0,
    higherIsBetter: true,
    requiredPermission: "manager",
    version: "1.0.0",
    lastModified: "2024-01-15",
  },

  // ============================================
  // COMMISSION METRICS
  // ============================================

  total_commissions_pending: {
    id: "total_commissions_pending",
    name: "Comissões Pendentes",
    description: "Total de comissões a pagar",
    category: "commissions",
    formula: "SUM(commission_amount) WHERE status = 'pending'",
    humanFormula: "Quanto tens de comissões por pagar",
    dataSource: ["commissions", "payments"],
    updateFrequency: "daily",
    contexts: [
      { module: "financial", displayLevel: "full", showTrend: true, showComparison: true },
      { module: "commissions", displayLevel: "detailed", showTrend: true, showComparison: true },
    ],
    unit: "currency",
    precision: 0,
    higherIsBetter: false,
    requiredPermission: "financial",
    version: "1.0.0",
    lastModified: "2024-01-15",
  },

  // ============================================
  // AFFILIATE METRICS
  // ============================================

  affiliate_revenue: {
    id: "affiliate_revenue",
    name: "Receita por Afiliados",
    description: "Total de receita atribuída a afiliados",
    category: "affiliates",
    formula: "SUM(value) WHERE source = 'affiliate' AND status = 'won'",
    humanFormula: "Quanto os afiliados geraram em vendas",
    dataSource: ["opportunities", "affiliates"],
    updateFrequency: "daily",
    contexts: [
      { module: "affiliates", displayLevel: "detailed", showTrend: true, showComparison: true },
      { module: "financial", displayLevel: "full", showTrend: true, showComparison: true },
    ],
    unit: "currency",
    precision: 0,
    higherIsBetter: true,
    requiredPermission: "manager",
    version: "1.0.0",
    lastModified: "2024-01-15",
  },
};

// Helper to get metrics by category
export function getMetricsByCategory(category: MetricCategory): MetricDefinition[] {
  return Object.values(METRICS_CATALOG).filter(m => m.category === category);
}

// Helper to get metrics for a specific module/context
export function getMetricsForModule(moduleName: string): MetricDefinition[] {
  return Object.values(METRICS_CATALOG).filter(m => 
    m.contexts.some(c => c.module === moduleName)
  );
}

// Helper to get metric by ID
export function getMetricDefinition(metricId: string): MetricDefinition | undefined {
  return METRICS_CATALOG[metricId];
}

// Get display config for metric in specific module
export function getMetricDisplayConfig(metricId: string, moduleName: string) {
  const metric = METRICS_CATALOG[metricId];
  if (!metric) return null;
  return metric.contexts.find(c => c.module === moduleName) || null;
}
