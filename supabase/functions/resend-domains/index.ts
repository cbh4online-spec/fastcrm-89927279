// Lista os domínios configurados na conta Resend ligada (via conector).
// Requer utilizador autenticado. Se a chave for "sending only", devolve restricted=true.
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import { createClient } from "npm:@supabase/supabase-js@2";

const GATEWAY_URL = "https://connector-gateway.lovable.dev/resend";
const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    const auth = req.headers.get("Authorization");
    if (!auth?.startsWith("Bearer ")) return json({ error: "unauthorized" }, 401);
    const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: auth } },
    });
    const { data: userData, error: userErr } = await supabase.auth.getUser();
    if (userErr || !userData?.user) return json({ error: "unauthorized" }, 401);

    const lovableKey = Deno.env.get("LOVABLE_API_KEY");
    const resendKey = Deno.env.get("RESEND_API_KEY");
    if (!lovableKey || !resendKey) return json({ domains: [], restricted: false, error: "not_configured" });

    const res = await fetch(`${GATEWAY_URL}/domains`, {
      headers: { Authorization: `Bearer ${lovableKey}`, "X-Connection-Api-Key": resendKey },
    });
    const text = await res.text();
    if (!res.ok) {
      const restricted = text.includes("restricted_api_key");
      console.error(`resend-domains [${res.status}]: ${text}`);
      return json({ domains: [], restricted, error: restricted ? "restricted_api_key" : "provider_error", status: res.status });
    }
    const body = JSON.parse(text);
    const domains = (body?.data ?? []).map((d: any) => ({ name: d.name, status: d.status, region: d.region }));
    return json({ domains, restricted: false });
  } catch (e) {
    console.error("resend-domains error", e);
    return json({ domains: [], restricted: false, error: "internal_error" });
  }
});
