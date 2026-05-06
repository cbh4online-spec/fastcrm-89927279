import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const lovableKey = Deno.env.get("LOVABLE_API_KEY");

    const authHeader = req.headers.get("Authorization") ?? "";
    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: userData } = await userClient.auth.getUser();
    if (!userData.user) {
      return new Response(JSON.stringify({ error: "unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const userId = userData.user.id;

    const { workspace_id, ticket_id } = await req.json();
    if (!workspace_id || !ticket_id) {
      return new Response(JSON.stringify({ error: "workspace_id and ticket_id are required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const admin = createClient(supabaseUrl, serviceKey, { auth: { persistSession: false } });

    const { data: member } = await admin
      .from("workspace_members")
      .select("user_id")
      .eq("workspace_id", workspace_id)
      .eq("user_id", userId)
      .maybeSingle();
    if (!member) {
      return new Response(JSON.stringify({ error: "forbidden" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: ticket } = await admin
      .from("client_tickets")
      .select("id,subject,description,priority,category,conversation_id,ai_summary")
      .eq("id", ticket_id)
      .eq("workspace_id", workspace_id)
      .maybeSingle();

    if (!ticket) {
      return new Response(JSON.stringify({ error: "ticket_not_found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Pull last messages from the linked conversation if available
    let conversationContext = "";
    if (ticket.conversation_id) {
      const { data: msgs } = await admin
        .from("messages")
        .select("direction,content,created_at")
        .eq("conversation_id", ticket.conversation_id)
        .order("created_at", { ascending: false })
        .limit(10);
      if (msgs?.length) {
        conversationContext = msgs
          .reverse()
          .map((m) => `[${m.direction}] ${String(m.content ?? "").slice(0, 400)}`)
          .join("\n");
      }
    }

    await admin.from("support_ticket_events").insert({
      workspace_id,
      ticket_id,
      event_type: "support.ticket.triage_started",
      description: "Triagem IA iniciada.",
      created_by: userId,
      payload: {},
    });

    if (!lovableKey) {
      console.warn("[SUPPORT][TRIAGE] LOVABLE_API_KEY missing, returning fallback");
      return new Response(
        JSON.stringify({
          fallback: true,
          recommendation: {
            summary: ticket.subject,
            category: ticket.category ?? "Suporte Técnico",
            priority: ticket.priority,
            recommended_response: "Olá, recebemos o seu pedido e estamos a analisar. Voltamos em breve com uma resposta.",
            resolution_steps: ["Confirmar dados do cliente", "Validar histórico", "Responder com solução"],
            escalation_risk: "low",
            confidence: 0.4,
          },
        }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const systemPrompt = `És um especialista em triagem de tickets de suporte para uma empresa portuguesa.
Devolve sempre português de Portugal, claro e profissional.
Categorias possíveis: Suporte Técnico, Reclamação, Faturação, Entrega, Cancelamento, Pré-venda, Outro.
Prioridades possíveis: low, medium, high, critical.
Risco de escalamento: low, medium, high.`;

    const userPrompt = `Ticket:
Assunto: ${ticket.subject}
Descrição: ${ticket.description ?? "(sem descrição)"}
Categoria atual: ${ticket.category ?? "(nenhuma)"}
Prioridade atual: ${ticket.priority}

Últimas mensagens da conversa:
${conversationContext || "(sem mensagens)"}

Faz a triagem completa.`;

    const aiResp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${lovableKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        tools: [
          {
            type: "function",
            function: {
              name: "triage_ticket",
              description: "Devolve recomendação estruturada de triagem.",
              parameters: {
                type: "object",
                properties: {
                  summary: { type: "string" },
                  category: { type: "string" },
                  priority: { type: "string", enum: ["low", "medium", "high", "critical"] },
                  recommended_team: { type: "string" },
                  recommended_response: { type: "string" },
                  resolution_steps: { type: "array", items: { type: "string" } },
                  escalation_risk: { type: "string", enum: ["low", "medium", "high"] },
                  confidence: { type: "number" },
                },
                required: ["summary", "category", "priority", "recommended_response", "resolution_steps", "escalation_risk", "confidence"],
                additionalProperties: false,
              },
            },
          },
        ],
        tool_choice: { type: "function", function: { name: "triage_ticket" } },
      }),
    });

    if (!aiResp.ok) {
      const txt = await aiResp.text();
      console.error("[SUPPORT][TRIAGE] AI gateway error", aiResp.status, txt);
      const status = aiResp.status === 429 || aiResp.status === 402 ? aiResp.status : 200;
      return new Response(
        JSON.stringify({ error: "ai_error", status: aiResp.status, fallback: true }),
        { status, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const aiJson = await aiResp.json();
    const tc = aiJson?.choices?.[0]?.message?.tool_calls?.[0];
    let recommendation: Record<string, unknown> | null = null;
    try {
      recommendation = tc?.function?.arguments ? JSON.parse(tc.function.arguments) : null;
    } catch (e) {
      console.error("[SUPPORT][TRIAGE] parse error", e);
    }

    if (!recommendation) {
      return new Response(
        JSON.stringify({ fallback: true, error: "no_recommendation" }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    await admin
      .from("client_tickets")
      .update({
        ai_summary: String(recommendation.summary ?? "").slice(0, 4000),
        ai_recommendation: recommendation,
      })
      .eq("id", ticket_id)
      .eq("workspace_id", workspace_id);

    await admin.from("support_ticket_events").insert({
      workspace_id,
      ticket_id,
      event_type: "support.ticket.triaged",
      description: "Triagem IA concluída.",
      created_by: userId,
      payload: { confidence: recommendation.confidence, escalation_risk: recommendation.escalation_risk },
    });

    return new Response(JSON.stringify({ recommendation }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("[SUPPORT][TRIAGE] error", e);
    return new Response(
      JSON.stringify({ error: "internal_error", fallback: true, message: (e as Error).message }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
