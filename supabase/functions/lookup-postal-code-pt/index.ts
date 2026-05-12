// Lookup público de código postal português com cache em DB.
// Tenta cache primeiro; se não existir, faz fetch a geoapi.pt e grava.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-info",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const CP_REGEX = /^\d{4}-\d{3}$/;

interface LookupResult {
  address: string | null;
  city: string | null;
  municipality: string | null;
  district: string | null;
}

function normalizeFromGeoapi(data: any): LookupResult | null {
  if (!data || typeof data !== "object") return null;
  const partes: Array<Record<string, string>> = Array.isArray(data.partes) ? data.partes : [];
  const firstParte = partes[0] ?? {};
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

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { postalCode } = await req.json().catch(() => ({}));
    const cp = String(postalCode ?? "").trim();
    if (!CP_REGEX.test(cp)) {
      return new Response(
        JSON.stringify({ error: "invalid_postal_code", result: null }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    );

    // 1. Cache hit
    const { data: cached } = await supabase
      .from("pt_postal_code_cache")
      .select("address, city, municipality, district")
      .eq("postal_code", cp)
      .maybeSingle();

    if (cached) {
      return new Response(JSON.stringify({ result: cached, source: "cache" }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // 2. Fetch geoapi.pt
    let result: LookupResult | null = null;
    try {
      const res = await fetch(`https://json.geoapi.pt/cp/${encodeURIComponent(cp)}`, {
        headers: { Accept: "application/json", "User-Agent": "FastCRM/1.0 (+postalcode-lookup)" },
      });
      if (res.ok) {
        const data = await res.json().catch(() => null);
        result = normalizeFromGeoapi(data);
      }
    } catch (e) {
      console.warn("[lookup-postal-code-pt] geoapi fetch failed:", e);
    }

    if (!result) {
      return new Response(
        JSON.stringify({ result: null, source: "miss" }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // 3. Grava cache (best-effort)
    await supabase
      .from("pt_postal_code_cache")
      .upsert({ postal_code: cp, ...result, cached_at: new Date().toISOString() })
      .select()
      .maybeSingle();

    return new Response(JSON.stringify({ result, source: "geoapi" }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("[lookup-postal-code-pt] internal_error:", e);
    return new Response(
      JSON.stringify({ result: null, error: "internal_error" }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
