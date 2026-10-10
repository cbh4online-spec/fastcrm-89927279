/** Itens que o fluxo em massa pode realmente preparar/confirmar (só Instagram; WhatsApp fica individual). */
export function selectBulkEligible<T>(items: T[], isWhatsApp: (item: T) => boolean): T[] {
  return items.filter((i) => !isWhatsApp(i));
}

/** Progresso do fluxo em massa, com denominador limitado aos elegíveis. */
export function bulkProgress(eligibleIds: string[], sent: Set<string>, rejected: Set<string>) {
  const total = eligibleIds.length;
  const processed = eligibleIds.filter((id) => sent.has(id) || rejected.has(id)).length;
  return { total, processed, pct: total > 0 ? (processed / total) * 100 : 0 };
}
