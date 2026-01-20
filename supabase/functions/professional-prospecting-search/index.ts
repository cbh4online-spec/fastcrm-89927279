import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface Profile {
  profileUrl: string;
  profileName: string;
  profileBio: string | null;
  source: string;
  sourceTitle: string;
  platform: "instagram" | "facebook";
}

// Generate Instagram search queries
function generateInstagramQueries(profession: string, location: string | null, keywords: string | null): string[] {
  const queries: string[] = [];
  const professionLower = profession.toLowerCase();
  
  // Map common professions to variations and related terms
  const professionVariations: Record<string, string[]> = {
    "médico dentista": ["dentista", "odontologista", "médico dentista", "cirurgião dentista", "dental"],
    "medico dentista": ["dentista", "odontologista", "médico dentista", "cirurgião dentista", "dental"],
    "dentista": ["dentista", "odontologista", "médico dentista", "cirurgião dentista"],
    "cabeleireiro": ["cabeleireiro", "cabeleireira", "hairstylist", "hair stylist", "cabelo"],
    "cabeleireira": ["cabeleireira", "cabeleireiro", "hairstylist", "hair stylist", "cabelo"],
    "esteticista": ["esteticista", "estética", "beauty", "beleza", "skin care"],
    "médico": ["médico", "dr.", "dra.", "doctor", "medicina"],
    "advogado": ["advogado", "advogada", "lawyer", "jurídico", "direito"],
    "arquiteto": ["arquiteto", "arquiteta", "architect", "arquitetura"],
    "personal trainer": ["personal trainer", "personal", "fitness", "gym", "treino"],
    "nutricionista": ["nutricionista", "nutrição", "nutri", "nutrition"],
    "psicólogo": ["psicólogo", "psicóloga", "psicologo", "psicologa", "psicologia", "terapeuta"],
    "fisioterapeuta": ["fisioterapeuta", "fisioterapia", "physio", "reabilitação"],
    "massagista": ["massagista", "massagem", "massage", "spa", "terapeuta"],
    "maquilhador": ["maquilhador", "maquilhadora", "makeup artist", "maquilhagem", "makeup"],
    "fotógrafo": ["fotógrafo", "fotógrafa", "photographer", "fotografia", "photo"],
  };

  // Get variations for the profession
  let variations = [profession];
  for (const [key, vals] of Object.entries(professionVariations)) {
    if (professionLower.includes(key) || key.includes(professionLower)) {
      variations = [...new Set([...variations, ...vals])];
      break;
    }
  }

  // Location variations for Portugal
  const locationStr = location || "";
  const locationParts = locationStr ? [locationStr, "Portugal"] : ["Portugal"];
  
  // Strategy 1: Direct Instagram site search with profession
  for (const variant of variations.slice(0, 3)) {
    queries.push(`site:instagram.com "${variant}" ${locationParts.join(" ")}`);
  }
  
  // Strategy 2: Search for professionals with Instagram mentions
  queries.push(`"${profession}" instagram ${locationParts.join(" ")}`);
  
  // Strategy 3: Search with keywords if provided
  if (keywords) {
    queries.push(`site:instagram.com "${profession}" ${keywords} ${locationStr}`);
    queries.push(`"${profession}" "${keywords}" instagram ${locationStr}`);
  }
  
  // Strategy 4: Bio-style searches
  for (const variant of variations.slice(0, 2)) {
    queries.push(`site:instagram.com "${variant}" "📍" ${locationStr || "Portugal"}`);
    queries.push(`site:instagram.com "${variant}" clínica ${locationStr || ""}`);
  }

  // Return unique queries (max 6 to avoid too many API calls)
  return [...new Set(queries)].slice(0, 6);
}

// Generate Facebook search queries
function generateFacebookQueries(profession: string, location: string | null, keywords: string | null): string[] {
  const queries: string[] = [];
  const locationStr = location || "Portugal";
  
  // Facebook business pages
  queries.push(`site:facebook.com "${profession}" ${locationStr}`);
  queries.push(`site:facebook.com/pages "${profession}" ${locationStr}`);
  queries.push(`site:facebook.com "${profession}" clínica ${locationStr}`);
  queries.push(`site:facebook.com "${profession}" consultório ${locationStr}`);
  
  // With keywords if available
  if (keywords) {
    queries.push(`site:facebook.com "${profession}" ${keywords} ${locationStr}`);
  }
  
  // Professional services
  queries.push(`site:facebook.com "dr." "${profession}" ${locationStr}`);
  queries.push(`site:facebook.com "dra." "${profession}" ${locationStr}`);
  
  return [...new Set(queries)].slice(0, 4);
}

