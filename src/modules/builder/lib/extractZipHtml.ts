import JSZip from "jszip";

export interface ExtractedBundle {
  html: string;
  entryName: string;
  files: number;
}

/**
 * Lê um ficheiro .zip e devolve o primeiro HTML encontrado (preferindo
 * index.html). As referências relativas a ficheiros dentro do zip são
 * convertidas em data-URLs base64 para permitir pré-visualização sem servidor.
 */
export async function extractZipHtml(file: File): Promise<ExtractedBundle> {
  const zip = await JSZip.loadAsync(file);
  const entries = Object.values(zip.files).filter((f) => !f.dir);
  if (entries.length === 0) throw new Error("ZIP vazio");

  // Procurar entry HTML (preferência: index.html na raiz)
  const htmlEntries = entries.filter((f) => /\.x?html?$/i.test(f.name));
  if (htmlEntries.length === 0) throw new Error("Nenhum HTML encontrado no ZIP");

  htmlEntries.sort((a, b) => {
    const aDepth = a.name.split("/").length;
    const bDepth = b.name.split("/").length;
    const aIndex = /(^|\/)index\.html?$/i.test(a.name) ? 0 : 1;
    const bIndex = /(^|\/)index\.html?$/i.test(b.name) ? 0 : 1;
    if (aIndex !== bIndex) return aIndex - bIndex;
    return aDepth - bDepth;
  });

  const entry = htmlEntries[0];
  let html = await entry.async("string");
  const baseDir = entry.name.includes("/")
    ? entry.name.slice(0, entry.name.lastIndexOf("/") + 1)
    : "";

  // Construir mapa de assets com data-URL
  const mimeFor = (name: string): string => {
    const ext = name.toLowerCase().split(".").pop() ?? "";
    const map: Record<string, string> = {
      png: "image/png",
      jpg: "image/jpeg",
      jpeg: "image/jpeg",
      gif: "image/gif",
      webp: "image/webp",
      svg: "image/svg+xml",
      css: "text/css",
      js: "application/javascript",
      woff: "font/woff",
      woff2: "font/woff2",
      ttf: "font/ttf",
      otf: "font/otf",
    };
    return map[ext] ?? "application/octet-stream";
  };

  const assetMap = new Map<string, string>();
  for (const f of entries) {
    if (f === entry) continue;
    if (/\.x?html?$/i.test(f.name)) continue;
    if (f.name.endsWith(".js")) continue; // não expomos JS
    try {
      const blob = await f.async("base64");
      const mime = mimeFor(f.name);
      assetMap.set(f.name, `data:${mime};base64,${blob}`);
    } catch {
      // ignora ficheiros ilegíveis
    }
  }

  const resolveRef = (ref: string): string | null => {
    if (/^(https?:|data:|mailto:|tel:|#)/i.test(ref)) return null;
    const cleaned = ref.split("?")[0].split("#")[0];
    const candidates = [
      baseDir + cleaned,
      cleaned,
      cleaned.replace(/^\.\//, ""),
    ];
    for (const c of candidates) {
      if (assetMap.has(c)) return assetMap.get(c)!;
    }
    return null;
  };

  // Substituir src/href relativos
  html = html.replace(
    /(\s(?:src|href))=("|')([^"']+)\2/gi,
    (m, attr, q, ref) => {
      const replaced = resolveRef(ref);
      return replaced ? `${attr}=${q}${replaced}${q}` : m;
    },
  );

  // Substituir url(...) em CSS inline
  html = html.replace(/url\((['"]?)([^'")]+)\1\)/gi, (m, q, ref) => {
    const replaced = resolveRef(ref);
    return replaced ? `url(${q}${replaced}${q})` : m;
  });

  return { html, entryName: entry.name, files: entries.length };
}
