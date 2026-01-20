import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

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

    // Build search query for Instagram profiles - more specific query
    const queryParts = [`site:instagram.com "${profession}"`];
    if (location) queryParts.push(location);
    if (keywords) queryParts.push(keywords);
    
    const searchQuery = queryParts.join(" ");
    console.log("Searching for:", searchQuery);

    // Use Firecrawl to search
    const firecrawlResponse = await fetch("https://api.firecrawl.dev/v1/search", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${FIRECRAWL_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        query: searchQuery,
        limit: 50,
        lang: "pt",
        country: "PT",
        scrapeOptions: {
          formats: ["markdown"]
        }
      }),
    });

    if (!firecrawlResponse.ok) {
      const errorText = await firecrawlResponse.text();
      console.error("Firecrawl error:", firecrawlResponse.status, errorText);
      
      // Update search status to failed
      await supabase
        .from("professional_prospecting_searches")
        .update({ status: "failed", error_message: `Search failed: ${firecrawlResponse.status}` })
        .eq("id", search.id);

      return new Response(
        JSON.stringify({ success: false, error: "Web search failed" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const searchResults = await firecrawlResponse.json();
    console.log("Search results count:", searchResults.data?.length || 0);

    // Extract Instagram profiles from search results
    const profiles: any[] = [];
    const seenUrls = new Set<string>();

    for (const result of searchResults.data || []) {
      const url = result.url || "";
      const title = result.title || "";
      const description = result.description || "";
      const markdown = result.markdown || "";
      
      // Check if this is an Instagram profile URL (not a post or reel)
      const instagramProfileMatch = url.match(/instagram\.com\/([a-zA-Z0-9._]+)\/?$/);
      
      if (instagramProfileMatch) {
        const username = instagramProfileMatch[1];
        // Skip common non-profile pages
        if (["p", "reel", "reels", "stories", "explore", "accounts", "direct", "tv"].includes(username)) {
          continue;
        }
        
        const profileUrl = `https://www.instagram.com/${username}`;
        if (!seenUrls.has(profileUrl)) {
          seenUrls.add(profileUrl);
          
          // Extract bio/description from the result
          const bio = description || (markdown ? markdown.substring(0, 300) : null);
          
          profiles.push({
            profileUrl,
            profileName: username,
            profileBio: bio,
            source: url,
            sourceTitle: title
          });
        }
      } else {
        // Try to find Instagram profile URLs in the content
        const contentMatches = (markdown + " " + description).match(/instagram\.com\/([a-zA-Z0-9._]+)/g) || [];
        
        for (const match of contentMatches) {
          const usernameMatch = match.match(/instagram\.com\/([a-zA-Z0-9._]+)/);
          if (usernameMatch) {
            const username = usernameMatch[1];
            // Skip non-profile pages
            if (["p", "reel", "reels", "stories", "explore", "accounts", "direct", "tv"].includes(username)) {
              continue;
            }
            
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

      // Limit to 50 profiles max
      if (profiles.length >= 50) break;
    }
    
    console.log("Profiles extracted:", profiles.length);

    // Update search record with results count
    await supabase
      .from("professional_prospecting_searches")
      .update({ 
        status: "completed", 
        results_count: profiles.length,
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
        profiles,
        count: profiles.length,
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
