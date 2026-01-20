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
}

// Generate multiple search queries for better coverage
function generateSearchQueries(profession: string, location: string | null, keywords: string | null): string[] {
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

// Extract Instagram profiles from search results
function extractProfiles(results: any[], seenUrls: Set<string>): Profile[] {
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
            sourceTitle: title
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
            sourceTitle: title
          });
        }
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
    const { profession, location, keywords, workspaceId, userId } = await req.json();

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

    // Create search record
    const { data: search, error: searchError } = await supabase
      .from("professional_prospecting_searches")
      .insert({
        workspace_id: workspaceId,
        created_by: userId,
        profession,
        location,
        keywords: keywords ? keywords.split(",").map((k: string) => k.trim()) : null,
        search_type: "web",
        status: "processing"
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

    // Generate multiple search queries for better coverage
    const searchQueries = generateSearchQueries(profession, location, keywords);
    console.log("Search queries:", searchQueries);

    const allProfiles: Profile[] = [];
    const seenUrls = new Set<string>();
    let totalResults = 0;

    // Execute multiple searches in parallel (max 3 at a time to avoid rate limits)
    const batchSize = 3;
    for (let i = 0; i < searchQueries.length && allProfiles.length < 50; i += batchSize) {
      const batch = searchQueries.slice(i, i + batchSize);
      
      const batchPromises = batch.map(async (query) => {
        try {
          console.log("Executing query:", query);
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
            return [];
          }

          const data = await response.json();
          return data.data || [];
        } catch (err) {
          console.error(`Query error: ${query}`, err);
          return [];
        }
      });

      const batchResults = await Promise.all(batchPromises);
      
      for (const results of batchResults) {
        totalResults += results.length;
        const newProfiles = extractProfiles(results, seenUrls);
        allProfiles.push(...newProfiles);
        
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
        queriesExecuted: searchQueries.length,
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
