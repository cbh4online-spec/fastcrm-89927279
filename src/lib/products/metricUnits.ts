/**
 * Converte unidades imperiais (oz, lb, ", in, ft, °F) para o Sistema Internacional
 * (g/kg, mm/cm/m, °C). Determinístico; valores sem unidade imperial ficam intactos.
 */
const UNIT_RE = /^\s*(-?\d+(?:[.,]\d+)?)\s*(oz|ounces?|onças?|lbs?|pounds?|"|”|''|in|inch(?:es)?|polegadas?|ft|feet|foot|°\s?f|ºf|f)\s*$/i;

const fmt = (n: number, d: number) => {
  const r = Math.round(n * 10 ** d) / 10 ** d;
  return String(r).replace(".", ",");
};

export function toMetric(value: string, unit = ""): { value: string; unit: string } {
  const raw = `${value ?? ""}${unit ? " " + unit : ""}`.trim();
  const m = raw.match(UNIT_RE);
  if (!m) return { value, unit };
  const n = Number(m[1].replace(",", "."));
  const u = m[2].toLowerCase().replace(/\s/g, "");
  if (/^(oz|ounce|onça)/.test(u)) {
    const g = n * 28.3495;
    return g >= 1000 ? { value: fmt(g / 1000, 2), unit: "kg" } : { value: fmt(g, 0), unit: "g" };
  }
  if (/^(lb|pound)/.test(u)) {
    const kg = n * 0.453592;
    return kg < 1 ? { value: fmt(kg * 1000, 0), unit: "g" } : { value: fmt(kg, 2), unit: "kg" };
  }
  if (/^("|”|''|in|polegada)/.test(u)) return { value: fmt(n * 25.4, 0), unit: "mm" };
  if (/^(ft|feet|foot)/.test(u)) return { value: fmt(n * 0.3048, 2), unit: "m" };
  if (/f$/.test(u)) return { value: fmt(((n - 32) * 5) / 9, 0), unit: "°C" };
  return { value, unit };
}
