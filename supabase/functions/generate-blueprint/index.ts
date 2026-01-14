import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const SYSTEM_PROMPT = `You are a CRM Blueprint Generator. Given a form schema or natural language description, you generate comprehensive CRM blueprints.

Your output must be a JSON object with this structure:
{
  "needsClarification": boolean,
  "questions": [...] (if needsClarification is true),
  "blueprint": {...} (if needsClarification is false),
  "confidence": number (0-1),
  "explanation": string
}

When you need clarification (3-7 questions max), return:
{
  "needsClarification": true,
  "questions": [
    {
      "id": "unique_id",
      "question": "The question text",
      "type": "single" | "multiple" | "text",
      "options": [{"label": "...", "value": "..."}] // for single/multiple
    }
  ]
}

Questions to consider asking:
- What is the primary business use case? (lead gen, support, sales, etc.)
- Should this create Opportunities with pipeline stages?
- What are the key dedupe fields?
- Are there specific automations needed?
- How should sections be organized?

When generating a blueprint, include:
1. customFields: Array of fields with correct types, required flags, options
2. sections: Logical groupings of fields (Contact Info, Business Details, etc.)
3. pipelineStages: Only if sales intent detected (array of stages with colors)
4. automations: Starter rules based on form intent
5. dedupeRules: Email, phone, or other unique identifiers
6. mappingRules: How form fields map to CRM fields

Pipeline stage colors should be hex codes like: #3B82F6, #10B981, #F59E0B, #EF4444, #8B5CF6

Return ONLY valid JSON, no markdown or explanations outside the JSON.`;

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { formSchema, naturalLanguageDescription, clarifyingAnswers } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');

    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY is not configured');
    }

    let userPrompt = '';

    if (formSchema) {
      userPrompt = `Generate a CRM blueprint from this form schema:\n${JSON.stringify(formSchema, null, 2)}`;
    } else if (naturalLanguageDescription) {
      userPrompt = `Generate a CRM blueprint from this description:\n${naturalLanguageDescription}`;
    } else {
      throw new Error('Either formSchema or naturalLanguageDescription is required');
    }

    if (clarifyingAnswers && Object.keys(clarifyingAnswers).length > 0) {
      userPrompt += `\n\nUser provided these clarifying answers:\n${JSON.stringify(clarifyingAnswers, null, 2)}\n\nNow generate the complete blueprint based on these answers.`;
    }

    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-3-flash-preview',
        messages: [
          { role: 'system', content: SYSTEM_PROMPT },
          { role: 'user', content: userPrompt }
        ],
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: 'Rate limit exceeded. Please try again later.' }),
          { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: 'AI credits exhausted. Please add credits to continue.' }),
          { status: 402, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      const errorText = await response.text();
      console.error('AI gateway error:', response.status, errorText);
      throw new Error('AI gateway error');
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content;

    if (!content) {
      throw new Error('No response from AI');
    }

    // Parse JSON from response (handle potential markdown wrapping)
    let jsonContent = content;
    if (content.includes('```json')) {
      jsonContent = content.replace(/```json\n?/g, '').replace(/```\n?/g, '');
    } else if (content.includes('```')) {
      jsonContent = content.replace(/```\n?/g, '');
    }

    const parsed = JSON.parse(jsonContent.trim());

    // Ensure blueprint has required structure if present
    if (parsed.blueprint && !parsed.needsClarification) {
      parsed.blueprint = {
        id: crypto.randomUUID(),
        version: 1,
        name: parsed.blueprint.name || 'Untitled Blueprint',
        entityType: parsed.blueprint.entityType || 'lead',
        customFields: parsed.blueprint.customFields || [],
        sections: parsed.blueprint.sections || [],
        pipelineStages: parsed.blueprint.pipelineStages,
        automations: parsed.blueprint.automations || [],
        dedupeRules: parsed.blueprint.dedupeRules || [],
        mappingRules: parsed.blueprint.mappingRules || [],
        metadata: {
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          status: 'draft',
        },
      };
    }

    return new Response(
      JSON.stringify(parsed),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error: unknown) {
    console.error('Error generating blueprint:', error);
    const message = error instanceof Error ? error.message : 'Failed to generate blueprint';
    return new Response(
      JSON.stringify({ error: message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
