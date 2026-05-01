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
      hint: "Um passo por linha, na ordem de aplicação.",
    },
    {
      key: "dose",
      label: "Dose",
      type: "text",
      placeholder: "Ex: 2 gotas / 1 cápsula / 5 ml",
    },
    {
      key: "frequencia",
      label: "Frequência",
      type: "text",
      placeholder: "Ex: 2x por dia, manhã e noite",
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
      hint: "Lista os princípios activos ou componentes destacados.",
    },
  ],
  clinical: [
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
  ],
};

export function getKnownKeys(section: ProductSectionKey): Set<string> {
  return new Set(SECTION_FIELDS[section].map((f) => f.key));
}
