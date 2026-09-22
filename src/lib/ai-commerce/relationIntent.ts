/**
 * Motor determinístico de relações comerciais entre produtos (AI Commerce).
 *
 * Princípios (não negociáveis):
 * - Nunca inventar dados: uma relação só é válida se existir evidência real nos
 *   campos do catálogo (marca, categoria, especificações, contexto AI Commerce)
 *   ou em dados de vendas (co-ocorrência em faturas).
 * - Conceito comercial explícito: cada relação é classificada como up-sell,
 *   down-sell ou cross-sell, para nunca perder a venda e subir o ticket médio.
 * - Preços, stock e disponibilidade vêm sempre do produto real — nunca da IA.
 */

export type RelationType =
  | "accessory"
  | "alternative"
  | "required"
  | "upgrade"
  | "compatible"
  | "bundle"
  | "related";

/** Intenção comercial de uma relação. */
export type RelationIntent = "upsell" | "downsell" | "cross_sell" | "neutral";

export type RelationConfidence = "high" | "medium" | "low";

export const RELATION_TYPES: RelationType[] = [
  "accessory",
  "alternative",
  "required",
  "upgrade",
  "compatible",
  "bundle",
  "related",
];

export const RELATION_INTENTS: RelationIntent[] = ["upsell", "downsell", "cross_sell", "neutral"];

export const RELATION_INTENT_LABEL: Record<RelationIntent, string> = {
  upsell: "Up-sell",
  downsell: "Down-sell",
  cross_sell: "Cross-sell",
  neutral: "Neutra",
};

export function isRelationType(value: unknown): value is RelationType {
  return typeof value === "string" && (RELATION_TYPES as string[]).includes(value);
}

export function isRelationIntent(value: unknown): value is RelationIntent {
  return typeof value === "string" && (RELATION_INTENTS as string[]).includes(value);
}

export function isRelationConfidence(value: unknown): value is RelationConfidence {
  return value === "high" || value === "medium" || value === "low";
}

/** Margem mínima de preço para considerar um produto mais caro / mais barato. */
const PRICE_BAND = 0.05;
/** Acima deste múltiplo, o up-sell deixa de ser credível para o mesmo cliente. */
const MAX_UPSELL_MULTIPLE = 3;

/** Factos reais de um produto, lidos da base de dados. Nada é inferido. */
export interface RelationProductFacts {
  id: string;
  name?: string | null;
  brand?: string | null;
  category?: string | null;
  subcategory?: string | null;
  productType?: string | null;
  price?: number | null;
  status?: string | null;
  stockStatus?: string | null;
  trackStock?: boolean | null;
  stockQuantity?: number | null;
  storePublished?: boolean | null;
  /** Especificações + contexto AI Commerce concatenados (palavras-chave, casos de uso...). */
  context?: string | null;
}

export function normalizeText(value?: string | null): string {
  return (value || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

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
  "branco",
  "preto",
]);

function tokenize(value: string): string[] {
  return value
    .split(/[^a-z0-9]+/)
    .filter((token) => token.length >= 4 && !STOP_WORDS.has(token));
}

/**
 * Classificação comercial determinística.
 * Sem preços reais nos dois lados não há classificação de valor — devolve cross-sell
 * para complementos e "neutral" para o resto, nunca um palpite.
 */
export function classifyRelationIntent(
  relationType: RelationType,
  sourcePrice?: number | null,
  targetPrice?: number | null,
): RelationIntent {
  const source = typeof sourcePrice === "number" && sourcePrice > 0 ? sourcePrice : null;
  const target = typeof targetPrice === "number" && targetPrice > 0 ? targetPrice : null;

  switch (relationType) {
    case "accessory":
    case "required":
    case "bundle":
      // Somam-se ao produto principal: sobem sempre o ticket.
      return "cross_sell";
    case "compatible":
      return "cross_sell";
    case "upgrade":
      if (!source || !target) return "neutral";
      return target > source * (1 + PRICE_BAND) ? "upsell" : "neutral";
    case "alternative":
      if (!source || !target) return "neutral";
      if (target < source * (1 - PRICE_BAND)) return "downsell";
      if (target > source * (1 + PRICE_BAND)) return "upsell";
      return "neutral";
    case "related":
    default:
      return "neutral";
  }
}

/** Uma relação está disponível para venda? (estado real, nunca assumido) */
export function isRelationAvailable(
  facts: RelationProductFacts,
  opts: { requireStorePublished?: boolean } = {},
): boolean {
  if (facts.status && facts.status !== "active") return false;
  if (opts.requireStorePublished && facts.storePublished === false) return false;
  if (normalizeText(facts.stockStatus) === "out_of_stock") return false;
  if (facts.trackStock && typeof facts.stockQuantity === "number" && facts.stockQuantity <= 0) {
    return false;
  }
  return true;
}

export interface GroundingResult {
  /** Passa o critério rigoroso? */
  grounded: boolean;
  /** Sinais reais encontrados nos dados (para mostrar ao utilizador). */
  signals: string[];
  /** Motivo da rejeição, quando não passa. */
  rejection?: string;
}

/**
 * Verifica se existe evidência real para a relação proposta.
 * Só sinais verificáveis contam: marca, categoria/subcategoria, sobreposição de
 * termos nas especificações/contexto AI Commerce e co-ocorrência em faturas.
 */
