import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface KeywordResult {
  keyword: string;
  type: "main" | "long-tail" | "question";
  estimated_volume: "high" | "medium" | "low";
  difficulty: "easy" | "medium" | "hard";
  intent: "informational" | "commercial" | "transactional";
  cpc_indicator?: "low" | "medium" | "high";
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { seed_keyword, country, language } = await req.json();

    if (!seed_keyword || seed_keyword.trim().length < 2) {
      return new Response(
        JSON.stringify({ success: false, error: "Seed keyword must be at least 2 characters" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    const countryContext = country ? ` for the ${country} market` : "";
    const languageContext = language ? ` in ${language}` : "";

    const systemPrompt = `You are a keyword research expert. Generate comprehensive keyword ideas based on the seed keyword provided. 
Focus on:
- Main keywords (direct variations and related terms)
- Long-tail keywords (3-5 word phrases with specific intent)
- Question keywords (who, what, where, when, why, how questions)

For each keyword, estimate:
- Volume: high (>10k searches/month), medium (1k-10k), low (<1k)
- Difficulty: easy (low competition), medium, hard (high competition)
- Intent: informational (learning), commercial (comparing), transactional (buying)
- CPC: low (<$1), medium ($1-5), high (>$5)

Generate diverse, actionable keywords that users would actually search for.`;

    const userPrompt = `Generate keyword ideas for: "${seed_keyword}"${countryContext}${languageContext}.

Provide 15 main keywords, 20 long-tail keywords, and 15 question keywords.`;

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
        tools: [
          {
            type: "function",
            function: {
              name: "generate_keywords",
              description: "Generate structured keyword ideas with metrics",
              parameters: {
                type: "object",
                properties: {
                  main_keywords: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        keyword: { type: "string" },
                        estimated_volume: { type: "string", enum: ["high", "medium", "low"] },
                        difficulty: { type: "string", enum: ["easy", "medium", "hard"] },
                        intent: { type: "string", enum: ["informational", "commercial", "transactional"] },
                        cpc_indicator: { type: "string", enum: ["low", "medium", "high"] },
                      },
                      required: ["keyword", "estimated_volume", "difficulty", "intent"],
                    },
                  },
                  long_tail_keywords: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        keyword: { type: "string" },
                        estimated_volume: { type: "string", enum: ["high", "medium", "low"] },
                        difficulty: { type: "string", enum: ["easy", "medium", "hard"] },
                        intent: { type: "string", enum: ["informational", "commercial", "transactional"] },
                        cpc_indicator: { type: "string", enum: ["low", "medium", "high"] },
                      },
                      required: ["keyword", "estimated_volume", "difficulty", "intent"],
                    },
                  },
                  question_keywords: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        keyword: { type: "string" },
                        estimated_volume: { type: "string", enum: ["high", "medium", "low"] },
                        difficulty: { type: "string", enum: ["easy", "medium", "hard"] },
                        intent: { type: "string", enum: ["informational", "commercial", "transactional"] },
                        cpc_indicator: { type: "string", enum: ["low", "medium", "high"] },
                      },
                      required: ["keyword", "estimated_volume", "difficulty", "intent"],
                    },
                  },
                },
                required: ["main_keywords", "long_tail_keywords", "question_keywords"],
              },
            },
          },
        ],
        tool_choice: { type: "function", function: { name: "generate_keywords" } },
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ success: false, error: "Rate limit exceeded. Please try again later." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ success: false, error: "Usage limit reached. Please upgrade your plan." }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      const errorText = await response.text();
      console.error("AI gateway error:", response.status, errorText);
      throw new Error("Failed to generate keywords");
    }

    const data = await response.json();
    const toolCall = data.choices?.[0]?.message?.tool_calls?.[0];
    
    if (!toolCall?.function?.arguments) {
      throw new Error("Invalid response from AI");
    }

    const keywords = JSON.parse(toolCall.function.arguments);

    const formatKeywords = (items: any[], type: "main" | "long-tail" | "question"): KeywordResult[] => {
      return (items || []).map((item: any) => ({
        keyword: item.keyword,
        type,
        estimated_volume: item.estimated_volume || "medium",
        difficulty: item.difficulty || "medium",
        intent: item.intent || "informational",
        cpc_indicator: item.cpc_indicator,
      }));
    };

    const mainKeywords = formatKeywords(keywords.main_keywords, "main");
    const longTailKeywords = formatKeywords(keywords.long_tail_keywords, "long-tail");
    const questionKeywords = formatKeywords(keywords.question_keywords, "question");

    const totalCount = mainKeywords.length + longTailKeywords.length + questionKeywords.length;

    return new Response(
      JSON.stringify({
        success: true,
        seed_keyword: seed_keyword,
        total_count: totalCount,
        keywords: {
          main: mainKeywords,
          long_tail: longTailKeywords,
          questions: questionKeywords,
        },
        preview_limit: 5,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("generate-keyword-ideas error:", error);
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error instanceof Error ? error.message : "Unknown error" 
      }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
