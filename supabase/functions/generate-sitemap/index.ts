import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Content-Type': 'application/xml',
};

interface SitemapEntry {
  loc: string;
  lastmod?: string;
  changefreq?: string;
  priority?: number;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const url = new URL(req.url);
    const baseUrl = url.searchParams.get('baseUrl') || 'https://fastcrm.lovable.app';
    const type = url.searchParams.get('type') || 'index';

    if (type === 'index') {
      // Generate sitemap index
      const sitemapIndex = generateSitemapIndex(baseUrl);
      return new Response(sitemapIndex, { headers: corsHeaders });
    }

    // Fetch entities based on type
    const { data: entities, error } = await supabase
      .from('seo_entities')
      .select('slug, entity_type, updated_at, priority, change_frequency')
      .eq('status', 'published')
      .eq('entity_type', type)
      .order('priority', { ascending: false });

    if (error) {
      throw new Error(`Failed to fetch entities: ${error.message}`);
    }

    const entries: SitemapEntry[] = (entities || []).map((entity) => ({
      loc: `${baseUrl}/${entity.entity_type}s/${entity.slug}`,
      lastmod: entity.updated_at?.split('T')[0],
      changefreq: entity.change_frequency || 'weekly',
      priority: entity.priority || 0.5,
    }));

    // Add static pages based on type
    if (type === 'pages') {
      entries.push(
        { loc: baseUrl, priority: 1.0, changefreq: 'daily' },
        { loc: `${baseUrl}/keywords`, priority: 0.9, changefreq: 'daily' },
        { loc: `${baseUrl}/templates`, priority: 0.9, changefreq: 'daily' },
        { loc: `${baseUrl}/tools`, priority: 0.9, changefreq: 'daily' },
        { loc: `${baseUrl}/categories`, priority: 0.8, changefreq: 'weekly' },
        { loc: `${baseUrl}/blog`, priority: 0.8, changefreq: 'daily' },
        { loc: `${baseUrl}/glossary`, priority: 0.7, changefreq: 'weekly' },
      );
    }

    const sitemap = generateSitemap(entries);
    return new Response(sitemap, { headers: corsHeaders });

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('Sitemap generation error:', errorMessage);
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});

function generateSitemapIndex(baseUrl: string): string {
  const types = ['pages', 'keyword', 'template', 'tool', 'category', 'blog', 'guide', 'glossary'];
  const today = new Date().toISOString().split('T')[0];
  
  let xml = '<?xml version="1.0" encoding="UTF-8"?>\n';
  xml += '<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n';
  
  for (const type of types) {
    xml += '  <sitemap>\n';
    xml += `    <loc>${baseUrl}/api/sitemap?type=${type}</loc>\n`;
    xml += `    <lastmod>${today}</lastmod>\n`;
    xml += '  </sitemap>\n';
  }
  
  xml += '</sitemapindex>';
  return xml;
}

function generateSitemap(entries: SitemapEntry[]): string {
  let xml = '<?xml version="1.0" encoding="UTF-8"?>\n';
  xml += '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n';
  
  for (const entry of entries) {
    xml += '  <url>\n';
    xml += `    <loc>${escapeXml(entry.loc)}</loc>\n`;
    if (entry.lastmod) {
      xml += `    <lastmod>${entry.lastmod}</lastmod>\n`;
    }
    if (entry.changefreq) {
      xml += `    <changefreq>${entry.changefreq}</changefreq>\n`;
    }
    if (entry.priority !== undefined) {
      xml += `    <priority>${entry.priority.toFixed(1)}</priority>\n`;
    }
    xml += '  </url>\n';
  }
  
  xml += '</urlset>';
  return xml;
}

function escapeXml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}
