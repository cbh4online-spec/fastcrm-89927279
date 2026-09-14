/**
 * AI Commerce Readiness Engine — motor puro (sem I/O), reutilizável no
 * frontend (pré-visualização) e nas Edge Functions (fonte de verdade).
 *
 * Regra fundamental: nunca inventa dados. Um campo em falta é reportado como
 * problema, nunca preenchido automaticamente.
 */
import type {
  CommerceProduct,
  ProductAICommerce,
  ReadinessCategory,
  ReadinessCategoryScore,
  ReadinessConfigOverride,
  ReadinessIssue,
  ReadinessResult,
} from "./types.ts";

const MIN_SHORT_DESCRIPTION = 40;
const MIN_LONG_DESCRIPTION = 200;

function hasText(value: string | null | undefined, min = 1): boolean {
  return typeof value === "string" && value.trim().length >= min;
}

function hasList(value: string[] | null | undefined, min = 1): boolean {
  return Array.isArray(value) && value.filter((v) => hasText(v)).length >= min;
}

function isValidUrl(value: string | null | undefined): boolean {
  if (!hasText(value)) return false;
  try {
    const url = new URL(value!.trim());
    return url.protocol === "https:" || url.protocol === "http:";
  } catch {
    return false;
  }
}

interface Criterion {
  code: string;
  label: string;
  message: string;
  weight: number;
  severity: "error" | "warning";
  target: "product" | "ai" | "feed";
  field?: string;
  test: (p: CommerceProduct, ai: Partial<ProductAICommerce> | null, ctx: ReadinessContext) => boolean;
}

export interface ReadinessContext {
  /** Nº de feeds ativos que incluem este produto (0 = sem publicação externa). */
  activeFeeds?: number;
  /** URL pública base da loja, quando conhecida. */
  storeBaseUrl?: string | null;
  /** Overrides configuráveis por workspace (pesos, severidade, ativação). */
  overrides?: ReadinessConfigOverride[] | null;
}

/** Categoria de cada critério — usada no score por categoria. */
const CATEGORY_BY_CODE: Record<string, ReadinessCategory> = {
  name: "identification",
  sku: "identification",
  brand: "identification",
  category: "identification",
  schema: "identification",
  price: "commercial",
  currency: "commercial",
  availability: "commercial",
  checkout: "commercial",
  public_url: "commercial",
  short_description: "content",
  long_description: "content",
  main_image: "content",
  target_audience: "content",
  benefits: "content",
  features: "content",
  faq: "content",
  recommendation_context: "content",
  canonical: "publishing",
  language: "publishing",
  country: "publishing",
  external_feed: "publishing",
};

/** Preço efetivo: base_price ou o menor preço de variante ativa. */
export function effectivePrice(p: CommerceProduct): number | null {
  const variantPrices = (p.variants || [])
    .filter((v) => v?.is_active !== false && typeof v?.price_override === "number" && (v!.price_override as number) > 0)
    .map((v) => v!.price_override as number);
  const candidates = [
    ...(typeof p.base_price === "number" && p.base_price > 0 ? [p.base_price] : []),
    ...variantPrices,
  ];
  if (!candidates.length) return null;
  return Math.min(...candidates);
}

/** Intervalo de preços quando há variantes com preços diferentes. */
export function priceRange(p: CommerceProduct): { min: number; max: number } | null {
  const prices = [
    ...(typeof p.base_price === "number" && p.base_price > 0 ? [p.base_price] : []),
    ...(p.variants || [])
      .filter((v) => v?.is_active !== false && typeof v?.price_override === "number" && (v!.price_override as number) > 0)
      .map((v) => v!.price_override as number),
  ];
  if (!prices.length) return null;
  return { min: Math.min(...prices), max: Math.max(...prices) };
}

