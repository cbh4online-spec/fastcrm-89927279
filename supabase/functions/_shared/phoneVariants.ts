/**
 * Variantes equivalentes de um número para verificar opt-out (PT por defeito).
 * Espelhado em src/lib/whatsapp/phoneVariants.ts — manter iguais (teste de paridade).
 * Mais variantes = mais correspondências = mais restritivo (nunca mais permissivo).
 */
export function phoneOptOutVariants(raw: string | null | undefined): string[] {
  let d = String(raw ?? "").replace(/\D/g, "");
  if (d.startsWith("00")) d = d.slice(2);
  if (d.length < 6) return [];
  const set = new Set<string>([d]);
  if (d.length === 9 && /^[239]/.test(d)) set.add(`351${d}`);
  if (d.startsWith("351") && d.length === 12) set.add(d.slice(3));
  const out = new Set<string>();
  for (const v of set) { out.add(v); out.add(`+${v}`); }
  return [...out];
}
