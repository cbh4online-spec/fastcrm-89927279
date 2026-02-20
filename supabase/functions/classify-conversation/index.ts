

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface ClassificationResult {
  priority: "high" | "medium" | "low";
  intent: "support" | "sales" | "question" | "follow_up" | "complaint" | "other";
  sentiment: "positive" | "neutral" | "negative";
  reasoning: string;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { messages, leadName, channel } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");

    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      return new Response(
        JSON.stringify({ error: "No messages provided" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Build conversation context
    const conversationContext = messages
      .slice(-20) // Last 20 messages for context
      .map((m: { direction: string; content: string }) => 
        `${m.direction === "inbound" ? "Customer" : "Agent"}: ${m.content}`
      )
      .join("\n");

    const systemPrompt = `You are an AI assistant that classifies customer conversations for a CRM system.

Analyze the conversation and classify it according to these criteria:

1. PRIORITY (how urgently this needs attention):
   - "high": Urgent issues, complaints, time-sensitive matters, frustrated customers
   - "medium": Normal inquiries that need timely response
   - "low": General questions, informational requests, low urgency

2. INTENT (what the customer wants):
   - "sales": Interested in buying, pricing questions, product inquiries
   - "support": Technical issues, problems, needs help with something
   - "question": General questions, information seeking
   - "follow_up": Following up on a previous conversation or order
   - "complaint": Expressing dissatisfaction, negative experience
   - "other": Doesn't fit other categories

3. SENTIMENT (emotional tone):
   - "positive": Happy, satisfied, grateful
   - "neutral": No strong emotion, matter-of-fact
   - "negative": Frustrated, angry, disappointed

You must use the classify_conversation function to return your analysis.`;

    const userPrompt = `Analyze this ${channel} conversation${leadName ? ` with ${leadName}` : ""}:

${conversationContext}

Classify the conversation based on the messages above.`;

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
              name: "classify_conversation",
              description: "Classify a customer conversation by priority, intent, and sentiment",
              parameters: {
                type: "object",
                properties: {
                  priority: {
                    type: "string",
                    enum: ["high", "medium", "low"],
                    description: "How urgently this conversation needs attention"
                  },
                  intent: {
                    type: "string",
                    enum: ["support", "sales", "question", "follow_up", "complaint", "other"],
                    description: "What the customer is trying to accomplish"
                  },
                  sentiment: {
                    type: "string",
                    enum: ["positive", "neutral", "negative"],
                    description: "The emotional tone of the conversation"
                  },
                  reasoning: {
                    type: "string",
                    description: "Brief explanation of the classification (1-2 sentences)"
                  }
                },
                required: ["priority", "intent", "sentiment", "reasoning"],
                additionalProperties: false
              }
            }
          }
        ],
        tool_choice: { type: "function", function: { name: "classify_conversation" } },
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
          JSON.stringify({ error: "Payment required. Please add credits to continue using AI." }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      const errorText = await response.text();
      console.error("AI gateway error:", response.status, errorText);
      return new Response(
        JSON.stringify({ error: "AI classification failed" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const data = await response.json();
    const toolCall = data.choices?.[0]?.message?.tool_calls?.[0];

    if (!toolCall || toolCall.function.name !== "classify_conversation") {
      throw new Error("Invalid response from AI");
    }

    const classification: ClassificationResult = JSON.parse(toolCall.function.arguments);

    return new Response(JSON.stringify(classification), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Classification error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
