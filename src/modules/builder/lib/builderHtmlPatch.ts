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
  | { type: "style"; bid: string; styles: Record<string, string | null> }
  | { type: "replaceOuter"; bid: string; value: string };

/** Devolve o outerHTML do elemento com o bid indicado, ou null. */
export function getOuterHtmlByBid(html: string, bid: string): string | null {
  if (!html?.trim() || !bid) return null;
  const doc = parseDoc(html);
  const el = doc.querySelector(`[${BID_ATTR}="${cssEscape(bid)}"]`);
  return el ? (el as HTMLElement).outerHTML : null;
}

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
  } else if (patch.type === "replaceOuter") {
    // Substitui o elemento inteiro por novo HTML (assume que o novo HTML é um único elemento root).
    const tpl = doc.createElement("template");
    tpl.innerHTML = patch.value.trim();
    const newNode = tpl.content.firstElementChild;
    if (newNode && el.parentNode) {
      // Preservar o bid no novo elemento para manter a selecção utilizável
      (newNode as HTMLElement).setAttribute(BID_ATTR, patch.bid);
      el.parentNode.replaceChild(newNode, el);
    }
  }

  return serializeDoc(doc, originalHadHtml);
}

// ===================== Operações de secção =====================

export type SectionPosition = "before" | "after" | "append";

export interface BuilderSection {
  bid: string;
  tag: string;
  label: string;
}

/** Lista as secções de topo (filhos directos do body) com bid. */
export function listSections(html: string): BuilderSection[] {
  if (!html?.trim()) return [];
  const doc = parseDoc(html);
  return Array.from(doc.body.children)
    .filter((el) => el.hasAttribute(BID_ATTR))
    .map((el) => ({
      bid: el.getAttribute(BID_ATTR) as string,
      tag: el.tagName.toLowerCase(),
      label: sectionLabel(el as HTMLElement),
    }));
}

function sectionLabel(el: HTMLElement): string {
  const heading = el.querySelector("h1,h2,h3")?.textContent?.trim();
  if (heading) return heading.slice(0, 40);
  const tag = el.tagName.toLowerCase();
  const map: Record<string, string> = {
    header: "Cabeçalho",
    footer: "Rodapé",
    nav: "Navegação",
    section: "Secção",
    main: "Conteúdo",
    div: "Bloco",
  };
  return map[tag] ?? tag;
}

/** Sobe/desce uma secção de topo. Devolve o HTML actualizado. */
export function moveSection(html: string, bid: string, direction: "up" | "down"): string {
  return withSection(html, bid, (el) => {
    const sibling =
      direction === "up" ? el.previousElementSibling : el.nextElementSibling;
    if (!sibling || !el.parentNode) return;
    if (direction === "up") el.parentNode.insertBefore(el, sibling);
    else el.parentNode.insertBefore(sibling, el);
  });
}

/** Duplica a secção imediatamente a seguir à original (novo bid). */
export function duplicateSection(html: string, bid: string): string {
  const next = withSection(html, bid, (el) => {
    const clone = el.cloneNode(true) as HTMLElement;
    clone.querySelectorAll(`[${BID_ATTR}]`).forEach((c) => c.removeAttribute(BID_ATTR));
    clone.removeAttribute(BID_ATTR);
    el.parentNode?.insertBefore(clone, el.nextSibling);
  });
  return ensureBids(next);
}

/** Remove uma secção. */
export function removeSection(html: string, bid: string): string {
  return withSection(html, bid, (el) => el.remove());
}

/**
 * Insere HTML relativamente a uma secção alvo.
 * `position: "append"` (ou bid vazio) acrescenta no fim do body.
 */
export function insertHtmlAt(
  html: string,
  targetBid: string | null,
  position: SectionPosition,
  snippet: string,
): string {
  if (!snippet?.trim()) return html;
  const source = html?.trim()
    ? html
    : '<!doctype html><html><head><meta charset="utf-8"></head><body></body></html>';
  const originalHadHtml = /<html[\s>]/i.test(source);
  const doc = parseDoc(source);
  const tpl = doc.createElement("template");
  tpl.innerHTML = snippet.trim();
  const nodes = Array.from(tpl.content.childNodes);
  if (nodes.length === 0) return html;

  const target =
    targetBid && position !== "append"
      ? (doc.querySelector(`body > [${BID_ATTR}="${cssEscape(targetBid)}"]`) as HTMLElement | null)
      : null;

  nodes.forEach((node) => {
    if (target) {
      target.parentNode?.insertBefore(node, position === "before" ? target : target.nextSibling);
    } else {
      doc.body.appendChild(node);
    }
  });

  return ensureBids(serializeDoc(doc, originalHadHtml));
}

function withSection(html: string, bid: string, fn: (el: HTMLElement) => void): string {
  if (!html?.trim() || !bid) return html;
  const originalHadHtml = /<html[\s>]/i.test(html);
  const doc = parseDoc(html);
  const el = doc.querySelector(`[${BID_ATTR}="${cssEscape(bid)}"]`) as HTMLElement | null;
  if (!el) return html;
  fn(el);
  return serializeDoc(doc, originalHadHtml);
}

/** Sobe até à secção de topo (filho directo do body) que contém o bid. */
export function resolveSectionBid(html: string, bid: string): string | null {
  if (!html?.trim() || !bid) return null;
  const doc = parseDoc(html);
  let el = doc.querySelector(`[${BID_ATTR}="${cssEscape(bid)}"]`) as HTMLElement | null;
  while (el && el.parentElement && el.parentElement !== doc.body) {
    el = el.parentElement;
  }
  return el?.getAttribute(BID_ATTR) ?? null;
}

function camelToKebab(s: string): string {
  return s.replace(/[A-Z]/g, (m) => `-${m.toLowerCase()}`);
}

function cssEscape(s: string): string {
  // CSS.escape pode não estar disponível em SSR; bids são alfanuméricos por construção
  if (typeof CSS !== "undefined" && CSS.escape) return CSS.escape(s);
  return s.replace(/"/g, '\\"');
}
