import { logAIUsage } from '../_shared/ai-instrumentation.ts';
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
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      return new Response(
        JSON.stringify({ error: "LOVABLE_API_KEY is not configured" }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const body = await req.json();
    const {
      messages,
      system,
      model = "google/gemini-3-flash-preview",
      max_tokens,
      tools,
      tool_choice,
      stream = false,
      workspace_id,
      user_id,
    } = body;

    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      return new Response(
        JSON.stringify({ error: "messages array is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // AI Gate — enforce credit consumption when workspace context is available
    if (workspace_id) {
      const gate = await aiGate(workspace_id, 'medium', 'ai-router', user_id);
      if (!gate.allowed) {
        return new Response(
          JSON.stringify({ error: 'quota_exceeded', upgrade_required: true }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
    }

    const apiMessages = [];
    if (system) {
      apiMessages.push({ role: "system", content: system });
    }
    apiMessages.push(...messages);

    const requestBody: Record<string, unknown> = {
      model,
      messages: apiMessages,
    };

    if (max_tokens) requestBody.max_tokens = max_tokens;
    if (tools) requestBody.tools = tools;
    if (tool_choice) requestBody.tool_choice = tool_choice;
    if (stream) requestBody.stream = true;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(requestBody),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("AI Gateway error:", response.status, errorText);

      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: "Rate limit exceeded. Tenta novamente mais tarde." }),
          { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: "Créditos AI esgotados. Adiciona créditos para continuar." }),
          { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      return new Response(
        JSON.stringify({ error: `AI gateway error: ${response.status}` }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (stream) {
      return new Response(response.body, {
        headers: { ...corsHeaders, "Content-Type": "text/event-stream" },
      });
    }

    const data = await response.json();

    const content = data.choices?.[0]?.message?.content || "";
    const toolCalls = data.choices?.[0]?.message?.tool_calls;

    return new Response(
      JSON.stringify({
        content,
        model: data.model,
        usage: data.usage,
        tool_calls: toolCalls || null,
        raw: data,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (e) {
    console.error("ai-router error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});