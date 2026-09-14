/**
 * Feed Engine — transformação do Product Master em feeds por canal.
 *
 * Arquitetura: Product Master → mapper → validator → serializer → Output Feed.
 * As regras de cada canal externo vivem exclusivamente no respetivo adaptador,
 * nunca no modelo central de produtos.
 */
import { effectivePrice, priceRange } from "./readiness.ts";
import { productPublicUrl, resolveAvailability, resolveSchemaType } from "./schemaOrg.ts";
import type { CommerceProduct, FeedChannel, FeedFormat, ProductAICommerce } from "./types.ts";

export interface FeedContext {
  baseUrl: string;
  workspaceSlug: string;
  language?: string | null;
  country?: string | null;
}

export interface FeedIssue {
  product_id?: string;
  message: string;
}

export interface MappedItem {
  product_id: string;
  record: Record<string, unknown>;
}

export interface ChannelAdapter {
  channel: FeedChannel;
  label: string;
  format: FeedFormat;
  contentType: string;
  map(product: CommerceProduct, ai: Partial<ProductAICommerce> | null, ctx: FeedContext): Record<string, unknown>;
  validate(record: Record<string, unknown>): { errors: string[]; warnings: string[] };
  serialize(records: Record<string, unknown>[], ctx: FeedContext): string;
}

