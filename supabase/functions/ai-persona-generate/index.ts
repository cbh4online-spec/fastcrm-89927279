import { aiGate } from '../_shared/ai-gate.ts';
import { logAIUsage } from '../_shared/ai-instrumentation.ts';
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });

  try {
    const { workspace_id, description, save = false } = await req.json();


    // AI Gate — enforce credit consumption
    if (workspace_id) {
      const gate = await aiGate(workspace_id, 'heavy', 'ai-persona-generate');
      if (!gate.allowed) {
        return new Response(JSON.stringify({ error: 'quota_exceeded', upgrade_required: true }), {
          status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    // Fetch existing vibe profiles
    const { data: vibeProfiles } = await supabase
      .from('vibe_profiles')
      .select('id, name, tone_of_voice, formality_level')
      .eq('workspace_id', workspace_id)
      .eq('status', 'active');

    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) throw new Error('LOVABLE_API_KEY not configured');

    const aiResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          {
            role: 'system',
            content: 'És um especialista em design de assistentes de IA para CRM. Gera uma persona completa com base na descrição fornecida.',
          },
          {
            role: 'user',
            content: `Descrição: "${description}"\n\nPerfis de vibe disponíveis: ${JSON.stringify(vibeProfiles ?? [])}\n\nResponde APENAS com JSON válido no formato:\n{\n  "name": "nome curto",\n  "slug": "slug-url-safe",\n  "description": "descrição 1 frase",\n  "role": "assistant|sales|support|onboarding",\n  "expertise_domain": "área",\n  "backstory": "personalidade 2-3 frases",\n  "temperature": 0.7,\n  "max_response_tokens": 512,\n  "fallback_message": "mensagem quando não sabe",\n  "active_in_inbox": true,\n  "active_in_copilot": false,\n  "active_in_b2b_portal": false,\n  "suggested_vibe": {\n    "name": "nome do vibe",\n    "tone": "formal|professional|neutral|friendly|casual",\n    "formality_level": 3,\n    "response_length": "concise|medium|detailed",\n    "emoji_usage": "none|minimal|moderate|expressive",\n    "greeting_template": "saudação",\n    "closing_template": "fecho",\n    "system_prompt_fragment": "instruções 2-3 frases"\n  }\n}`,
          },
        ],
        tools: [{
          type: 'function',
          function: {
            name: 'create_persona',
            description: 'Create a complete AI persona configuration',
            parameters: {
              type: 'object',
              properties: {
                name: { type: 'string' },
                slug: { type: 'string' },
                description: { type: 'string' },
                role: { type: 'string', enum: ['assistant', 'sales', 'support', 'onboarding'] },
                expertise_domain: { type: 'string' },
                backstory: { type: 'string' },
                temperature: { type: 'number' },
                max_response_tokens: { type: 'number' },
                fallback_message: { type: 'string' },
                active_in_inbox: { type: 'boolean' },
                active_in_copilot: { type: 'boolean' },
                active_in_b2b_portal: { type: 'boolean' },
                suggested_vibe: {
                  type: 'object',
                  properties: {
                    name: { type: 'string' },
                    tone: { type: 'string' },
                    formality_level: { type: 'number' },
                    response_length: { type: 'string' },
                    emoji_usage: { type: 'string' },
                    greeting_template: { type: 'string' },
                    closing_template: { type: 'string' },
                    system_prompt_fragment: { type: 'string' },
                  },
                  required: ['name', 'tone'],
                },
              },
              required: ['name', 'slug', 'role', 'backstory'],
            },
          },
        }],
        tool_choice: { type: 'function', function: { name: 'create_persona' } },
      }),
    });

    if (!aiResponse.ok) {
      const status = aiResponse.status;
      if (status === 429) return new Response(JSON.stringify({ error: 'Rate limit' }), { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
      if (status === 402) return new Response(JSON.stringify({ error: 'Credits exhausted' }), { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
      throw new Error(`AI error: ${status}`);
    }

    const aiData = await aiResponse.json()

    // AI Usage Instrumentation
    try {
      const _usage = aiData?.usage;
      logAIUsage({
        workspace_id: workspace_id,
        feature: 'ai-persona-generate',
        model: aiData?.model || 'google/gemini-3-flash-preview',
        tokens_input: _usage?.prompt_tokens ?? 0,
        tokens_output: _usage?.completion_tokens ?? 0,
        request_type: 'completion',
        latency_ms: Date.now() - (_startTime ?? Date.now()),
      });
    } catch (_e) { /* instrumentation error - non-blocking */ };
    let generated: any;

    // Extract from tool call
    const toolCall = aiData.choices?.[0]?.message?.tool_calls?.[0];
    if (toolCall?.function?.arguments) {
      generated = JSON.parse(toolCall.function.arguments);
    } else {
      // Fallback: parse from content
      const content = aiData.choices?.[0]?.message?.content ?? '{}';
      generated = JSON.parse(content.replace(/```json|```/g, '').trim());
    }

    if (!save) {
      return new Response(JSON.stringify({ success: true, persona: generated }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Save vibe profile if suggested
    let vibeProfileId = null;
    if (generated.suggested_vibe) {
      const { data: newVibe } = await supabase
        .from('vibe_profiles')
        .insert({
          workspace_id,
          name: generated.suggested_vibe.name,
          tone_of_voice: generated.suggested_vibe.tone ?? 'professional',
          formality_level: generated.suggested_vibe.formality_level ?? 3,
          response_length: generated.suggested_vibe.response_length ?? 'medium',
          emoji_usage: generated.suggested_vibe.emoji_usage ?? 'none',
          greeting_template: generated.suggested_vibe.greeting_template,
          closing_template: generated.suggested_vibe.closing_template,
          system_prompt_fragment: generated.suggested_vibe.system_prompt_fragment,
          language_code: 'pt-PT',
          is_default: false,
          status: 'active',
        })
        .select()
        .single();
      vibeProfileId = newVibe?.id;
    }

    // Save persona
    const { data: savedPersona, error: saveErr } = await supabase
      .from('ai_personas')
      .insert({
        workspace_id,
        name: generated.name,
        slug: generated.slug,
        description: generated.description,
        persona_type: generated.role ?? 'assistant',
        tone_of_voice: generated.suggested_vibe?.tone ?? 'professional',
        expertise_domain: generated.expertise_domain,
        backstory: generated.backstory,
        vibe_profile_id: vibeProfileId,
        temperature: generated.temperature ?? 0.7,
        max_response_tokens: generated.max_response_tokens ?? 512,
        fallback_message: generated.fallback_message,
        active_in_inbox: generated.active_in_inbox ?? false,
        active_in_copilot: generated.active_in_copilot ?? false,
        active_in_b2b_portal: generated.active_in_b2b_portal ?? false,
        status: 'draft',
      })
      .select('*, vibe_profile:vibe_profiles(*)')
      .single();
    if (saveErr) throw saveErr;

    return new Response(
      JSON.stringify({ success: true, persona: savedPersona }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('[PERSONA-GENERATE] Error:', error);
    return new Response(
      JSON.stringify({ error: (error as Error).message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