// Extract Instagram profiles from search results
function extractInstagramProfiles(results: any[], seenUrls: Set<string>): Profile[] {
  const profiles: Profile[] = [];
  const skipUsernames = new Set(["p", "reel", "reels", "stories", "explore", "accounts", "direct", "tv", "about", "legal", "help", "privacy", "safety", "instagram"]);

  for (const result of results) {
    const url = result.url || "";
    const title = result.title || "";
    const description = result.description || "";
    const markdown = result.markdown || "";
    
    // Strategy 1: Direct Instagram profile URLs
    const directMatch = url.match(/instagram\.com\/([a-zA-Z0-9._]{1,30})\/?(?:\?|$)/);
    if (directMatch) {
      const username = directMatch[1].toLowerCase();
      if (!skipUsernames.has(username)) {
        const profileUrl = `https://www.instagram.com/${username}`;
        if (!seenUrls.has(profileUrl)) {
          seenUrls.add(profileUrl);
          profiles.push({
            profileUrl,
            profileName: username,
            profileBio: description || null,
            source: url,
            sourceTitle: title,
            platform: "instagram"
          });
        }
      }
    }
    
    // Strategy 2: Extract from content/markdown
    const content = `${markdown} ${description} ${title}`;
    const contentMatches = content.matchAll(/(?:instagram\.com\/|@)([a-zA-Z0-9._]{3,30})(?:\s|$|[,\.\!\?\)])/g);
    
    for (const match of contentMatches) {
      const username = match[1].toLowerCase();
      if (!skipUsernames.has(username) && !username.startsWith("p/") && !username.startsWith("reel")) {
        const profileUrl = `https://www.instagram.com/${username}`;
        if (!seenUrls.has(profileUrl)) {
          seenUrls.add(profileUrl);
          profiles.push({
            profileUrl,
            profileName: username,
            profileBio: null,
            source: url,
            sourceTitle: title,
            platform: "instagram"
          });
        }
      }
    }
  }

  return profiles;
}

// Clean Facebook page title by removing common suffixes
function cleanFacebookTitle(title: string): string {
  if (!title) return "";
  return title
    .replace(/\s*[-|–]\s*(Facebook|Página inicial|Homepage|Home|Page|Posts|Fotos|Photos|About|Sobre|Publicações|Vídeos|Videos).*$/i, "")
    .replace(/\s*[-|–]\s*होम पेज.*$/i, "") // Hindi suffix
    .replace(/\s*\|\s*Facebook$/i, "")
    .replace(/\s*-\s*Home$/i, "")
    .replace(/\s*·\s*Facebook$/i, "")
    .trim();
}

