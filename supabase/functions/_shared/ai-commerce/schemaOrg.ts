/**
 * Gerador central de dados estruturados (JSON-LD) a partir da base de dados.
 *
 * Regras rígidas: nada é inventado. Sem reviews, sem ratings, sem preços e sem
 * disponibilidade que não existam nas tabelas do FastCRM.
 */
import type { AIFaqEntry, CommerceProduct, ProductAICommerce } from "./types.ts";

export type SchemaType =
  | "Product"
  | "SoftwareApplication"
  | "Service"
  | "Course";

const AVAILABILITY_MAP: Record<string, string> = {
  in_stock: "https://schema.org/InStock",
  available: "https://schema.org/InStock",
  low_stock: "https://schema.org/LimitedAvailability",
  out_of_stock: "https://schema.org/OutOfStock",
  preorder: "https://schema.org/PreOrder",
  discontinued: "https://schema.org/Discontinued",
};

export function resolveSchemaType(product: CommerceProduct): SchemaType {
  const explicit = (product.schema_type || "").trim();
  if (explicit === "SoftwareApplication" || explicit === "Service" || explicit === "Course" || explicit === "Product") {
    return explicit;
  }
  const type = (product.product_type || "").toLowerCase();
  if (type.includes("software") || type.includes("saas") || type.includes("subscription")) return "SoftwareApplication";
  if (type.includes("service") || type.includes("serviço")) return "Service";
  if (type.includes("course") || type.includes("curso") || type.includes("formação")) return "Course";
  return "Product";
}

export function resolveAvailability(product: CommerceProduct): string | null {
  const key = (product.stock_status || "").toLowerCase();
  return AVAILABILITY_MAP[key] ?? null;
}

export function productPublicUrl(
  product: CommerceProduct,
  opts: { baseUrl: string; workspaceSlug: string },
): string {
  if (product.canonical_url && /^https?:\/\//.test(product.canonical_url)) return product.canonical_url;
  const slug = product.store_slug || product.id;
  return `${opts.baseUrl.replace(/\/$/, "")}/store/${opts.workspaceSlug}/product/${slug}`;
}

function offerNode(product: CommerceProduct, url: string) {
  if (typeof product.base_price !== "number" || product.base_price <= 0) return null;
  const availability = resolveAvailability(product);
  return {
    "@type": "Offer",
    url,
    price: Number(product.base_price.toFixed(2)),
    priceCurrency: product.currency || "EUR",
    ...(availability ? { availability } : {}),
    ...(product.countries?.length ? { eligibleRegion: product.countries } : {}),
  };
}

export interface SchemaBuildInput {
  product: CommerceProduct;
  ai?: Partial<ProductAICommerce> | null;
  baseUrl: string;
  workspaceSlug: string;
  organizationName?: string | null;
  organizationUrl?: string | null;
  breadcrumbs?: { name: string; url: string }[];
}

/** Devolve um array de nós JSON-LD (Product/Offer, Organization, Breadcrumb, FAQ). */
export function buildProductJsonLd(input: SchemaBuildInput): Record<string, unknown>[] {
  const { product, ai, baseUrl, workspaceSlug } = input;
  const url = productPublicUrl(product, { baseUrl, workspaceSlug });
  const schemaType = resolveSchemaType(product);
  const nodes: Record<string, unknown>[] = [];

  const name = ai?.ai_title || product.name || "";
  const description =
    ai?.ai_short_description || product.short_description || ai?.ai_long_description || product.commercial_description || "";
  const images = Array.isArray(product.images) ? product.images.filter(Boolean) : [];
  const offer = offerNode(product, url);

  const base: Record<string, unknown> = {
    "@context": "https://schema.org",
    "@type": schemaType,
    name,
    url,
    ...(description ? { description } : {}),
    ...(images.length ? { image: images } : {}),
    ...(product.sku ? { sku: product.sku } : {}),
    ...(product.gtin ? { gtin: product.gtin } : {}),
    ...(product.mpn ? { mpn: product.mpn } : {}),
    ...(product.brand || product.manufacturer
      ? { brand: { "@type": "Brand", name: product.brand || product.manufacturer } }
      : {}),
    ...(offer ? { offers: offer } : {}),
  };

  if (schemaType === "SoftwareApplication") {
    base.applicationCategory = ai?.ai_category || product.category || "BusinessApplication";
    if (product.languages?.length) base.inLanguage = product.languages;
  }
  if (schemaType === "Product") {
    if (product.category) base.category = product.category;
    if (product.product_condition) {
      base.itemCondition =
        product.product_condition === "new"
          ? "https://schema.org/NewCondition"
          : "https://schema.org/UsedCondition";
    }
  }
  if (schemaType === "Service" && (product.brand || input.organizationName)) {
    base.provider = { "@type": "Organization", name: product.brand || input.organizationName };
  }
  if (schemaType === "Course" && (product.brand || input.organizationName)) {
    base.provider = { "@type": "Organization", name: product.brand || input.organizationName };
  }

  nodes.push(base);

  if (input.organizationName) {
    nodes.push({
      "@context": "https://schema.org",
      "@type": "Organization",
      name: input.organizationName,
      ...(input.organizationUrl ? { url: input.organizationUrl } : {}),
    });
  }

  if (input.breadcrumbs?.length) {
    nodes.push({
      "@context": "https://schema.org",
      "@type": "BreadcrumbList",
      itemListElement: input.breadcrumbs.map((b, i) => ({
        "@type": "ListItem",
        position: i + 1,
        name: b.name,
        item: b.url,
      })),
    });
  }

  const faq: AIFaqEntry[] = (ai?.ai_faq || []).filter(
    (f) => !!f?.question?.trim() && !!f?.answer?.trim(),
  );
  if (faq.length) {
    nodes.push({
      "@context": "https://schema.org",
      "@type": "FAQPage",
      mainEntity: faq.map((f) => ({
        "@type": "Question",
        name: f.question,
        acceptedAnswer: { "@type": "Answer", text: f.answer },
      })),
    });
  }

  return nodes;
}
