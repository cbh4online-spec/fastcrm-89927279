import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface AnalyzeRequest {
  entityType: 'company' | 'contact' | 'lead';
  entityId: string;
  entityName: string;
  linkedinUrl: string;
  workspaceId: string;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { entityType, entityId, entityName, linkedinUrl, workspaceId }: AnalyzeRequest = await req.json();

    if (!entityId || !linkedinUrl || !workspaceId) {
      return new Response(
        JSON.stringify({ success: false, error: 'Missing required fields' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const firecrawlKey = Deno.env.get('FIRECRAWL_API_KEY');
    if (!firecrawlKey) {
      return new Response(
        JSON.stringify({ success: false, error: 'Firecrawl connector not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Determine target table based on entity type
    const tableMap = {
      company: 'company_linkedin_data',
      contact: 'contact_linkedin_data',
      lead: 'lead_linkedin_data',
    };
    const idFieldMap = {
      company: 'company_id',
      contact: 'contact_id',
      lead: 'lead_id',
    };
    
    const targetTable = tableMap[entityType];
    const idField = idFieldMap[entityType];

    console.log(`Analyzing ${entityType} LinkedIn for ${entityName}: ${linkedinUrl}`);

    // Scrape LinkedIn pages
    const pagesToScrape = [
      { url: linkedinUrl, type: 'about' },
      { url: `${linkedinUrl.replace(/\/$/, '')}/people/`, type: 'people' },
      { url: `${linkedinUrl.replace(/\/$/, '')}/posts/?feedView=all`, type: 'posts' },
    ];

    const scrapedData: Record<string, any> = {};

    for (const page of pagesToScrape) {
      try {
        console.log(`Scraping ${page.type}: ${page.url}`);
        
        const response = await fetch('https://api.firecrawl.dev/v1/scrape', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${firecrawlKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            url: page.url,
            formats: ['markdown'],
            onlyMainContent: true,
            waitFor: 2000,
          }),
        });

        if (response.ok) {
          const data = await response.json();
          if (data.success && data.data?.markdown) {
            scrapedData[page.type] = data.data.markdown;
          }
        }
      } catch (err) {
        console.error(`Error scraping ${page.type}:`, err);
      }
      
      // Rate limiting
      await new Promise(resolve => setTimeout(resolve, 1000));
    }

    // Parse scraped data
    const parsedData = parseLinkedInData(scrapedData, entityName);

    // Upsert to database
    const upsertData = {
      [idField]: entityId,
      workspace_id: workspaceId,
      linkedin_url: linkedinUrl,
      description: parsedData.description,
      tagline: parsedData.tagline,
      headline: parsedData.headline,
      linkedin_industry: parsedData.industry,
      company_size_range: parsedData.companySizeRange,
      headquarters: parsedData.headquarters,
      founded_year: parsedData.foundedYear,
      employee_count_linkedin: parsedData.employeeCount,
      employees_on_linkedin: parsedData.employeesOnLinkedin,
      key_people: parsedData.keyPeople,
      recent_posts: parsedData.recentPosts,
      posting_frequency: parsedData.postingFrequency,
      avg_likes_per_post: parsedData.avgLikes,
      avg_comments_per_post: parsedData.avgComments,
      engagement_score: parsedData.engagementScore,
      specialties: parsedData.specialties,
      raw_data: scrapedData,
      analysis_status: 'completed',
      analyzed_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    const { error: upsertError } = await supabase
      .from(targetTable)
      .upsert(upsertData, { onConflict: idField });

    if (upsertError) {
      console.error('Upsert error:', upsertError);
      return new Response(
        JSON.stringify({ success: false, error: upsertError.message }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Successfully analyzed ${entityType} LinkedIn data`);

    return new Response(
      JSON.stringify({ 
        success: true, 
        data: parsedData,
        message: 'LinkedIn analysis completed and saved' 
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: unknown) {
    console.error('Error in analyze-entity-linkedin:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ success: false, error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

function parseLinkedInData(scrapedData: Record<string, string>, entityName: string) {
  const aboutContent = scrapedData.about || '';
  const peopleContent = scrapedData.people || '';
  const postsContent = scrapedData.posts || '';

  // Parse description
  let description = '';
  const descMatch = aboutContent.match(/## About\s*([\s\S]*?)(?=##|$)/i) ||
                    aboutContent.match(/About\s*\n\s*([\s\S]*?)(?=\n##|\n\n\n|$)/i);
  if (descMatch) {
    description = descMatch[1].trim().slice(0, 2000);
  }

  // Parse industry
  let industry = '';
  const industryMatch = aboutContent.match(/Industry[:\s]+([^\n]+)/i);
  if (industryMatch) {
    industry = industryMatch[1].trim();
  }

  // Parse company size
  let companySizeRange = '';
  const sizeMatch = aboutContent.match(/Company size[:\s]+([^\n]+)/i) ||
                    aboutContent.match(/(\d+[\-–]\d+|\d+\+?)\s*employees/i);
  if (sizeMatch) {
    companySizeRange = sizeMatch[1].trim();
  }

  // Parse headquarters
  let headquarters = '';
  const hqMatch = aboutContent.match(/Headquarters[:\s]+([^\n]+)/i) ||
                  aboutContent.match(/Location[:\s]+([^\n]+)/i);
  if (hqMatch) {
    headquarters = hqMatch[1].trim();
  }

  // Parse founded year
  let foundedYear = null;
  const foundedMatch = aboutContent.match(/Founded[:\s]+(\d{4})/i);
  if (foundedMatch) {
    foundedYear = parseInt(foundedMatch[1]);
  }

  // Parse employee count
  let employeeCount = null;
  let employeesOnLinkedin = null;
  const empMatch = aboutContent.match(/(\d+,?\d*)\s*employees/i);
  if (empMatch) {
    employeeCount = parseInt(empMatch[1].replace(',', ''));
  }
  const linkedinEmpMatch = aboutContent.match(/(\d+,?\d*)\s*on LinkedIn/i);
  if (linkedinEmpMatch) {
    employeesOnLinkedin = parseInt(linkedinEmpMatch[1].replace(',', ''));
  }

  // Parse specialties
  const specialties: string[] = [];
  const specMatch = aboutContent.match(/Specialties[:\s]+([^\n]+)/i);
  if (specMatch) {
    specialties.push(...specMatch[1].split(/[,;]/).map(s => s.trim()).filter(Boolean));
  }

  // Parse key people from people page
  const keyPeople: Array<{ name: string; title: string; linkedin_url?: string }> = [];
  const peopleLines = peopleContent.split('\n');
  let currentPerson: { name?: string; title?: string } = {};
  
  for (const line of peopleLines) {
    const trimmed = line.trim();
    if (trimmed.startsWith('###') || (trimmed.length > 0 && !trimmed.includes('|') && !trimmed.startsWith('-') && !trimmed.startsWith('*'))) {
      if (currentPerson.name && currentPerson.title) {
        keyPeople.push({ name: currentPerson.name, title: currentPerson.title });
      }
      currentPerson = { name: trimmed.replace(/^#+\s*/, '') };
    } else if (currentPerson.name && !currentPerson.title && trimmed.length > 0 && trimmed.length < 100) {
      currentPerson.title = trimmed;
    }
  }
  if (currentPerson.name && currentPerson.title) {
    keyPeople.push({ name: currentPerson.name, title: currentPerson.title });
  }

  // Parse recent posts
  const recentPosts: Array<{ content: string; likes?: number; comments?: number }> = [];
  const postBlocks = postsContent.split(/(?=#{2,3}\s)/);
  
  for (const block of postBlocks.slice(0, 5)) {
    if (block.length > 50) {
      const content = block.replace(/^#{2,3}\s*/, '').trim().slice(0, 500);
      const likesMatch = block.match(/(\d+)\s*likes?/i);
      const commentsMatch = block.match(/(\d+)\s*comments?/i);
      
      recentPosts.push({
        content,
        likes: likesMatch ? parseInt(likesMatch[1]) : undefined,
        comments: commentsMatch ? parseInt(commentsMatch[1]) : undefined,
      });
    }
  }

  // Calculate engagement metrics
  let avgLikes = 0;
  let avgComments = 0;
  let engagementScore = 0;
  
  const postsWithLikes = recentPosts.filter(p => p.likes !== undefined);
  if (postsWithLikes.length > 0) {
    avgLikes = Math.round(postsWithLikes.reduce((sum, p) => sum + (p.likes || 0), 0) / postsWithLikes.length);
    avgComments = Math.round(postsWithLikes.reduce((sum, p) => sum + (p.comments || 0), 0) / postsWithLikes.length);
    engagementScore = Math.min(100, avgLikes + avgComments * 3);
  }

  // Determine posting frequency
  let postingFrequency = 'unknown';
  if (recentPosts.length >= 4) postingFrequency = 'very_active';
  else if (recentPosts.length >= 2) postingFrequency = 'active';
  else if (recentPosts.length >= 1) postingFrequency = 'occasional';
  else postingFrequency = 'inactive';

  return {
    description,
    tagline: '',
    headline: '',
    industry,
    companySizeRange,
    headquarters,
    foundedYear,
    employeeCount,
    employeesOnLinkedin,
    keyPeople: keyPeople.slice(0, 10),
    recentPosts: recentPosts.slice(0, 5),
    postingFrequency,
    avgLikes,
    avgComments,
    engagementScore,
    specialties: specialties.slice(0, 10),
  };
}
