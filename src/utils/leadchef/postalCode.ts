/**
 * Lookup de código postal português via geoapi.pt (gratuito, sem chave).
 * Devolve morada (arruamento) e localidade quando disponível.
 *
 * Formato esperado: XXXX-XXX (4-3 dígitos).
 */

export interface PortugalPostalLookupResult {
  address: string | null;
  city: string | null;
  district: string | null;
  municipality: string | null;
}

const CP_REGEX = /^\d{4}-\d{3}$/;

export function isValidPortugalPostalCode(cp: string): boolean {
  return CP_REGEX.test(cp.trim());
}

export async function lookupPortugalPostalCode(
  cp: string,
  signal?: AbortSignal,
): Promise<PortugalPostalLookupResult | null> {
  const code = cp.trim();
  if (!isValidPortugalPostalCode(code)) return null;

  const res = await fetch(`https://json.geoapi.pt/cp/${encodeURIComponent(code)}`, {
    signal,
    headers: { Accept: "application/json" },
  });
  if (!res.ok) return null;
  const data = await res.json().catch(() => null);
  if (!data || typeof data !== "object") return null;

  const partes: Array<Record<string, string>> = Array.isArray(data.partes) ? data.partes : [];
  const firstParte = partes[0] ?? {};

  // Geoapi.pt usa "Artéria" (rua) e "Local" (bairro/zona) dentro de cada parte.
  const arteria: string | undefined =
    firstParte["Artéria"] || firstParte["Arteria"] || firstParte["arruamento"] || data.arruamento;
  const local: string | undefined = firstParte["Local"];
  const address = [arteria, local].filter(Boolean).join(", ") || null;

  const localidade: string | undefined =
    data["Localidade"] || data["localidade"] || data["Designação Postal"];
  const concelho: string | undefined = data["Concelho"] || data["concelho"];
  const distrito: string | undefined = data["Distrito"] || data["distrito"];

  return {
    address,
    city: localidade ?? concelho ?? null,
    municipality: concelho ?? null,
    district: distrito ?? null,
  };
}
