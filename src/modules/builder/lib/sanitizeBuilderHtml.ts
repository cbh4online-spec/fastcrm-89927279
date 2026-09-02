import DOMPurify from "dompurify";

/**
 * Sanitiza HTML completo para ser renderizado num iframe sandboxed
 * do HTML Builder Studio. Permite tags estruturais e <style>, mas
 * remove scripts, handlers inline e protocolos perigosos.
 */
export function sanitizeBuilderHtml(dirty: string): string {
  if (!dirty) return "";

  return DOMPurify.sanitize(dirty, {
    WHOLE_DOCUMENT: true,
    ADD_TAGS: ["style", "link", "meta", "title"],
    ADD_ATTR: ["target", "rel", "media", "charset", "name", "content"],
    FORBID_TAGS: ["script", "iframe", "object", "embed", "form"],
    FORBID_ATTR: [
      "onerror",
      "onload",
      "onclick",
      "onmouseover",
      "onfocus",
      "onblur",
      "onsubmit",
      "onchange",
      "onkeydown",
      "onkeyup",
      "onkeypress",
    ],
    ALLOW_DATA_ATTR: true,
  });
}

/**
 * Proteção mínima aplicada ANTES de persistir o HTML do Builder.
 *
 * Ao contrário de `sanitizeBuilderHtml()` (usada só no editor/preview), esta
 * versão NÃO destrói o código original da landing page: mantém `<script>`,
 * `<form>`, handlers inline (`onclick`, `onsubmit`, ...), IDs, âncoras
 * internas, `target="_blank"` e atributos `data-*`.
 *
 * A proteção real da página publicada é o iframe sandboxed sem
 * `allow-same-origin`, que isola a landing page do FastCRM.
 */
export function sanitizeBuilderHtmlForPersistence(dirty: string): string {
  if (!dirty) return "";

  return (
    dirty
      // remove <base> — reescreveria a resolução de URLs relativas do documento
      .replace(/<base\b[^>]*>/gi, "")
      // neutraliza javascript: em href/src (mantendo o resto do markup intacto)
      .replace(/\b(href|src)\s*=\s*(["'])\s*javascript:[^"']*\2/gi, '$1="#"')
  );
}

/** Gera um slug seguro a partir de um nome livre. */
export function slugify(input: string): string {
  return input
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .slice(0, 80) || `asset-${Date.now()}`;
}
