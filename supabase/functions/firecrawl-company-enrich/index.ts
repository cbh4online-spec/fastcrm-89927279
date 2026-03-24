import { createClient } from 'npm:@supabase/supabase-js@2'
import { firecrawl } from '../_shared/firecrawl-client.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
}

const COMPANY_SCHEMA = {
  type: 'object',
  properties: {
    company_name:   { type: 'string', description: 'Official company name' },
    tagline:        { type: 'string', description: 'Company tagline or short description' },
    description:    { type: 'string', description: 'Full company description (2-4 sentences)' },
    industry:       { type: 'string', description: 'Primary industry/sector' },
    founded_year:   { type: 'number', description: 'Year the company was founded' },
    employee_count: { type: 'string', description: 'Approximate number of employees' },
    headquarters:   { type: 'string', description: 'City and country of headquarters' },
    email:          { type: 'string', description: 'Primary contact email' },
    phone:          { type: 'string', description: 'Primary phone number' },
    linkedin_url:   { type: 'string', description: 'LinkedIn company page URL' },
    twitter_url:    { type: 'string', description: 'Twitter/X profile URL' },
    technologies:   { type: 'array', items: { type: 'string' }, description: 'Technologies used' },
    services:       { type: 'array', items: { type: 'string' }, description: 'Main products or services' },
    target_market:  { type: 'string', description: 'Target market (B2B, B2C, etc.)' },
    certifications: { type: 'array', items: { type: 'string' }, description: 'Awards or certifications' },
  },
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders })

  try {
    const { company_id, lead_id, website_url, workspace_id, save_to_db = true } = await req.json()

    if (!website_url) throw new Error('website_url is required')

    const url = website_url.startsWith('http') ? website_url : `https://${website_url}`
    const domain = new URL(url).hostname

    // Try extract first — most powerful
    let enrichedData: Record<string, unknown> | null = null
    let source = 'firecrawl_extract'

    try {
      const extractResult = await firecrawl.extract(
        [`https://${domain}/*`],
        {
          prompt: 'Extract detailed company information including contact details, services, team size, founded year, and technology stack. Focus on the homepage, about page, contact page, and services/products page.',
          schema: COMPANY_SCHEMA,
        }
      )

      if (extractResult.success && extractResult.data) {
        enrichedData = extractResult.data as Record<string, unknown>
      }
    } catch (e) {
      console.warn('Extract failed, falling back to scrape:', (e as Error).message)
    }

    // Fallback: scrape homepage
    if (!enrichedData) {
      const scrapeResult = await firecrawl.scrape(url, {
        formats: ['markdown'],
        onlyMainContent: true,
      })

      return new Response(
        JSON.stringify({
          success: true,
          data: null,
          fallback_markdown: scrapeResult.data?.markdown?.slice(0, 2000),
          source: 'firecrawl_scrape_fallback',
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Save to database
    if (save_to_db && workspace_id) {
      const supabase = createClient(
        Deno.env.get('SUPABASE_URL')!,
        Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
      )

      if (company_id) {
        const updates: Record<string, unknown> = {}
        if (enrichedData.description)    updates.description = enrichedData.description
        if (enrichedData.industry)       updates.industry = enrichedData.industry
        if (enrichedData.employee_count) updates.employee_count = enrichedData.employee_count
        if (enrichedData.headquarters)   updates.city = enrichedData.headquarters
        if (enrichedData.email)          updates.email = enrichedData.email
        if (enrichedData.phone)          updates.phone = enrichedData.phone
        if (enrichedData.linkedin_url)   updates.linkedin_url = enrichedData.linkedin_url
        if (enrichedData.services)       updates.tags = enrichedData.services
        if (Object.keys(updates).length > 0) {
          updates.website = url
          updates.enriched_at = new Date().toISOString()
          updates.enrichment_source = 'firecrawl'
          updates.firecrawl_data = enrichedData
          await supabase.from('companies').update(updates)
            .eq('id', company_id).eq('workspace_id', workspace_id)
        }
      }

      if (lead_id) {
        const updates: Record<string, unknown> = {}
        if (enrichedData.company_name) updates.company = enrichedData.company_name
        if (enrichedData.description)  updates.notes = enrichedData.description
        if (enrichedData.industry)     updates.industry = enrichedData.industry
        if (enrichedData.target_market) updates.segment = enrichedData.target_market
        if (Object.keys(updates).length > 0) {
          await supabase.from('leads').update(updates)
            .eq('id', lead_id).eq('workspace_id', workspace_id)
        }
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        data: enrichedData,
        source,
        website_url: url,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    console.error('Error enriching company:', error)
    return new Response(
      JSON.stringify({ success: false, error: (error as Error).message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
