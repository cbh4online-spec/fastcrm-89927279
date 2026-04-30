const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  // Devolver 200 com flag `deprecated` para o cliente tratar graciosamente
  // (em vez de 410 que dispara erro genérico no supabase-js e crasha a UI).
  return new Response(JSON.stringify({
    deprecated: true,
    error: "DEPRECATED: A compra de créditos avulsos foi substituída pelo modelo de subscrição. Use o módulo de Faturação.",
    redirect: "/settings/billing",
  }), {
    status: 200,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
});
