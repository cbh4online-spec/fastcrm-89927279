const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { field_config, record_data, field_name } = await req.json();

    if (!field_config || !field_name) {
      return new Response(JSON.stringify({ error: "field_config and field_name are required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      return new Response(JSON.stringify({ error: "LOVABLE_API_KEY not configured" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { ai_autofill_type, ai_autofill_guidance } = field_config;
    const recordContext = record_data
      ? Object.entries(record_data)
          .map(([k, v]) => `${k}: ${v ?? "(vazio)"}`)
          .join("\n")
      : "(sem dados do registo)";

    let systemPrompt = "";
    switch (ai_autofill_type) {
      case "research":
        systemPrompt = `És um agente de pesquisa. Com base nos dados do registo, pesquisa e devolve o valor mais adequado para o campo "${field_name}". Responde APENAS com o valor, sem explicações.`;
        break;
      case "classify":
        systemPrompt = `És um classificador. Com base nos dados do registo, classifica e devolve o valor mais adequado para o campo "${field_name}". Responde APENAS com a classificação, sem explicações.`;
        break;
      case "generate":
      default:
        systemPrompt = `És um assistente de geração de conteúdo. Com base nos dados do registo, gera o valor mais adequado para o campo "${field_name}". Responde APENAS com o valor gerado, sem explicações.`;
        break;
    }

    let userPrompt = `Dados do registo:\n${recordContext}`;
    if (ai_autofill_guidance) {
      // Replace variable placeholders with actual values
      let resolvedGuidance = ai_autofill_guidance;
      if (record_data) {
        for (const [key, value] of Object.entries(record_data)) {
          resolvedGuidance = resolvedGuidance.replace(
            new RegExp(`\\{${key}\\}`, "g"),
            String(value ?? "")
          );
        }
      }
      userPrompt += `\n\nOrientação do utilizador: ${resolvedGuidance}`;
    }
    userPrompt += `\n\nCampo a preencher: ${field_name}`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limit exceeded, try again later." }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "Payment required." }), {
          status: 402,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const t = await response.text();
      console.error("AI error:", response.status, t);
      return new Response(JSON.stringify({ error: "AI autofill failed" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const data = await response.json();
    const value = data.choices?.[0]?.message?.content?.trim() || "";

    return new Response(JSON.stringify({ value }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("ai-autofill-field error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
