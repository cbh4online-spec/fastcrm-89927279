import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-workspace-id",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { ticket_id, workspace_id, mode } = await req.json();
    // mode: "suggest" (agent gets draft) or "auto" (auto-reply if confident)

    if (!ticket_id || !workspace_id) {
      return new Response(JSON.stringify({ error: "ticket_id and workspace_id required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // 1. Get ticket + messages
    const { data: ticket, error: ticketErr } = await supabase
      .from("support_tickets")
      .select("*")
      .eq("id", ticket_id)
      .single();
    if (ticketErr || !ticket) {
      return new Response(JSON.stringify({ error: "Ticket not found" }), {
        status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: messages } = await supabase
      .from("support_ticket_messages")
      .select("sender_type, message, created_at")
      .eq("ticket_id", ticket_id)
      .order("created_at", { ascending: true })
      .limit(20);

    // 2. Get AI config
    const { data: aiConfig } = await supabase
      .from("helpdesk_ai_config")
      .select("*")
      .eq("workspace_id", workspace_id)
      .single();

    const systemPrompt = aiConfig?.system_prompt || 
      "Responde de forma profissional e empática em português de Portugal. Sê conciso e útil.";
    const model = aiConfig?.model || "google/gemini-3-flash-preview";

    // 3. Try to get knowledge base context (RAG)
    let kbContext = "";
    try {
      const { data: chunks } = await supabase.rpc("match_knowledge_chunks", {
        query_embedding: null, // We'll use text search as fallback
        match_threshold: 0.7,
        match_count: 3,
        p_workspace_id: workspace_id,
      });
      if (chunks?.length) {
        kbContext = "\n\nBase de conhecimento relevante:\n" + 
          chunks.map((c: any) => c.content).join("\n---\n");
      }
    } catch {
      // RAG not available, continue without it
    }

    // 4. Build conversation for AI
    const conversationHistory = (messages || []).map((m: any) => ({
      role: m.sender_type === "client" ? "user" : "assistant",
      content: m.message,
    }));

    const aiMessages = [
      {
        role: "system",
        content: `${systemPrompt}\n\nEstás a responder a um ticket de suporte.\nAssunto: ${ticket.subject}\nDescrição: ${ticket.description || "Sem descrição"}\nTipo: ${ticket.type}\nPrioridade: ${ticket.priority}${kbContext}`,
      },
      ...conversationHistory,
      ...(conversationHistory.length === 0 ? [{
        role: "user",
        content: ticket.description || ticket.subject,
      }] : []),
    ];

    // 5. Call AI
    const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model,
        messages: aiMessages,
        stream: false,
      }),
    });

    if (!aiResponse.ok) {
      if (aiResponse.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limit exceeded" }), {
          status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (aiResponse.status === 402) {
        return new Response(JSON.stringify({ error: "Credits exhausted" }), {
          status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      throw new Error(`AI error: ${aiResponse.status}`);
    }

    const aiData = await aiResponse.json();
    const reply = aiData.choices?.[0]?.message?.content || "";

    if (mode === "auto" && aiConfig?.auto_reply_enabled) {
      // Auto-reply: insert message as AI
      await supabase.from("support_ticket_messages").insert({
        ticket_id,
        sender_type: "ai",
        sender_id: null,
        message: reply,
        is_internal_note: false,
        content_type: "markdown",
      });

      // Update ticket status if it was just opened
      if (ticket.status === "open") {
        await supabase.from("support_tickets").update({
          status: "waiting_client",
          first_response_at: ticket.first_response_at || new Date().toISOString(),
          updated_at: new Date().toISOString(),
        }).eq("id", ticket_id);
      }

      return new Response(JSON.stringify({ 
        success: true, 
        mode: "auto",
        reply,
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Suggest mode: return draft for agent review
    return new Response(JSON.stringify({ 
      success: true, 
      mode: "suggest",
      reply,
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (e) {
    console.error("ticket-ai-reply error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
