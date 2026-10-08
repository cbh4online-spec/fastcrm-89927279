/**
 * Apresentação uniforme de títulos de produto na loja (PT-PT).
 * Só corrige forma (espaços, separadores soltos, grafia PT-PT de "detetor");
 * não acrescenta características, compatibilidades nem altera o nome guardado.
 */
export function formatStoreTitle(raw?: string | null): string {
  let t = (raw || "").replace(/\s+/g, " ").trim();
  t = t.replace(/\s*[-–|,]+\s*$/g, "").replace(/^\s*[-–|]+\s*/g, "");
  t = t.replace(/\b([Dd])etector(es)?\b/g, (_m, d, pl) => `${d}etetor${pl || ""}`);
  t = t.replace(/\bautônom(o|a|os|as)\b/gi, (m) => m.replace("ô", "ó"));
  t = t.replace(/\s+([,.;:])/g, "$1");
  return t;
}
