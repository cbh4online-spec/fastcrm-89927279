import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

interface PersonaChatRequest {
  persona_id: string;
  workspace_id: string;
  messages: Array<{ role: 'user' | 'assistant'; content: string }>;
  context?: Record<string, unknown>;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });

  try {
    const { persona_id, workspace_id, messages, context = {} }: PersonaChatRequest = await req.json();

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    // Fetch persona with vibe profile
    const { data: persona, error: personaErr } = await supabase
      .from('ai_personas')
      .select('*, vibe_profile:vibe_profiles(*)')
      .eq('id', persona_id)
      .eq('workspace_id', workspace_id)
      .single();
    if (personaErr || !persona) throw new Error('Persona not found');

    // Build system prompt
    let systemPrompt = persona.compiled_system_prompt || buildSystemPrompt(persona, context);
    if (persona.compiled_system_prompt && Object.keys(context).length > 0) {
      systemPrompt += `\n\n## Contexto actual da conversa\n${JSON.stringify(context, null, 2)}`;
    }

    // RAG: fetch knowledge base context if linked
    const kbIds = persona.knowledge_base_ids as string[] | null;
    if (kbIds?.length && messages.length > 0) {
      const lastUserMsg = [...messages].reverse().find(m => m.role === 'user');
      if (lastUserMsg) {
        try {
          const { data: searchResult } = await supabase.functions.invoke('knowledge-semantic-search', {
            body: {
              query: lastUserMsg.content,
              knowledge_base_id: kbIds[0],
              workspace_id,
              top_k: 3,
              similarity_threshold: 0.6,
            },
          });
          if (searchResult?.results?.length > 0) {
            const kbContext = searchResult.results
              .map((r: any) => `[${r.document_name}]\n${r.content}`)
              .join('\n\n---\n\n');
            systemPrompt += `\n\n## Informação da base de conhecimento\n${kbContext}`;
          }
        } catch (e) {
          console.warn('[PERSONA-CHAT] KB search failed:', e);
        }
      }
    }

    // Call Lovable AI Gateway
    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) throw new Error('LOVABLE_API_KEY not configured');

    const aiMessages = [
      { role: 'system', content: systemPrompt },
      ...messages.map(m => ({ role: m.role, content: m.content })),
    ];

    const aiResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: aiMessages,
        max_tokens: persona.max_response_tokens ?? 512,
        temperature: persona.temperature ?? 0.7,
      }),
    });

    if (!aiResponse.ok) {
      const status = aiResponse.status;
      if (status === 429) {
        return new Response(JSON.stringify({ error: 'Rate limit exceeded' }), {
          status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      if (status === 402) {
        return new Response(JSON.stringify({ error: 'Credits exhausted' }), {
          status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      throw new Error(`AI gateway error: ${status}`);
    }

    const aiData = await aiResponse.json();
    const message = aiData.choices?.[0]?.message?.content ?? persona.fallback_message ?? '';
    const tokensUsed = (aiData.usage?.total_tokens ?? 0);

    return new Response(
      JSON.stringify({ message, tokens_used: tokensUsed }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('[PERSONA-CHAT] Error:', error);
    return new Response(
      JSON.stringify({ error: (error as Error).message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

function buildSystemPrompt(persona: any, context: Record<string, unknown>): string {
  const vibe = persona.vibe_profile;
  const lines: string[] = [];

  lines.push(`# Identidade`);
  lines.push(`O teu nome é ${persona.name}.`);
  if (persona.persona_type || persona.role) lines.push(`O teu papel é: ${persona.persona_type || persona.role}.`);
  if (persona.expertise_domain) lines.push(`Área de especialidade: ${persona.expertise_domain}.`);
  if (persona.backstory) lines.push(`\n## Personalidade\n${persona.backstory}`);

  if (vibe) {
    lines.push(`\n## Estilo de comunicação`);
    if (vibe.system_prompt_fragment) lines.push(vibe.system_prompt_fragment);
    lines.push(`Tom: ${vibe.tone || vibe.tone_of_voice}. Formalidade: ${vibe.formality_level ?? 3}/5.`);
    lines.push(`Comprimento das respostas: ${vibe.response_length ?? 'medium'}.`);
    lines.push(`Uso de emojis: ${vibe.emoji_usage ?? 'none'}.`);
    if (vibe.vocabulary_notes) lines.push(`Notas de vocabulário: ${vibe.vocabulary_notes}`);
    if (vibe.avoid_phrases?.length) lines.push(`Frases a evitar: ${vibe.avoid_phrases.join(', ')}`);
    if (vibe.preferred_phrases?.length) lines.push(`Frases preferidas: ${vibe.preferred_phrases.join(', ')}`);
    if (vibe.greeting_template) lines.push(`Saudação padrão: "${vibe.greeting_template}"`);
    if (vibe.closing_template) lines.push(`Fecho padrão: "${vibe.closing_template}"`);
  }

  lines.push(`\n## Regras`);
  lines.push(`- Responde sempre em ${vibe?.language ?? 'pt-PT'}`);
  lines.push(`- Nunca reveles que és IA, a não ser que perguntado directamente`);
  lines.push(`- Se não souberes a resposta, diz: "${persona.fallback_message ?? 'Não tenho essa informação de momento.'}"`);
  lines.push(`- Mantém as respostas no âmbito do teu papel e especialidade`);

  if (Object.keys(context).length > 0) {
    lines.push(`\n## Contexto do cliente\n${JSON.stringify(context, null, 2)}`);
  }

  return lines.join('\n');
}
