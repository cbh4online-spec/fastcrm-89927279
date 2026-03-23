import { logAIUsage } from '../_shared/ai-instrumentation.ts';
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { markdown, title, url, description } = await req.json();

    if (!markdown && !title) {
      return new Response(
        JSON.stringify({ success: false, error: 'markdown or title is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      return new Response(
        JSON.stringify({ success: false, error: 'LOVABLE_API_KEY not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Truncate markdown to avoid token limits
    const contentSnippet = (markdown || '').substring(0, 3000);

    const systemPrompt = `Você é um extrator de dados de empresas. Dado o conteúdo de uma página web, extraia informações estruturadas sobre a empresa.
Responda APENAS com o JSON via tool call. Se um campo não estiver disponível, omita-o.`;

    const userPrompt = `Extraia dados da empresa a partir desta página:

Título: ${title || 'N/A'}
URL: ${url || 'N/A'}
Descrição: ${description || 'N/A'}

Conteúdo da página:
${contentSnippet}`;

    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-3-flash-preview',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
        ],
        tools: [
          {
            type: 'function',
            function: {
              name: 'extract_company_data',
              description: 'Extract structured company data from web page content',
              parameters: {
                type: 'object',
                properties: {
                  company_name: { type: 'string', description: 'Nome oficial da empresa' },
                  about: { type: 'string', description: 'Breve descrição da empresa (max 300 chars)' },
                  industry: { type: 'string', description: 'Sector de atividade' },
                  city: { type: 'string', description: 'Cidade da sede' },
                  address: { type: 'string', description: 'Morada completa' },
                  phone: { type: 'string', description: 'Telefone principal' },
                  email: { type: 'string', description: 'Email de contacto' },
                  website: { type: 'string', description: 'Website oficial (URL limpa)' },
                },
                additionalProperties: false,
              },
            },
          },
        ],
        tool_choice: { type: 'function', function: { name: 'extract_company_data' } },
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        const text = await response.text();
        console.error('Rate limited:', text);
        return new Response(
          JSON.stringify({ success: false, error: 'Rate limit exceeded' }),
          { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      if (response.status === 402) {
        const text = await response.text();
        console.error('Payment required:', text);
        return new Response(
          JSON.stringify({ success: false, error: 'Credits exhausted' }),
          { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      const text = await response.text();
      console.error('AI gateway error:', response.status, text);
      return new Response(
        JSON.stringify({ success: false, error: 'AI extraction failed' }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const aiData = await response.json();
    const toolCall = aiData.choices?.[0]?.message?.tool_calls?.[0];

    if (!toolCall?.function?.arguments) {
      console.warn('No tool call in AI response');
      return new Response(
        JSON.stringify({ success: true, data: {} }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    let extracted: Record<string, string>;
    try {
      extracted = JSON.parse(toolCall.function.arguments);
    } catch {
      console.error('Failed to parse tool call arguments:', toolCall.function.arguments);
      return new Response(
        JSON.stringify({ success: true, data: {} }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Clean: remove empty strings
    const cleaned: Record<string, string> = {};
    for (const [key, value] of Object.entries(extracted)) {
      if (value && typeof value === 'string' && value.trim()) {
        cleaned[key] = value.trim();
      }
    }

    console.log('Extracted fields:', Object.keys(cleaned).join(', '));

    return new Response(
      JSON.stringify({ success: true, data: cleaned }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('web-search-enrich error:', error);
    return new Response(
      JSON.stringify({ success: false, error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
