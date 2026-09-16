/**
 * Resolução do conteúdo apresentado na ficha pública de produto.
 *
 * Regra: o conteúdo escrito à mão no produto tem prioridade máxima; o conteúdo
 * do AI Commerce apenas preenche lacunas. Nada é inventado — campos vazios
 * resultam em secções ausentes.
 */

export interface StoreAIFaqEntry {
  question: string;
  answer: string;
}

export interface StoreAICommerceContent {
  ai_short_description?: string | null;
  ai_long_description?: string | null;
  ai_key_features?: string[] | null;
  ai_target_audience?: string | null;
  ai_problem_solved?: string | null;
  ai_use_cases?: string[] | null;
  ai_faq?: unknown;
}

export interface StoreProductContentInput {
  short_description?: string | null;
  commercial_description?: string | null;
  benefits?: string[] | null;
}

export interface ResolvedStoreProductContent {
  shortDescription: string | null;
  longDescription: string | null;
  highlights: string[];
  targetAudience: string | null;
  problemSolved: string | null;
  useCases: string[];
  faq: StoreAIFaqEntry[];
  hasAIContext: boolean;
}

const MAX_FAQ_ENTRIES = 12;

function clean(value?: string | null): string | null {
  const trimmed = (value || "").trim();
  return trimmed.length > 0 ? trimmed : null;
}

function cleanList(value?: string[] | null): string[] {
  return (value || []).map((item) => (item || "").trim()).filter((item) => item.length > 0);
}

export function normalizeStoreFaq(value: unknown): StoreAIFaqEntry[] {
  if (!Array.isArray(value)) return [];
  return value
    .map((entry) => {
      const record = entry as Record<string, unknown> | null;
      const question = clean(typeof record?.question === "string" ? record.question : null);
      const answer = clean(typeof record?.answer === "string" ? record.answer : null);
      return question && answer ? { question, answer } : null;
    })
    .filter((entry): entry is StoreAIFaqEntry => entry !== null)
    .slice(0, MAX_FAQ_ENTRIES);
}

export function resolveStoreProductContent(
  product: StoreProductContentInput,
  ai?: StoreAICommerceContent | null,
): ResolvedStoreProductContent {
  const shortDescription = clean(product.short_description) || clean(ai?.ai_short_description);
  const longDescription = clean(product.commercial_description) || clean(ai?.ai_long_description);

  const ownBenefits = cleanList(product.benefits);
  const highlights = ownBenefits.length > 0 ? ownBenefits : cleanList(ai?.ai_key_features);

  const targetAudience = clean(ai?.ai_target_audience);
  const problemSolved = clean(ai?.ai_problem_solved);
  const useCases = cleanList(ai?.ai_use_cases);
  const faq = normalizeStoreFaq(ai?.ai_faq);

  return {
    shortDescription,
    longDescription,
    highlights,
    targetAudience,
    problemSolved,
    useCases,
    faq,
    hasAIContext: !!(targetAudience || problemSolved || useCases.length > 0),
  };
}
