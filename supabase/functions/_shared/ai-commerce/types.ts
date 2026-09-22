/**
 * Tipos partilhados da camada AI Commerce.
 *
 * O produto continua a ser a fonte de verdade (`products` + tabelas satélite).
 * A camada AI Commerce apenas acrescenta metadados e regras de publicação
 * externa — nunca substitui o modelo comercial existente.
 */

export interface AIFaqEntry {
  question: string;
  answer: string;
}

/** Registo da tabela `product_ai_commerce`. */
export interface ProductAICommerce {
  id?: string;
  workspace_id?: string;
  product_id: string;
  ai_commerce_enabled: boolean;
  ai_title: string | null;
  ai_short_description: string | null;
  ai_long_description: string | null;
  ai_category: string | null;
  ai_target_audience: string | null;
  ai_problem_solved: string | null;
  ai_use_cases: string[] | null;
  ai_key_features: string[] | null;
  ai_faq: AIFaqEntry[] | null;
  ai_keywords: string[] | null;
  ai_recommendation_context: string | null;
  ai_exclusions: string | null;
  ai_last_validation: string | null;
  ai_readiness_score: number;
  ai_readiness_issues?: ReadinessIssue[] | null;
}

/**
 * Vista mínima do produto necessária para o motor de readiness, feeds e
 * dados estruturados. Mapeia colunas reais da tabela `products`.
 */
export interface CommerceProduct {
  id: string;
  workspace_id?: string;
  name: string | null;
  sku: string | null;
  brand: string | null;
  manufacturer?: string | null;
  gtin?: string | null;
  mpn?: string | null;
  store_slug: string | null;
  category: string | null;
  subcategory?: string | null;
  product_type: string | null;
  schema_type?: string | null;
  short_description: string | null;
  commercial_description?: string | null;
  base_price: number | null;
  compare_at_price?: number | null;
  currency: string | null;
  tax_included?: boolean | null;
  tax_class?: string | null;
  activation_fee?: number | null;
  setup_fee?: number | null;
  recurring_fee?: number | null;
  billing_type?: string | null;
  billing_frequency?: string | null;
  stock_status: string | null;
  status: string | null;
  store_published?: boolean | null;
  images: string[] | null;
  primary_image_index?: number | null;
  seo_title?: string | null;
  seo_description?: string | null;
  canonical_url?: string | null;
  checkout_url?: string | null;
  target_audience?: string | null;
  problem_solved?: string | null;
  use_cases?: string[] | null;
  main_benefits?: string[] | null;
  benefits?: string[] | null;
  features?: string[] | null;
  countries?: string[] | null;
  languages?: string[] | null;
  product_condition?: string | null;
  origin_country?: string | null;
  /** Peso em kg — usado para `g:shipping_weight` (portes reais, nunca estimados). */
  weight?: number | null;
  weight_gross?: number | null;
  weight_net?: number | null;
  /** Margem-alvo (%) — usada apenas para etiquetas de campanha (custom_label). */
  target_margin_pct?: number | null;
  /** Categoria oficial Google, quando definida manualmente. */
  google_product_category?: string | null;
  /** Variantes ativas (preço/subscrição). Nunca inventadas: vêm de `product_variants`. */
  variants?: CommerceVariant[] | null;
}

export type ReadinessSeverity = "error" | "warning";

/** Agrupamento apresentado ao utilizador (score por categoria). */
export type ReadinessCategory = "identification" | "commercial" | "content" | "publishing";

export interface ReadinessIssue {
  /** Chave estável do critério — usada para o CTA "Corrigir". */
  code: string;
  label: string;
  message: string;
  severity: ReadinessSeverity;
  category: ReadinessCategory;
  /** Onde corrigir: `product` (ficha) ou `ai` (separador AI Commerce). */
  target: "product" | "ai" | "feed";
  field?: string;
}

/** Override configurável (tabela `ai_commerce_readiness_config`). */
export interface ReadinessConfigOverride {
  code: string;
  weight?: number | null;
  severity?: ReadinessSeverity | null;
  enabled?: boolean | null;
}

export interface ReadinessCategoryScore {
  category: ReadinessCategory;
  earned: number;
  max: number;
  score: number;
}

export interface ReadinessResult {
  score: number;
  maxScore: number;
  issues: ReadinessIssue[];
  passed: string[];
  isReady: boolean;
  /** Pronto para venda: preço, moeda, disponibilidade e checkout válidos. */
  isCommerceReady: boolean;
  categories: ReadinessCategoryScore[];
}

/** Variante de produto relevante para preço/feeds (fonte: `product_variants`). */
export interface CommerceVariant {
  id: string;
  name: string | null;
  sku: string | null;
  price_override: number | null;
  stock_quantity?: number | null;
  is_active?: boolean | null;
  attributes?: Record<string, string> | null;
}

export type FeedChannel = "openai" | "google" | "meta" | "xml" | "json" | "csv";
export type FeedFormat = "json" | "xml" | "csv";

export interface CommerceFeed {
  id: string;
  workspace_id: string;
  name: string;
  channel: FeedChannel;
  format: FeedFormat;
  is_active: boolean;
  filters: Record<string, unknown>;
  language: string | null;
  country: string | null;
  public_token: string;
  last_generated_at: string | null;
  last_status: string | null;
  last_product_count: number;
  last_error_count: number;
  last_warning_count: number;
  created_at: string;
  updated_at: string;
}

export interface CommerceFeedRun {
  id: string;
  feed_id: string;
  status: "running" | "success" | "error";
  product_count: number;
  errors: { product_id?: string; message: string }[];
  warnings: { product_id?: string; message: string }[];
  duration_ms: number | null;
  created_at: string;
}
