const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { profile, tone = "casual", workspaceContext, serviceContext, sequenceStep = 1 } = await req.json();

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    const toneDescriptions: Record<string, string> = {
      formal: "Tom formal e profissional. Use 'você' e linguagem corporativa educada.",
      casual: "Tom casual e amigável. Use linguagem natural e próxima, como se falasse com um conhecido.",
      direto: "Tom direto e objetivo. Vá direto ao ponto sem rodeios, mas mantendo respeito.",
    };

    const stepInstructions: Record<number, string> = {
      1: `ETAPA 1 - ABERTURA (Dia 0):
- Método AIDA completo (Atenção, Interesse, Desejo, Ação)
- Primeiro contacto, criar curiosidade
- Referência directa ao trabalho do prospect
- Termina com pergunta aberta`,
      2: `ETAPA 2 - FOLLOW-UP (Dia 3):
- Referir subtilmente que já contactaste antes (sem ser insistente)
- Partilhar um caso de estudo ou resultado concreto
- Mostrar valor adicional com dado/estatística relevante
- Termina com convite para conversa rápida`,
      3: `ETAPA 3 - FECHO (Dia 7):
- Última mensagem da sequência
- Criar sentido de urgência ou escassez (subtil, não agressivo)
- Resumir o benefício principal em 1 frase
- CTA final claro e directo
- Tom respeitoso: "se não fizer sentido, sem problema"`,
    };

    const serviceBlock = serviceContext?.offer
      ? `\nCONTEXTO DO SERVIÇO QUE VENDES:
- Oferta: ${serviceContext.offer}
- Dores que resolves: ${serviceContext.painPoints || "N/A"}
IMPORTANTE: Foca a mensagem na DOR específica deste prospect e como a tua oferta a resolve. Não sejas genérico.`
      : "";

    const systemPrompt = `És um especialista em copywriting para Instagram DMs usando o método AIDA (Atenção, Interesse, Desejo, Ação).

REGRAS OBRIGATÓRIAS:
- A mensagem DEVE ter no máximo 300 caracteres (ideal para Instagram DM)
- Escreve em português de Portugal
- NÃO uses hashtags
- NÃO uses saudações genéricas como "Olá, tudo bem?"
- A mensagem deve parecer natural e humana, não um template
- Personaliza com base nos dados reais do perfil
- ${toneDescriptions[tone] || toneDescriptions.casual}
${serviceBlock}

${stepInstructions[sequenceStep] || stepInstructions[1]}

Responde APENAS com um JSON no formato:
{
  "message": "mensagem com emojis",
  "message_plain": "mesma mensagem sem emojis"
}`;

    const profileInfo = [
      profile.name && `Nome: ${profile.name}`,
      profile.profession && `Profissão: ${profile.profession}`,
      profile.specialty && `Especialidade: ${profile.specialty}`,
      profile.bio && `Bio: ${profile.bio}`,
      profile.location && `Localização: ${profile.location}`,
      profile.followers && `Seguidores: ${profile.followers}`,
      profile.category && `Categoria Instagram: ${profile.category}`,
      profile.isVerified && `Perfil verificado`,
      profile.isBusiness && `Conta profissional`,
    ].filter(Boolean).join("\n");

    const workspaceInfo = workspaceContext
      ? `\nContexto da empresa que envia:\n- Nome: ${workspaceContext.name || "N/A"}\n- O que fazem: ${workspaceContext.description || "N/A"}`
      : "";

    const userPrompt = `Gera uma mensagem de prospecção para Instagram DM para este perfil:\n\n${profileInfo}${workspaceInfo}\n\nTom: ${tone}\nEtapa da sequência: ${sequenceStep}/3`;

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
        temperature: 0.8,
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Limite de pedidos excedido. Tente novamente em breve." }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "Créditos insuficientes. Adicione créditos ao workspace." }), {
          status: 402,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const text = await response.text();
      console.error("AI gateway error:", response.status, text);
      throw new Error("Erro ao gerar mensagem");
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content || "";

    // Parse JSON from response
    let result;
    try {
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      result = jsonMatch ? JSON.parse(jsonMatch[0]) : { message: content, message_plain: content };
    } catch {
      result = { message: content, message_plain: content.replace(/[\u{1F600}-\u{1F9FF}]/gu, "").trim() };
    }

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Erro desconhecido" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
