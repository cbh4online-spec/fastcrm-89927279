/**
 * AI Commerce — estratégia determinística de etiquetas (tags).
 *
 * Regras não negociáveis:
 * - Nunca inventa dados: todas as etiquetas derivam de campos reais do produto
 *   (marca, fabricante, modelo, categoria, subcategoria, especificações e
 *   conteúdo AI Commerce já validado).
 * - Nunca guarda automaticamente: devolve apenas sugestões para aprovação.
 * - Sem etiquetas comerciais vagas ("novo", "promo") — essas são decisão humana.
 */

export type TagPurpose = "identificacao" | "tecnologia" | "uso" | "seo";

export interface TagSuggestionGroup {
  purpose: TagPurpose;
  label: string;
  description: string;
  tags: string[];
}

export interface TagStrategyInput {
  name?: string | null;
  brand?: string | null;
  manufacturer?: string | null;
  model?: string | null;
  category?: string | null;
  subcategory?: string | null;
  specifications?: Record<string, string> | null;
  /** Especificações estruturadas (chave/valor) já guardadas */
  specAttributes?: { spec_key: string; spec_value: string }[];
  /** Conteúdo AI Commerce validado */
  idealFor?: string[] | null;
  useCases?: string[] | null;
  searchTerms?: string[] | null;
}

const STOPWORDS = new Set([
  "de", "da", "do", "das", "dos", "para", "com", "sem", "por", "em", "no", "na",
  "e", "ou", "a", "o", "as", "os", "um", "uma", "the", "and", "of", "to",
]);

/** Etiquetas vagas que só um humano pode decidir — nunca sugeridas. */
const BLOCKED = new Set([
  "novo", "promo", "promocao", "destaque", "outlet", "bestseller", "oferta",
  "desconto", "barato", "melhor", "top", "premium",
]);

export function normalizeTag(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim()
    .replace(/\s+/g, " ");
}

function isUsable(tag: string): boolean {
  if (tag.length < 3 || tag.length > 40) return false;
  if (BLOCKED.has(tag)) return false;
  if (STOPWORDS.has(tag)) return false;
  if (/^\d+$/.test(tag)) return false;
  return true;
}

function collect(values: (string | null | undefined)[]): string[] {
  const out: string[] = [];
  for (const raw of values) {
    if (!raw) continue;
    const tag = normalizeTag(raw);
    if (isUsable(tag) && !out.includes(tag)) out.push(tag);
  }
  return out;
}

/** Palavras-chave com significado técnico extraídas do nome do produto. */
function keywordsFromName(name?: string | null): string[] {
  if (!name) return [];
  const words = normalizeTag(name).split(" ");
  const out: string[] = [];
  for (const w of words) {
    if (w.length < 4 || STOPWORDS.has(w) || BLOCKED.has(w)) continue;
    if (/^\d/.test(w)) continue;
    if (!out.includes(w)) out.push(w);
  }
  return out.slice(0, 6);
}

export function buildTagSuggestions(
  input: TagStrategyInput,
  existingTags: string[] = []
): TagSuggestionGroup[] {
  const existing = new Set(existingTags.map(normalizeTag));

  const specPairs: [string, string][] = [
    ...Object.entries(input.specifications || {}),
    ...(input.specAttributes || []).map(
      (s) => [s.spec_key, s.spec_value] as [string, string]
    ),
  ].filter(([k, v]) => !!k && !!v);

  const identificacao = collect([
    input.brand,
    input.manufacturer && input.manufacturer !== input.brand ? input.manufacturer : null,
    input.model,
    input.category,
    input.subcategory,
  ]);

  const tecnologia = collect(
    specPairs
      .filter(([key]) =>
        /tecnolog|tipo|compatib|sensor|lente|conex|conet|rede|aliment|protocolo|indicador|cor|material|resolu/i.test(
          key
        )
      )
      .map(([, value]) => value)
  );

  const uso = collect([
    ...(input.idealFor || []),
    ...(input.useCases || []),
    ...specPairs
      .filter(([key]) => /instala|aplica|ambiente|utiliza/i.test(key))
      .map(([, value]) => value),
  ]);

  const seo = collect([
    ...(input.searchTerms || []),
    ...keywordsFromName(input.name),
  ]);

  const groups: TagSuggestionGroup[] = [
    {
      purpose: "identificacao",
      label: "Identificação e filtros",
      description: "Marca, modelo e categoria — usadas na pesquisa e nos filtros da loja.",
      tags: identificacao,
    },
    {
      purpose: "tecnologia",
      label: "Tecnologia e compatibilidade",
      description: "Retiradas das especificações técnicas — apoiam relações e comparações.",
      tags: tecnologia,
    },
    {
      purpose: "uso",
      label: "Caso de uso e público",
      description: "Para quem serve e onde se aplica — apoiam a conversão na loja.",
      tags: uso,
    },
    {
      purpose: "seo",
      label: "Termos comerciais e SEO",
      description: "Termos coerentes com a ficha, usados em pesquisa e feeds.",
      tags: seo,
    },
  ];

  // Sem duplicados entre grupos nem repetições do que já está guardado
  const seen = new Set(existing);
  return groups
    .map((g) => {
      const tags = g.tags.filter((t) => {
        if (seen.has(t)) return false;
        seen.add(t);
        return true;
      });
      return { ...g, tags: tags.slice(0, 8) };
    })
    .filter((g) => g.tags.length > 0);
}
