/**
 * Condições de presença de dados ("Com email", "Sem telefone", …).
 * Valor de cada condição: `${campo}:has` ou `${campo}:missing`.
 * Entre campos aplica-se AND; num mesmo campo "com" e "sem" são exclusivos.
 */
export type PresenceMode = "has" | "missing";

export interface PresenceField {
  key: string;
  label: string; // ex.: "email" → "Com email" / "Sem email"
}

export function presenceOptions(fields: PresenceField[]) {
  return fields.flatMap((f) => [
    { value: `${f.key}:has`, label: `Com ${f.label}`, count: 0 },
    { value: `${f.key}:missing`, label: `Sem ${f.label}`, count: 0 },
  ]);
}

/** Um valor só conta como presente se tiver texto não vazio (espaços e "—" contam como vazio). */
export function hasValue(v: unknown): boolean {
  if (v == null) return false;
  if (Array.isArray(v)) return v.length > 0;
  const s = String(v).trim();
  return s !== "" && s !== "—" && s !== "-";
}

export function parsePresence(selected: string[]): Array<{ field: string; mode: PresenceMode }> {
  const out: Array<{ field: string; mode: PresenceMode }> = [];
  for (const v of selected) {
    const [field, mode] = v.split(":");
    if (field && (mode === "has" || mode === "missing")) out.push({ field, mode });
  }
  return out;
}

/** Ao escolher "Com X", remove "Sem X" (e vice-versa). */
export function normalizePresenceSelection(prev: string[], next: string[]): string[] {
  const added = next.filter((v) => !prev.includes(v));
  let result = next;
  for (const a of added) {
    const [field] = a.split(":");
    result = result.filter((v) => v === a || v.split(":")[0] !== field);
  }
  return result;
}

export function matchesPresence(
  selected: string[],
  getField: (field: string) => unknown,
): boolean {
  return parsePresence(selected).every(({ field, mode }) =>
    mode === "has" ? hasValue(getField(field)) : !hasValue(getField(field)),
  );
}
