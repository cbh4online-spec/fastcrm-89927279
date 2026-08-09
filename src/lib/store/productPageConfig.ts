/**
 * Configuração da ficha de produto pública (guardada em store_settings.product_page_config).
 * Fonte única de verdade partilhada entre backoffice e loja pública.
 */

export interface ProductPageConfig {
  /** Faixa de confiança */
  trust_enabled: boolean;
  trust_delivery: boolean;
  trust_free_shipping: boolean;
  trust_returns: boolean;
  trust_secure_payment: boolean;
  trust_support: boolean;
  trust_returns_text: string;
  trust_support_text: string;
  /** Blocos da ficha */
  decision_nudge_enabled: boolean;
  sections_enabled: boolean;
  bundles_enabled: boolean;
  cheaper_alternatives_enabled: boolean;
  qa_enabled: boolean;
  /** Permitir submissão pública de perguntas (mantém moderação) */
  qa_allow_questions: boolean;
}

export const DEFAULT_PRODUCT_PAGE_CONFIG: ProductPageConfig = {
  trust_enabled: true,
  trust_delivery: true,
  trust_free_shipping: true,
  trust_returns: true,
  trust_secure_payment: true,
  trust_support: true,
  trust_returns_text: "14 dias para devolver (direito de livre resolução)",
  trust_support_text: "Respondemos a todas as questões",
  decision_nudge_enabled: true,
  sections_enabled: true,
  bundles_enabled: true,
  cheaper_alternatives_enabled: true,
  qa_enabled: true,
  qa_allow_questions: true,
};

/** Normaliza o JSON guardado, aplicando defaults a campos em falta. */
export function parseProductPageConfig(raw: unknown): ProductPageConfig {
  const obj = (raw && typeof raw === "object" ? raw : {}) as Record<string, unknown>;
  const bool = (key: keyof ProductPageConfig) =>
    typeof obj[key] === "boolean" ? (obj[key] as boolean) : (DEFAULT_PRODUCT_PAGE_CONFIG[key] as boolean);
  const text = (key: keyof ProductPageConfig) => {
    const v = obj[key];
    return typeof v === "string" && v.trim().length > 0 ? v.trim() : (DEFAULT_PRODUCT_PAGE_CONFIG[key] as string);
  };

  return {
    trust_enabled: bool("trust_enabled"),
    trust_delivery: bool("trust_delivery"),
    trust_free_shipping: bool("trust_free_shipping"),
    trust_returns: bool("trust_returns"),
    trust_secure_payment: bool("trust_secure_payment"),
    trust_support: bool("trust_support"),
    trust_returns_text: text("trust_returns_text"),
    trust_support_text: text("trust_support_text"),
    decision_nudge_enabled: bool("decision_nudge_enabled"),
    sections_enabled: bool("sections_enabled"),
    bundles_enabled: bool("bundles_enabled"),
    cheaper_alternatives_enabled: bool("cheaper_alternatives_enabled"),
    qa_enabled: bool("qa_enabled"),
    qa_allow_questions: bool("qa_allow_questions"),
  };
}
