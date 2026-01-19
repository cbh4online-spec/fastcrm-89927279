import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface LinkedInAnalysis {
  // About data
  description?: string;
  tagline?: string;
  headquarters?: string;
  founded_year?: number;
  company_size_range?: string;
  linkedin_industry?: string;
  linkedin_type?: string;
  specialties?: string[];
  linkedin_website?: string;
  
  // People data
  employee_count_linkedin?: number;
  employees_on_linkedin?: number;
  key_people?: Array<{ name: string; title: string; linkedin_url?: string }>;
  
  // Posts data
  recent_posts?: Array<{
    content: string;
    date?: string;
    likes?: number;
    comments?: number;
  }>;
  avg_likes_per_post?: number;
  avg_comments_per_post?: number;
  posting_frequency?: string;
  last_post_date?: string;
  engagement_score?: number;
}

async function scrapeLinkedInPage(url: string, apiKey: string): Promise<{ markdown: string; metadata?: any } | null> {
  try {
    const response = await fetch('https://api.firecrawl.dev/v1/scrape', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        url,
        formats: ['markdown'],
        onlyMainContent: true,
        waitFor: 3000,
      }),
    });

    const data = await response.json();
    
    if (!response.ok || !data.success) {
      console.error('Firecrawl error:', data);
      return null;
    }

    return {
      markdown: data.data?.markdown || data.markdown || '',
      metadata: data.data?.metadata || data.metadata,
    };
  } catch (error) {
    console.error('Error scraping:', error);
    return null;
  }
}

