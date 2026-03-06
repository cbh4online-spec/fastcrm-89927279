import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-widget-id, x-visitor-id",
};

interface ChatWidgetRequest {
  action: "init" | "send_message" | "get_config";
  widgetId: string;
  visitorId: string;
  conversationId?: string;
  message?: string;
  visitorEmail?: string;
  visitorName?: string;
  metadata?: Record<string, unknown>;
}

interface WidgetConfig {
  id: string;
  primary_color: string;
  secondary_color: string;
  text_color: string;
  position: string;
  bubble_icon: string;
  welcome_message: string;
  placeholder_text: string;
  show_branding: boolean;
  avatar_url?: string;
  company_name?: string;
  require_email_before_chat: boolean;
  auto_open_delay_ms: number;
  custom_css?: string;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const body: ChatWidgetRequest = await req.json();
    const { action, widgetId, visitorId, conversationId, message, visitorEmail, visitorName, metadata } = body;

    if (!widgetId || !visitorId) {
      return new Response(
        JSON.stringify({ error: "Widget ID and Visitor ID are required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Fetch widget configuration
    const { data: widget, error: widgetError } = await supabase
      .from("widget_configurations")
      .select("*, workspaces(id, name)")
      .eq("id", widgetId)
      .eq("is_active", true)
      .single();

    if (widgetError || !widget) {
      console.error("[CHAT-WIDGET] Widget not found:", widgetError);
      return new Response(
        JSON.stringify({ error: "Widget not found or inactive" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Check domain restrictions
    const origin = req.headers.get("origin") || "";
    if (widget.allowed_domains?.length > 0) {
      const isAllowed = widget.allowed_domains.some((domain: string) => 
        origin.includes(domain) || domain === "*"
      );
      if (!isAllowed) {
        return new Response(
          JSON.stringify({ error: "Domain not allowed" }),
          { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
    }

    // Handle actions
    switch (action) {
      case "get_config": {
        const config: WidgetConfig = {
          id: widget.id,
          primary_color: widget.primary_color,
          secondary_color: widget.secondary_color,
          text_color: widget.text_color,
          position: widget.position,
          bubble_icon: widget.bubble_icon,
          welcome_message: widget.welcome_message,
          placeholder_text: widget.placeholder_text,
          show_branding: widget.show_branding,
          avatar_url: widget.avatar_url,
          company_name: widget.company_name || widget.workspaces?.name,
          require_email_before_chat: widget.require_email_before_chat,
          auto_open_delay_ms: widget.auto_open_delay_ms,
          custom_css: widget.custom_css,
        };

        return new Response(
          JSON.stringify({ config }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      case "init": {
        // Get or create conversation
        let conversation;
        
        const { data: existingConv } = await supabase
          .from("widget_conversations")
          .select("*")
          .eq("widget_id", widgetId)
          .eq("visitor_id", visitorId)
          .eq("status", "active")
          .order("created_at", { ascending: false })
          .limit(1)
          .single();

        if (existingConv) {
          conversation = existingConv;
          
          // Fetch existing messages
          const { data: messages } = await supabase
            .from("widget_messages")
            .select("*")
            .eq("conversation_id", conversation.id)
            .order("created_at", { ascending: true });

          return new Response(
            JSON.stringify({
              conversationId: conversation.id,
              messages: messages || [],
              isNew: false,
            }),
            { headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

        // Create new conversation
        const { data: newConv, error: convError } = await supabase
          .from("widget_conversations")
          .insert({
            widget_id: widgetId,
            workspace_id: widget.workspace_id,
            visitor_id: visitorId,
            visitor_email: visitorEmail,
            visitor_name: visitorName,
            visitor_metadata: metadata || {},
            status: "active",
          })
          .select()
          .single();

        if (convError) {
          console.error("[CHAT-WIDGET] Error creating conversation:", convError);
          throw new Error("Failed to create conversation");
        }

        conversation = newConv;

        // Send welcome message
        const { data: welcomeMsg } = await supabase
          .from("widget_messages")
          .insert({
            conversation_id: conversation.id,
            role: "assistant",
            content: widget.welcome_message || "Olá! Como posso ajudar?",
          })
          .select()
          .single();

        return new Response(
          JSON.stringify({
            conversationId: conversation.id,
            messages: welcomeMsg ? [welcomeMsg] : [],
            isNew: true,
          }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      case "send_message": {
        if (!message || !conversationId) {
          return new Response(
            JSON.stringify({ error: "Message and conversation ID required" }),
            { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

        // Verify conversation exists
        const { data: conv } = await supabase
          .from("widget_conversations")
          .select("*")
          .eq("id", conversationId)
          .eq("visitor_id", visitorId)
          .single();

        if (!conv) {
          return new Response(
            JSON.stringify({ error: "Conversation not found" }),
            { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

        // Save user message
        await supabase
          .from("widget_messages")
          .insert({
            conversation_id: conversationId,
            role: "user",
            content: message,
          });

        // Update conversation timestamp
        await supabase
          .from("widget_conversations")
          .update({ 
            last_message_at: new Date().toISOString(),
            visitor_email: visitorEmail || conv.visitor_email,
            visitor_name: visitorName || conv.visitor_name,
          })
          .eq("id", conversationId);

        // Call flow engine to get response
        let aiResponse = "Obrigado pela sua mensagem. Um assistente irá responder em breve.";
        let flowUsed = false;
        let collectedVariables = {};

        console.log("[CHAT-WIDGET] Processing message for workspace:", widget.workspace_id);

        try {
          // First, try flow engine
          console.log("[CHAT-WIDGET] Calling flow-engine...");
          const flowResponse = await fetch(
            `${Deno.env.get("SUPABASE_URL")}/functions/v1/flow-engine`,
            {
              method: "POST",
              headers: {
                Authorization: `Bearer ${Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")}`,
                "Content-Type": "application/json",
              },
              body: JSON.stringify({
                action: "continue",
                workspaceId: widget.workspace_id,
                conversationId: conversationId,
                userMessage: message,
                channel: "widget", // Match the trigger_channels in flows
              }),
            }
          );

          console.log("[CHAT-WIDGET] Flow engine response status:", flowResponse.status);

          if (flowResponse.ok) {
            const flowResult = await flowResponse.json();
            console.log("[CHAT-WIDGET] Flow result:", JSON.stringify(flowResult));
            
            if (flowResult.hasActiveFlow && flowResult.responses?.length) {
              aiResponse = flowResult.responses.join("\n\n");
              flowUsed = true;
              collectedVariables = flowResult.collectedVariables || {};

              // If session completed or handed off, update conversation
              if (flowResult.sessionState === "completed" || flowResult.sessionState === "handed_off") {
                await supabase
                  .from("widget_conversations")
                  .update({ 
                    status: flowResult.sessionState === "handed_off" ? "transferred" : "closed",
                    transferred_to_inbox_at: flowResult.sessionState === "handed_off" ? new Date().toISOString() : null,
                  })
                  .eq("id", conversationId);
              }
            } else {
              // No active flow - use AI with knowledge base
              console.log("[CHAT-WIDGET] No active flow, trying KB response...");
              const kbResponse = await generateKBResponse(
                supabase,
                widget,
                message,
                conversationId
              );
              console.log("[CHAT-WIDGET] KB response:", kbResponse ? "Generated" : "None");
              if (kbResponse) {
                aiResponse = kbResponse;
              }
            }
          } else {
            const errorText = await flowResponse.text();
            console.error("[CHAT-WIDGET] Flow engine error response:", errorText);
            
            // Fallback to KB even if flow engine fails
            console.log("[CHAT-WIDGET] Flow engine failed, trying KB response...");
            const kbResponse = await generateKBResponse(
              supabase,
              widget,
              message,
              conversationId
            );
            if (kbResponse) {
              aiResponse = kbResponse;
            }
          }
        } catch (flowError) {
          console.error("[CHAT-WIDGET] Flow engine error:", flowError);
          
          // Fallback to KB
          try {
            const kbResponse = await generateKBResponse(
              supabase,
              widget,
              message,
              conversationId
            );
            if (kbResponse) {
              aiResponse = kbResponse;
            }
          } catch (kbError) {
            console.error("[CHAT-WIDGET] KB fallback error:", kbError);
          }
        }

        // Save AI response
        const { data: responseMsg } = await supabase
          .from("widget_messages")
          .insert({
            conversation_id: conversationId,
            role: "assistant",
            content: aiResponse,
          })
          .select()
          .single();

        return new Response(
          JSON.stringify({
            message: responseMsg,
            flowUsed,
            collectedVariables,
          }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      default:
        return new Response(
          JSON.stringify({ error: "Invalid action" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
    }
  } catch (error) {
    console.error("[CHAT-WIDGET] Error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

// Generate response using knowledge base when no flow is active
async function generateKBResponse(
  supabase: ReturnType<typeof createClient>,
  widget: any,
  userMessage: string,
  conversationId: string
): Promise<string | null> {
  const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
  if (!LOVABLE_API_KEY) {
    console.error("[CHAT-WIDGET] LOVABLE_API_KEY not configured");
    return null;
  }

  try {
    // Get knowledge base IDs
    let kbIds = widget.knowledge_base_ids || [];
    console.log("[CHAT-WIDGET] Widget KB IDs:", kbIds);
    
    if (!kbIds.length) {
      // Get all active KBs for workspace
      const { data: kbs } = await supabase
        .from("knowledge_bases")
        .select("id")
        .eq("workspace_id", widget.workspace_id)
        .eq("is_active", true);
      
      if (kbs) kbIds = kbs.map((kb: any) => kb.id);
      console.log("[CHAT-WIDGET] Active KBs from workspace:", kbIds);
    }

    if (!kbIds.length) {
      console.log("[CHAT-WIDGET] No knowledge bases found");
      return null;
    }

    // Search knowledge base using direct text query (Lovable AI doesn't support embeddings API)
    console.log("[CHAT-WIDGET] Searching KB entries with text query...");
    
    // Get all validated entries from the knowledge bases
    const { data: entries, error: entriesError } = await supabase
      .from("knowledge_entries")
      .select("id, title, content")
      .eq("workspace_id", widget.workspace_id)
      .eq("status", "validated")
      .in("knowledge_base_id", kbIds)
      .limit(15);

    if (entriesError) {
      console.error("[CHAT-WIDGET] KB search error:", entriesError);
      return null;
    }

    console.log("[CHAT-WIDGET] KB entries found:", entries?.length || 0);

    if (!entries?.length) {
      console.log("[CHAT-WIDGET] No KB entries found for context");
      return null;
    }

    // Build context from all relevant knowledge entries
    const context = entries
      .map((e: any) => `## ${e.title}\n${e.content}`)
      .join("\n\n---\n\n");

    // Get persona if configured
    let personaInstructions = "";
    if (widget.default_persona_id) {
      const { data: persona } = await supabase
        .from("ai_personas")
        .select("*")
        .eq("id", widget.default_persona_id)
        .single();
      
      if (persona) {
        console.log(`[AI-PERSONAS] PERSONA_SELECTED id=${widget.default_persona_id} channel=widget`);
        personaInstructions = `
Tone: ${persona.tone_of_voice || "empático"}
Style: ${persona.language_style || "conversational"}
${persona.system_prompt || ""}
`;
      }
    }

    // Generate response
    console.log("[CHAT-WIDGET] Generating AI response...");
    const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          {
            role: "system",
            content: `És um assistente de chat para ${widget.company_name || "a empresa"}.
${personaInstructions}

Responde em Português (PT-PT). Sê conciso e útil.
Usa apenas a informação da base de conhecimento abaixo. Se não souberes, diz que vais encaminhar para um humano.

Base de Conhecimento:
${context}`,
          },
          {
            role: "user",
            content: userMessage,
          },
        ],
        max_tokens: 500,
      }),
    });

    if (!aiResponse.ok) {
      const errorText = await aiResponse.text();
      console.error("[CHAT-WIDGET] AI generation error:", errorText);
      return null;
    }

    const aiData = await aiResponse.json();
    const responseContent = aiData.choices?.[0]?.message?.content;
    console.log("[CHAT-WIDGET] AI response generated successfully");
    
    return responseContent || null;
  } catch (error) {
    console.error("[CHAT-WIDGET] KB response error:", error);
    return null;
  }
}
