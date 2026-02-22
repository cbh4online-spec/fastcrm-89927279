const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

function isValidEmailFormat(email: string): boolean {
  const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return re.test(email);
}

async function hasMxRecords(domain: string): Promise<boolean> {
  try {
    const records = await Deno.resolveDns(domain, "MX");
    return records.length > 0;
  } catch {
    return false;
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { email } = await req.json();

    if (!email) {
      return new Response(
        JSON.stringify({ success: false, error: "Email is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Step 1: Format check
    if (!isValidEmailFormat(email)) {
      return new Response(
        JSON.stringify({ success: true, data: { email, status: "invalid", reason: "Formato inválido" } }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Step 2: MX record check
    const domain = email.split("@")[1];
    const hasMx = await hasMxRecords(domain);

    if (!hasMx) {
      return new Response(
        JSON.stringify({ success: true, data: { email, status: "invalid", reason: "Domínio sem registos MX" } }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({ success: true, data: { email, status: "valid", reason: "Formato e MX válidos" } }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Email validation error:", error);
    return new Response(
      JSON.stringify({
        success: true,
        data: { status: "unknown", reason: "Erro na validação" },
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
