// Verifica TXT _lovable-builder.<host> via DNS-over-HTTPS (Google) e marca
// o domínio como verificado se o token bater certo.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.74.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

interface DohAnswer {
  name: string;
  type: number;
  data: string;
}

async function lookupTxt(host: string): Promise<string[]> {
  const r = await fetch(
    `https://dns.google/resolve?name=${encodeURIComponent(host)}&type=TXT`,
    { headers: { Accept: "application/dns-json" } },
  );
  if (!r.ok) return [];
  const j = await r.json();
  const ans: DohAnswer[] = j.Answer ?? [];
  return ans
    .filter((a) => a.type === 16)
    .map((a) => a.data.replace(/^"(.*)"$/, "$1").replace(/"\s+"/g, ""));
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Cliente em nome do utilizador para validar permissões via RLS na RPC
    const userClient = createClient(SUPABASE_URL, ANON_KEY, {
      global: { headers: { Authorization: authHeader } },
      auth: { persistSession: false },
    });
    const admin = createClient(SUPABASE_URL, SERVICE_KEY, {
      auth: { persistSession: false },
    });

    const { data: claims, error: authErr } = await userClient.auth.getClaims(
      authHeader.replace("Bearer ", ""),
    );
    if (authErr || !claims?.claims) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = await req.json().catch(() => ({}));
    const domainId: string | undefined = body?.domain_id;
    if (!domainId || typeof domainId !== "string") {
      return new Response(JSON.stringify({ error: "domain_id required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Buscar host + token via service role (validação de membership é feita na RPC)
    const { data: domain, error: dErr } = await admin
      .from("builder_asset_domains")
      .select("id, hostname, verification_token, workspace_id")
      .eq("id", domainId)
      .maybeSingle();

    if (dErr || !domain) {
      return new Response(JSON.stringify({ error: "Domain not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const recordHost = `_lovable-builder.${domain.hostname}`;
    const txts = await lookupTxt(recordHost);
    const found = txts.find((t) => t.trim() === domain.verification_token);

    // Chama RPC com o token resolvido (a RPC valida membership do workspace)
    const { data: ok, error: vErr } = await userClient.rpc(
      "verify_builder_domain",
      {
        _domain_id: domainId,
        _resolved_token: found ?? "",
      },
    );

    if (vErr) {
      return new Response(JSON.stringify({ error: vErr.message }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(
      JSON.stringify({
        verified: !!ok,
        record_host: recordHost,
        expected_token: domain.verification_token,
        found_records: txts,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  } catch (e) {
    console.error("[builder-domain-verify]", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "fatal" }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  }
});
