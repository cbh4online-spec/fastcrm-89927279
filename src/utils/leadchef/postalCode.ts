/**
 * Lookup de código postal português via edge function `lookup-postal-code-pt`,
 * que faz cache em DB + chamada ao geoapi.pt server-side (evita rate-limit do browser).
 *
 * Formato esperado: XXXX-XXX (4-3 dígitos).
 */

import { supabase } from "@/integrations/supabase/client";

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
): Promise<PortugalPostalLookupResult | null> {
  const code = cp.trim();
  if (!isValidPortugalPostalCode(code)) return null;

  const { data, error } = await supabase.functions.invoke<{
    result: PortugalPostalLookupResult | null;
  }>("lookup-postal-code-pt", {
    body: { postalCode: code },
  });
  if (error) {
    console.warn("[postalCode] edge function error:", error.message);
    return null;
  }
  return data?.result ?? null;
}
