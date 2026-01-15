import { serve } from "https://deno.land/std@0.190.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface TranslateRequest {
  text: string;
  targetLanguage: string;
  makeNatural?: boolean;
  preserveVariables?: boolean;
  preserveHtml?: boolean;
}

interface TranslateResult {
  translatedText: string;
  sourceLanguage: string;
  changes: string[];
}

// Language labels for prompts
const languageLabels: Record<string, string> = {
  pt: "Portuguese (European)",
  "pt-BR": "Portuguese (Brazilian)",
  en: "English",
  es: "Spanish",
  fr: "French",
  de: "German",
  it: "Italian",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    const body: TranslateRequest = await req.json();
    const { 
      text, 
      targetLanguage, 
      makeNatural = false, 
      preserveVariables = true,
      preserveHtml = true,
    } = body;

    if (!text || !targetLanguage) {
      throw new Error("Missing required fields: text, targetLanguage");
    }

    const targetLangLabel = languageLabels[targetLanguage] || targetLanguage;

    // Build the system prompt
    let systemPrompt = `You are a professional translator specializing in business and marketing communications.
Your task is to translate the given text to ${targetLangLabel}.`;

    if (preserveVariables) {
      systemPrompt += `

CRITICAL: Preserve ALL template variables EXACTLY as they appear. These are in the format:
- {{variable_name}}
- {{lead.field}}
- {{opportunity.field}}
- {{user.field}}
Do NOT translate the variable names. Keep them exactly as written.`;
    }

    if (preserveHtml) {
      systemPrompt += `

IMPORTANT: Preserve all HTML tags and structure. Translate only the text content, not the HTML markup.`;
    }

    if (makeNatural) {
      systemPrompt += `

After translating, also make the text sound natural and native in ${targetLangLabel}. 
Adapt idioms, expressions, and phrasing to sound native rather than translated.
Maintain the same professional tone and intent while making it culturally appropriate.`;
    }

    systemPrompt += `

Return a JSON object with:
- translatedText: the translated text
- sourceLanguage: detected source language (2-letter code)
- changes: array of notable changes made (for user review)`;

    const userPrompt = `Translate the following text to ${targetLangLabel}:

---
${text}
---

Return only the JSON object, no markdown formatting.`;

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
        temperature: 0.3,
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: "Rate limit exceeded. Please try again later." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: "AI credits exhausted. Please add credits." }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      const errorText = await response.text();
      console.error("AI gateway error:", response.status, errorText);
      throw new Error("Translation failed");
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content;

    if (!content) {
      throw new Error("No translation result received");
    }

    // Parse the JSON response
    let result: TranslateResult;
    try {
      // Handle potential markdown code blocks
      let jsonStr = content.trim();
      if (jsonStr.startsWith("```json")) {
        jsonStr = jsonStr.slice(7);
      }
      if (jsonStr.startsWith("```")) {
        jsonStr = jsonStr.slice(3);
      }
      if (jsonStr.endsWith("```")) {
        jsonStr = jsonStr.slice(0, -3);
      }
      result = JSON.parse(jsonStr.trim());
    } catch (parseError) {
      console.error("Failed to parse translation result:", content);
      // Fallback: treat the entire response as the translated text
      result = {
        translatedText: content,
        sourceLanguage: "unknown",
        changes: [],
      };
    }

    return new Response(
      JSON.stringify(result),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: unknown) {
    console.error("Translation error:", error);
    const message = error instanceof Error ? error.message : "Unknown error";
    return new Response(
      JSON.stringify({ error: message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
