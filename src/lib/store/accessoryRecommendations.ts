/**
 * Motor de sugestão de acessórios (cross-sell) para a ficha pública de produto.
 *
 * Regras:
 * - Só usa produtos reais do catálogo publicado. Nada é inventado.
 * - Preço, moeda e disponibilidade vêm sempre do produto de origem.
 * - A pontuação cruza o contexto do AI Commerce (palavras-chave, casos de uso,
 *   contexto de recomendação) com sinais de acessório (nome/categoria/preço).
 */

export interface AccessoryCandidate {
  id: string;
  name: string | null;
  slug?: string | null;
  sku?: string | null;
  price: number | null;
  currency?: string | null;
  image?: string | null;
  category?: string | null;
  subcategory?: string | null;
  stockStatus?: string | null;
  /** Texto agregado do AI Commerce / ficha para comparação semântica simples. */
  context?: string | null;
}

export interface AccessoryBaseProduct {
  id: string;
  name: string | null;
  category?: string | null;
  subcategory?: string | null;
  price: number | null;
  /** Palavras-chave, casos de uso e contexto do AI Commerce, já concatenados. */
  context?: string | null;
}

export interface AccessorySuggestion extends AccessoryCandidate {
  score: number;
  reason: string;
}

const ACCESSORY_TERMS = [
  "acessorio",
  "acessorios",
  "suporte",
  "cabo",
  "fonte",
  "alimentacao",
  "bateria",
  "carregador",
  "adaptador",
  "modulo",
  "licenca",
  "instalacao",
  "kit",
  "caixa",
  "conector",
  "antena",
  "cartao",
  "transformador",
  "expansor",
  "repetidor",
  "sirene",
  "teclado",
  "fixacao",
  "calha",
  "ficha",
  "extensao",
];

const STOP_WORDS = new Set([
  "para",
  "com",
  "que",
  "uma",
  "como",
  "dos",
  "das",
  "sem",
  "mais",
  "este",
  "esta",
  "sobre",
  "pode",
  "produto",
  "solucao",
  "sistema",
]);

export function normalizeText(value?: string | null): string {
  return (value || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

function tokens(value: string): string[] {
  return value
    .split(/[^a-z0-9]+/)
    .filter((token) => token.length >= 4 && !STOP_WORDS.has(token));
}

export function suggestAccessories(
  base: AccessoryBaseProduct,
  candidates: AccessoryCandidate[],
  limit = 4,
): AccessorySuggestion[] {
  const baseTokens = new Set(tokens(normalizeText(`${base.name || ""} ${base.context || ""}`)));
  const baseCategory = normalizeText(base.category);
  const baseSubcategory = normalizeText(base.subcategory);
  const basePrice = typeof base.price === "number" && base.price > 0 ? base.price : null;

  const scored: AccessorySuggestion[] = [];

  for (const candidate of candidates) {
    if (candidate.id === base.id) continue;
    if (typeof candidate.price !== "number" || candidate.price <= 0) continue;
    if (normalizeText(candidate.stockStatus) === "out_of_stock") continue;

    const haystack = normalizeText(
      [candidate.name, candidate.category, candidate.subcategory, candidate.context].join(" "),
    );

    let score = 0;
    const reasons: string[] = [];

    const isAccessoryNamed = ACCESSORY_TERMS.some((term) => haystack.includes(term));
    if (isAccessoryNamed) {
      score += 3;
      reasons.push("Acessório compatível");
    }

    let overlap = 0;
    for (const token of baseTokens) {
      if (haystack.includes(token)) overlap += 1;
    }
    if (overlap > 0) {
      score += Math.min(overlap, 4);
      reasons.push("Referido no contexto do produto");
    }

    if (baseCategory && normalizeText(candidate.category) === baseCategory) {
      score += normalizeText(candidate.subcategory) === baseSubcategory ? 0.5 : 1.5;
    }

    if (basePrice && candidate.price < basePrice * 0.6) {
      score += 1.5;
      reasons.push("Complemento de valor reduzido");
    }

    if (score < 3) continue;

    scored.push({ ...candidate, score, reason: reasons[0] || "Sugestão do catálogo" });
  }

  return scored
    .sort((a, b) => b.score - a.score || (a.price || 0) - (b.price || 0))
    .slice(0, limit);
}
