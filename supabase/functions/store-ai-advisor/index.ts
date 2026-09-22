import { aiGate } from '../_shared/ai-gate.ts';
import { logAIUsage } from '../_shared/ai-instrumentation.ts';
import { createClient } from "@supabase/supabase-js";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { question, workspaceId, productContext, history } = await req.json();

    // AI Gate — enforce credit consumption
    if (workspaceId) {
      const gate = await aiGate(workspaceId, 'medium', 'store-ai-advisor');
      if (!gate.allowed) {
        return new Response(JSON.stringify({ error: 'quota_exceeded', upgrade_required: true }), {
          status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }
    if (!question || !workspaceId) {
      return new Response(JSON.stringify({ error: "Missing question or workspaceId" }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) throw new Error('LOVABLE_API_KEY not configured');

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Catálogo publicado (inclui esgotados, sinalizados como tal — o consultor
    // nunca deve recomendar algo indisponível sem avisar).
    const { data: allProducts } = await supabase
      .from('products')
      .select('id, name, store_slug, base_price, currency, category, subcategory, brand, short_description, commercial_description, images, primary_image_index, sku, benefits, features, specifications, stock_status')
      .eq('workspace_id', workspaceId)
      .eq('store_published', true)
      .eq('status', 'active')
      .order('store_sort_order', { ascending: true })
      .limit(400);

    const products = (allProducts || []).filter((p) => typeof p.base_price === 'number' && p.base_price > 0);

    if (products.length === 0) {
      return new Response(JSON.stringify({
        response: "De momento não temos produtos disponíveis no catálogo.",
        products: [],
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Camada AI Commerce (benefícios, casos de uso, problema resolvido, FAQ)
    // — é o que permite responder a dúvidas técnicas com fundamento real.
    const { data: aiRows } = await supabase
      .from('product_ai_commerce')
      .select('product_id, ai_short_description, ai_key_features, ai_use_cases, ai_problem_solved, ai_target_audience, ai_keywords, ai_faq, ai_recommendation_context, ai_exclusions')
      .eq('workspace_id', workspaceId)
      .eq('ai_commerce_enabled', true);

    const aiByProduct = new Map<string, any>();
    for (const row of aiRows || []) aiByProduct.set(row.product_id, row);

    // Seleção por relevância: a pergunta do cliente pontua nome, categoria,
    // marca, especificações e conteúdo AI Commerce. Assim o catálogo pode ser
    // grande sem estourar o contexto do modelo.
    const stopWords = new Set(['para', 'com', 'que', 'uma', 'como', 'dos', 'das', 'preciso', 'qual', 'quais', 'tem', 'mais', 'este', 'esta', 'sobre', 'pode']);
    const terms = `${question} ${productContext?.name || ''} ${productContext?.category || ''}`
      .toLowerCase()
      .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
      .split(/[^a-z0-9]+/)
      .filter((t) => t.length >= 4 && !stopWords.has(t));

    const norm = (v: unknown) => String(v ?? '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');

    const scored = products.map((p) => {
      const ai = aiByProduct.get(p.id);
      const haystack = norm([
        p.name, p.category, p.subcategory, p.brand, p.sku, p.short_description,
        (p.benefits || []).join(' '), (p.features || []).join(' '),
        p.specifications ? JSON.stringify(p.specifications) : '',
        ai?.ai_short_description, (ai?.ai_key_features || []).join(' '),
        (ai?.ai_use_cases || []).join(' '), ai?.ai_problem_solved,
        (ai?.ai_keywords || []).join(' '), ai?.ai_recommendation_context,
      ].join(' '));
      let score = 0;
      for (const term of terms) if (haystack.includes(term)) score += 1;
      if (productContext?.category && norm(p.category) === norm(productContext.category)) score += 2;
      if (ai) score += 0.5; // fichas enriquecidas respondem melhor
      return { p, ai, score };
    });

    const shortlist = (terms.length > 0 ? scored.filter((s) => s.score > 0) : []);
    const ranked = (shortlist.length >= 4 ? shortlist : scored)
      .sort((a, b) => b.score - a.score)
      .slice(0, 28);

    const catalog = ranked.map(({ p, ai }, i) => {
      const specs = p.specifications
        ? Object.entries(p.specifications).slice(0, 12).map(([k, v]) => `${k}: ${v}`).join('; ')
        : '';
      const lines = [
        `[${i + 1}] ID:${p.id} | ${p.name} | ${Number(p.base_price).toFixed(2)} ${p.currency || 'EUR'} | ${p.category || 'Sem categoria'}${p.brand ? ` | Marca: ${p.brand}` : ''} | ${p.stock_status === 'out_of_stock' ? 'ESGOTADO' : 'Disponível'}`,
      ];
      const desc = ai?.ai_short_description || p.short_description;
      if (desc) lines.push(`    Resumo: ${String(desc).slice(0, 320)}`);
      const feats = (ai?.ai_key_features || p.features || p.benefits || []).slice(0, 6);
      if (feats.length) lines.push(`    Vantagens: ${feats.join('; ').slice(0, 320)}`);
      if (ai?.ai_problem_solved) lines.push(`    Resolve: ${String(ai.ai_problem_solved).slice(0, 220)}`);
      if (ai?.ai_use_cases?.length) lines.push(`    Casos de uso: ${ai.ai_use_cases.slice(0, 5).join('; ').slice(0, 260)}`);
      if (ai?.ai_exclusions) lines.push(`    Limitações: ${String(ai.ai_exclusions).slice(0, 200)}`);
      if (specs) lines.push(`    Especificações: ${specs.slice(0, 360)}`);
      const faq = Array.isArray(ai?.ai_faq) ? ai.ai_faq.slice(0, 3) : [];
      for (const entry of faq) {
        if (entry?.question && entry?.answer) {
          lines.push(`    FAQ: ${entry.question} → ${String(entry.answer).slice(0, 200)}`);
        }
      }
      return lines.join('\n');
    }).join('\n');

    const systemPrompt = `É o consultor técnico desta loja online. Ajuda o cliente a escolher o produto certo e a fechar a compra com confiança.

REGRAS OBRIGATÓRIAS:
- Responda SEMPRE em Português de Portugal (PT-PT).
- Use APENAS informação do catálogo abaixo. Nunca invente produtos, preços, prazos, stock, compatibilidades ou características técnicas.
- Se a informação não constar do catálogo, diga que confirma com a equipa e sugira contacto — nunca adivinhe.
- Indique o preço exatamente como aparece no catálogo.
- Se um produto estiver ESGOTADO, avise e proponha alternativa disponível.
- Se o cliente precisar de uma solução completa, liste os componentes necessários que existam no catálogo.
- Se faltarem dados para decidir, faça 1 pergunta concreta.
- Seja direto: no máximo 3 parágrafos curtos.
- Termine SEMPRE a resposta com os IDs dos produtos recomendados no formato exato: [PRODUTOS: id1, id2]. Se não recomendar nenhum, escreva [PRODUTOS: ]

CATÁLOGO DISPONÍVEL:
${catalog}

${productContext ? `CONTEXTO: o cliente está a ver o produto "${productContext.name}"${productContext.category ? ` na categoria "${productContext.category}"` : ''}.` : ''}`;

    const messages: any[] = [
      { role: 'system', content: systemPrompt },
    ];

    // Add history
    if (history && Array.isArray(history)) {
      for (const h of history.slice(-6)) {
        messages.push({ role: h.role, content: h.content });
      }
    }

    messages.push({ role: 'user', content: question });

    const aiResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-3-flash-preview',
        messages,
        temperature: 0.7,
      }),
    });

    if (!aiResponse.ok) {
      if (aiResponse.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limit exceeded" }), {
          status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      if (aiResponse.status === 402) {
        return new Response(JSON.stringify({ error: "Credits exhausted" }), {
          status: 402, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      throw new Error(`AI error: ${aiResponse.status}`);
    }

    const aiData = await aiResponse.json();
    // Log AI usage (fire-and-forget)
    try {
      logAIUsage({
        workspace_id: workspaceId,
        feature: "store-ai-advisor",
        model: "google/gemini-3-flash-preview",
        tokens_input: aiData?.usage?.prompt_tokens ?? 0,
        tokens_output: aiData?.usage?.completion_tokens ?? 0,
      });
    } catch (_e) { /* logging never blocks */ }

    let content = aiData.choices?.[0]?.message?.content || '';

    // Extrai os IDs recomendados e devolve dados reais da base (preço, stock,
    // slug) — o texto do modelo nunca é fonte de verdade comercial.
    const toCard = (p: any) => {
      const imgIdx = p.primary_image_index ?? 0;
      return {
        id: p.id,
        name: p.name,
        slug: p.store_slug || p.id,
        sku: p.sku || null,
        price: p.base_price,
        currency: p.currency || 'EUR',
        image: p.images?.[imgIdx] || p.images?.[0] || null,
        available: p.stock_status !== 'out_of_stock',
      };
    };

    const productIdsMatch = content.match(/\[PRODUTOS?:\s*([^\]]*)\]/i);
    let recommendedProducts: any[] = [];

    if (productIdsMatch) {
      const ids = productIdsMatch[1].split(',').map((s: string) => s.trim()).filter(Boolean);
      recommendedProducts = ids
        .map((id: string) => {
          const p = products.find((pr) => pr.id === id);
          return p ? toCard(p) : null;
        })
        .filter(Boolean);

      content = content.replace(/\[PRODUTOS?:\s*[^\]]*\]/i, '').trim();
    }

    // Recurso: se o modelo não devolveu a etiqueta de IDs, identificamos os
    // produtos pelo nome mencionado na resposta (só nomes do catálogo enviado).
    if (recommendedProducts.length === 0) {
      const normalized = norm(content);
      const mentioned = ranked
        .map(({ p }) => p)
        .filter((p) => {
          const name = norm(p.name);
          return name.length >= 8 && normalized.includes(name);
        });
      recommendedProducts = mentioned.map(toCard);
    }

    recommendedProducts = recommendedProducts.slice(0, 4);



    return new Response(JSON.stringify({
      response: content,
      products: recommendedProducts,
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (e) {
    console.error('store-ai-advisor error:', e);
    return new Response(JSON.stringify({
      error: e instanceof Error ? e.message : 'Unknown error',
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
