/**
 * Motor determinístico do Copiloto de Conversão.
 *
 * Cruza o funil real (eventos `ai_commerce_events`) com o estado do catálogo
 * (preço, stock, readiness AI Commerce) e devolve recomendações acionáveis.
 * Nunca inventa métricas: se não houver eventos, não há diagnóstico.
 */

export type CopilotIssueKind =
  | "critical_dropoff"
  | "abandoned_cart"
  | "low_readiness"
  | "cross_sell_opportunity"
  | "stock_risk";

export type CopilotSeverity = "critical" | "warning" | "opportunity";

export interface CopilotFunnelStats {
  productId: string;
  views: number;
  carts: number;
  checkouts: number;
  purchases: number;
  revenue: number;
}

export interface CopilotProductInput {
  id: string;
  name: string;
  sku?: string | null;
  price: number | null;
  stockStatus?: string | null;
  storePublished?: boolean | null;
  readinessScore: number;
  aiEnabled: boolean;
  /** Acessórios/relacionados já configurados para este produto. */
  hasAccessories?: boolean;
}

export interface CopilotRecommendation {
  productId: string;
  productName: string;
  sku?: string | null;
  kind: CopilotIssueKind;
  severity: CopilotSeverity;
  title: string;
  detail: string;
  action: "enrich" | "review_price" | "review_shipping" | "add_accessories" | "review_stock";
  actionLabel: string;
  /** Impacto mensal estimado em euros, derivado de dados reais. */
  estimatedImpact: number;
  stats: CopilotFunnelStats;
}

export interface CopilotFunnelTotals {
  views: number;
  carts: number;
  checkouts: number;
  purchases: number;
  revenue: number;
  viewToCartRate: number;
  cartToPurchaseRate: number;
  conversionRate: number;
  averageOrderValue: number;
}

export interface CopilotGoalProjection {
  target: number;
  currentRevenue: number;
  progressPct: number;
  /** Encomendas mensais necessárias ao ticket médio atual. */
  ordersNeeded: number;
  /** Visitas mensais necessárias à conversão atual. */
  visitsNeeded: number;
  gap: number;
}

export interface CopilotAnalysis {
  totals: CopilotFunnelTotals;
  goal: CopilotGoalProjection;
  recommendations: CopilotRecommendation[];
  hasData: boolean;
}

const MIN_VIEWS_FOR_DROPOFF = 15;
const MIN_CARTS_FOR_ABANDON = 5;

function rate(part: number, whole: number) {
  return whole > 0 ? (part / whole) * 100 : 0;
}

/** Normaliza janelas de dias para base mensal (30 dias). */
function toMonthly(value: number, days: number) {
  if (days <= 0) return value;
  return (value / days) * 30;
}