const CRITERIA: Criterion[] = [
  {
    code: "name",
    label: "Nome",
    message: "O produto não tem nome definido.",
    weight: 6,
    severity: "error",
    target: "product",
    field: "name",
    test: (p) => hasText(p.name, 3),
  },
  {
    code: "sku",
    label: "SKU",
    message: "Falta o SKU — é obrigatório para feeds e agentes de compra.",
    weight: 5,
    severity: "error",
    target: "product",
    field: "sku",
    test: (p) => hasText(p.sku),
  },
  {
    code: "brand",
    label: "Marca",
    message: "Falta a marca do produto.",
    weight: 5,
    severity: "error",
    target: "product",
    field: "brand",
    test: (p) => hasText(p.brand) || hasText(p.manufacturer),
  },
  {
    code: "category",
    label: "Categoria",
    message: "Falta a categoria do produto.",
    weight: 5,
    severity: "error",
    target: "product",
    field: "category",
    test: (p, ai) => hasText(p.category) || hasText(ai?.ai_category),
  },
  {
    code: "price",
    label: "Preço",
    message: "Preço não definido (nem no produto nem em variantes ativas).",
    weight: 7,
    severity: "error",
    target: "product",
    field: "base_price",
    test: (p) => effectivePrice(p) !== null,
  },
  {
    code: "currency",
    label: "Moeda",
    message: "Falta a moeda do preço.",
    weight: 3,
    severity: "error",
    target: "product",
    field: "currency",
    test: (p) => hasText(p.currency, 3),
  },
  {
    code: "availability",
    label: "Disponibilidade",
    message: "Disponibilidade não definida.",
    weight: 4,
    severity: "error",
    target: "product",
    field: "stock_status",
    test: (p) => hasText(p.stock_status),
  },
  {
    code: "short_description",
    label: "Descrição curta",
    message: `Descrição curta demasiado curta (mínimo ${MIN_SHORT_DESCRIPTION} caracteres).`,
    weight: 5,
    severity: "error",
    target: "ai",
    field: "ai_short_description",
    test: (p, ai) =>
      hasText(ai?.ai_short_description, MIN_SHORT_DESCRIPTION) ||
      hasText(p.short_description, MIN_SHORT_DESCRIPTION),
  },
  {
    code: "long_description",
    label: "Descrição longa",
    message: `Descrição longa demasiado curta (mínimo ${MIN_LONG_DESCRIPTION} caracteres).`,
    weight: 6,
    severity: "error",
    target: "ai",
    field: "ai_long_description",
    test: (p, ai) =>
      hasText(ai?.ai_long_description, MIN_LONG_DESCRIPTION) ||
      hasText(p.commercial_description, MIN_LONG_DESCRIPTION),
  },
  {
    code: "main_image",
    label: "Imagem principal",
    message: "Falta imagem principal.",
    weight: 6,
    severity: "error",
    target: "product",
    field: "images",
    test: (p) => hasList(p.images),
  },
  {
    code: "public_url",
    label: "URL pública",
    message: "O produto não tem URL pública (slug da loja em falta).",
    weight: 5,
    severity: "error",
    target: "product",
    field: "store_slug",
    test: (p) => hasText(p.store_slug) || isValidUrl(p.canonical_url),
  },
  {
    code: "checkout",
    label: "Checkout",
    message: "Checkout URL inválida ou inexistente.",
    weight: 6,
    severity: "error",
    target: "product",
    field: "checkout_url",
    test: (p) => isValidUrl(p.checkout_url) || (hasText(p.store_slug) && p.store_published === true),
  },
  {
    code: "target_audience",
    label: "Público-alvo",
    message: "Falta target audience.",
    weight: 5,
    severity: "error",
    target: "ai",
    field: "ai_target_audience",
    test: (p, ai) => hasText(ai?.ai_target_audience) || hasText(p.target_audience),
  },
  {
    code: "benefits",
    label: "Benefícios",
    message: "Não há benefícios definidos.",
    weight: 4,
    severity: "error",
    target: "product",
    field: "main_benefits",
    test: (p) => hasList(p.main_benefits) || hasList(p.benefits),
  },
  {
    code: "features",
    label: "Funcionalidades",
    message: "Não há funcionalidades definidas.",
    weight: 4,
    severity: "error",
    target: "ai",
    field: "ai_key_features",
    test: (p, ai) => hasList(ai?.ai_key_features) || hasList(p.features),
  },
  {
    code: "faq",
    label: "FAQ",
    message: "Falta FAQ (pelo menos duas perguntas).",
    weight: 4,
    severity: "warning",
    target: "ai",
    field: "ai_faq",
    test: (_p, ai) =>
      Array.isArray(ai?.ai_faq) &&
      ai!.ai_faq!.filter((f) => hasText(f?.question) && hasText(f?.answer)).length >= 2,
  },
  {
    code: "schema",
    label: "Dados estruturados",
    message: "Sem Schema.org — falta definir o tipo de dados estruturados.",
    weight: 4,
    severity: "error",
    target: "product",
    field: "schema_type",
    test: (p) => hasText(p.schema_type),
  },
  {
    code: "canonical",
    label: "Canonical URL",
    message: "Canonical URL em falta ou inválida.",
    weight: 3,
    severity: "warning",
    target: "product",
    field: "canonical_url",
    test: (p, _ai, ctx) => isValidUrl(p.canonical_url) || (!!ctx.storeBaseUrl && hasText(p.store_slug)),
  },
  {
    code: "language",
    label: "Idioma",
    message: "Nenhum idioma definido para publicação externa.",
    weight: 3,
    severity: "warning",
    target: "product",
    field: "languages",
    test: (p) => hasList(p.languages),
  },
  {
    code: "country",
    label: "País",
    message: "Nenhum país de disponibilidade definido.",
    weight: 3,
    severity: "warning",
    target: "product",
    field: "countries",
    test: (p) => hasList(p.countries),
  },
  {
    code: "recommendation_context",
    label: "Contexto de recomendação",
    message: "Falta o contexto de recomendação para assistentes de IA.",
    weight: 5,
    severity: "error",
    target: "ai",
    field: "ai_recommendation_context",
    test: (_p, ai) => hasText(ai?.ai_recommendation_context, 30),
  },
  {
    code: "external_feed",
    label: "Feed externo",
    message: "O produto não está incluído em nenhum feed externo ativo.",
    weight: 2,
    severity: "warning",
    target: "feed",
    test: (_p, _ai, ctx) => (ctx.activeFeeds ?? 0) > 0,
  },
];

