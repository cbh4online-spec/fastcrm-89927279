import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { prompt } = await req.json();

    if (!prompt) {
      return new Response(
        JSON.stringify({ error: 'Prompt is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const systemPrompt = `You are a form schema generator. Given a description of a form, generate a JSON array of form fields.

Each field must have this structure:
{
  "id": "unique_id",
  "label": "Field Label",
  "type": "text|textarea|number|currency|date|datetime|boolean|select|multiselect|email|phone|url",
  "required": true|false,
  "placeholder": "optional placeholder text",
  "helpText": "optional help text",
  "options": [{"label": "Option", "value": "option"}] // only for select/multiselect
}

Guidelines:
- Use appropriate field types based on the context
- Make fields required when they are essential (like name, email for contact forms)
- Add helpful placeholders
- For select/multiselect, create sensible options
- Use lowercase snake_case for IDs
- Labels should be in the same language as the prompt

Respond ONLY with a valid JSON object: {"fields": [...]}`;

    const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${Deno.env.get('OPENROUTER_API_KEY')}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': 'https://lovable.dev',
        'X-Title': 'Lovable Form Studio',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: prompt }
        ],
        response_format: { type: 'json_object' },
      }),
    });

    const data = await response.json();
    
    if (data.error) {
      throw new Error(data.error.message || 'AI request failed');
    }

    const content = data.choices?.[0]?.message?.content;
    if (!content) {
      throw new Error('No response from AI');
    }

    const parsed = JSON.parse(content);
    
    // Ensure all fields have IDs
    const fields = (parsed.fields || []).map((field: any, index: number) => ({
      ...field,
      id: field.id || `field_${index + 1}`,
    }));

    return new Response(
      JSON.stringify({ fields }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error: unknown) {
    console.error('Error generating form schema:', error);
    const message = error instanceof Error ? error.message : 'Failed to generate form';
    return new Response(
      JSON.stringify({ error: message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
