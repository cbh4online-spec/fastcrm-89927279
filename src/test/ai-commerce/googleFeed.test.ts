/**
 * Feed Google Merchant: RSS 2.0 válido, sem identifier_exists inventado,
 * sem etiquetas internas de margem, e canal Meta inalterado.
 */
import { describe, expect, it } from "vitest";
import { buildFeed, type FeedContext } from "@/lib/ai-commerce/feeds";
import type { CommerceProduct } from "@/lib/ai-commerce/types";

const ctx: FeedContext = {
  baseUrl: "https://fastcrm.metodopare.ai",
  workspaceSlug: "ajax",
  storeName: "Ajax Systems",
  storeUrl: "https://fastcrm.metodopare.ai/store/ajax",
};

function product(i: number, extra: Partial<CommerceProduct> = {}): CommerceProduct {
  return {
    id: `00000000-0000-0000-0000-${String(i).padStart(12, "0")}`,
    name: `Produto ${i}`,
    sku: `SKU-${i}`,
    brand: "Ajax",
    store_slug: `produto-${i}`,
    category: "Intrusão",
    product_type: "physical",
    short_description: "Descrição real do produto com detalhe suficiente para o teste.",
    base_price: 49.25,
    currency: "EUR",
    stock_status: "in_stock",
    status: "active",
    store_published: true,
    images: [`https://cdn.example.com/${i}.jpg`],
    target_margin_pct: 45,
    gtin: null,
    mpn: null,
    ...extra,
  };
}

const rows = (n: number, extra: Partial<CommerceProduct> = {}) =>
  Array.from({ length: n }, (_, i) => ({ product: product(i + 1, extra), ai: { ai_readiness_score: 90 } }));

function parse(xml: string) {
  const doc = new DOMParser().parseFromString(xml, "application/xml");
  expect(doc.getElementsByTagName("parsererror").length).toBe(0);
  return doc;
}

const G = "http://base.google.com/ns/1.0";

describe("feed Google Merchant", () => {
  it("gera RSS 2.0 com channel, title, link e description", () => {
    const doc = parse(buildFeed("google", rows(2), ctx).body);
    const rss = doc.documentElement;
    expect(rss.tagName).toBe("rss");
    expect(rss.getAttribute("version")).toBe("2.0");
    const channel = rss.getElementsByTagName("channel")[0];
    expect(channel.parentNode).toBe(rss);
    expect(channel.getElementsByTagName("title")[0].textContent).toBe("Ajax Systems");
    expect(channel.getElementsByTagName("link")[0].textContent).toBe("https://fastcrm.metodopare.ai/store/ajax");
    expect(channel.getElementsByTagName("description")[0].textContent).toBeTruthy();
    const items = channel.getElementsByTagName("item");
    expect(items.length).toBe(2);
    expect(items[0].parentNode).toBe(channel);
    expect(items[0].getElementsByTagNameNS(G, "price")[0].textContent).toBe("49.25 EUR");
    expect(items[0].getElementsByTagNameNS(G, "link")[0].textContent).toBe(
      "https://fastcrm.metodopare.ai/store/ajax/product/produto-1",
    );
    expect(items[0].getElementsByTagNameNS(G, "image_link")[0].textContent).toBe("https://cdn.example.com/1.jpg");
  });

  it("inclui os 629 produtos (mais de um lote de 100) sem truncar", () => {
    const result = buildFeed("google", rows(629), ctx);
    expect(result.productCount).toBe(629);
    expect(result.rejectedCount).toBe(0);
    const ids = Array.from(parse(result.body).getElementsByTagNameNS(G, "id")).map((n) => n.textContent);
    expect(new Set(ids).size).toBe(629);
  });

  it("omite identifier_exists quando GTIN/MPN estão ausentes e mantém aviso", () => {
    const result = buildFeed("google", rows(1), ctx);
    expect(result.body).not.toContain("identifier_exists");
    expect(result.body).not.toContain("<g:mpn>");
    expect(result.warnings.some((w) => w.message === "Sem GTIN nem MPN")).toBe(true);
  });

  it("emite identifier_exists=yes apenas com identificadores reais", () => {
    const result = buildFeed("google", rows(1, { gtin: "4820246990012" }), ctx);
    expect(result.body).toContain("<g:identifier_exists>yes</g:identifier_exists>");
    expect(result.body).toContain("<g:gtin>4820246990012</g:gtin>");
  });

  it("não transmite etiqueta de margem ao Google", () => {
    const body = buildFeed("google", rows(1), ctx).body;
    expect(body).not.toContain("custom_label_3");
    expect(body).not.toMatch(/margem-/);
  });

  it("continua a rejeitar produto sem marca nem identificadores", () => {
    const result = buildFeed("google", rows(1, { brand: null }), ctx);
    expect(result.productCount).toBe(0);
  });

  it("canal Meta mantém CSV e etiquetas atuais", () => {
    const result = buildFeed("meta", rows(1), ctx);
    expect(result.contentType).toContain("text/csv");
    expect(result.body).toContain("custom_label_3");
    expect(result.body).toContain("margem-alta");
  });
});

describe("links do feed Google", () => {
  const G2 = "http://base.google.com/ns/1.0";
  const link = (xml: string) =>
    new DOMParser().parseFromString(xml, "application/xml").getElementsByTagNameNS(G2, "link")[0].textContent;

  it("ignora canonical_url antiga e usa a loja atual + slug atual", () => {
    const r = rows(1, { canonical_url: "https://fastcrm.metodopare.ai/store/ajax-systems/product/antigo" });
    r[0].product.store_slug = "aj-hub2plus-w";
    expect(link(buildFeed("google", r, ctx).body)).toBe("https://fastcrm.metodopare.ai/store/ajax/product/aj-hub2plus-w");
  });

  it("sem canonical_url usa a loja atual (https), nunca host interno", () => {
    const r = rows(1, { canonical_url: null });
    expect(link(buildFeed("google", r, ctx).body)).toBe("https://fastcrm.metodopare.ai/store/ajax/product/produto-1");
  });

  it("Meta mantém o link canónico existente", () => {
    const r = rows(1, { canonical_url: "https://fastcrm.metodopare.ai/store/ajax-systems/product/antigo" });
    expect(buildFeed("meta", r, ctx).body).toContain("/store/ajax-systems/product/antigo");
  });
});
