/**
 * Referências Ajax terminadas em "-DUMMY" (ou "-DUMMY-COPY") identificam
 * caixas/carcaças vazias, sem o equipamento eletrónico. Só se usa esta fonte
 * confirmada (SKU); nunca se deduz pelo nome.
 */
export function isEmptyHousingSku(sku: string | null | undefined): boolean {
  if (!sku) return false;
  return /-DUMMY(-COPY)?$/i.test(sku.trim());
}

/** Referência do equipamento correspondente (ex.: AJ-KEYPADCOMBI-W). */
export function housingBaseSku(sku: string): string {
  return sku.trim().replace(/-DUMMY(-COPY)?$/i, "");
}
