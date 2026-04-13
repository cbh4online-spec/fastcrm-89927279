import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const EXPECTED_IP = "185.158.133.1";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Não autorizado" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Validate user
    const userClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );
    const { data: { user }, error: authError } = await userClient.auth.getUser();
    if (authError || !user) {
      return new Response(JSON.stringify({ error: "Não autorizado" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { domain, workspace_id } = await req.json();

    if (!domain || typeof domain !== "string" || domain.length > 253) {
      return new Response(JSON.stringify({ error: "Domínio inválido" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (!workspace_id || typeof workspace_id !== "string") {
      return new Response(JSON.stringify({ error: "workspace_id obrigatório" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Verify workspace membership
    const { data: member } = await supabase
      .from("workspace_members")
      .select("id")
      .eq("workspace_id", workspace_id)
      .eq("user_id", user.id)
      .limit(1);
    if (!member?.length) {
      return new Response(JSON.stringify({ error: "Sem acesso a este workspace" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // DNS lookup via Google DNS API
    const cleanDomain = domain.replace(/^https?:\/\//, "").replace(/\/+$/, "").toLowerCase();
    const dnsRes = await fetch(`https://dns.google/resolve?name=${encodeURIComponent(cleanDomain)}&type=A`);
    const dnsData = await dnsRes.json();

    const ips: string[] = (dnsData.Answer || [])
      .filter((r: any) => r.type === 1)
      .map((r: any) => r.data);

    const verified = ips.includes(EXPECTED_IP);

    // Update config
    await supabase
      .from("c2c_marketplace_config")
      .update({ custom_domain_verified: verified })
      .eq("workspace_id", workspace_id);

    return new Response(
      JSON.stringify({
        verified,
        domain: cleanDomain,
        expected_ip: EXPECTED_IP,
        found_ips: ips,
        dns_status: dnsData.Status,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (err) {
    console.error("verify-marketplace-domain error:", err);
    return new Response(
      JSON.stringify({ error: "Erro interno na verificação" }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
