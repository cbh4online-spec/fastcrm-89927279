const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Content-Type': 'text/plain',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);
    const baseUrl = url.searchParams.get('baseUrl') || 'https://fastcrm.lovable.app';
    const environment = url.searchParams.get('env') || 'production';

    let robotsTxt = '';

    if (environment === 'production') {
      robotsTxt = `# robots.txt for ${baseUrl}
# Generated dynamically

User-agent: *
Allow: /

# SEO Pages
Allow: /keywords/
Allow: /templates/
Allow: /tools/
Allow: /categories/
Allow: /blog/
Allow: /guides/
Allow: /glossary/
Allow: /compare/

# Disallow private/admin areas
Disallow: /dashboard/
Disallow: /admin/
Disallow: /auth/
Disallow: /api/
Disallow: /_/

# Crawl-delay for polite crawling
Crawl-delay: 1

# Sitemaps
Sitemap: ${baseUrl}/sitemap.xml
Sitemap: ${baseUrl}/api/sitemap?type=index
`;
    } else {
      // Staging/development - block all crawlers
      robotsTxt = `# robots.txt - ${environment} environment
# Blocking all crawlers

User-agent: *
Disallow: /
`;
    }

    return new Response(robotsTxt, { headers: corsHeaders });

  } catch (error) {
    console.error('Robots.txt generation error:', error);
    return new Response(
      `# Error generating robots.txt\nUser-agent: *\nDisallow: /`,
      { headers: corsHeaders }
    );
  }
});
