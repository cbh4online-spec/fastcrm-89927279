// whatsapp-rewrite-reply
// Fase 1E — Reescreve uma resposta sugerida com um determinado tom/variante.
// Variants: shorter | professional | empathetic | sales | direct | with_cta | without_cta

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.57.4';
import { corsHeaders } from '../_shared/cors.ts';

const GATEWAY_URL = 'https://ai.gateway.lovable.dev/v1/chat/completions';

function jsonRes(body: Record<string, unknown>, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

const VARIANT_INSTRUCTIONS: Record<string, string> = {
  shorter: 'Reescreve mais curta, máx 2 frases, sem perder a essência.',
  professional: 'Reescreve com tom mais profissional, formal e claro.',
  empathetic: 'Reescreve com tom mais empático, validando o cliente.',
  sales: 'Reescreve com tom mais comercial, sem ser agressivo.',
  direct: 'Reescreve mais direta e objectiva, sem rodeios.',
  with_cta: 'Reescreve e adiciona um Call-to-Action claro no final.',
  without_cta: 'Reescreve sem qualquer Call-to-Action ou pergunta final.',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const authHeader = req.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) return jsonRes({ error: 'Unauthorized' }, 401);

    const userClient = createClient(supabaseUrl, Deno.env.get('SUPABASE_ANON_KEY')!, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: claims } = await userClient.auth.getClaims(authHeader.replace('Bearer ', ''));
    if (!claims?.claims?.sub) return jsonRes({ error: 'Unauthorized' }, 401);

    const body = await req.json().catch(() => ({}));
    const text: string = (body?.text || '').trim();
    const variant: string = body?.variant || 'professional';
    const context: string | undefined = body?.context;

    if (!text) return jsonRes({ ok: false, error: 'text required' }, 400);
    const instruction = VARIANT_INSTRUCTIONS[variant] || VARIANT_INSTRUCTIONS.professional;

    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) return jsonRes({ ok: false, error: 'AI not configured', fallback: true });

    const res = await fetch(GATEWAY_URL, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-3-flash-preview',
        messages: [
          {
            role: 'system',
            content:
              'És assistente de atendimento WhatsApp em PT-PT. Reescreves mensagens curtas, sem inventar dados. ' +
              'Devolves apenas o texto reescrito, sem aspas nem explicações.',
          },
          {
            role: 'user',
            content: `${instruction}\n\nMensagem original:\n"""${text}"""${
              context ? `\n\nContexto da conversa:\n${context}` : ''
            }`,
          },
        ],
      }),
    });

    if (!res.ok) {
      if (res.status === 429)
        return jsonRes({ ok: false, error: 'Rate limit', code: 'rate_limit', fallback: true });
      if (res.status === 402)
        return jsonRes({ ok: false, error: 'Sem créditos AI', code: 'no_credits', fallback: true });
      const t = await res.text();
      console.error('[rewrite-reply] gateway error', res.status, t);
      return jsonRes({ ok: false, error: 'AI gateway error', fallback: true });
    }

    const json = await res.json();
    const out = (json?.choices?.[0]?.message?.content || '').trim();
    if (!out) return jsonRes({ ok: false, error: 'Empty response', fallback: true });

    return jsonRes({ ok: true, text: out, variant });
  } catch (err) {
    console.error('[rewrite-reply] error', err);
    return jsonRes({ ok: false, error: (err as Error).message, fallback: true });
  }
});
