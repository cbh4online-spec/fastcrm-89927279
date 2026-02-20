import "https://deno.land/x/xhr@0.1.0/mod.ts";

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface Message {
  direction: string;
  content: string;
}

interface RequestBody {
  messages: Message[];
  leadName?: string;
  channel?: string;
  lastMessageAt?: string;
  // Session summary mode
  sessionMode?: boolean;
  conversationId?: string;
  workspaceId?: string;
  inactivityThresholdMinutes?: number;
  saveToContactField?: string;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { 
      messages, leadName, channel, lastMessageAt,
      sessionMode, conversationId, workspaceId,
      inactivityThresholdMinutes, saveToContactField
    }: RequestBody = await req.json();

    if (!messages || messages.length === 0) {
      return new Response(
        JSON.stringify({ error: "No messages provided" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Format messages for context
    const conversationText = messages
      .slice(-20)
      .map((m) => `${m.direction === "inbound" ? "Cliente" : "Equipa"}: ${m.content}`)
      .join("\n");

    // Build full transcript for session mode
    const fullTranscript = sessionMode 
      ? messages.map((m) => `[${m.direction === "inbound" ? "Cliente" : "Equipa"}] ${m.content}`).join("\n")
      : undefined;

    // Calculate time since last message
    let timeSinceLastMessage = "";
    if (lastMessageAt) {
      const hoursSince = Math.floor((Date.now() - new Date(lastMessageAt).getTime()) / (1000 * 60 * 60));
      if (hoursSince < 1) {
        timeSinceLastMessage = "há menos de 1 hora";
      } else if (hoursSince < 24) {
        timeSinceLastMessage = `há ${hoursSince} horas`;
      } else {
        const days = Math.floor(hoursSince / 24);
        timeSinceLastMessage = `há ${days} dia${days > 1 ? 's' : ''}`;
      }
    }

    const systemPrompt = `Você é um assistente de CRM que cria resumos concisos de conversas de negócios.

REGRAS IMPORTANTES:
1. Crie exatamente 2-3 bullet points curtos (máximo 15 palavras cada)
2. Use linguagem de negócios simples e objetiva
3. NUNCA invente fatos - baseie-se apenas no conteúdo das mensagens
4. Identifique o status atual da conversa (ex: "Aguardando resposta", "Em negociação", "Cliente interessado")
5. Destaque: interesse demonstrado, pedidos específicos, objeções, próximos passos acordados

FORMATO DE RESPOSTA (JSON):
{
  "bulletPoints": ["ponto 1", "ponto 2", "ponto 3"],
  "status": "status atual da conversa",
  "lastAction": "quem enviou a última mensagem (cliente/equipa)"
}`;

    const userPrompt = `Analise esta conversa${leadName ? ` com ${leadName}` : ""}${channel ? ` via ${channel}` : ""}:

${conversationText}

${timeSinceLastMessage ? `Última mensagem: ${timeSinceLastMessage}` : ""}

Gere um resumo conciso seguindo o formato especificado.`;

    // Use Lovable AI
    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${Deno.env.get("LOVABLE_API_KEY")}`,
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
      const errorText = await response.text();
      console.error("AI API error:", errorText);
      throw new Error(`AI API error: ${response.status}`);
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content || "";

    // Parse JSON from response
    let summary;
    try {
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        summary = JSON.parse(jsonMatch[0]);
      } else {
        throw new Error("No JSON found in response");
      }
    } catch (parseError) {
      console.error("Failed to parse AI response:", content);
      summary = {
        bulletPoints: ["Não foi possível gerar resumo automático"],
        status: "Indeterminado",
        lastAction: "desconhecido",
      };
    }

    // Session mode: persist to conversation_sessions
    if (sessionMode && conversationId && workspaceId) {
      try {
        const supabaseAdmin = createClient(
          Deno.env.get("SUPABASE_URL")!,
          Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
        );

        const summaryText = summary.bulletPoints.join(" | ");

        // Upsert session with summary
        await supabaseAdmin
          .from("conversation_sessions")
          .update({
            summary: summaryText,
            transcript: fullTranscript || null,
            saved_to_contact_field: saveToContactField || null,
            session_end_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          })
          .eq("conversation_id", conversationId)
          .eq("workspace_id", workspaceId)
          .order("created_at", { ascending: false })
          .limit(1);

        console.log(`[CONV-SUMMARY] Session summary saved for conversation ${conversationId}`);
      } catch (sessionErr) {
        console.warn("[CONV-SUMMARY] Failed to save session summary:", sessionErr);
      }
    }

    return new Response(
      JSON.stringify(summary),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error in conversation-summary:", error);
    return new Response(
      JSON.stringify({ 
        error: error instanceof Error ? error.message : "Unknown error",
        bulletPoints: [],
        status: "Erro",
        lastAction: "desconhecido"
      }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