function text(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function firstImage(product: CommerceProduct): string {
  const images = Array.isArray(product.images) ? product.images.filter(Boolean) : [];
  const idx = product.primary_image_index ?? 0;
  return images[idx] || images[0] || "";
}

function availabilityLabel(product: CommerceProduct): string {
  const status = (product.stock_status || "").toLowerCase();
  if (status === "out_of_stock" || status === "discontinued") return "out_of_stock";
  if (status === "preorder") return "preorder";
  return "in_stock";
}

function priceString(product: CommerceProduct): string {
  const price = effectivePrice(product);
  if (price === null) return "";
  return `${price.toFixed(2)} ${product.currency || "EUR"}`;
}

/** Variantes ativas normalizadas para os canais que as suportam. */
function variantRecords(product: CommerceProduct): Record<string, unknown>[] {
  return (product.variants || [])
    .filter((v) => v && v.is_active !== false)
    .map((v) => ({
      id: v.id,
      name: v.name || null,
      sku: v.sku || null,
      price:
        typeof v.price_override === "number" && v.price_override > 0
          ? Number(v.price_override.toFixed(2))
          : typeof product.base_price === "number"
            ? Number(product.base_price.toFixed(2))
            : null,
      currency: product.currency || "EUR",
      availability:
        typeof v.stock_quantity === "number" && v.stock_quantity <= 0
          ? "out_of_stock"
          : availabilityLabel(product),
      attributes: v.attributes || {},
    }));
}

function xmlEscape(value: unknown): string {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function toXml(records: Record<string, unknown>[], rootTag: string, itemTag: string, prefix = ""): string {
  const items = records
    .map((r) => {
      const fields = Object.entries(r)
        .filter(([, v]) => v !== null && v !== undefined && v !== "")
        .map(([k, v]) => {
          const value = Array.isArray(v) ? v.join(", ") : v;
          return `    <${prefix}${k}>${xmlEscape(value)}</${prefix}${k}>`;
        })
        .join("\n");
      return `  <${itemTag}>\n${fields}\n  </${itemTag}>`;
    })
    .join("\n");
  return `<?xml version="1.0" encoding="UTF-8"?>\n<${rootTag} xmlns:g="http://base.google.com/ns/1.0">\n${items}\n</${rootTag}>`;
}

function toCsv(records: Record<string, unknown>[]): string {
  if (!records.length) return "";
  const headers = Array.from(new Set(records.flatMap((r) => Object.keys(r))));
  const escape = (v: unknown) => {
    const s = Array.isArray(v) ? v.join("|") : v == null ? "" : String(v);
    return /[",;\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  return [headers.join(","), ...records.map((r) => headers.map((h) => escape(r[h])).join(","))].join("\n");
}

function baseRecord(product: CommerceProduct, ai: Partial<ProductAICommerce> | null, ctx: FeedContext) {
  const url = productPublicUrl(product, { baseUrl: ctx.baseUrl, workspaceSlug: ctx.workspaceSlug });
  return {
    id: product.sku || product.id,
    title: text(ai?.ai_title) || text(product.name),
    description: text(ai?.ai_short_description) || text(product.short_description),
    link: url,
    image_link: firstImage(product),
    brand: text(product.brand) || text(product.manufacturer),
    price: priceString(product),
    availability: availabilityLabel(product),
    condition: text(product.product_condition) || "new",
    url,
  };
}

/** Adaptador OpenAI Commerce (ChatGPT). Modular: campos podem evoluir sem tocar no modelo. */
const openaiAdapter: ChannelAdapter = {
  channel: "openai",
  label: "OpenAI Commerce",
  format: "json",
  contentType: "application/json; charset=utf-8",
  map(product, ai, ctx) {
    const b = baseRecord(product, ai, ctx);
    return {
      id: b.id,
      sku: product.sku || null,
      gtin: product.gtin || null,
      mpn: product.mpn || null,
      title: b.title,
      brand: b.brand,
      product_type: resolveSchemaType(product),
      category: text(ai?.ai_category) || text(product.category),
      short_description: b.description,
      long_description: text(ai?.ai_long_description) || text(product.commercial_description),
      price: effectivePrice(product),
      price_min: priceRange(product)?.min ?? null,
      price_max: priceRange(product)?.max ?? null,
      variants: variantRecords(product),
      currency: product.currency || "EUR",
      availability: b.availability,
      product_url: b.link,
      canonical_url: product.canonical_url || b.link,
      checkout_url: product.checkout_url || b.link,
      image: b.image_link,
      gallery: (product.images || []).filter(Boolean),
      target_audience: text(ai?.ai_target_audience) || text(product.target_audience),
      problem_solved: text(ai?.ai_problem_solved) || text(product.problem_solved),
      use_cases: ai?.ai_use_cases?.length ? ai.ai_use_cases : product.use_cases || [],
      key_features: ai?.ai_key_features?.length ? ai.ai_key_features : product.features || [],
      benefits: product.main_benefits?.length ? product.main_benefits : product.benefits || [],
      faq: ai?.ai_faq || [],
      keywords: ai?.ai_keywords || [],
      recommendation_context: text(ai?.ai_recommendation_context),
      exclusions: text(ai?.ai_exclusions),
      countries: product.countries?.length ? product.countries : ctx.country ? [ctx.country] : [],
      languages: product.languages?.length ? product.languages : ctx.language ? [ctx.language] : [],
      schema_type: resolveSchemaType(product),
      availability_schema: resolveAvailability(product),
    };
  },
  validate(record) {
    const errors: string[] = [];
    const warnings: string[] = [];
    for (const field of ["id", "title", "brand", "price", "currency", "product_url", "checkout_url"]) {
      if (!record[field]) errors.push(`Campo obrigatório em falta: ${field}`);
    }
    if (!record.image) errors.push("Campo obrigatório em falta: image");
    if (!record.recommendation_context) warnings.push("Sem contexto de recomendação para assistentes de IA");
    if (!(record.faq as unknown[])?.length) warnings.push("Sem FAQ");
    if (text(record.long_description).length < 200) warnings.push("Descrição longa curta (<200 caracteres)");
    return { errors, warnings };
  },
  serialize(records) {
    return JSON.stringify({ version: "1.0", generated_at: new Date().toISOString(), products: records }, null, 2);
  },
};

const googleAdapter: ChannelAdapter = {
  channel: "google",
  label: "Google Merchant",
  format: "xml",
  contentType: "application/xml; charset=utf-8",
  map(product, ai, ctx) {
    const b = baseRecord(product, ai, ctx);
    return {
      id: b.id,
      title: b.title.slice(0, 150),
      description: (b.description || text(ai?.ai_long_description)).slice(0, 5000),
      link: b.link,
      image_link: b.image_link,
      availability: b.availability,
      price: b.price,
      brand: b.brand,
      condition: b.condition,
      ...(product.gtin ? { gtin: product.gtin } : {}),
      ...(product.mpn ? { mpn: product.mpn } : {}),
      product_type: text(product.category),
      identifier_exists: product.gtin || product.mpn ? "yes" : "no",
    };
  },
  validate(record) {
    const errors: string[] = [];
    const warnings: string[] = [];
    for (const field of ["id", "title", "description", "link", "image_link", "availability", "price"]) {
      if (!record[field]) errors.push(`Google exige o campo: ${field}`);
    }
    if (!record.brand) warnings.push("Google recomenda marca");
    if (!record.gtin && !record.mpn) warnings.push("Sem GTIN nem MPN");
    return { errors, warnings };
  },
  serialize(records) {
    return toXml(records, "rss", "item", "g:");
  },
};

const metaAdapter: ChannelAdapter = {
  channel: "meta",
  label: "Meta Catalog",
  format: "csv",
  contentType: "text/csv; charset=utf-8",
  map(product, ai, ctx) {
    const b = baseRecord(product, ai, ctx);
    return {
      id: b.id,
      title: b.title,
      description: b.description,
      availability: b.availability,
      condition: b.condition,
      price: b.price,
      link: b.link,
      image_link: b.image_link,
      brand: b.brand,
      google_product_category: text(product.category),
    };
  },
  validate(record) {
    const errors: string[] = [];
    const warnings: string[] = [];
    for (const field of ["id", "title", "description", "availability", "condition", "price", "link", "image_link"]) {
      if (!record[field]) errors.push(`Meta exige o campo: ${field}`);
    }
    if (!record.brand) warnings.push("Meta recomenda marca");
    return { errors, warnings };
  },
  serialize(records) {
    return toCsv(records);
  },
};

const genericJsonAdapter: ChannelAdapter = {
  channel: "json",
  label: "JSON genérico",
  format: "json",
  contentType: "application/json; charset=utf-8",
  map: (product, ai, ctx) => baseRecord(product, ai, ctx),
  validate(record) {
    const errors = !record.id || !record.title ? ["Faltam id ou title"] : [];
    return { errors, warnings: [] };
  },
  serialize(records) {
    return JSON.stringify({ generated_at: new Date().toISOString(), products: records }, null, 2);
  },
};

const genericXmlAdapter: ChannelAdapter = {
  ...genericJsonAdapter,
  channel: "xml",
  label: "XML genérico",
  format: "xml",
  contentType: "application/xml; charset=utf-8",
  serialize(records) {
    return toXml(records, "products", "product");
  },
};

const csvAdapter: ChannelAdapter = {
  ...genericJsonAdapter,
  channel: "csv",
  label: "CSV",
  format: "csv",
  contentType: "text/csv; charset=utf-8",
  serialize(records) {
    return toCsv(records);
  },
};

export const CHANNEL_ADAPTERS: Record<FeedChannel, ChannelAdapter> = {
  openai: openaiAdapter,
  google: googleAdapter,
  meta: metaAdapter,
  json: genericJsonAdapter,
  xml: genericXmlAdapter,
  csv: csvAdapter,
};

export function getAdapter(channel: FeedChannel): ChannelAdapter {
  return CHANNEL_ADAPTERS[channel] ?? genericJsonAdapter;
}

export interface FeedBuildResult {
  body: string;
  contentType: string;
  productCount: number;
  /** Produtos analisados (antes da validação do canal). */
  inputCount: number;
  /** Produtos rejeitados por erros do canal. */
  rejectedCount: number;
  errors: FeedIssue[];
  warnings: FeedIssue[];
  /** Mensagem legível, ex.: "4 produtos sem preço." */
  summary: string;
}

/** Agrupa erros por mensagem para produzir um resumo compreensível. */
export function summarizeIssues(issues: FeedIssue[]): string {
  if (!issues.length) return "";
  const counts = new Map<string, number>();
  for (const issue of issues) {
    counts.set(issue.message, (counts.get(issue.message) || 0) + 1);
  }
  return Array.from(counts.entries())
    .sort((a, b) => b[1] - a[1])
    .map(([message, count]) => `${count} ${count === 1 ? "produto" : "produtos"}: ${message}`)
    .join(" · ");
}

export function buildFeed(
  channel: FeedChannel,
  rows: { product: CommerceProduct; ai: Partial<ProductAICommerce> | null }[],
  ctx: FeedContext,
): FeedBuildResult {
  const adapter = getAdapter(channel);
  const records: Record<string, unknown>[] = [];
  const errors: FeedIssue[] = [];
  const warnings: FeedIssue[] = [];

  for (const row of rows) {
    const record = adapter.map(row.product, row.ai, ctx);
    const check = adapter.validate(record);
    check.errors.forEach((message) => errors.push({ product_id: row.product.id, message }));
    check.warnings.forEach((message) => warnings.push({ product_id: row.product.id, message }));
    // Produtos com erro do canal são excluídos do output (fail-closed).
    if (!check.errors.length) records.push(record);
  }

  return {
    body: adapter.serialize(records, ctx),
    contentType: adapter.contentType,
    productCount: records.length,
    inputCount: rows.length,
    rejectedCount: rows.length - records.length,
    errors,
    warnings,
    summary: summarizeIssues(errors),
  };
}