export function analyzeConversionCopilot(
  products: CopilotProductInput[],
  funnel: Map<string, CopilotFunnelStats>,
  options: { days: number; targetMonthlyRevenue?: number },
): CopilotAnalysis {
  const days = options.days > 0 ? options.days : 30;
  const target = options.targetMonthlyRevenue ?? 50000;

  const totals = { views: 0, carts: 0, checkouts: 0, purchases: 0, revenue: 0 };
  for (const stats of funnel.values()) {
    totals.views += stats.views;
    totals.carts += stats.carts;
    totals.checkouts += stats.checkouts;
    totals.purchases += stats.purchases;
    totals.revenue += stats.revenue;
  }

  const averageOrderValue = totals.purchases > 0 ? totals.revenue / totals.purchases : 0;
  const conversionRate = rate(totals.purchases, totals.views);
  const funnelTotals: CopilotFunnelTotals = {
    ...totals,
    viewToCartRate: rate(totals.carts, totals.views),
    cartToPurchaseRate: rate(totals.purchases, totals.carts),
    conversionRate,
    averageOrderValue,
  };

  const monthlyRevenue = toMonthly(totals.revenue, days);
  const ordersNeeded = averageOrderValue > 0 ? Math.ceil(target / averageOrderValue) : 0;
  const visitsNeeded = conversionRate > 0 ? Math.ceil((ordersNeeded / conversionRate) * 100) : 0;

  const goal: CopilotGoalProjection = {
    target,
    currentRevenue: monthlyRevenue,
    progressPct: target > 0 ? Math.min(100, (monthlyRevenue / target) * 100) : 0,
    ordersNeeded,
    visitsNeeded,
    gap: Math.max(0, target - monthlyRevenue),
  };

  const recommendations: CopilotRecommendation[] = [];
  const benchmarkAov = averageOrderValue > 0 ? averageOrderValue : 0;
  const benchmarkViewToCart = funnelTotals.viewToCartRate;

  for (const product of products) {
    const stats =
      funnel.get(product.id) ??
      ({ productId: product.id, views: 0, carts: 0, checkouts: 0, purchases: 0, revenue: 0 } as CopilotFunnelStats);

    const unitValue = product.price && product.price > 0 ? product.price : benchmarkAov;
    const base = {
      productId: product.id,
      productName: product.name,
      sku: product.sku,
      stats,
    };

    // 1. Tráfego sem adições ao carrinho — fuga na ficha do produto.
    if (stats.views >= MIN_VIEWS_FOR_DROPOFF && stats.carts === 0) {
      recommendations.push({
        ...base,
        kind: "critical_dropoff",
        severity: "critical",
        title: "Visitas sem nenhuma adição ao carrinho",
        detail: `${stats.views} visitas e zero carrinhos. Reveja o benefício principal, as fotografias e o preço face à concorrência.`,
        action: product.readinessScore < 80 ? "enrich" : "review_price",
        actionLabel: product.readinessScore < 80 ? "Melhorar conteúdo com IA" : "Rever preço",
        estimatedImpact: toMonthly(stats.views * 0.02 * unitValue, days),
      });
      continue;
    }

    // 2. Conversão de visita para carrinho muito abaixo da loja.
    if (
      stats.views >= MIN_VIEWS_FOR_DROPOFF &&
      benchmarkViewToCart > 0 &&
      rate(stats.carts, stats.views) < benchmarkViewToCart / 2
    ) {
      recommendations.push({
        ...base,
        kind: "critical_dropoff",
        severity: "warning",
        title: "Interesse muito abaixo da média da loja",
        detail: `Só ${rate(stats.carts, stats.views).toFixed(1)}% das visitas adicionam ao carrinho (média da loja: ${benchmarkViewToCart.toFixed(1)}%).`,
        action: "enrich",
        actionLabel: "Melhorar conteúdo com IA",
        estimatedImpact: toMonthly(stats.views * 0.01 * unitValue, days),
      });
      continue;
    }

    // 3. Carrinhos que não fecham — portes, peso ou checkout.
    if (stats.carts >= MIN_CARTS_FOR_ABANDON && stats.purchases === 0) {
      recommendations.push({
        ...base,
        kind: "abandoned_cart",
        severity: "critical",
        title: "Carrinhos sempre abandonados no pagamento",
        detail: `${stats.carts} carrinhos sem nenhuma compra. Confirme portes, prazo de entrega e métodos de pagamento.`,
        action: "review_shipping",
        actionLabel: "Rever portes e envio",
        estimatedImpact: toMonthly(stats.carts * 0.3 * unitValue, days),
      });
      continue;
    }

    // 4. Produto a vender sem acessórios associados — subir ticket médio.
    if (stats.purchases > 0 && product.hasAccessories === false) {
      recommendations.push({
        ...base,
        kind: "cross_sell_opportunity",
        severity: "opportunity",
        title: "Vende bem mas sem complementos sugeridos",
        detail: `${stats.purchases} compras no período. Associar acessórios pode subir o valor médio da encomenda.`,
        action: "add_accessories",
        actionLabel: "Sugerir acessórios",
        estimatedImpact: toMonthly(stats.purchases * unitValue * 0.2, days),
      });
      continue;
    }

    // 5. Risco de rutura com procura confirmada.
    if (stats.views > 0 && product.stockStatus === "out_of_stock") {
      recommendations.push({
        ...base,
        kind: "stock_risk",
        severity: "warning",
        title: "Procura ativa mas sem stock",
        detail: `${stats.views} visitas com o artigo esgotado. Repor stock ou retirar dos anúncios para não gastar orçamento.`,
        action: "review_stock",
        actionLabel: "Rever stock",
        estimatedImpact: toMonthly(stats.views * 0.02 * unitValue, days),
      });
      continue;
    }

    // 6. Potencial adormecido: publicado, com visitas, mas ficha pobre.
    if (product.storePublished && stats.views > 0 && product.readinessScore < 60) {
      recommendations.push({
        ...base,
        kind: "low_readiness",
        severity: "opportunity",
        title: "Ficha incompleta a limitar a procura",
        detail: `Qualidade da ficha em ${product.readinessScore}%. Completar o conteúdo melhora a pesquisa e a decisão de compra.`,
        action: "enrich",
        actionLabel: "Melhorar conteúdo com IA",
        estimatedImpact: toMonthly(stats.views * 0.01 * unitValue, days),
      });
    }
  }

  const severityRank: Record<CopilotSeverity, number> = { critical: 0, warning: 1, opportunity: 2 };
  recommendations.sort(
    (a, b) => severityRank[a.severity] - severityRank[b.severity] || b.estimatedImpact - a.estimatedImpact,
  );

  return {
    totals: funnelTotals,
    goal,
    recommendations,
    hasData: totals.views > 0 || totals.purchases > 0,
  };
}
