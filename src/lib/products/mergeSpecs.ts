/**
 * Junta especificações vindas da IA/fabricante às existentes:
 * preenche apenas valores vazios com a mesma chave (normalizada) e
 * acrescenta as restantes. Nunca substitui um valor já preenchido.
 */
export interface MergeableSpec {
  id?: string;
  spec_key: string;
  spec_value: string;
  unit: string;
  spec_group: string;
  display_order: number;
  isNew?: boolean;
  source?: "manual" | "ia" | "fabricante";
}

export const normalizeSpecKey = (k: string) =>
  k.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();

export function mergeSpecs(
  current: MergeableSpec[],
  incoming: Array<Partial<MergeableSpec>>,
  source: MergeableSpec["source"],
): { specs: MergeableSpec[]; filled: number; added: number } {
  const specs = current.map((s) => ({ ...s }));
  const index = new Map(specs.map((s, i) => [normalizeSpecKey(s.spec_key), i]));
  let filled = 0;
  let added = 0;
  for (const raw of incoming) {
    const key = String(raw.spec_key ?? "").trim();
    const value = String(raw.spec_value ?? "").trim();
    if (!key) continue;
    const i = index.get(normalizeSpecKey(key));
    if (i !== undefined) {
      if (!specs[i].spec_value.trim() && value) {
        specs[i] = { ...specs[i], spec_value: value, unit: specs[i].unit || String(raw.unit ?? ""), source };
        filled++;
      }
      continue;
    }
    specs.push({
      spec_key: key,
      spec_value: value,
      unit: String(raw.unit ?? ""),
      spec_group: raw.spec_group || "Geral",
      display_order: specs.length,
      isNew: true,
      source,
    });
    index.set(normalizeSpecKey(key), specs.length - 1);
    added++;
  }
  return { specs, filled, added };
}