function parseAboutPage(markdown: string): Partial<LinkedInAnalysis> {
  const result: Partial<LinkedInAnalysis> = {};
  
  // Extract description
  const descMatch = markdown.match(/(?:Sobre|About|Descrição)[\s\S]*?(?:\n\n|\r\n\r\n)([\s\S]*?)(?:\n##|\n\*\*|$)/i);
  if (descMatch) {
    result.description = descMatch[1].trim().slice(0, 2000);
  }
  
  // Extract company size
  const sizeMatch = markdown.match(/(\d+[\-–]\d+|\d+\+?)\s*(?:funcionários|employees|colaboradores)/i);
  if (sizeMatch) {
    result.company_size_range = sizeMatch[1];
    const numMatch = sizeMatch[1].match(/(\d+)/);
    if (numMatch) {
      result.employee_count_linkedin = parseInt(numMatch[1]);
    }
  }
  
  // Extract industry
  const industryMatch = markdown.match(/(?:Setor|Industry|Indústria)[:\s]*([^\n]+)/i);
  if (industryMatch) {
    result.linkedin_industry = industryMatch[1].trim();
  }
  
  // Extract headquarters
  const hqMatch = markdown.match(/(?:Sede|Headquarters|Localização)[:\s]*([^\n]+)/i);
  if (hqMatch) {
    result.headquarters = hqMatch[1].trim();
  }
  
  // Extract founded year
  const foundedMatch = markdown.match(/(?:Fundada|Founded|Fundação)[:\s]*(\d{4})/i);
  if (foundedMatch) {
    result.founded_year = parseInt(foundedMatch[1]);
  }
  
  // Extract specialties
  const specialtiesMatch = markdown.match(/(?:Especialidades|Specialties)[:\s]*([^\n]+)/i);
  if (specialtiesMatch) {
    result.specialties = specialtiesMatch[1].split(',').map(s => s.trim()).filter(Boolean);
  }
  
  // Extract website
  const websiteMatch = markdown.match(/(?:Website|Site)[:\s]*(https?:\/\/[^\s\n]+)/i);
  if (websiteMatch) {
    result.linkedin_website = websiteMatch[1];
  }
  
  return result;
}

function parsePeoplePage(markdown: string): Partial<LinkedInAnalysis> {
  const result: Partial<LinkedInAnalysis> = {};
  
  // Extract employee count on LinkedIn
  const countMatch = markdown.match(/(\d+[\.,]?\d*)\s*(?:funcionários|employees|no LinkedIn)/i);
  if (countMatch) {
    result.employees_on_linkedin = parseInt(countMatch[1].replace(/[.,]/g, ''));
  }
  
  // Extract key people (look for names with titles)
  const people: Array<{ name: string; title: string }> = [];
  const peopleMatches = markdown.matchAll(/\*\*([^*]+)\*\*\s*(?:\n|[-–])\s*([^\n]+)/g);
  for (const match of peopleMatches) {
    if (people.length < 10) {
      people.push({
        name: match[1].trim(),
        title: match[2].trim(),
      });
    }
  }
  
  if (people.length > 0) {
    result.key_people = people;
  }
  
  return result;
}

function parsePostsPage(markdown: string): Partial<LinkedInAnalysis> {
  const result: Partial<LinkedInAnalysis> = {};
  
  // Extract recent posts
  const posts: Array<{ content: string; likes?: number; comments?: number }> = [];
  
  // Look for post patterns
  const postBlocks = markdown.split(/(?=##|\*\*[^*]+\*\*\s+publicou|posted)/i);
  
  for (const block of postBlocks.slice(0, 5)) {
    const likesMatch = block.match(/(\d+)\s*(?:curtidas|likes|gostaram)/i);
    const commentsMatch = block.match(/(\d+)\s*(?:comentários|comments)/i);
    const contentMatch = block.match(/(?:publicou|posted)[:\s]*([^\n]+)/i);
    
    if (contentMatch || likesMatch) {
      posts.push({
        content: contentMatch?.[1]?.slice(0, 500) || block.slice(0, 200),
        likes: likesMatch ? parseInt(likesMatch[1]) : undefined,
        comments: commentsMatch ? parseInt(commentsMatch[1]) : undefined,
      });
    }
  }
  
  if (posts.length > 0) {
    result.recent_posts = posts;
    
    // Calculate averages
    const postsWithLikes = posts.filter(p => p.likes !== undefined);
    const postsWithComments = posts.filter(p => p.comments !== undefined);
    
    if (postsWithLikes.length > 0) {
      result.avg_likes_per_post = Math.round(
        postsWithLikes.reduce((sum, p) => sum + (p.likes || 0), 0) / postsWithLikes.length
      );
    }
    
    if (postsWithComments.length > 0) {
      result.avg_comments_per_post = Math.round(
        postsWithComments.reduce((sum, p) => sum + (p.comments || 0), 0) / postsWithComments.length
      );
    }
    
    // Calculate engagement score (simplified)
    const totalEngagement = (result.avg_likes_per_post || 0) + (result.avg_comments_per_post || 0) * 3;
    result.engagement_score = Math.min(100, Math.round(totalEngagement / 10));
  }
  
  return result;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { companyId, linkedinUrl, workspaceId } = await req.json();

    if (!companyId || !linkedinUrl || !workspaceId) {
      return new Response(
        JSON.stringify({ success: false, error: 'companyId, linkedinUrl and workspaceId are required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const firecrawlApiKey = Deno.env.get('FIRECRAWL_API_KEY');
    if (!firecrawlApiKey) {
      return new Response(
        JSON.stringify({ success: false, error: 'Firecrawl connector not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get auth user from token
    const authHeader = req.headers.get('Authorization');
    let userId: string | null = null;
    if (authHeader) {
      const token = authHeader.replace('Bearer ', '');
      const { data: { user } } = await supabase.auth.getUser(token);
      userId = user?.id || null;
    }

    console.log('Analyzing LinkedIn for company:', companyId, 'URL:', linkedinUrl);

    // Normalize LinkedIn URL
    let baseUrl = linkedinUrl.replace(/\/$/, '');
    if (!baseUrl.includes('/company/')) {
      return new Response(
        JSON.stringify({ success: false, error: 'Invalid LinkedIn company URL' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Extract company slug
    const companySlug = baseUrl.match(/\/company\/([^/]+)/)?.[1];
    if (!companySlug) {
      return new Response(
        JSON.stringify({ success: false, error: 'Could not extract company from URL' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    baseUrl = `https://www.linkedin.com/company/${companySlug}`;

    // Scrape all three pages
    console.log('Scraping About page...');
    const aboutPage = await scrapeLinkedInPage(`${baseUrl}/about/`, firecrawlApiKey);
    
    console.log('Scraping People page...');
    const peoplePage = await scrapeLinkedInPage(`${baseUrl}/people/`, firecrawlApiKey);
    
    console.log('Scraping Posts page...');
    const postsPage = await scrapeLinkedInPage(`${baseUrl}/posts/`, firecrawlApiKey);

    // Parse the data
    const analysis: LinkedInAnalysis = {
      ...(aboutPage ? parseAboutPage(aboutPage.markdown) : {}),
      ...(peoplePage ? parsePeoplePage(peoplePage.markdown) : {}),
      ...(postsPage ? parsePostsPage(postsPage.markdown) : {}),
    };

    console.log('Analysis result:', analysis);

    // Upsert the data
    const { data, error } = await supabase
      .from('company_linkedin_data')
      .upsert({
        company_id: companyId,
        workspace_id: workspaceId,
        linkedin_url: baseUrl,
        ...analysis,
        analyzed_at: new Date().toISOString(),
        analyzed_by: userId,
        analysis_status: 'completed',
        raw_data: {
          about: aboutPage?.markdown?.slice(0, 5000),
          people: peoplePage?.markdown?.slice(0, 5000),
          posts: postsPage?.markdown?.slice(0, 5000),
        },
      }, {
        onConflict: 'company_id',
      })
      .select()
      .single();

    if (error) {
      console.error('Database error:', error);
      return new Response(
        JSON.stringify({ success: false, error: error.message }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({ success: true, data }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error:', error);
    return new Response(
      JSON.stringify({ success: false, error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