export function checkRelationGrounding(input: {
  source: RelationProductFacts;
  target: RelationProductFacts;
  relationType: RelationType;
  /** Nº de vezes que os dois produtos foram faturados juntos (dados reais). */
  cooccurrenceCount?: number | null;
}): GroundingResult {
  const { source, target, relationType } = input;
  const cooccurrence = typeof input.cooccurrenceCount === "number" ? input.cooccurrenceCount : 0;

  if (!target.id || target.id === source.id) {
    return { grounded: false, signals: [], rejection: "Produto alvo inválido" };
  }

  const signals: string[] = [];

  const sameBrand =
    !!normalizeText(source.brand) && normalizeText(source.brand) === normalizeText(target.brand);
  if (sameBrand) signals.push(`Mesma marca (${source.brand})`);

  const sameCategory =
    !!normalizeText(source.category) &&
    normalizeText(source.category) === normalizeText(target.category);
  if (sameCategory) signals.push(`Mesma categoria (${source.category})`);

  const sameSubcategory =
    !!normalizeText(source.subcategory) &&
    normalizeText(source.subcategory) === normalizeText(target.subcategory);
  if (sameSubcategory) signals.push(`Mesma subcategoria (${source.subcategory})`);

  const sourceTokens = new Set(tokenize(normalizeText(`${source.name || ""} ${source.context || ""}`)));
  const targetHaystack = normalizeText(
    [target.name, target.category, target.subcategory, target.productType, target.context].join(" "),
  );
  const overlap = Array.from(sourceTokens).filter((token) => targetHaystack.includes(token));
  if (overlap.length > 0) {
    signals.push(`Termos em comum na ficha (${overlap.slice(0, 3).join(", ")})`);
  }

  if (cooccurrence > 0) signals.push(`Faturados juntos ${cooccurrence}x`);

  if (signals.length === 0) {
    return { grounded: false, signals, rejection: "Sem evidência nos dados do catálogo" };
  }

  // Requisitos específicos por tipo de relação — é aqui que o critério é rigoroso.
  switch (relationType) {
    case "alternative":
    case "upgrade": {
      if (!sameCategory && !sameSubcategory) {
        return {
          grounded: false,
          signals,
          rejection: "Alternativa/upgrade exige a mesma categoria do produto",
        };
      }
      if (relationType === "upgrade") {
        const sp = source.price ?? 0;
        const tp = target.price ?? 0;
        if (!(sp > 0 && tp > sp * (1 + PRICE_BAND))) {
          return { grounded: false, signals, rejection: "Upgrade exige preço superior ao produto" };
        }
      }
      return { grounded: true, signals };
    }
    case "bundle": {
      if (cooccurrence === 0 && !(overlap.length > 0 && (sameBrand || sameCategory))) {
        return {
          grounded: false,
          signals,
          rejection: "Bundle exige histórico de vendas em conjunto ou ligação clara na ficha",
        };
      }
      return { grounded: true, signals };
    }
    case "accessory":
    case "required":
    case "compatible": {
      if (!sameBrand && overlap.length === 0 && cooccurrence === 0) {
        return {
          grounded: false,
          signals,
          rejection: "Sem compatibilidade comprovada (marca, ficha ou vendas)",
        };
      }
      return { grounded: true, signals };
    }
    case "related":
    default: {
      if (!sameCategory && !sameSubcategory) {
        return { grounded: false, signals, rejection: "Relação genérica exige a mesma categoria" };
      }
      return { grounded: true, signals };
    }
  }
}

/** Só sugestões com evidência e confiança alta entram no catálogo sem revisão humana. */
export function shouldAutoApprove(
  confidence: RelationConfidence,
  grounding: GroundingResult,
): boolean {
  return grounding.grounded && confidence === "high";
}

export interface RelationOffer<T = unknown> {
  relationType: RelationType;
  intent: RelationIntent;
  target: RelationProductFacts;
  payload: T;
}

export interface RankedRelationOffers<T> {
  /** Sobe o ticket médio: complementos e versões superiores. */
  upsell: RelationOffer<T>[];
  /** Salva a venda: alternativas disponíveis, mais baratas ou equivalentes. */
  downsell: RelationOffer<T>[];
}

/**
 * Ordena as relações para as superfícies de venda.
 * - Produto principal indisponível → prioridade absoluta ao down-sell (nunca perder a venda).
 * - Produto disponível → prioridade ao up-sell/cross-sell de maior incremento credível.
 */
export function rankRelationOffers<T>(
  offers: RelationOffer<T>[],
  options: { sourcePrice?: number | null; sourceAvailable: boolean; limit?: number },
): RankedRelationOffers<T> {
  const limit = options.limit ?? 4;
  const sourcePrice =
    typeof options.sourcePrice === "number" && options.sourcePrice > 0 ? options.sourcePrice : null;

  const available = offers.filter((offer) =>
    isRelationAvailable(offer.target, { requireStorePublished: true }),
  );

  const upsell = available
    .filter((offer) => offer.intent === "upsell" || offer.intent === "cross_sell")
    .filter((offer) => {
      if (!sourcePrice) return true;
      const price = offer.target.price ?? 0;
      return price <= sourcePrice * MAX_UPSELL_MULTIPLE;
    })
    .sort((a, b) => (b.target.price ?? 0) - (a.target.price ?? 0));

  const downsell = available
    .filter((offer) => offer.relationType === "alternative" || offer.relationType === "compatible")
    .sort((a, b) => {
      if (!sourcePrice) return (a.target.price ?? 0) - (b.target.price ?? 0);
      // Mais próximo (por baixo) do preço original primeiro: preserva valor da venda.
      const da = Math.abs(sourcePrice - (a.target.price ?? 0));
      const db = Math.abs(sourcePrice - (b.target.price ?? 0));
      return da - db;
    });

  if (!options.sourceAvailable) {
    return { upsell: upsell.slice(0, limit), downsell: downsell.slice(0, limit) };
  }

  return { upsell: upsell.slice(0, limit), downsell: downsell.slice(0, limit) };
}
