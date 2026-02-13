/**
 * Sanitize template content by removing persuasion structure labels
 * that should never be visible to the end recipient.
 */

const STRUCTURE_LABEL_PATTERN = /^\*\*(Atenção|Interesse|Desejo|Ação|Problema|Agitação|Solução|Gancho|Autoridade|Prova|Oferta|Urgência|Contexto|Conflito|Resolução)\*\*\s*\n?/gm;

/**
 * Remove framework block labels (AIDA, PAS, etc.) from template text.
 * Returns cleaned text with collapsed empty lines.
 */
export function stripStructureLabels(text: string): string {
  if (!text) return text;
  return text
    .replace(STRUCTURE_LABEL_PATTERN, '')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}
