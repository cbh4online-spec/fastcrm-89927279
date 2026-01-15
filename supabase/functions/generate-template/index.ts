import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface GenerateTemplateRequest {
  type: "email" | "whatsapp" | "proposal";
  goal: string;
  tone: "formal" | "friendly" | "direct" | "casual";
  context: {
    contactId?: string;
    companyId?: string;
    opportunityId?: string;
    conversationContext?: string;
  };
  customInstructions?: string;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Validate auth
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const anonClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } }
    });

    const token = authHeader.replace("Bearer ", "");
    const { data: userData, error: userError } = await anonClient.auth.getUser(token);

    if (userError || !userData?.user) {
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { type, goal, tone, context, customInstructions }: GenerateTemplateRequest = await req.json();

    if (!type || !goal) {
      return new Response(
        JSON.stringify({ error: "type and goal are required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      return new Response(
        JSON.stringify({ error: "AI not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Gather context data
    let contextData: Record<string, unknown> = {};

    if (context.contactId) {
      const { data: contact } = await supabase
        .from("contacts")
        .select("name, email, phone, company, job_title, notes, tags")
        .eq("id", context.contactId)
        .single();
      if (contact) contextData.contact = contact;
    }

    if (context.companyId) {
      const { data: company } = await supabase
        .from("companies")
        .select("name, industry, size, website, notes")
        .eq("id", context.companyId)
        .single();
      if (company) contextData.company = company;
    }

    if (context.opportunityId) {
      const { data: opportunity } = await supabase
        .from("opportunities")
        .select(`
          title, value, status, notes, expected_close_date,
          lead:leads(name, email, phone)
        `)
        .eq("id", context.opportunityId)
        .single();
      if (opportunity) contextData.opportunity = opportunity;
    }

    // Build prompt based on type
    const typeInstructions = {
      email: `Create a professional email template. Include:
- Subject line (max 60 chars, engaging)
- Body content with proper greeting and sign-off
- Use {{variables}} for personalization: {{contact.name}}, {{company.name}}, {{opportunity.value}}`,
      whatsapp: `Create a WhatsApp message template. Keep it:
- Concise (max 500 chars)
- Conversational but professional
- Use emojis sparingly if appropriate
- Use {{variables}} for personalization`,
      proposal: `Create proposal content blocks. Generate:
- Compelling introduction
- Value proposition (3-5 bullet points)
- Call to action
- Use {{variables}} for personalization`,
    };

    const toneInstructions = {
      formal: "Use formal, professional language. Address the recipient respectfully.",
      friendly: "Use warm, approachable language while maintaining professionalism.",
      direct: "Be concise and to the point. Focus on value and action.",
      casual: "Use relaxed, conversational tone. Be personable.",
    };

    const prompt = `Generate a ${type} template in Portuguese (Portugal).

Goal: ${goal}
Tone: ${toneInstructions[tone]}

${typeInstructions[type]}

Context:
${JSON.stringify(contextData, null, 2)}

${context.conversationContext ? `Previous conversation:\n${context.conversationContext}` : ""}

${customInstructions ? `Additional instructions: ${customInstructions}` : ""}

Return ONLY a JSON object (no markdown):
${type === "email" ? `{
  "subject": "Email subject line",
  "content": "Full email body with proper formatting",
  "suggestedName": "Template name suggestion"
}` : type === "whatsapp" ? `{
  "content": "WhatsApp message content",
  "suggestedName": "Template name suggestion"
}` : `{
  "content_blocks": [
    { "type": "text", "title": "...", "body": "..." },
    { "type": "offer", "title": "...", "features": ["..."] },
    { "type": "cta", "text": "..." }
  ],
  "suggestedName": "Template name suggestion"
}`}`;

    const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { 
            role: "system", 
            content: "You are a CRM template expert. Create persuasive, professional templates in Portuguese. Always respond with valid JSON only, no markdown formatting." 
          },
          { role: "user", content: prompt },
        ],
        temperature: 0.7,
      }),
    });

    if (!aiResponse.ok) {
      const errorText = await aiResponse.text();
      console.error("AI API error:", errorText);
      return new Response(
        JSON.stringify({ error: "Failed to generate template" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const aiData = await aiResponse.json();
    const content = aiData.choices?.[0]?.message?.content;

    if (!content) {
      return new Response(
        JSON.stringify({ error: "No content generated" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    try {
      const cleanContent = content.replace(/```json\n?|\n?```/g, "").trim();
      const parsed = JSON.parse(cleanContent);

      return new Response(
        JSON.stringify({ success: true, data: parsed }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    } catch (parseError) {
      console.error("Failed to parse AI response:", parseError, content);
      return new Response(
        JSON.stringify({ error: "Failed to parse generated template" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
  } catch (error) {
    console.error("Template generation error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
