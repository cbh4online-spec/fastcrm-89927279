import { createClient } from 'npm:@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    )

    // Auth guard
    const authHeader = req.headers.get('Authorization')
    if (!authHeader?.startsWith('Bearer ')) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: corsHeaders })
    }

    const anonClient = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      { global: { headers: { Authorization: authHeader } } }
    )

    const token = authHeader.replace('Bearer ', '')
    const { data: claims, error: claimsErr } = await anonClient.auth.getClaims(token)
    if (claimsErr || !claims?.claims) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: corsHeaders })
    }
    const userId = claims.claims.sub as string

    const body = await req.json()
    const { product_names, workspace_id } = body

    if (!product_names?.length || !workspace_id) {
      throw new Error('product_names[] and workspace_id are required')
    }

    // Verify workspace membership
    const { data: member } = await supabase
      .from('workspace_members')
      .select('id')
      .eq('workspace_id', workspace_id)
      .eq('user_id', userId)
      .maybeSingle()
    if (!member) {
      return new Response(JSON.stringify({ error: 'Forbidden' }), { status: 403, headers: corsHeaders })
    }

    // Fetch existing categories for this workspace
    const { data: categories } = await supabase
      .from('product_categories')
      .select('id, name, parent_id')
      .eq('workspace_id', workspace_id)

    const categoryList = (categories || []).map((c: any) => {
      const parent = categories?.find((p: any) => p.id === c.parent_id)
      return parent ? `${parent.name} > ${c.name}` : c.name
    })

    // Limit to 50 products per call
    const names = (product_names as string[]).slice(0, 50)

    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY')
    if (!LOVABLE_API_KEY) throw new Error('LOVABLE_API_KEY not configured')

    const aiRes = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
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
            content: `És um classificador de produtos especializado em segurança eletrónica, videovigilância, alarmes, controlo de acessos e redes.

Categorias existentes no sistema:
${categoryList.length > 0 ? categoryList.join('\n') : '(nenhuma categoria existente)'}

Para cada produto, sugere:
1. A melhor categoria existente OU uma nova categoria se nenhuma encaixa
2. Uma subcategoria específica

Responde APENAS com um array JSON válido, sem markdown:
[{"product_name":"...","category":"...","subcategory":"...","is_new_category":false,"confidence":"high"}]

Regras:
- Nomes de categorias em português de Portugal
- confidence: "high" (>80%), "medium" (50-80%), "low" (<50%)
- is_new_category: true se sugeres uma categoria que não existe na lista acima
- Sê consistente: produtos semelhantes devem ter a mesma categoria
- Subcategorias devem ser específicas (ex: "Câmaras Dome", "Câmaras Bullet", não apenas "Câmaras")`
          },
          {
            role: 'user',
            content: `Classifica estes ${names.length} produtos:\n${names.map((n: string, i: number) => `${i + 1}. ${n}`).join('\n')}`
          }
        ],
        tools: [
          {
            type: 'function',
            function: {
              name: 'classify_products',
              description: 'Classify products into categories and subcategories',
              parameters: {
                type: 'object',
                properties: {
                  suggestions: {
                    type: 'array',
                    items: {
                      type: 'object',
                      properties: {
                        product_name: { type: 'string' },
                        category: { type: 'string' },
                        subcategory: { type: 'string' },
                        is_new_category: { type: 'boolean' },
                        confidence: { type: 'string', enum: ['high', 'medium', 'low'] }
                      },
                      required: ['product_name', 'category', 'subcategory', 'is_new_category', 'confidence'],
                      additionalProperties: false
                    }
                  }
                },
                required: ['suggestions'],
                additionalProperties: false
              }
            }
          }
        ],
        tool_choice: { type: 'function', function: { name: 'classify_products' } },
      }),
    })

    if (!aiRes.ok) {
      const status = aiRes.status
      const errText = await aiRes.text()
      if (status === 429) {
        return new Response(JSON.stringify({ error: 'Rate limit exceeded. Tenta novamente em alguns minutos.' }), {
          status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        })
      }
      if (status === 402) {
        return new Response(JSON.stringify({ error: 'Créditos insuficientes para IA.' }), {
          status: 402, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        })
      }
      throw new Error(`AI gateway error ${status}: ${errText}`)
    }

    const aiData = await aiRes.json()

    // Extract from tool call response
    let suggestions: any[] = []
    const toolCall = aiData.choices?.[0]?.message?.tool_calls?.[0]
    if (toolCall?.function?.arguments) {
      const parsed = JSON.parse(toolCall.function.arguments)
      suggestions = parsed.suggestions || []
    }

    return new Response(
      JSON.stringify({ success: true, suggestions }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    return new Response(
      JSON.stringify({ success: false, error: (error as Error).message }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
