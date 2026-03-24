import { createClient } from 'npm:@supabase/supabase-js@2'
import { firecrawl } from '../_shared/firecrawl-client.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders })

  try {
    const {
      workspace_id,
      sectors,
      country = 'pt',
      analysis_depth = 'quick',
    } = await req.json()

    if (!sectors?.length) throw new Error('sectors array is required')

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    )

    const topSectors = sectors.slice(0, 3)
    const currentYear = new Date().getFullYear()
    const countryName = country === 'pt' ? 'Portugal' : country

    const queries = analysis_depth === 'quick' ? [
      `tendências de mercado ${topSectors[0] ?? 'PME'} ${countryName} ${currentYear}`,
      `crescimento negócios ${topSectors[1] ?? topSectors[0] ?? 'B2B'} ${countryName}`,
      `oportunidades sector ${topSectors[0] ?? 'empresas'} ${currentYear}`,
    ] : [
      `tendências mercado ${topSectors[0]} ${countryName} ${currentYear}`,
      `crescimento sector ${topSectors[0]} ${countryName}`,
      `análise competitiva ${topSectors[1] ?? topSectors[0]} Portugal`,
      `inovação disrupção ${topSectors[0]} ${currentYear}`,
      `oportunidades investimento ${topSectors[1] ?? topSectors[0]} ibéria`,
      `regulamentação legislação ${topSectors[0]} Portugal ${currentYear}`,
      `estatísticas mercado ${topSectors[0]} Portugal`,
      `startups empresas ${topSectors[0]} Portugal crescimento`,
    ]

    // Execute search queries in parallel
    const searchPromises = queries.map(q =>
      firecrawl.search(q, {
        limit: 3,
        lang: 'pt',
        country,
        scrapeOptions: { formats: ['markdown'] },
      }).catch(err => ({ success: false, error: (err as Error).message, data: null as any }))
    )

    const searchResults = await Promise.allSettled(searchPromises)

    // Compile search results into context
    const marketContext = searchResults
      .filter(r => r.status === 'fulfilled')
      .flatMap((r, i) => {
        const result = (r as PromiseFulfilledResult<any>).value
        if (!result.success || !result.data) return []
        const items = Array.isArray(result.data) ? result.data : (result.data.web ?? [])
        return items.slice(0, 2).map((item: any) => ({
          query: queries[i],
          source: item.url,
          title: item.title,
          content: item.markdown?.slice(0, 800) ?? item.description ?? '',
        }))
      })
      .filter((item: any) => item.content.length > 50)
      .slice(0, 12)

    // Use Lovable AI (Gemini) instead of Anthropic directly
    const LOVABLE_AI_URL = `${Deno.env.get('SUPABASE_URL')}/functions/v1/ai-gateway`

    const systemPrompt = `És um analista de mercado especializado em PMEs portuguesas e mercados ibéricos.
Analisa fontes de mercado reais e produz insights accionáveis para gestores de negócio.
Responde APENAS em JSON válido. Usa português de Portugal. Baseia-te nos dados reais fornecidos.`

    const userPrompt = `Com base nas seguintes fontes de mercado reais (${currentYear}), 
analisa as tendências e oportunidades para empresas nos sectores: ${topSectors.join(', ')} em ${countryName}.

## Fontes de mercado recolhidas
${marketContext.map((s: any, i: number) => `### Fonte ${i+1}: ${s.title}\nURL: ${s.source}\nConteúdo: ${s.content}`).join('\n\n')}

## Schema de resposta
{
  "market_signals": [{ "signal_type": "trend_up|trend_down|opportunity|risk", "title": "", "description": "", "strength": "weak|moderate|strong", "sector": "", "source_url": "" }],
  "growth_opportunities": [{ "opportunity": "", "evidence": "", "action": "" }],
  "competitive_landscape": "",
  "market_summary": "",
  "sources_used": ${JSON.stringify(marketContext.map((s: any) => ({ title: s.title, url: s.source })))}
}`

    // Call the AI gateway or directly call Gemini via Lovable AI
    const aiResponse = await fetch('https://api.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${Deno.env.get('LOVABLE_API_KEY') ?? ''}`,
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
        ],
        max_tokens: 3000,
        temperature: 0.3,
      }),
    })

    let analysis: any = {}
    
    if (aiResponse.ok) {
      const aiData = await aiResponse.json()
      const rawText = aiData.choices?.[0]?.message?.content ?? '{}'
      try {
        analysis = JSON.parse(rawText.replace(/```json|```/g, '').trim())
      } catch {
        analysis = { market_summary: rawText.slice(0, 500), market_signals: [], growth_opportunities: [] }
      }
    } else {
      // Fallback: return raw market context without AI synthesis
      analysis = {
        market_summary: `Encontrámos ${marketContext.length} fontes de mercado relevantes para os sectores ${topSectors.join(', ')}.`,
        market_signals: marketContext.slice(0, 5).map((s: any) => ({
          signal_type: 'opportunity',
          title: s.title,
          description: s.content.slice(0, 200),
          strength: 'moderate',
          sector: topSectors[0],
          source_url: s.source,
        })),
        growth_opportunities: [],
        sources_used: marketContext.map((s: any) => ({ title: s.title, url: s.source })),
      }
    }

    // Store in imo_market_insights
    await supabase.from('imo_market_insights')
      .update({ is_stale: true })
      .eq('workspace_id', workspace_id)
      .catch(console.error)

    const today = new Date().toISOString().split('T')[0]
    const { data: insight } = await supabase.from('imo_market_insights').insert({
      workspace_id,
      period_start: today,
      period_end: today,
      dominant_sectors: topSectors,
      market_signals: analysis.market_signals ?? [],
      competitive_signals: analysis.competitive_landscape
        ? [{ signal: analysis.competitive_landscape, implication: '', recommended_action: '' }]
        : [],
      market_summary: analysis.market_summary,
      key_findings: analysis.growth_opportunities?.map((o: any) => o.opportunity) ?? [],
      expires_at: new Date(Date.now() + 12 * 3600000).toISOString(),
    }).select().maybeSingle()

    return new Response(
      JSON.stringify({
        success: true,
        insight,
        sources_used: marketContext.length,
        queries_run: queries.length,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    console.error('Error in market search:', error)
    return new Response(
      JSON.stringify({ success: false, error: (error as Error).message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