export const READINESS_MAX_SCORE = CRITERIA.reduce((sum, c) => sum + c.weight, 0);

/** Critérios que definem "pronto para venda" (Commerce Ready). */
export const COMMERCE_READY_CODES = ["price", "currency", "availability", "checkout"] as const;

function categoryOf(code: string): ReadinessCategory {
  return CATEGORY_BY_CODE[code] ?? "publishing";
}

function applyOverrides(ctx: ReadinessContext): Criterion[] {
  const map = new Map<string, ReadinessConfigOverride>();
  for (const o of ctx.overrides || []) {
    if (o?.code) map.set(o.code, o);
  }
  if (!map.size) return CRITERIA;
  return CRITERIA.filter((c) => map.get(c.code)?.enabled !== false).map((c) => {
    const o = map.get(c.code);
    if (!o) return c;
    return {
      ...c,
      weight: typeof o.weight === "number" && o.weight >= 0 ? o.weight : c.weight,
      severity: o.severity === "error" || o.severity === "warning" ? o.severity : c.severity,
    };
  });
}

export function evaluateReadiness(
  product: CommerceProduct,
  ai: Partial<ProductAICommerce> | null,
  ctx: ReadinessContext = {},
): ReadinessResult {
  const criteria = applyOverrides(ctx);
  const issues: ReadinessIssue[] = [];
  const passed: string[] = [];
  const byCategory = new Map<ReadinessCategory, { earned: number; max: number }>();
  let earned = 0;
  let maxWeight = 0;

  for (const criterion of criteria) {
    const category = categoryOf(criterion.code);
    const bucket = byCategory.get(category) || { earned: 0, max: 0 };
    bucket.max += criterion.weight;
    maxWeight += criterion.weight;

    let ok = false;
    try {
      ok = criterion.test(product, ai, ctx);
    } catch {
      ok = false;
    }
    if (ok) {
      earned += criterion.weight;
      bucket.earned += criterion.weight;
      passed.push(criterion.code);
    } else {
      issues.push({
        code: criterion.code,
        label: criterion.label,
        message: criterion.message,
        severity: criterion.severity,
        category,
        target: criterion.target,
        field: criterion.field,
      });
    }
    byCategory.set(category, bucket);
  }

  const score = maxWeight > 0 ? Math.round((earned / maxWeight) * 100) : 0;
  const categories: ReadinessCategoryScore[] = Array.from(byCategory.entries()).map(
    ([category, b]) => ({
      category,
      earned: b.earned,
      max: b.max,
      score: b.max > 0 ? Math.round((b.earned / b.max) * 100) : 0,
    }),
  );

  return {
    score,
    maxScore: 100,
    issues,
    passed,
    isReady: issues.every((i) => i.severity !== "error"),
    isCommerceReady: COMMERCE_READY_CODES.every(
      (code) => !criteria.some((c) => c.code === code) || passed.includes(code),
    ),
    categories,
  };
}

export function readinessBand(score: number): "critical" | "low" | "good" | "excellent" {
  if (score < 40) return "critical";
  if (score < 70) return "low";
  if (score < 90) return "good";
  return "excellent";
}

export const READINESS_CATEGORY_LABELS: Record<ReadinessCategory, string> = {
  identification: "Identificação",
  commercial: "Comercial",
  content: "Conteúdo",
  publishing: "Publicação",
};

export const READINESS_CRITERIA_LABELS = CRITERIA.map((c) => ({
  code: c.code,
  label: c.label,
  weight: c.weight,
  severity: c.severity,
  category: categoryOf(c.code),
}));