// Extract Facebook profiles from search results
function extractFacebookProfiles(results: any[], seenUrls: Set<string>): Profile[] {
  const profiles: Profile[] = [];
  const skipPaths = new Set([
    "groups", "events", "marketplace", "gaming", "watch", "help", "policies", 
    "login", "register", "recover", "privacy", "terms", "settings", "notifications",
    "messages", "friends", "photos", "videos", "about", "community", "ads", "business"
  ]);

  for (const result of results) {
    const url = result.url || "";
    const title = result.title || "";
    const description = result.description || "";
    
    // Match Facebook page URLs: facebook.com/PageName or facebook.com/pages/category/PageName
    // Also match profile URLs: facebook.com/profile.php?id=123
    
    // Strategy 1: Direct page URLs
    const pageMatch = url.match(/facebook\.com\/([a-zA-Z0-9._-]+)\/?(?:\?|$)/);
    if (pageMatch) {
      const pageName = pageMatch[1];
      if (!skipPaths.has(pageName.toLowerCase()) && !pageName.startsWith("pages")) {
        const profileUrl = `https://www.facebook.com/${pageName}`;
        if (!seenUrls.has(profileUrl)) {
          seenUrls.add(profileUrl);
          
          // Determine the display name - use title if pageName is numeric ID
          let displayName: string;
          const isNumericId = /^\d+$/.test(pageName);
          
          if (isNumericId && title) {
            // Use cleaned title for numeric IDs
            displayName = cleanFacebookTitle(title);
          } else {
            // Use page name from URL, formatting it nicely
            displayName = pageName.replace(/[.-]/g, " ");
          }
          
          profiles.push({
            profileUrl,
            profileName: displayName || pageName,
            profileBio: description || null,
            source: url,
            sourceTitle: title,
            platform: "facebook"
          });
        }
      }
    }
    
    // Strategy 2: Pages directory URLs
    const pagesMatch = url.match(/facebook\.com\/pages\/[^\/]+\/([a-zA-Z0-9._-]+)/);
    if (pagesMatch) {
      const pageName = pagesMatch[1];
      const profileUrl = `https://www.facebook.com/${pageName}`;
      if (!seenUrls.has(profileUrl)) {
        seenUrls.add(profileUrl);
        
        // For /pages/ URLs, prefer the title as name (usually has real page name)
        const isNumericId = /^\d+$/.test(pageName);
        const displayName = (isNumericId && title) 
          ? cleanFacebookTitle(title) 
          : pageName.replace(/-/g, " ");
        
        profiles.push({
          profileUrl,
          profileName: displayName || pageName,
          profileBio: description || null,
          source: url,
          sourceTitle: title,
          platform: "facebook"
        });
      }
    }
  }

  return profiles;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { profession, location, keywords, workspaceId, userId, platforms = ["instagram"] } = await req.json();

    if (!profession) {
      return new Response(
        JSON.stringify({ success: false, error: "Profession is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!workspaceId || !userId) {
      return new Response(
        JSON.stringify({ success: false, error: "Workspace and user ID are required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const FIRECRAWL_API_KEY = Deno.env.get("FIRECRAWL_API_KEY");
    if (!FIRECRAWL_API_KEY) {
      return new Response(
        JSON.stringify({ success: false, error: "Firecrawl connector not configured. Please enable it in settings." }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Check usage limits
    const { data: usage, error: usageError } = await supabase.rpc(
      "get_or_create_prospecting_usage",
      { p_workspace_id: workspaceId }
    );

    if (usageError) {
      console.error("Error getting usage:", usageError);
      return new Response(
        JSON.stringify({ success: false, error: "Failed to check usage limits" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (usage.searches_count >= usage.searches_limit) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: "Monthly search limit reached",
          usage: {
            searches: usage.searches_count,
            limit: usage.searches_limit
          }
        }),
        { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Create search record with platforms
    const { data: search, error: searchError } = await supabase
      .from("professional_prospecting_searches")
      .insert({
        workspace_id: workspaceId,
        created_by: userId,
        profession,
        location,
        keywords: keywords ? keywords.split(",").map((k: string) => k.trim()) : null,
        search_type: "web",
        status: "processing",
        platforms: platforms
      })
      .select()
      .single();

    if (searchError) {
      console.error("Error creating search:", searchError);
      return new Response(
        JSON.stringify({ success: false, error: "Failed to create search record" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Generate search queries per platform
    const allQueries: Array<{query: string, platform: "instagram" | "facebook"}> = [];
    
    if (platforms.includes("instagram")) {
      generateInstagramQueries(profession, location, keywords)
        .forEach(q => allQueries.push({query: q, platform: "instagram"}));
    }
    
    if (platforms.includes("facebook")) {
      generateFacebookQueries(profession, location, keywords)
        .forEach(q => allQueries.push({query: q, platform: "facebook"}));
    }

    console.log("Search queries:", allQueries.map(q => `[${q.platform}] ${q.query}`));

    const allProfiles: Profile[] = [];
    const seenUrls = new Set<string>();
    let totalResults = 0;

    // Execute multiple searches in parallel (max 3 at a time to avoid rate limits)
    const batchSize = 3;
    for (let i = 0; i < allQueries.length && allProfiles.length < 50; i += batchSize) {
      const batch = allQueries.slice(i, i + batchSize);
      
      const batchPromises = batch.map(async ({query, platform}) => {
        try {
          console.log(`Executing [${platform}] query:`, query);
          const response = await fetch("https://api.firecrawl.dev/v1/search", {
            method: "POST",
            headers: {
              Authorization: `Bearer ${FIRECRAWL_API_KEY}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              query,
              limit: 20,
              lang: "pt",
              country: "PT",
              scrapeOptions: {
                formats: ["markdown"]
              }
            }),
          });

          if (!response.ok) {
            console.error(`Query failed: ${query}`, response.status);
            return { results: [], platform };
          }

          const data = await response.json();
          return { results: data.data || [], platform };
        } catch (err) {
          console.error(`Query error: ${query}`, err);
          return { results: [], platform };
        }
      });

      const batchResults = await Promise.all(batchPromises);
      
      for (const {results, platform} of batchResults) {
        totalResults += results.length;
        
        // Extract profiles based on platform
        if (platform === "instagram") {
          const newProfiles = extractInstagramProfiles(results, seenUrls);
          allProfiles.push(...newProfiles);
        } else if (platform === "facebook") {
          const newProfiles = extractFacebookProfiles(results, seenUrls);
          allProfiles.push(...newProfiles);
        }
        
        if (allProfiles.length >= 50) break;
      }
    }

    console.log(`Total search results: ${totalResults}, Profiles extracted: ${allProfiles.length}`);

    // Limit to 50 profiles
    const finalProfiles = allProfiles.slice(0, 50);

    // Update search record with results count
    await supabase
      .from("professional_prospecting_searches")
      .update({ 
        status: "completed", 
        results_count: finalProfiles.length,
        completed_at: new Date().toISOString()
      })
      .eq("id", search.id);

    // Update usage count
    await supabase
      .from("professional_prospecting_usage")
      .update({ 
        searches_count: usage.searches_count + 1,
        updated_at: new Date().toISOString()
      })
      .eq("id", usage.id);

    return new Response(
      JSON.stringify({
        success: true,
        searchId: search.id,
        profiles: finalProfiles,
        count: finalProfiles.length,
        queriesExecuted: allQueries.length,
        platforms,
        usage: {
          searches: usage.searches_count + 1,
          limit: usage.searches_limit
        }
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("Error in professional-prospecting-search:", error);
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error instanceof Error ? error.message : "Unknown error" 
      }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
