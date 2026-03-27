import { aiGate } from '../_shared/ai-gate.ts';
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const ANTHROPIC_API_KEY = Deno.env.get("ANTHROPIC_API_KEY");
    if (!ANTHROPIC_API_KEY) {
      return new Response(
        JSON.stringify({ success: false, error: "ANTHROPIC_API_KEY is not configured" }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const body = await req.json();
    const {
      messages,
      model = "claude-sonnet-4-20250514",
      system,
      max_tokens = 4096,
      stream = false,
      tools,
      tool_choice,
      workspace_id,
      user_id,
    } = body;

    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      return new Response(
        JSON.stringify({ success: false, error: "messages array is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // AI Gate — enforce credit consumption when workspace context is available
    if (workspace_id) {
      const gate = await aiGate(workspace_id, 'heavy', 'claude-chat', user_id);
      if (!gate.allowed) {
        return new Response(
          JSON.stringify({ success: false, error: 'quota_exceeded', upgrade_required: true }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
    }

    // Build Anthropic API request
    const anthropicBody: Record<string, unknown> = {
      model,
      max_tokens,
      messages,
    };

    if (system) {
      anthropicBody.system = system;
    }

    if (tools) {
      anthropicBody.tools = tools;
    }

    if (tool_choice) {
      anthropicBody.tool_choice = tool_choice;
    }

    if (stream) {
      anthropicBody.stream = true;

      const response = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: {
          "x-api-key": ANTHROPIC_API_KEY,
          "anthropic-version": "2023-06-01",
          "Content-Type": "application/json",
        },
        body: JSON.stringify(anthropicBody),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error("Anthropic API error:", response.status, errorText);

        if (response.status === 429) {
          return new Response(
            JSON.stringify({ success: false, error: "Rate limit exceeded. Aguarda um momento e tenta novamente." }),
            { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }
        if (response.status === 402 || response.status === 400) {
          return new Response(
            JSON.stringify({ success: false, error: `Anthropic API error: ${response.status}` }),
            { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

        return new Response(
          JSON.stringify({ success: false, error: `Anthropic API error: ${response.status}` }),
          { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Transform Anthropic SSE stream to OpenAI-compatible SSE format
      const { readable, writable } = new TransformStream();
      const writer = writable.getWriter();
      const encoder = new TextEncoder();

      (async () => {
        const reader = response.body!.getReader();
        const decoder = new TextDecoder();
        let buffer = "";

        try {
          while (true) {
            const { done, value } = await reader.read();
            if (done) break;

            buffer += decoder.decode(value, { stream: true });

            let newlineIndex: number;
            while ((newlineIndex = buffer.indexOf("\n")) !== -1) {
              const line = buffer.slice(0, newlineIndex).trim();
              buffer = buffer.slice(newlineIndex + 1);

              if (!line.startsWith("data: ")) continue;
              const jsonStr = line.slice(6).trim();
              if (!jsonStr || jsonStr === "[DONE]") continue;

              try {
                const event = JSON.parse(jsonStr);
                
                // Convert Anthropic events to OpenAI-compatible format
                if (event.type === "content_block_delta" && event.delta?.text) {
                  const openaiEvent = {
                    choices: [{ delta: { content: event.delta.text } }],
                  };
                  await writer.write(
                    encoder.encode(`data: ${JSON.stringify(openaiEvent)}\n\n`)
                  );
                } else if (event.type === "message_stop") {
                  await writer.write(encoder.encode("data: [DONE]\n\n"));
                }
              } catch {
                // Skip malformed JSON
              }
            }
          }
          await writer.write(encoder.encode("data: [DONE]\n\n"));
        } catch (e) {
          console.error("Stream error:", e);
        } finally {
          await writer.close();
        }
      })();

      return new Response(readable, {
        headers: { ...corsHeaders, "Content-Type": "text/event-stream" },
      });
    }

    // Non-streaming request
    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "x-api-key": ANTHROPIC_API_KEY,
        "anthropic-version": "2023-06-01",
        "Content-Type": "application/json",
      },
      body: JSON.stringify(anthropicBody),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("Anthropic API error:", response.status, errorText);

      if (response.status === 429) {
        return new Response(
          JSON.stringify({ success: false, error: "Rate limit exceeded. Aguarda um momento e tenta novamente." }),
          { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      return new Response(
        JSON.stringify({ success: false, error: `Anthropic API error: ${response.status}` }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const data = await response.json();

    // Extract text from Anthropic response format
    const textContent = data.content
      ?.filter((c: any) => c.type === "text")
      .map((c: any) => c.text)
      .join("") || "";

    return new Response(
      JSON.stringify({
        success: true,
        content: textContent,
        model: data.model,
        usage: data.usage,
        stop_reason: data.stop_reason,
        // Include full response for tool use cases
        raw: data,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (e) {
    console.error("claude-chat error:", e);
    return new Response(
      JSON.stringify({ success: false, error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});