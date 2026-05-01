import type { ProductSectionKey } from "@/hooks/products/useProductContentSections";

export type FieldType = "text" | "textarea" | "list";

export interface SectionField {
  key: string;
  label: string;
  type: FieldType;
  placeholder?: string;
  hint?: string;
}

/**
 * Mapeamento canónico: chaves de atributo de secção que correspondem
 * directamente a colunas existentes da tabela `products`. A coluna é
 * sempre o SSoT — estas chaves não são editáveis no editor de secções
 * para evitar duplicação de inputs.
 *
 * Usado por `resolveCanonicalAttributes()` para "hidratar" o Copilot B2B
 * com a vista unificada (colunas + atributos jsonb).
 */
export const CANONICAL_COLUMN_MAP: Record<string, { section: ProductSectionKey; column: string; transform?: "weight_kg" | "validity_days" | "quantity_unit" }> = {
  // how_to_use
  frequencia: { section: "how_to_use", column: "recommended_frequency" },
  dose: { section: "how_to_use", column: "included_quantity", transform: "quantity_unit" },
  // specifications
  peso: { section: "specifications", column: "weight", transform: "weight_kg" },
  volume: { section: "specifications", column: "total_units", transform: "quantity_unit" },
  validade: { section: "specifications", column: "validity_days", transform: "validity_days" },
};

/** Conjunto de chaves "espelhadas" — não devem aparecer no editor de secções. */
export const MIRRORED_KEYS = new Set(Object.keys(CANONICAL_COLUMN_MAP));

/**
 * Campos conhecidos por secção. São guardados dentro do jsonb `attributes`,
 * mas apresentados como inputs dedicados no UI para garantir consistência
 * e permitir ao Copilot B2B consultar cada atributo separadamente.
 *
 * Quaisquer outras chaves continuam editáveis na zona "Atributos extra".
 */
export const SECTION_FIELDS: Record<ProductSectionKey, SectionField[]> = {
  overview: [
    {
      key: "indicacao",
      label: "Indicação",
      type: "textarea",
      placeholder: "Para que serve este produto?",
      hint: "Indicação principal e benefícios.",
    },
    {
      key: "contraindicacao",
      label: "Contraindicação (resumo)",
      type: "textarea",
      placeholder: "Em que situações não deve ser usado?",
      hint: "Resumo curto. Detalhe completo na secção Clínico.",
    },
    {
      key: "publico_alvo",
      label: "Público-alvo",
      type: "list",
      placeholder: "Ex: peles oleosas, adultos 30-50 anos…",
    },
  ],
  how_to_use: [
    {
      key: "passos",
      label: "Passos de uso",
      type: "list",
      placeholder: "Ex: Aplicar 2 gotas no rosto seco",
      hint: "Um passo por linha, na ordem de aplicação. Dose e frequência são definidas nos campos do produto.",
    },
    {
      key: "advertencias",
      label: "Advertências de uso",
      type: "list",
      placeholder: "Ex: Evitar contacto com os olhos",
    },
  ],
  specifications: [
    {
      key: "ingredientes_chave",
      label: "Ingredientes-chave",
      type: "list",
      placeholder: "Ex: Ácido hialurónico 2%",
      hint: "Princípios activos ou componentes destacados.",
    },
    {
      key: "inci",
      label: "INCI",
      type: "textarea",
      placeholder: "Aqua, Glycerin, Sodium Hyaluronate…",
      hint: "Lista INCI completa, separada por vírgulas.",
    },
    {
      key: "ph",
      label: "pH",
      type: "text",
      placeholder: "Ex: 5.5",
    },
    {
      key: "certificacoes",
      label: "Certificações",
      type: "list",
      placeholder: "Ex: Vegan, Cruelty-Free, ISO 22716, CE",
    },
    {
      key: "dimensoes",
      label: "Dimensões (CxLxA)",
      type: "text",
      placeholder: "Ex: 5 x 5 x 12 cm",
      hint: "Volume, peso e validade são definidos nos campos do produto (SSoT).",
    },
  ],
  clinical: [
    {
      key: "mecanismo_accao",
      label: "Mecanismo de acção",
      type: "textarea",
      placeholder: "Ex: Inibe a tirosinase reduzindo a melanogénese…",
      hint: "Como o produto actua biologicamente. Linguagem técnica para o Copilot B2B.",
    },
    {
      key: "activos",
      label: "Activos (com concentração)",
      type: "list",
      placeholder: "Ex: Niacinamida 5%, Retinol 0.3%",
      hint: "Cada activo numa linha, idealmente com a concentração.",
    },
    {
      key: "alvo_terapeutico",
      label: "Alvo terapêutico / receptor",
      type: "list",
      placeholder: "Ex: Receptor de melatonina MT1, COX-2",
    },
    {
      key: "evidencia",
      label: "Evidência clínica",
      type: "list",
      placeholder: "Ex: RCT 2022, n=120, redução 32% manchas (p<0.05)",
      hint: "Estudos, ensaios, in vitro, in vivo. Inclui amostra, resultado e p-value.",
    },
    {
      key: "referencias",
      label: "Referências bibliográficas",
      type: "list",
      placeholder: "Ex: Smith J. et al., JAAD 2022; doi:10.1234/abc",
    },
    {
      key: "protocolos",
      label: "Protocolos de aplicação",
      type: "list",
      placeholder: "Ex: 4 sessões, 1x/semana, manutenção mensal",
      hint: "Protocolos clínicos ou esquemas terapêuticos recomendados.",
    },
    {
      key: "indicacoes_clinicas",
      label: "Indicações clínicas",
      type: "list",
      placeholder: "Ex: Hiperpigmentação pós-inflamatória, melasma",
    },
    {
      key: "contraindicacoes",
      label: "Contraindicações",
      type: "list",
      placeholder: "Ex: Gravidez, alergia a X",
    },
    {
      key: "advertencias",
      label: "Advertências",
      type: "list",
      placeholder: "Ex: Não exceder a dose recomendada",
    },
    {
      key: "precaucoes",
      label: "Precauções",
      type: "list",
      placeholder: "Ex: Suspender uso se irritação persistir",
    },
    {
      key: "interaccoes",
      label: "Interacções",
      type: "list",
      placeholder: "Ex: Anticoagulantes, retinóides",
    },
    {
      key: "efeitos_adversos",
      label: "Efeitos adversos",
      type: "list",
      placeholder: "Ex: Eritema ligeiro, descamação transitória",
    },
    {
      key: "tempo_resultados",
      label: "Tempo até resultados",
      type: "text",
      placeholder: "Ex: 4-6 semanas de uso contínuo",
    },
  ],
};

export function getKnownKeys(section: ProductSectionKey): Set<string> {
  return new Set(SECTION_FIELDS[section].map((f) => f.key));
}
