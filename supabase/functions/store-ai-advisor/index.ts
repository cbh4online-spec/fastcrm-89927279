import { createClient } from "@supabase/supabase-js";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { question, workspaceId, productContext, history } = await req.json();

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

    // Fetch published products from workspace
    const { data: products } = await supabase
      .from('products')
      .select('id, name, base_price, currency, category, short_description, images, primary_image_index, sku, benefits, specifications')
      .eq('workspace_id', workspaceId)
      .eq('store_published', true)
      .eq('status', 'active')
      .neq('stock_status', 'out_of_stock')
      .order('store_sort_order', { ascending: true })
      .limit(30);

    if (!products || products.length === 0) {
      return new Response(JSON.stringify({
        response: "De momento não temos produtos disponíveis no catálogo.",
        products: [],
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Build catalog summary for AI
    const catalog = products.map((p, i) => {
      const specs = p.specifications ? Object.entries(p.specifications).map(([k, v]) => `${k}: ${v}`).join(', ') : '';
      return `[${i + 1}] ID:${p.id} | ${p.name} | €${p.base_price.toFixed(2)} | ${p.category || 'Sem categoria'} | ${p.short_description || ''} ${specs ? `| Specs: ${specs}` : ''}`;
    }).join('\n');

    const systemPrompt = `Você é um consultor especializado desta loja online. Ajuda os clientes a escolher os melhores produtos.

REGRAS:
- Responda SEMPRE em Português de Portugal (PT-PT)
- Seja conciso, profissional e simpático
- Recomende produtos ESPECÍFICOS do catálogo abaixo
- Quando recomendar, mencione o nome e preço
- Se o cliente precisa de um sistema completo, sugira todos os componentes necessários
- Se não tiver certeza, pergunte mais detalhes ao cliente
- Máximo de 3-4 parágrafos por resposta
- No final da resposta, liste os IDs dos produtos recomendados no formato: [PRODUTOS: id1, id2, id3]

CATÁLOGO DISPONÍVEL:
${catalog}

${productContext ? `CONTEXTO: O cliente está a ver o produto "${productContext.name}"${productContext.category ? ` na categoria "${productContext.category}"` : ''}.` : ''}`;

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
    let content = aiData.choices?.[0]?.message?.content || '';

    // Extract product IDs from response
    const productIdsMatch = content.match(/\[PRODUTOS?:\s*([^\]]+)\]/i);
    let recommendedProducts: any[] = [];

    if (productIdsMatch) {
      const ids = productIdsMatch[1].split(',').map((s: string) => s.trim()).filter(Boolean);
      recommendedProducts = ids
        .map((id: string) => {
          const p = products.find((pr) => pr.id === id);
          if (!p) return null;
          const imgIdx = p.primary_image_index ?? 0;
          return {
            id: p.id,
            name: p.name,
            price: p.base_price,
            image: p.images?.[imgIdx] || p.images?.[0],
          };
        })
        .filter(Boolean);

      // Remove the product IDs tag from the visible response
      content = content.replace(/\[PRODUTOS?:\s*[^\]]+\]/i, '').trim();
    }

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
