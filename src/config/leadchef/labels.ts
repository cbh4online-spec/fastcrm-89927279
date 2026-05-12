/**
 * SSoT — Rótulos visíveis para a entidade "Lead/Referência" no módulo LeadChef.
 *
 * Toda a UI do LeadChef que precise mostrar este conceito DEVE importar daqui,
 * em vez de usar strings literais. Para mudar globalmente o vocabulário
 * (ex.: voltar a "Lead" ou usar "Indicação"), basta editar este ficheiro.
 *
 * Não usar para identificadores técnicos, nomes de tabelas, rotas ou tipos.
 */

export const LEADCHEF_ENTITY_LABELS = {
  /** Singular, minúsculas. Ex.: "nova referência" */
  singular: "referência",
  /** Plural, minúsculas. Ex.: "as referências" */
  plural: "referências",
  /** Singular capitalizado. Ex.: título "Referência" */
  Singular: "Referência",
  /** Plural capitalizado. Ex.: título "Referências" */
  Plural: "Referências",
  /** Genitivo plural com artigo. Ex.: "score das tuas referências" */
  pluralPossessive: "das tuas referências",
} as const;

export type LeadChefEntityLabelKey = keyof typeof LEADCHEF_ENTITY_LABELS;

/** Atalho conveniente. */
export const L = LEADCHEF_ENTITY_LABELS;

/** CTAs e frases compostas reutilizáveis. */
export const LEADCHEF_COPY = {
  newEntity: `Nova ${L.singular}`,
  newEntityShort: `Nova ${L.singular}`,
  convertToEntity: `Converter em ${L.singular}`,
  entityFunnelSubtitle: `Funil ${L.pluralPossessive} LeadChef.`,
  entityIntelligenceSubtitle: `Score e sugestões ${L.pluralPossessive}`,
  noEntities: `Sem ${L.plural} com estes filtros.`,
  searchPlaceholder: `Pesquisar nome, telefone, email…`,
} as const;
