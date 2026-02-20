import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
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

    const systemPrompt = `És um especialista em CRM e formulários de captação de leads.
Dado um objetivo de formulário, gera uma estrutura completa e otimizada.

Responde APENAS com um objeto JSON válido com esta estrutura:
{
  "name": "Nome do Formulário",
  "description": "Descrição breve",
  "form_type": "lead_capture|qualification|proposal_request|support|onboarding|reactivation",
  "is_conversational": boolean (recomenda true para formulários com mais de 4 campos),
  "fields": [
    {
      "id": "campo_id",
      "label": "Label visível",
      "type": "text|email|phone|select|multiselect|textarea|number|currency|date|url|boolean",
      "required": boolean,
      "placeholder": "placeholder opcional",
      "helpText": "texto de ajuda opcional",
      "options": [{"label": "Opção", "value": "valor"}] // só para select/multiselect
      "enrichmentSource": "email|website" // opcional, para campos que podem enriquecer dados
      "conversationalPrompt": "Pergunta conversacional amigável" // para modo conversacional
    }
  ],
  "scoringRules": [
    {
      "id": "rule_1",
      "fieldId": "campo_id",
      "condition": "equals|contains|greater_than|less_than|is_corporate_email",
      "value": "valor esperado",
      "scoreChange": número (positivo ou negativo),
      "temperatureEffect": "increase|decrease|none"
    }
  ],
  "suggestedAutomations": ["create_lead", "send_email", "notify_sales", "create_opportunity"],
  "explanation": "Explica em 2-3 frases porque sugeriste esta estrutura"
}

Diretrizes:
- Menos campos = mais conversão. Máximo 6-8 campos.
- Email e nome são quase sempre obrigatórios
- Campos de orçamento/urgência aumentam significativamente o score
- Emails corporativos (@empresa.com) devem aumentar +15 pontos
- Pedidos de orçamento/proposta devem aumentar +25 pontos
- Urgência alta/imediata deve aumentar +20 pontos
- Labels e prompts devem ser em português de Portugal
- Conversational prompts devem ser amigáveis e naturais
- Inclui helpText quando útil para o utilizador`;

    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${Deno.env.get('LOVABLE_API_KEY')}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-3-flash-preview',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: prompt }
        ],
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('AI gateway error:', response.status, errorText);
      throw new Error('Failed to generate form');
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content;
    
    if (!content) {
      throw new Error('No response from AI');
    }

    // Extract JSON from response
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error('Could not parse AI response');
    }

    const parsed = JSON.parse(jsonMatch[0]);
    
    // Ensure all fields have IDs
    if (parsed.fields) {
      parsed.fields = parsed.fields.map((field: Record<string, unknown>, index: number) => ({
        ...field,
        id: field.id || `field_${index + 1}`,
      }));
    }

    if (parsed.scoringRules) {
      parsed.scoringRules = parsed.scoringRules.map((rule: Record<string, unknown>, index: number) => ({
        ...rule,
        id: rule.id || `rule_${index + 1}`,
      }));
    }

    return new Response(
      JSON.stringify(parsed),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error generating smart form:', error);
    const message = error instanceof Error ? error.message : 'Failed to generate form';
    return new Response(
      JSON.stringify({ error: message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
