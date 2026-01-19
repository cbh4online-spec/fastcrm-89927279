const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface AnalyzeRequest {
  companyId: string;
  companyName: string;
  linkedinUrl?: string;
  facebookUrl?: string;
  instagramUrl?: string;
  workspaceId: string;
  currentCompanyData?: {
    industry?: string;
    website?: string;
    size?: string;
    employee_count?: number;
  };
}

interface SuggestedContact {
  name: string;
  role: string;
  linkedinUrl?: string;
}

interface DataSuggestion {
  field: string;
  currentValue: string | null;
  suggestedValue: string;
  source: string;
}

interface SalesOpportunity {
  type: string;
  severity: 'low' | 'medium' | 'high';
  title: string;
  description: string;
  service: string;
}

// Helper to scrape a page via Firecrawl
async function scrapePage(url: string, apiKey: string): Promise<{ markdown: string; metadata?: any } | null> {
  try {
    console.log(`Scraping: ${url}`);
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
      console.error(`Failed to scrape ${url}:`, data.error);
      return null;
    }

    return {
      markdown: data.data?.markdown || data.markdown || '',
      metadata: data.data?.metadata || data.metadata,
    };
  } catch (error) {
    console.error(`Error scraping ${url}:`, error);
    return null;
  }
}

// Parse LinkedIn data
function parseLinkedInData(aboutMd: string, peopleMd: string, postsMd: string) {
  const result: any = {
    description: null,
    industry: null,
    size: null,
    headquarters: null,
    website: null,
    founded: null,
    employeeCount: null,
    followersCount: null,
    specialties: [],
    keyPeople: [] as SuggestedContact[],
    recentPosts: [] as any[],
    postsPerMonth: null,
    lastPostDate: null,
    activityLevel: 'unknown',
    engagementScore: null,
  };

  // Parse About page
  if (aboutMd) {
    // Followers
    const followersMatch = aboutMd.match(/(\d+[,.]?\d*)\s*(K|M|k|m)?\s*(followers|seguidores)/i);
    if (followersMatch) {
      let count = parseFloat(followersMatch[1].replace(',', '.'));
      if (followersMatch[2]?.toLowerCase() === 'k') count *= 1000;
      if (followersMatch[2]?.toLowerCase() === 'm') count *= 1000000;
      result.followersCount = Math.round(count);
    }

    // Employee count
    const employeeMatch = aboutMd.match(/(\d+[,.]?\d*)\s*(K|k)?\s*(employees|funcionários|colaboradores)/i);
    if (employeeMatch) {
      let count = parseFloat(employeeMatch[1].replace(',', '.'));
      if (employeeMatch[2]?.toLowerCase() === 'k') count *= 1000;
      result.employeeCount = Math.round(count);
    }

    // Company size range
    const sizeMatch = aboutMd.match(/([\d,]+)\s*-\s*([\d,]+)\s*(employees|funcionários)/i);
    if (sizeMatch) {
      result.size = `${sizeMatch[1]}-${sizeMatch[2]}`;
    }

    // Industry
    const industryMatch = aboutMd.match(/(?:Industry|Setor|Indústria)[:\s]*([^\n]+)/i);
    if (industryMatch) {
      result.industry = industryMatch[1].trim();
    }

    // Headquarters
    const hqMatch = aboutMd.match(/(?:Headquarters|Sede|Location)[:\s]*([^\n]+)/i);
    if (hqMatch) {
      result.headquarters = hqMatch[1].trim();
    }

    // Website
    const websiteMatch = aboutMd.match(/(?:Website|Site)[:\s]*(https?:\/\/[^\s\n]+)/i);
    if (websiteMatch) {
      result.website = websiteMatch[1].trim();
    }

    // Founded
    const foundedMatch = aboutMd.match(/(?:Founded|Fundada?)[:\s]*(\d{4})/i);
    if (foundedMatch) {
      result.founded = parseInt(foundedMatch[1]);
    }

    // Description (first substantial paragraph)
    const paragraphs = aboutMd.split('\n\n').filter(p => p.length > 100);
    if (paragraphs.length > 0) {
      result.description = paragraphs[0].substring(0, 500);
    }

    // Specialties
    const specialtiesMatch = aboutMd.match(/(?:Specialties|Especialidades)[:\s]*([^\n]+)/i);
    if (specialtiesMatch) {
      result.specialties = specialtiesMatch[1].split(/[,;]/).map((s: string) => s.trim()).filter(Boolean);
    }
  }

  // Parse People page
  if (peopleMd) {
    // Extract key people with roles
    const peopleLines = peopleMd.split('\n');
    for (const line of peopleLines) {
      // Match patterns like "Name - Role" or "Name, Role" or "[Name](url) Role"
      const personMatch = line.match(/\[([^\]]+)\]\(([^)]+)\)[^a-z]*([A-Za-z].*?)(?:\||$)/i) ||
                          line.match(/([A-Z][a-z]+\s+[A-Z][a-z]+(?:\s+[A-Z][a-z]+)?)\s*[-–|]\s*(.+)/);
      
      if (personMatch) {
        const name = personMatch[1].trim();
        const url = personMatch[2]?.startsWith('http') ? personMatch[2] : undefined;
        const role = (personMatch[3] || personMatch[2] || '').trim();
        
        // Filter out non-person entries
        if (name && role && name.length < 50 && !name.includes('View') && !name.includes('employees')) {
          result.keyPeople.push({
            name,
            role: role.substring(0, 100),
            linkedinUrl: url,
          });
        }
      }
    }
    result.keyPeople = result.keyPeople.slice(0, 15);
  }

  // Parse Posts page
  if (postsMd) {
    const postBlocks = postsMd.split(/(?:---|\*\*\*|#{2,})/);
    const posts: any[] = [];
    
    for (const block of postBlocks.slice(0, 10)) {
      if (block.length < 50) continue;
      
      const likesMatch = block.match(/(\d+)\s*(?:likes?|reações?|curtidas?)/i);
      const commentsMatch = block.match(/(\d+)\s*(?:comments?|comentários?)/i);
      const dateMatch = block.match(/(\d+)\s*(?:d|w|mo|h|days?|weeks?|months?|hours?|dias?|semanas?|meses?|horas?)/i);
      
      posts.push({
        preview: block.substring(0, 200).trim(),
        likes: likesMatch ? parseInt(likesMatch[1]) : 0,
        comments: commentsMatch ? parseInt(commentsMatch[1]) : 0,
        relativeDate: dateMatch ? dateMatch[0] : null,
      });
    }
    
    result.recentPosts = posts.slice(0, 5);
    
    // Calculate engagement metrics
    if (posts.length > 0) {
      const totalLikes = posts.reduce((sum, p) => sum + p.likes, 0);
      const totalComments = posts.reduce((sum, p) => sum + p.comments, 0);
      result.engagementScore = Math.round((totalLikes + totalComments * 2) / posts.length);
      
      // Estimate posts per month based on date references
      const hasRecent = posts.some(p => p.relativeDate?.match(/\d+\s*(d|h|dias?|horas?)/i));
      const hasWeekly = posts.some(p => p.relativeDate?.match(/\d+\s*(w|weeks?|semanas?)/i));
      
      if (hasRecent && posts.length >= 3) {
        result.postsPerMonth = 8;
        result.activityLevel = 'high';
      } else if (hasWeekly || posts.length >= 2) {
        result.postsPerMonth = 4;
        result.activityLevel = 'medium';
      } else {
        result.postsPerMonth = 1;
        result.activityLevel = 'low';
      }
    }
  }

  return result;
}

// Parse Facebook data
function parseFacebookData(mainMd: string, aboutMd: string) {
  const result: any = {
    followersCount: null,
    likesCount: null,
    rating: null,
    reviewsCount: null,
    aboutText: null,
    pageCategory: null,
    activityLevel: 'unknown',
    hasRecentPosts: false,
  };

  const combinedMd = `${mainMd}\n${aboutMd}`;

  // Followers
  const followersMatch = combinedMd.match(/(\d+[,.]?\d*)\s*(K|M|k|m|mil)?\s*(followers|seguidores|people follow)/i);
  if (followersMatch) {
    let count = parseFloat(followersMatch[1].replace(/[,.]/g, ''));
    if (followersMatch[2]?.toLowerCase() === 'k' || followersMatch[2] === 'mil') count *= 1000;
    if (followersMatch[2]?.toLowerCase() === 'm') count *= 1000000;
    result.followersCount = Math.round(count);
  }

  // Likes
  const likesMatch = combinedMd.match(/(\d+[,.]?\d*)\s*(K|M|k|m|mil)?\s*(likes?|gostos?|curtidas?)/i);
  if (likesMatch) {
    let count = parseFloat(likesMatch[1].replace(/[,.]/g, ''));
    if (likesMatch[2]?.toLowerCase() === 'k' || likesMatch[2] === 'mil') count *= 1000;
    if (likesMatch[2]?.toLowerCase() === 'm') count *= 1000000;
    result.likesCount = Math.round(count);
  }

  // Rating
  const ratingMatch = combinedMd.match(/(\d[.,]\d)\s*(?:\/\s*5|out of 5|stars?|estrelas?)/i);
  if (ratingMatch) {
    result.rating = parseFloat(ratingMatch[1].replace(',', '.'));
  }

  // Reviews
  const reviewsMatch = combinedMd.match(/(\d+)\s*(?:reviews?|avaliações?|opiniões?)/i);
  if (reviewsMatch) {
    result.reviewsCount = parseInt(reviewsMatch[1]);
  }

  // Category
  const categoryMatch = combinedMd.match(/(?:Category|Categoria)[:\s]*([^\n]+)/i);
  if (categoryMatch) {
    result.pageCategory = categoryMatch[1].trim();
  }

  // About text
  if (aboutMd) {
    const paragraphs = aboutMd.split('\n\n').filter(p => p.length > 50 && !p.includes('http'));
    if (paragraphs.length > 0) {
      result.aboutText = paragraphs[0].substring(0, 500);
    }
  }

  // Check for recent activity
  const hasRecent = combinedMd.match(/(\d+)\s*(h|d|hours?|dias?|horas?)\s*ago/i);
  if (hasRecent) {
    result.hasRecentPosts = true;
    result.activityLevel = 'high';
  } else {
    const hasWeekly = combinedMd.match(/(\d+)\s*(w|weeks?|semanas?)\s*ago/i);
    result.activityLevel = hasWeekly ? 'medium' : 'low';
  }

  return result;
}

// Parse Instagram data
function parseInstagramData(profileMd: string) {
  const result: any = {
    followersCount: null,
    followingCount: null,
    postsCount: null,
    bio: null,
    activityLevel: 'unknown',
    contentType: null,
    engagementRate: null,
  };

  // Followers
  const followersMatch = profileMd.match(/(\d+[,.]?\d*)\s*(K|M|k|m|mil)?\s*(followers|seguidores)/i);
  if (followersMatch) {
    let count = parseFloat(followersMatch[1].replace(/[,.]/g, ''));
    if (followersMatch[2]?.toLowerCase() === 'k' || followersMatch[2] === 'mil') count *= 1000;
    if (followersMatch[2]?.toLowerCase() === 'm') count *= 1000000;
    result.followersCount = Math.round(count);
  }

  // Following
  const followingMatch = profileMd.match(/(\d+[,.]?\d*)\s*(K|M|k|m)?\s*following/i);
  if (followingMatch) {
    let count = parseFloat(followingMatch[1].replace(/[,.]/g, ''));
    if (followingMatch[2]?.toLowerCase() === 'k') count *= 1000;
    if (followingMatch[2]?.toLowerCase() === 'm') count *= 1000000;
    result.followingCount = Math.round(count);
  }

  // Posts count
  const postsMatch = profileMd.match(/(\d+[,.]?\d*)\s*(K|M|k|m)?\s*(posts?|publicações?)/i);
  if (postsMatch) {
    let count = parseFloat(postsMatch[1].replace(/[,.]/g, ''));
    if (postsMatch[2]?.toLowerCase() === 'k') count *= 1000;
    result.postsCount = Math.round(count);
  }

  // Bio (first substantial text block)
  const lines = profileMd.split('\n').filter(l => l.length > 20 && l.length < 300 && !l.includes('http'));
  if (lines.length > 0) {
    result.bio = lines[0].trim();
  }

  // Determine content type based on keywords
  const lowerMd = profileMd.toLowerCase();
  if (lowerMd.includes('product') || lowerMd.includes('produto') || lowerMd.includes('shop')) {
    result.contentType = 'product';
  } else if (lowerMd.includes('team') || lowerMd.includes('corporate') || lowerMd.includes('empresa')) {
    result.contentType = 'corporate';
  } else {
    result.contentType = 'lifestyle';
  }

  // Activity level estimation
  if (result.postsCount && result.postsCount > 100) {
    result.activityLevel = 'high';
  } else if (result.postsCount && result.postsCount > 30) {
    result.activityLevel = 'medium';
  } else {
    result.activityLevel = 'low';
  }

  return result;
}

// Generate data suggestions
function generateDataSuggestions(
  linkedinData: any,
  facebookData: any,
  currentData: any
): DataSuggestion[] {
  const suggestions: DataSuggestion[] = [];

  if (linkedinData?.industry && linkedinData.industry !== currentData?.industry) {
    suggestions.push({
      field: 'industry',
      currentValue: currentData?.industry || null,
      suggestedValue: linkedinData.industry,
      source: 'LinkedIn',
    });
  }

  if (linkedinData?.website && linkedinData.website !== currentData?.website) {
    suggestions.push({
      field: 'website',
      currentValue: currentData?.website || null,
      suggestedValue: linkedinData.website,
      source: 'LinkedIn',
    });
  }

  if (linkedinData?.size && linkedinData.size !== currentData?.size) {
    suggestions.push({
      field: 'size',
      currentValue: currentData?.size || null,
      suggestedValue: linkedinData.size,
      source: 'LinkedIn',
    });
  }

  if (linkedinData?.employeeCount && linkedinData.employeeCount !== currentData?.employee_count) {
    suggestions.push({
      field: 'employee_count',
      currentValue: currentData?.employee_count?.toString() || null,
      suggestedValue: linkedinData.employeeCount.toString(),
      source: 'LinkedIn',
    });
  }

  return suggestions;
}

// Generate sales opportunities
function generateSalesOpportunities(
  linkedinData: any,
  facebookData: any,
  instagramData: any
): SalesOpportunity[] {
  const opportunities: SalesOpportunity[] = [];

  // Instagram opportunities
  if (!instagramData?.followersCount) {
    opportunities.push({
      type: 'missing_platform',
      severity: 'medium',
      title: 'Sem presença no Instagram',
      description: 'A empresa não tem perfil de Instagram ou não foi fornecido. Grande oportunidade para criar presença.',
      service: 'Gestão de Redes Sociais',
    });
  } else if (instagramData.activityLevel === 'low') {
    opportunities.push({
      type: 'inactive',
      severity: 'high',
      title: 'Instagram inativo',
      description: `Apenas ${instagramData.postsCount || 'poucos'} posts. Perfil inativo representa oportunidade de reativação.`,
      service: 'Gestão de Redes Sociais',
    });
  }

  // Facebook opportunities
  if (!facebookData?.followersCount) {
    opportunities.push({
      type: 'missing_platform',
      severity: 'low',
      title: 'Sem presença no Facebook',
      description: 'A empresa não tem página de Facebook ou não foi fornecida.',
      service: 'Criação de Página Facebook',
    });
  } else if (facebookData.activityLevel === 'low') {
    opportunities.push({
      type: 'inactive',
      severity: 'medium',
      title: 'Facebook com baixa atividade',
      description: 'Página com pouca atividade recente. Oportunidade para aumentar engagement.',
      service: 'Gestão de Redes Sociais',
    });
  }

  // LinkedIn opportunities
  if (linkedinData?.activityLevel === 'low') {
    opportunities.push({
      type: 'low_engagement',
      severity: 'medium',
      title: 'LinkedIn com pouco engagement',
      description: 'Atividade baixa no LinkedIn B2B. Oportunidade para estratégia de conteúdo.',
      service: 'Marketing de Conteúdo B2B',
    });
  }

  // General paid traffic opportunity
  if (facebookData?.followersCount > 1000 || instagramData?.followersCount > 1000) {
    opportunities.push({
      type: 'growth',
      severity: 'low',
      title: 'Potencial para tráfego pago',
      description: 'Audiência existente permite campanhas de retargeting e lookalike.',
      service: 'Tráfego Pago / Ads',
    });
  }

  // Low follower growth opportunity
  if ((facebookData?.followersCount && facebookData.followersCount < 500) ||
      (instagramData?.followersCount && instagramData.followersCount < 500)) {
    opportunities.push({
      type: 'growth',
      severity: 'medium',
      title: 'Baixo número de seguidores',
      description: 'Audiência pequena. Oportunidade para growth hacking e campanhas de awareness.',
      service: 'Growth / Campanhas de Awareness',
    });
  }

  return opportunities;
}

// Calculate digital maturity score
function calculateDigitalMaturity(
  linkedinData: any,
  facebookData: any,
  instagramData: any
): { score: number; level: 'low' | 'medium' | 'high'; reason: string } {
  let score = 0;
  const reasons: string[] = [];

  // LinkedIn (max 35 points)
  if (linkedinData?.followersCount > 1000) {
    score += 15;
    reasons.push('boa audiência LinkedIn');
  } else if (linkedinData?.followersCount > 100) {
    score += 8;
  }
  if (linkedinData?.activityLevel === 'high') {
    score += 20;
    reasons.push('ativo no LinkedIn');
  } else if (linkedinData?.activityLevel === 'medium') {
    score += 10;
  }

  // Facebook (max 30 points)
  if (facebookData?.followersCount > 1000) {
    score += 15;
    reasons.push('boa audiência Facebook');
  } else if (facebookData?.followersCount > 100) {
    score += 7;
  }
  if (facebookData?.activityLevel === 'high') {
    score += 15;
  } else if (facebookData?.activityLevel === 'medium') {
    score += 7;
  }

  // Instagram (max 35 points)
  if (instagramData?.followersCount > 1000) {
    score += 20;
    reasons.push('boa audiência Instagram');
  } else if (instagramData?.followersCount > 100) {
    score += 10;
  }
  if (instagramData?.activityLevel === 'high') {
    score += 15;
    reasons.push('ativo no Instagram');
  } else if (instagramData?.activityLevel === 'medium') {
    score += 7;
  }

  let level: 'low' | 'medium' | 'high';
  let reason: string;

  if (score >= 60) {
    level = 'high';
    reason = reasons.length > 0 ? `Empresa digitalmente madura: ${reasons.slice(0, 2).join(', ')}.` : 'Boa presença digital.';
  } else if (score >= 30) {
    level = 'medium';
    reason = 'Presença digital em desenvolvimento. Oportunidade para melhorias.';
  } else {
    level = 'low';
    reason = 'Baixa maturidade digital. Grande potencial para serviços de marketing digital.';
  }

  return { score, level, reason };
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body: AnalyzeRequest = await req.json();
    const { companyId, companyName, linkedinUrl, facebookUrl, instagramUrl, workspaceId, currentCompanyData } = body;

    if (!companyId || !workspaceId) {
      return new Response(
        JSON.stringify({ success: false, error: 'companyId and workspaceId are required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const apiKey = Deno.env.get('FIRECRAWL_API_KEY');
    if (!apiKey) {
      return new Response(
        JSON.stringify({ success: false, error: 'Firecrawl connector not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Starting complete social analysis for ${companyName}`);

    let linkedinData: any = null;
    let facebookData: any = null;
    let instagramData: any = null;

    // Scrape LinkedIn
    if (linkedinUrl) {
      const baseUrl = linkedinUrl.replace(/\/+$/, '').split('?')[0];
      
      const [aboutResult, peopleResult, postsResult] = await Promise.all([
        scrapePage(`${baseUrl}/about/`, apiKey),
        scrapePage(`${baseUrl}/people/`, apiKey),
        scrapePage(`${baseUrl}/posts/`, apiKey),
      ]);

      linkedinData = parseLinkedInData(
        aboutResult?.markdown || '',
        peopleResult?.markdown || '',
        postsResult?.markdown || ''
      );
      linkedinData.url = linkedinUrl;
    }

    // Rate limit between platforms
    await new Promise(resolve => setTimeout(resolve, 1000));

    // Scrape Facebook
    if (facebookUrl) {
      const baseUrl = facebookUrl.replace(/\/+$/, '').split('?')[0];
      
      const [mainResult, aboutResult] = await Promise.all([
        scrapePage(baseUrl, apiKey),
        scrapePage(`${baseUrl}/about_contact_and_basic_info`, apiKey),
      ]);

      facebookData = parseFacebookData(
        mainResult?.markdown || '',
        aboutResult?.markdown || ''
      );
      facebookData.url = facebookUrl;
    }

    // Rate limit between platforms
    await new Promise(resolve => setTimeout(resolve, 1000));

    // Scrape Instagram
    if (instagramUrl) {
      const profileResult = await scrapePage(instagramUrl, apiKey);
      if (profileResult) {
        instagramData = parseInstagramData(profileResult.markdown);
        instagramData.url = instagramUrl;
      }
    }

    // Generate insights
    const dataSuggestions = generateDataSuggestions(linkedinData, facebookData, currentCompanyData);
    const salesOpportunities = generateSalesOpportunities(linkedinData, facebookData, instagramData);
    const digitalMaturity = calculateDigitalMaturity(linkedinData, facebookData, instagramData);

    // Create Supabase client
    const { createClient } = await import('https://esm.sh/@supabase/supabase-js@2');
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Upsert LinkedIn data
    if (linkedinData) {
      await supabase.from('company_linkedin_data').upsert({
        company_id: companyId,
        workspace_id: workspaceId,
        linkedin_url: linkedinUrl,
        description: linkedinData.description,
        linkedin_industry: linkedinData.industry,
        company_size_range: linkedinData.size,
        headquarters: linkedinData.headquarters,
        linkedin_website: linkedinData.website,
        founded_year: linkedinData.founded,
        employee_count_linkedin: linkedinData.employeeCount,
        followers_count: linkedinData.followersCount,
        specialties: linkedinData.specialties,
        key_people: linkedinData.keyPeople,
        suggested_contacts: linkedinData.keyPeople,
        recent_posts: linkedinData.recentPosts,
        posting_frequency: linkedinData.activityLevel,
        posts_per_month: linkedinData.postsPerMonth,
        activity_level: linkedinData.activityLevel,
        engagement_score: linkedinData.engagementScore,
        data_suggestions: dataSuggestions,
        analysis_status: 'completed',
        analyzed_at: new Date().toISOString(),
      }, { onConflict: 'company_id' });
    }

    // Upsert Facebook data
    if (facebookData) {
      await supabase.from('company_facebook_data').upsert({
        company_id: companyId,
        workspace_id: workspaceId,
        facebook_url: facebookUrl,
        followers_count: facebookData.followersCount,
        likes_count: facebookData.likesCount,
        rating: facebookData.rating,
        reviews_count: facebookData.reviewsCount,
        about_text: facebookData.aboutText,
        page_category: facebookData.pageCategory,
        activity_level: facebookData.activityLevel,
        analysis_status: 'completed',
        analyzed_at: new Date().toISOString(),
      }, { onConflict: 'company_id' });
    }

    // Upsert Instagram data
    if (instagramData) {
      await supabase.from('company_instagram_data').upsert({
        company_id: companyId,
        workspace_id: workspaceId,
        instagram_url: instagramUrl,
        followers_count: instagramData.followersCount,
        following_count: instagramData.followingCount,
        posts_count: instagramData.postsCount,
        bio: instagramData.bio,
        content_type: instagramData.contentType,
        activity_level: instagramData.activityLevel,
        engagement_rate: instagramData.engagementRate,
        analysis_status: 'completed',
        analyzed_at: new Date().toISOString(),
      }, { onConflict: 'company_id' });
    }

    const result = {
      success: true,
      data: {
        linkedin: linkedinData,
        facebook: facebookData,
        instagram: instagramData,
        digitalMaturity,
        dataSuggestions,
        salesOpportunities,
        suggestedContacts: linkedinData?.keyPeople || [],
        analyzedAt: new Date().toISOString(),
      },
    };

    console.log('Complete social analysis finished successfully');

    return new Response(
      JSON.stringify(result),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error in complete social analysis:', error);
    return new Response(
      JSON.stringify({ success: false, error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});