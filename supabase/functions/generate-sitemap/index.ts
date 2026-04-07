import { createClient } from "@supabase/supabase-js";

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
    const baseUrl = url.searchParams.get('baseUrl') || 'https://fastcrm.metodopare.ai';
    const type = url.searchParams.get('type') || 'index';

    // ── Store-specific sitemaps ──────────────────────────────
    if (type === 'store-index') {
      const xml = await generateStoreSitemapIndex(supabase, baseUrl, url.origin);
      return new Response(xml, { headers: corsHeaders });
    }

    if (type === 'store-products') {
      const storeSlug = url.searchParams.get('store');
      const xml = await generateStoreProductsSitemap(supabase, baseUrl, storeSlug);
      return new Response(xml, { headers: corsHeaders });
    }

    if (type === 'store-categories') {
      const storeSlug = url.searchParams.get('store');
      const xml = await generateStoreCategoriesSitemap(supabase, baseUrl, storeSlug);
      return new Response(xml, { headers: corsHeaders });
    }

    if (type === 'store-pages') {
      const storeSlug = url.searchParams.get('store');
      const xml = await generateStorePagesSitemap(supabase, baseUrl, storeSlug);
      return new Response(xml, { headers: corsHeaders });
    }

    // ── Original SEO sitemaps ────────────────────────────────
    if (type === 'index') {
      const sitemapIndex = await generateSitemapIndex(supabase, baseUrl, url.origin);
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

    const entries: SitemapEntry[] = (entities || []).map((entity: any) => ({
      loc: `${baseUrl}/${entity.entity_type}s/${entity.slug}`,
      lastmod: entity.updated_at?.split('T')[0],
      changefreq: entity.change_frequency || 'weekly',
      priority: entity.priority || 0.5,
    }));

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

// ── Store sitemap generators ─────────────────────────────────

async function getStoresBySlug(supabase: any, storeSlug: string | null) {
  if (storeSlug) {
    const { data } = await supabase
      .from('store_settings')
      .select('workspace_id, store_slug, store_name, updated_at')
      .eq('store_slug', storeSlug)
      .maybeSingle();
    return data ? [data] : [];
  }
  const { data } = await supabase
    .from('store_settings')
    .select('workspace_id, store_slug, store_name, updated_at')
    .not('store_slug', 'is', null);
  return data || [];
}

async function generateStoreSitemapIndex(supabase: any, baseUrl: string, fnOrigin: string): Promise<string> {
  const stores = await getStoresBySlug(supabase, null);
  const today = new Date().toISOString().split('T')[0];
  
  let xml = '<?xml version="1.0" encoding="UTF-8"?>\n';
  xml += '<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n';

  for (const store of stores) {
    if (!store.store_slug) continue;
    const slug = store.store_slug;
    for (const sub of ['store-products', 'store-categories', 'store-pages']) {
      xml += '  <sitemap>\n';
      xml += `    <loc>${fnOrigin}/generate-sitemap?type=${sub}&amp;store=${escapeXml(slug)}&amp;baseUrl=${escapeXml(baseUrl)}</loc>\n`;
      xml += `    <lastmod>${today}</lastmod>\n`;
      xml += '  </sitemap>\n';
    }
  }

  xml += '</sitemapindex>';
  return xml;
}

async function generateStoreProductsSitemap(supabase: any, baseUrl: string, storeSlug: string | null): Promise<string> {
  const stores = await getStoresBySlug(supabase, storeSlug);
  const entries: SitemapEntry[] = [];

  for (const store of stores) {
    const slug = store.store_slug || store.workspace_id;

    // Regular products
    const { data: products } = await supabase
      .from('products')
      .select('id, updated_at')
      .eq('workspace_id', store.workspace_id)
      .eq('status', 'active')
      .order('updated_at', { ascending: false })
      .limit(1000);

    for (const p of products || []) {
      entries.push({
        loc: `${baseUrl}/store/${slug}/product/${p.id}`,
        lastmod: p.updated_at?.split('T')[0],
        changefreq: 'weekly',
        priority: 0.8,
      });
    }

    // C2C listings
    const { data: c2c } = await supabase
      .from('c2c_listings')
      .select('id, updated_at')
      .eq('workspace_id', store.workspace_id)
      .eq('status', 'active')
      .eq('moderation_status', 'approved')
      .order('updated_at', { ascending: false })
      .limit(1000);

    for (const l of c2c || []) {
      entries.push({
        loc: `${baseUrl}/marketplace/${slug}/listing/${l.id}`,
        lastmod: l.updated_at?.split('T')[0],
        changefreq: 'daily',
        priority: 0.7,
      });
    }
  }

  return generateSitemap(entries);
}

async function generateStoreCategoriesSitemap(supabase: any, baseUrl: string, storeSlug: string | null): Promise<string> {
  const stores = await getStoresBySlug(supabase, storeSlug);
  const entries: SitemapEntry[] = [];

  for (const store of stores) {
    const slug = store.store_slug || store.workspace_id;

    const { data: categories } = await supabase
      .from('product_categories')
      .select('slug, updated_at')
      .eq('workspace_id', store.workspace_id)
      .eq('store_visible', true)
      .not('slug', 'is', null);

    for (const c of categories || []) {
      if (!c.slug) continue;
      entries.push({
        loc: `${baseUrl}/store/${slug}/catalog/${c.slug}`,
        lastmod: c.updated_at?.split('T')[0],
        changefreq: 'weekly',
        priority: 0.6,
      });
    }
  }

  return generateSitemap(entries);
}

async function generateStorePagesSitemap(supabase: any, baseUrl: string, storeSlug: string | null): Promise<string> {
  const stores = await getStoresBySlug(supabase, storeSlug);
  const entries: SitemapEntry[] = [];

  for (const store of stores) {
    const slug = store.store_slug || store.workspace_id;
    const lastmod = store.updated_at?.split('T')[0] || new Date().toISOString().split('T')[0];

    // Store homepage
    entries.push({ loc: `${baseUrl}/store/${slug}`, lastmod, changefreq: 'daily', priority: 1.0 });
    // Static store pages
    entries.push({ loc: `${baseUrl}/store/${slug}/wishlist`, lastmod, changefreq: 'weekly', priority: 0.3 });
    entries.push({ loc: `${baseUrl}/store/${slug}/gift-cards`, lastmod, changefreq: 'weekly', priority: 0.4 });

    // Seller pages
    const { data: sellers } = await supabase
      .from('c2c_sellers')
      .select('slug, updated_at')
      .eq('workspace_id', store.workspace_id)
      .eq('status', 'approved')
      .not('slug', 'is', null);

    for (const s of sellers || []) {
      if (!s.slug) continue;
      entries.push({
        loc: `${baseUrl}/store/${slug}/seller/${s.slug}`,
        lastmod: s.updated_at?.split('T')[0],
        changefreq: 'weekly',
        priority: 0.5,
      });
    }
  }

  return generateSitemap(entries);
}

// ── Original index (includes store sub-sitemaps) ─────────────

async function generateSitemapIndex(supabase: any, baseUrl: string, fnOrigin: string): Promise<string> {
  const seoTypes = ['pages', 'keyword', 'template', 'tool', 'category', 'blog', 'guide', 'glossary'];
  const today = new Date().toISOString().split('T')[0];
  
  let xml = '<?xml version="1.0" encoding="UTF-8"?>\n';
  xml += '<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n';
  
  for (const t of seoTypes) {
    xml += '  <sitemap>\n';
    xml += `    <loc>${fnOrigin}/generate-sitemap?type=${t}&amp;baseUrl=${escapeXml(baseUrl)}</loc>\n`;
    xml += `    <lastmod>${today}</lastmod>\n`;
    xml += '  </sitemap>\n';
  }

  // Include store sitemaps
  const stores = await getStoresBySlug(supabase, null);
  for (const store of stores) {
    if (!store.store_slug) continue;
    const slug = store.store_slug;
    for (const sub of ['store-products', 'store-categories', 'store-pages']) {
      xml += '  <sitemap>\n';
      xml += `    <loc>${fnOrigin}/generate-sitemap?type=${sub}&amp;store=${escapeXml(slug)}&amp;baseUrl=${escapeXml(baseUrl)}</loc>\n`;
      xml += `    <lastmod>${today}</lastmod>\n`;
      xml += '  </sitemap>\n';
    }
  }

  xml += '</sitemapindex>';
  return xml;
}

// ── XML helpers ──────────────────────────────────────────────

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
