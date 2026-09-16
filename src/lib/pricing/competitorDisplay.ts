/**
 * Preparação das referências de concorrência para apresentação pública.
 *
 * Regras (apenas de apresentação — o motor de preços continua a usar todas as referências):
 * 1. Uma referência por loja (agrupada por domínio normalizado), mantendo o valor mais alto.
 * 2. Apenas referências estritamente acima do nosso preço são mostradas.
 * 3. Ordenação do mais alto para o mais baixo, limitada a `max` lojas.
 */

export interface CompetitorRefInput {
  id: string;
  source_name?: string | null;
  source_url?: string | null;
  price: number;
  currency?: string | null;
  fetched_at?: string | null;
}

export interface CompetitorRefDisplay {
  id: string;
  storeKey: string;
  storeLabel: string;
  url: string | null;
  price: number;
  currency: string;
  fetchedAt: string | null;
}

export interface PreparedCompetitorRefs {
  refs: CompetitorRefDisplay[];
  cheapestVisible: number | null;
  lastFetchedAt: string | null;
  hiddenCount: number;
}

const GENERIC_PREFIXES = ["www", "loja", "shop", "store", "m", "pt", "en"];

/** Extrai um domínio base estável a partir do URL (preferido) ou do nome da loja. */
export function normalizeStoreKey(name?: string | null, url?: string | null): string {
  const raw = extractHost(url) ?? extractHost(`https://${(name || "").trim()}`) ?? (name || "").trim().toLowerCase();
  if (!raw) return "";

  let host = raw.toLowerCase().replace(/^\.+|\.+$/g, "");
  // Remover prefixos genéricos (www., loja., shop., m., …)
  let parts = host.split(".").filter(Boolean);
  while (parts.length > 2 && GENERIC_PREFIXES.includes(parts[0])) {
    parts = parts.slice(1);
  }
  host = parts.join(".");

  // "aquario" e "aquario.pt" devem coincidir → usar apenas o rótulo principal
  const labels = host.split(".").filter(Boolean);
  if (labels.length === 0) return host;

  // Para domínios com TLD composto (ex.: loja.co.uk) manter os dois últimos rótulos como sufixo
  const main = labels.length >= 2 ? labels[labels.length - 2] : labels[0];
  return main;
}

function extractHost(url?: string | null): string | null {
  if (!url) return null;
  const value = url.trim();
  if (!value) return null;
  const withProtocol = /^https?:\/\//i.test(value) ? value : `https://${value}`;
  try {
    const host = new URL(withProtocol).hostname;
    return host && host.includes(".") ? host : null;
  } catch {
    return null;
  }
}

/** Nome legível da loja: domínio quando disponível, caso contrário o nome guardado. */
export function storeLabel(name?: string | null, url?: string | null): string {
  const host = extractHost(url);
  if (host) return host.replace(/^www\./i, "");
  const cleaned = (name || "").trim();
  return cleaned || "Loja externa";
}

export function prepareCompetitorRefs(
  input: CompetitorRefInput[],
  ourPrice: number,
  options?: { max?: number },
): PreparedCompetitorRefs {
  const max = options?.max ?? 4;
  const valid = (input || []).filter(
    (r) => typeof r?.price === "number" && Number.isFinite(r.price) && r.price > 0,
  );

  const lastFetchedAt = valid.reduce<string | null>((acc, r) => {
    if (!r.fetched_at) return acc;
    if (!acc) return r.fetched_at;
    return new Date(r.fetched_at) > new Date(acc) ? r.fetched_at : acc;
  }, null);

  // Apenas acima do nosso preço
  const eligible = valid.filter((r) => (Number.isFinite(ourPrice) ? r.price > ourPrice : true));

  // Uma por loja, mantendo o valor mais alto
  const byStore = new Map<string, CompetitorRefDisplay>();
  for (const r of eligible) {
    const key = normalizeStoreKey(r.source_name, r.source_url) || r.id;
    const candidate: CompetitorRefDisplay = {
      id: r.id,
      storeKey: key,
      storeLabel: storeLabel(r.source_name, r.source_url),
      url: r.source_url || null,
      price: r.price,
      currency: r.currency || "EUR",
      fetchedAt: r.fetched_at || null,
    };
    const existing = byStore.get(key);
    if (!existing || candidate.price > existing.price) byStore.set(key, candidate);
  }

  const grouped = Array.from(byStore.values()).sort((a, b) => b.price - a.price);
  const refs = grouped.slice(0, max);
  const cheapestVisible = refs.length ? Math.min(...refs.map((r) => r.price)) : null;

  return {
    refs,
    cheapestVisible,
    lastFetchedAt,
    hiddenCount: Math.max(0, valid.length - refs.length),
  };
}
