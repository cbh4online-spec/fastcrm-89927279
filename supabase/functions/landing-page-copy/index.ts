import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

type CopyType = "headline" | "subheadline" | "cta" | "features" | "testimonial";

interface CopyRequest {
  type: CopyType;
  context: {
    businessType?: string;
    targetAudience?: string;
    productName?: string;
    existingCopy?: string;
  };
}

const systemPrompts: Record<CopyType, string> = {
  headline: `You are an expert copywriter specializing in high-converting landing page headlines.
Generate a compelling, benefit-driven headline that captures attention and communicates value.
Keep it under 10 words. Focus on the main benefit or transformation.`,

  subheadline: `You are an expert copywriter specializing in landing page copy.
Generate a supporting subheadline that expands on the main headline.
Keep it under 25 words. Add credibility or specific details about the offer.`,

  cta: `You are an expert copywriter specializing in call-to-action buttons.
Generate a compelling CTA text that creates urgency and encourages action.
Keep it between 2-5 words. Use action verbs.`,

  features: `You are an expert copywriter specializing in feature descriptions.
Generate 3 compelling feature blocks with titles and descriptions.
Each title should be 3-5 words, each description 15-25 words.
Focus on benefits, not just features.`,

  testimonial: `You are an expert copywriter specializing in social proof.
Generate a realistic-sounding testimonial with a quote, author name, and their role.
The quote should be 20-40 words and feel authentic, not salesy.`,
};

const tools: Record<CopyType, Array<{ type: string; function: { name: string; description: string; parameters: Record<string, unknown> } }>> = {
  headline: [{
    type: "function",
    function: {
      name: "generate_headline",
      description: "Generate a compelling headline",
      parameters: {
        type: "object",
        properties: {
          headline: { type: "string", description: "The generated headline" },
        },
        required: ["headline"],
      },
    },
  }],
  subheadline: [{
    type: "function",
    function: {
      name: "generate_subheadline",
      description: "Generate a supporting subheadline",
      parameters: {
        type: "object",
        properties: {
          subheadline: { type: "string", description: "The generated subheadline" },
        },
        required: ["subheadline"],
      },
    },
  }],
  cta: [{
    type: "function",
    function: {
      name: "generate_cta",
      description: "Generate a call-to-action text",
      parameters: {
        type: "object",
        properties: {
          cta: { type: "string", description: "The generated CTA text" },
        },
        required: ["cta"],
      },
    },
  }],
  features: [{
    type: "function",
    function: {
      name: "generate_features",
      description: "Generate feature blocks",
      parameters: {
        type: "object",
        properties: {
          features: {
            type: "array",
            items: {
              type: "object",
              properties: {
                title: { type: "string" },
                description: { type: "string" },
              },
              required: ["title", "description"],
            },
          },
        },
        required: ["features"],
      },
    },
  }],
  testimonial: [{
    type: "function",
    function: {
      name: "generate_testimonial",
      description: "Generate a testimonial",
      parameters: {
        type: "object",
        properties: {
          testimonial: {
            type: "object",
            properties: {
              quote: { type: "string" },
              author: { type: "string" },
              role: { type: "string" },
            },
            required: ["quote", "author", "role"],
          },
        },
        required: ["testimonial"],
      },
    },
  }],
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { type, context }: CopyRequest = await req.json();

    if (!type || !systemPrompts[type]) {
      return new Response(
        JSON.stringify({ error: "Invalid copy type" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    const userContent = `Generate ${type} copy for a landing page.
${context.businessType ? `Business Type: ${context.businessType}` : ""}
${context.targetAudience ? `Target Audience: ${context.targetAudience}` : ""}
${context.productName ? `Product/Service Name: ${context.productName}` : ""}
${context.existingCopy ? `Existing Copy for Reference: ${context.existingCopy}` : ""}

Please generate compelling, conversion-focused copy.`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: systemPrompts[type] },
          { role: "user", content: userContent },
        ],
        tools: tools[type],
        tool_choice: { type: "function", function: { name: tools[type][0].function.name } },
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: "Rate limit exceeded" }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: "AI credits exhausted" }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      const text = await response.text();
      console.error("AI gateway error:", response.status, text);
      throw new Error("AI service error");
    }

    const aiResponse = await response.json();
    const toolCall = aiResponse.choices?.[0]?.message?.tool_calls?.[0];

    if (!toolCall?.function?.arguments) {
      throw new Error("No response from AI");
    }

    const result = JSON.parse(toolCall.function.arguments);

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Landing page copy error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
