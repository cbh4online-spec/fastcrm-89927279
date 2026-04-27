import JSZip from "jszip";
import { stripBids } from "./builderHtmlPatch";

export interface ExportZipOptions {
  /** Nome base do asset (usado para o nome do ficheiro). */
  name: string;
  /** HTML completo (pode ou não ter wrapper <html>). */
  html: string;
  /**
   * Estratégia para assets externos referenciados (img/src, link/href, url() em CSS).
   * - "keep": mantém URLs absolutas (rápido, dependente de ligação à rede ao abrir).
   * - "inline": converte para data-URL embutida (auto-suficiente, ficheiro maior).
   * - "download": descarrega para pasta `/assets` dentro do ZIP (organizado).
   */
  assetMode?: "keep" | "inline" | "download";
  /** Limite por asset descarregado, em bytes (default 5MB). */
  perAssetMaxBytes?: number;
}

export interface ExportZipResult {
  blob: Blob;
  filename: string;
  assetsProcessed: number;
  assetsFailed: number;
  totalBytes: number;
}

const DEFAULT_PER_ASSET = 5 * 1024 * 1024;

function slug(name: string): string {
  return (
    name
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 80) || "asset"
  );
}

function ensureFullHtml(html: string, title: string): string {
  if (/<html[\s>]/i.test(html)) return html;
  return `<!doctype html>
<html lang="pt">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>${escapeHtml(title)}</title>
</head>
<body>
${html}
</body>
</html>`;
}

function escapeHtml(s: string): string {
  return s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]!));
}

function extFromMime(mime: string): string {
  const map: Record<string, string> = {
    "image/png": "png",
    "image/jpeg": "jpg",
    "image/jpg": "jpg",
    "image/gif": "gif",
    "image/webp": "webp",
    "image/svg+xml": "svg",
    "image/avif": "avif",
    "image/x-icon": "ico",
    "font/woff": "woff",
    "font/woff2": "woff2",
    "font/ttf": "ttf",
    "font/otf": "otf",
    "application/font-woff": "woff",
    "application/font-woff2": "woff2",
    "text/css": "css",
  };
  return map[mime.toLowerCase()] ?? "bin";
}

function extFromUrl(url: string): string | null {
  const m = url.split("?")[0].split("#")[0].match(/\.([a-z0-9]{2,5})$/i);
  return m ? m[1].toLowerCase() : null;
}

async function fetchAsset(url: string, maxBytes: number): Promise<{ blob: Blob; mime: string } | null> {
  try {
    const res = await fetch(url, { mode: "cors", credentials: "omit" });
    if (!res.ok) return null;
    const blob = await res.blob();
    if (blob.size > maxBytes) return null;
    return { blob, mime: blob.type || "application/octet-stream" };
  } catch {
    return null;
  }
}

async function blobToDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(String(r.result));
    r.onerror = () => reject(r.error);
    r.readAsDataURL(blob);
  });
}

/** Encontra URLs absolutas em src/href/url(). */
function collectExternalUrls(html: string): string[] {
  const urls = new Set<string>();
  const reAttr = /\s(?:src|href)=("|')(https?:\/\/[^"']+)\1/gi;
  const reCss = /url\((['"]?)(https?:\/\/[^'")]*)\1\)/gi;
  let m: RegExpExecArray | null;
  while ((m = reAttr.exec(html))) urls.add(m[2]);
  while ((m = reCss.exec(html))) urls.add(m[2]);
  return Array.from(urls);
}

/**
 * Exporta o asset como ZIP (HTML + assets opcionalmente embutidos/descarregados).
 */
export async function exportAssetAsZip(opts: ExportZipOptions): Promise<ExportZipResult> {
  const { name, html: rawHtml, assetMode = "keep", perAssetMaxBytes = DEFAULT_PER_ASSET } = opts;
  const cleanHtml = stripBids(rawHtml);
  let html = ensureFullHtml(cleanHtml, name);

  let processed = 0;
  let failed = 0;

  if (assetMode !== "keep") {
    const urls = collectExternalUrls(html);
    const replacements = new Map<string, string>();
    const usedNames = new Set<string>();
    const blobs = new Map<string, Blob>();

    await Promise.all(
      urls.map(async (url) => {
        const fetched = await fetchAsset(url, perAssetMaxBytes);
        if (!fetched) {
          failed++;
          return;
        }
        if (assetMode === "inline") {
          try {
            const data = await blobToDataUrl(fetched.blob);
            replacements.set(url, data);
            processed++;
          } catch {
            failed++;
          }
        } else {
          const ext = extFromUrl(url) ?? extFromMime(fetched.mime);
          const base = slug(url.split("/").pop()?.replace(/\.[^.]+$/, "") ?? "asset");
          let filename = `${base}.${ext}`;
          let i = 1;
          while (usedNames.has(filename)) filename = `${base}-${i++}.${ext}`;
          usedNames.add(filename);
          const localPath = `assets/${filename}`;
          replacements.set(url, localPath);
          blobs.set(localPath, fetched.blob);
          processed++;
        }
      }),
    );

    if (replacements.size > 0) {
      html = html.replace(/(\s(?:src|href))=("|')(https?:\/\/[^"']+)\2/gi, (m, attr, q, url) => {
        const r = replacements.get(url);
        return r ? `${attr}=${q}${r}${q}` : m;
      });
      html = html.replace(/url\((['"]?)(https?:\/\/[^'")]*)\1\)/gi, (m, q, url) => {
        const r = replacements.get(url);
        return r ? `url(${q}${r}${q})` : m;
      });
    }

    const zip = new JSZip();
    zip.file("index.html", html);
    zip.file(
      "README.txt",
      `Exportado pelo HTML Builder Studio — ${new Date().toISOString()}\nModo de assets: ${assetMode}\nAssets embutidos/descarregados: ${processed}\nFalhas: ${failed}\n`,
    );
    if (assetMode === "download") {
      for (const [path, blob] of blobs.entries()) {
        zip.file(path, blob);
      }
    }
    const blob = await zip.generateAsync({ type: "blob", compression: "DEFLATE" });
    return {
      blob,
      filename: `${slug(name)}.zip`,
      assetsProcessed: processed,
      assetsFailed: failed,
      totalBytes: blob.size,
    };
  }

  const zip = new JSZip();
  zip.file("index.html", html);
  zip.file(
    "README.txt",
    `Exportado pelo HTML Builder Studio — ${new Date().toISOString()}\nModo de assets: keep (URLs absolutas mantidas)\n`,
  );
  const blob = await zip.generateAsync({ type: "blob", compression: "DEFLATE" });
  return {
    blob,
    filename: `${slug(name)}.zip`,
    assetsProcessed: 0,
    assetsFailed: 0,
    totalBytes: blob.size,
  };
}

/** Faz download no browser de um Blob com um nome de ficheiro. */
export function triggerBlobDownload(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

/** Exporta apenas o HTML standalone (sem ZIP). */
export function exportAssetAsHtml(name: string, html: string): { blob: Blob; filename: string } {
  const clean = ensureFullHtml(stripBids(html), name);
  const blob = new Blob([clean], { type: "text/html;charset=utf-8" });
  return { blob, filename: `${slug(name)}.html` };
}
