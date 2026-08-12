/**
 * Leitura/escrita dos metadados SEO no <head> do HTML do Builder.
 * Trabalha sempre sobre o documento completo; se o HTML for um fragmento,
 * é embrulhado num documento mínimo antes de escrever.
 */

export interface BuilderSeoMeta {
  title: string;
  description: string;
  ogImage: string;
  lang: string;
  favicon: string;
  canonical: string;
}

export const EMPTY_SEO: BuilderSeoMeta = {
  title: "",
  description: "",
  ogImage: "",
  lang: "pt-PT",
  favicon: "",
  canonical: "",
};

function parse(html: string): { doc: Document; hadHtml: boolean } {
  const hadHtml = /<html[\s>]/i.test(html ?? "");
  const wrapped = hadHtml
    ? html
    : `<!doctype html><html lang="pt-PT"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head><body>${html ?? ""}</body></html>`;
  return { doc: new DOMParser().parseFromString(wrapped, "text/html"), hadHtml };
}

function readMeta(doc: Document, selector: string, attr = "content"): string {
  return doc.head.querySelector(selector)?.getAttribute(attr)?.trim() ?? "";
}

export function readSeo(html: string): BuilderSeoMeta {
  if (!html?.trim()) return { ...EMPTY_SEO };
  const { doc } = parse(html);
  return {
    title: doc.head.querySelector("title")?.textContent?.trim() ?? "",
    description: readMeta(doc, 'meta[name="description"]'),
    ogImage:
      readMeta(doc, 'meta[property="og:image"]') || readMeta(doc, 'meta[name="twitter:image"]'),
    lang: doc.documentElement.getAttribute("lang")?.trim() || "pt-PT",
    favicon: readMeta(doc, 'link[rel~="icon"]', "href"),
    canonical: readMeta(doc, 'link[rel="canonical"]', "href"),
  };
}

function upsertMeta(
  doc: Document,
  selector: string,
  create: () => HTMLElement,
  value: string,
  attr = "content",
) {
  const existing = doc.head.querySelector(selector);
  if (!value.trim()) {
    existing?.remove();
    return;
  }
  const el = existing ?? doc.head.appendChild(create());
  el.setAttribute(attr, value.trim());
}

/** Escreve os metadados no <head> e devolve o HTML completo actualizado. */
export function writeSeo(html: string, seo: BuilderSeoMeta): string {
  const { doc } = parse(html ?? "");

  doc.documentElement.setAttribute("lang", seo.lang?.trim() || "pt-PT");

  if (!doc.head.querySelector("meta[charset]")) {
    const charset = doc.createElement("meta");
    charset.setAttribute("charset", "utf-8");
    doc.head.prepend(charset);
  }
  if (!doc.head.querySelector('meta[name="viewport"]')) {
    const vp = doc.createElement("meta");
    vp.setAttribute("name", "viewport");
    vp.setAttribute("content", "width=device-width,initial-scale=1");
    doc.head.appendChild(vp);
  }

  // <title>
  const title = seo.title.trim();
  const titleEl = doc.head.querySelector("title");
  if (!title) {
    titleEl?.remove();
  } else {
    (titleEl ?? doc.head.appendChild(doc.createElement("title"))).textContent = title;
  }

  const meta = (attrName: "name" | "property", key: string) => () => {
    const el = doc.createElement("meta");
    el.setAttribute(attrName, key);
    return el;
  };
  const link = (rel: string) => () => {
    const el = doc.createElement("link");
    el.setAttribute("rel", rel);
    return el;
  };

  upsertMeta(doc, 'meta[name="description"]', meta("name", "description"), seo.description);
  upsertMeta(doc, 'meta[property="og:title"]', meta("property", "og:title"), title);
  upsertMeta(
    doc,
    'meta[property="og:description"]',
    meta("property", "og:description"),
    seo.description,
  );
  upsertMeta(doc, 'meta[property="og:type"]', meta("property", "og:type"), title ? "website" : "");
  upsertMeta(doc, 'meta[property="og:image"]', meta("property", "og:image"), seo.ogImage);
  upsertMeta(
    doc,
    'meta[name="twitter:card"]',
    meta("name", "twitter:card"),
    seo.ogImage ? "summary_large_image" : "",
  );
  upsertMeta(doc, 'meta[name="twitter:title"]', meta("name", "twitter:title"), title);
  upsertMeta(
    doc,
    'meta[name="twitter:description"]',
    meta("name", "twitter:description"),
    seo.description,
  );
  upsertMeta(doc, 'meta[name="twitter:image"]', meta("name", "twitter:image"), seo.ogImage);
  upsertMeta(doc, 'link[rel~="icon"]', link("icon"), seo.favicon, "href");
  upsertMeta(doc, 'link[rel="canonical"]', link("canonical"), seo.canonical, "href");

  return `<!doctype html>\n${doc.documentElement.outerHTML}`;
}

export const SEO_LIMITS = { title: 60, description: 160 } as const;
