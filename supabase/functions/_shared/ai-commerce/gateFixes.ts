/**
 * Correções em massa seguras do Quality Gate.
 *
 * Só campos deriváveis de dados reais ou de valores explicitamente indicados
 * pelo utilizador. NUNCA preços, stock, GTIN, MPN, marca ou conteúdo comercial.
 */
import type { CommerceProduct, ProductAICommerce } from "./types.ts";

export type GateFixCode =
  | "currency"
  | "store_slug"
  | "schema_type"
  | "availability"
  | "language_country"
  | "short_description";

export interface GateFixDefaults {
  /** Moeda por omissão indicada pelo utilizador (nunca inventada pelo motor). */
  currency: string;
  language: string;
  country: string;
}

export const DEFAULT_GATE_FIX_DEFAULTS: GateFixDefaults = {
  currency: "EUR",
  language: "pt",
  country: "PT",
};

export const GATE_FIX_LABELS: Record<GateFixCode, string> = {
  currency: "Definir moeda por omissão",
  store_slug: "Gerar endereço público a partir do nome",
  schema_type: "Definir tipo de dados estruturados",
  availability: "Acertar disponibilidade com o stock real",
  language_country: "Definir idioma e país de venda",
  short_description: "Copiar a descrição curta existente para o AI Commerce",
};

export interface GateFixPlan {
  productId: string;
  applied: GateFixCode[];
  productPatch: Record<string, unknown>;
  aiPatch: Record<string, unknown>;
}

function hasText(value: unknown, min = 1): boolean {
  return typeof value === "string" && value.trim().length >= min;
}

function hasList(value: unknown): boolean {
  return Array.isArray(value) && value.filter((v) => hasText(v)).length > 0;
}

function slugify(text: string): string {
  return (text || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 70)
    .replace(/-+$/, "");
}

function schemaTypeFor(product: CommerceProduct): string {
  const type = (product.product_type || "").toLowerCase();
  if (type.includes("software") || type.includes("saas") || type.includes("subscription")) return "SoftwareApplication";
  if (type.includes("service") || type.includes("serviço")) return "Service";
  if (type.includes("course") || type.includes("curso") || type.includes("formação")) return "Course";
  return "Product";
}

function availabilityFor(product: CommerceProduct & { track_stock?: boolean | null; stock_quantity?: number | null }): string | null {
  if (product.track_stock !== true) return "in_stock";
  const qty = typeof product.stock_quantity === "number" ? product.stock_quantity : null;
  if (qty === null) return null;
  return qty > 0 ? "in_stock" : "out_of_stock";
}

/**
 * Constrói o plano de correção de um produto. Devolve `null` quando não há
 * nada seguro para corrigir.
 */
export function buildGateFixPlan(
  product: CommerceProduct & { track_stock?: boolean | null; stock_quantity?: number | null },
  ai: Partial<ProductAICommerce> | null,
  fixes: GateFixCode[],
  defaults: GateFixDefaults = DEFAULT_GATE_FIX_DEFAULTS,
): GateFixPlan | null {
  const productPatch: Record<string, unknown> = {};
  const aiPatch: Record<string, unknown> = {};
  const applied: GateFixCode[] = [];
  const wants = (code: GateFixCode) => fixes.includes(code);

  if (wants("currency") && !hasText(product.currency, 3) && hasText(defaults.currency, 3)) {
    productPatch.currency = defaults.currency.trim().toUpperCase();
    applied.push("currency");
  }

  if (wants("store_slug") && !hasText(product.store_slug) && hasText(product.name, 3)) {
    const base = slugify(product.name!);
    if (base) {
      productPatch.store_slug = `${base}-${product.id.slice(0, 6)}`;
      applied.push("store_slug");
    }
  }

  if (wants("schema_type") && !hasText(product.schema_type)) {
    productPatch.schema_type = schemaTypeFor(product);
    applied.push("schema_type");
  }

  if (wants("availability") && !hasText(product.stock_status)) {
    const availability = availabilityFor(product);
    if (availability) {
      productPatch.stock_status = availability;
      applied.push("availability");
    }
  }

  if (wants("language_country")) {
    let touched = false;
    if (!hasList(product.languages) && hasText(defaults.language)) {
      productPatch.languages = [defaults.language.trim().toLowerCase()];
      touched = true;
    }
    if (!hasList(product.countries) && hasText(defaults.country)) {
      productPatch.countries = [defaults.country.trim().toUpperCase()];
      touched = true;
    }
    if (touched) applied.push("language_country");
  }

  if (
    wants("short_description") &&
    !hasText(ai?.ai_short_description, 40) &&
    hasText(product.short_description, 40)
  ) {
    aiPatch.ai_short_description = product.short_description!.trim();
    applied.push("short_description");
  }

  if (!applied.length) return null;
  return { productId: product.id, applied, productPatch, aiPatch };
}
