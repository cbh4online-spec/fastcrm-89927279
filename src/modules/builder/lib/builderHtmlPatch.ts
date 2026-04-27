/**
 * Utilidades para WYSIWYG do Builder.
 *
 * Estratégia: cada elemento editável recebe um `data-bid` estável
 * (sequência DFS). O iframe visual envia patches identificando o bid;
 * aqui reconstrói-se o HTML aplicando essas alterações.
 */

const BID_ATTR = "data-bid";

/** Tags que NÃO devem receber bid (estrutura de documento). */
const SKIP_TAGS = new Set(["HTML", "HEAD", "META", "LINK", "TITLE", "STYLE", "SCRIPT", "BODY"]);

function parseDoc(html: string): Document {
  const hasHtml = /<html[\s>]/i.test(html);
  const wrapped = hasHtml
    ? html
    : `<!doctype html><html><head><meta charset="utf-8"></head><body>${html}</body></html>`;
  const parser = new DOMParser();
  return parser.parseFromString(wrapped, "text/html");
}

function serializeDoc(doc: Document, originalHadHtml: boolean): string {
  if (originalHadHtml) {
    return `<!doctype html>\n${doc.documentElement.outerHTML}`;
  }
  return doc.body.innerHTML;
}

/** Atribui (ou re-atribui) bids a todos os elementos editáveis. */
export function ensureBids(html: string): string {
  if (!html?.trim()) return html;
  const originalHadHtml = /<html[\s>]/i.test(html);
  const doc = parseDoc(html);
  let counter = 1;
  const all = doc.querySelectorAll("*");
  all.forEach((el) => {
    if (SKIP_TAGS.has(el.tagName)) {
      el.removeAttribute(BID_ATTR);
      return;
    }
    el.setAttribute(BID_ATTR, `b${counter++}`);
  });
  return serializeDoc(doc, originalHadHtml);
}

/** Remove bids do HTML (para guardar versão limpa, se necessário). */
export function stripBids(html: string): string {
  if (!html?.trim()) return html;
  const originalHadHtml = /<html[\s>]/i.test(html);
  const doc = parseDoc(html);
  doc.querySelectorAll(`[${BID_ATTR}]`).forEach((el) => el.removeAttribute(BID_ATTR));
  return serializeDoc(doc, originalHadHtml);
}

export type BuilderPatch =
  | { type: "text"; bid: string; value: string }
  | { type: "attr"; bid: string; name: string; value: string | null }
  | { type: "style"; bid: string; styles: Record<string, string | null> };

/** Aplica um patch ao HTML. Devolve o HTML actualizado. */
export function applyPatch(html: string, patch: BuilderPatch): string {
  if (!html?.trim()) return html;
  const originalHadHtml = /<html[\s>]/i.test(html);
  const doc = parseDoc(html);
  const el = doc.querySelector(`[${BID_ATTR}="${cssEscape(patch.bid)}"]`) as HTMLElement | null;
  if (!el) return html;

  if (patch.type === "text") {
    el.textContent = patch.value;
  } else if (patch.type === "attr") {
    if (patch.value === null || patch.value === "") {
      el.removeAttribute(patch.name);
    } else {
      el.setAttribute(patch.name, patch.value);
    }
  } else if (patch.type === "style") {
    Object.entries(patch.styles).forEach(([k, v]) => {
      if (v === null || v === "") {
        el.style.removeProperty(camelToKebab(k));
      } else {
        el.style.setProperty(camelToKebab(k), v);
      }
    });
    // limpar atributo style se ficou vazio
    if (!el.getAttribute("style")?.trim()) el.removeAttribute("style");
  }

  return serializeDoc(doc, originalHadHtml);
}

function camelToKebab(s: string): string {
  return s.replace(/[A-Z]/g, (m) => `-${m.toLowerCase()}`);
}

function cssEscape(s: string): string {
  // CSS.escape pode não estar disponível em SSR; bids são alfanuméricos por construção
  if (typeof CSS !== "undefined" && CSS.escape) return CSS.escape(s);
  return s.replace(/"/g, '\\"');
}
