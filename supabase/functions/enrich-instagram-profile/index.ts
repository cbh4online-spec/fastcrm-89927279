import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const logStep = (step: string, details?: unknown) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[ENRICH-INSTAGRAM] ${step}${detailsStr}`);
};

// RapidAPI Instagram Looter2 endpoint
const RAPIDAPI_HOST = "instagram-looter2.p.rapidapi.com";
const RAPIDAPI_URL = `https://${RAPIDAPI_HOST}`;

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseClient = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    { auth: { persistSession: false } }
  );

  try {
    logStep("Function started");

    // Authenticate user
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("No authorization header provided");

    const token = authHeader.replace("Bearer ", "");
    const { data: userData, error: userError } = await supabaseClient.auth.getUser(token);
    if (userError) throw new Error(`Authentication error: ${userError.message}`);
    
    const user = userData.user;
    if (!user?.id) throw new Error("User not authenticated");
    logStep("User authenticated", { userId: user.id });

    // Parse request body
    const { profileId, username, workspaceId } = await req.json();
    if (!username || !workspaceId) {
      throw new Error("Missing required parameters: username, workspaceId");
    }

    logStep("Enriching profile", { profileId, username });

    // Get RapidAPI key
    const rapidApiKey = Deno.env.get("RAPIDAPI_KEY");
    if (!rapidApiKey) {
      throw new Error("RapidAPI key not configured");
    }

    // Fetch Instagram profile data
    const url = `${RAPIDAPI_URL}/profile?username=${encodeURIComponent(username)}`;
    logStep("Fetching from Instagram API", { url });

    const apiResponse = await fetch(url, {
      method: "GET",
      headers: {
        "X-RapidAPI-Key": rapidApiKey,
        "X-RapidAPI-Host": RAPIDAPI_HOST,
      },
    });

    if (!apiResponse.ok) {
      const errorText = await apiResponse.text();
      logStep("API error", { status: apiResponse.status, error: errorText });
      throw new Error(`Instagram API error: ${apiResponse.status}`);
    }

    const apiData = await apiResponse.json();
    logStep("API response received", { hasData: !!apiData });

    // Extract profile data - handle various response structures
    const profileData = apiData.data || apiData;
    
    // Parse followers/following/posts count from various API response formats
    const followersCount = profileData.follower_count || 
                          profileData.edge_followed_by?.count || 
                          null;
    const followingCount = profileData.following_count || 
                          profileData.edge_follow?.count || 
                          null;
    const postsCount = profileData.media_count || 
                      profileData.edge_owner_to_timeline_media?.count || 
                      null;
    const fullBio = profileData.biography || null;
    const externalUrl = profileData.external_url || null;
    const category = profileData.category_name || profileData.category || null;
    const isVerified = profileData.is_verified || false;
    const isBusiness = profileData.is_business_account || profileData.is_professional_account || false;
    const fullName = profileData.full_name || null;
    const profilePicUrl = profileData.profile_pic_url_hd || profileData.profile_pic_url || null;

    logStep("Parsed profile data", {
      followers: followersCount,
      following: followingCount,
      posts: postsCount,
      bio: fullBio?.substring(0, 50),
      category,
    });

    // Update the professional_prospecting_profiles table if profileId provided
    if (profileId) {
      const { error: updateError } = await supabaseClient
        .from("professional_prospecting_profiles")
        .update({
          instagram_followers_count: followersCount,
          instagram_following_count: followingCount,
          instagram_posts_count: postsCount,
          instagram_full_bio: fullBio,
          instagram_external_url: externalUrl,
          instagram_category: category,
          instagram_is_verified: isVerified,
          instagram_is_business: isBusiness,
          instagram_enriched_at: new Date().toISOString(),
          instagram_raw_data: profileData,
          // Also update profile data if missing
          profile_name: fullName || undefined,
          profile_bio: fullBio || undefined,
          profile_image_url: profilePicUrl || undefined,
        })
        .eq("id", profileId);

      if (updateError) {
        logStep("Error updating profile", { error: updateError.message });
        throw new Error(`Failed to update profile: ${updateError.message}`);
      }

      logStep("Profile updated successfully");
    }

    return new Response(JSON.stringify({
      success: true,
      data: {
        username,
        fullName,
        followers: followersCount,
        following: followingCount,
        posts: postsCount,
        bio: fullBio,
        externalUrl,
        category,
        isVerified,
        isBusiness,
        profilePicUrl,
      }
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logStep("ERROR", { message: errorMessage });
    return new Response(JSON.stringify({ 
      success: false,
      error: errorMessage,
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 400,
    });
  }
});
