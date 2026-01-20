import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { toast } from "sonner";

export interface IGProfile {
  id: string;
  username: string;
  full_name: string | null;
  biography: string | null;
  external_url: string | null;
  profile_pic_url: string | null;
  followers_count: number | null;
  following_count: number | null;
  media_count: number | null;
  is_business: boolean | null;
  is_verified: boolean | null;
  category: string | null;
  city_name: string | null;
}

export interface IGSearchResult {
  pk: string;
  username: string;
  full_name: string;
  profile_pic_url: string;
  is_verified: boolean;
  is_private: boolean;
  follower_count?: number;
}

export interface IGProfileInsight {
  id: string;
  profile_id: string;
  is_individual: boolean | null;
  category_guess: string | null;
  specialty_guess: string | null;
  city_guess: string | null;
  works_at: string | null;
  contact_signals: string[] | null;
  confidence: number | null;
  reasons: string[] | null;
  red_flags: string[] | null;
  lead_score: number | null;
  lead_score_breakdown: {
    activity: number;
    clarity: number;
    location: number;
    contact: number;
    communication: number;
  } | null;
}

export interface IGCollection {
  id: string;
  name: string;
  description: string | null;
  color: string;
  icon: string;
  tags: string[] | null;
  items_count: number;
  created_at: string;
}

export interface UsageStats {
  actions_today: number;
  limit: number;
  remaining: number;
}

export function useInstagramLooter() {
  const { currentWorkspace } = useWorkspace();
  const queryClient = useQueryClient();
  const [isLoading, setIsLoading] = useState(false);

  const isMetodopare = currentWorkspace?.slug === "metodopare";

  // Helper to call the edge function
  const callAPI = async (action: string, params: Record<string, string> = {}) => {
    if (!currentWorkspace?.id) throw new Error("No workspace selected");
    if (!isMetodopare) throw new Error("Instagram Looter only available for metodopare");

    const { data: { session } } = await supabase.auth.getSession();
    if (!session) throw new Error("Not authenticated");

    const response = await supabase.functions.invoke("instagram-api-proxy", {
      body: {
        action,
        params,
        workspaceId: currentWorkspace.id,
      },
    });

    if (response.error) {
      throw new Error(response.error.message || "API request failed");
    }

    if (!response.data.success) {
      throw new Error(response.data.error || "API request failed");
    }

    return response.data;
  };

  // Call AI analysis edge function
  const callAIAnalysis = async (action: string, data: Record<string, any>) => {
    if (!currentWorkspace?.id) throw new Error("No workspace selected");

    const { data: { session } } = await supabase.auth.getSession();
    if (!session) throw new Error("Not authenticated");

    const response = await supabase.functions.invoke("instagram-ai-analyze", {
      body: {
        action,
        data,
        workspace_id: currentWorkspace.id,
      },
    });

    if (response.error) {
      throw new Error(response.error.message || "AI analysis failed");
    }

    if (!response.data.success) {
      throw new Error(response.data.error || "AI analysis failed");
    }

    return response.data;
  };

  // Global search
  const searchUsers = async (query: string): Promise<{ results: IGSearchResult[]; usage: UsageStats }> => {
    setIsLoading(true);
    try {
      const response = await callAPI("search", { query });
      // instagram-looter2 API returns { status, users: [...], places: [...], hashtags: [...] }
      const apiData = response.data?.data || response.data || {};
      const usersArray = apiData.users || apiData.items || [];
      const placesArray = apiData.places || [];
      
      // Parse users
      const userResults = usersArray.map((item: any) => {
        const userData = item.user || item;
        return {
          pk: userData.pk || userData.id,
          username: userData.username,
          full_name: userData.full_name || "",
          profile_pic_url: userData.profile_pic_url || "",
          is_verified: userData.is_verified || false,
          is_private: userData.is_private || false,
          follower_count: userData.follower_count,
        };
      });
      
      // Parse places as additional results (businesses/establishments)
      const placeResults = placesArray.map((item: any) => {
        const placeData = item.place || item;
        const location = placeData.location || {};
        return {
          pk: location.pk || location.facebook_places_id || `place_${item.position}`,
          username: placeData.title || location.name || "",
          full_name: placeData.subtitle || "",
          profile_pic_url: "",
          is_verified: false,
          is_private: false,
          follower_count: undefined,
          is_place: true, // Mark as place for UI differentiation
        };
      });
      
      return {
        results: [...userResults, ...placeResults],
        usage: response.usage,
      };
    } finally {
      setIsLoading(false);
    }
  };

  // Get profile details
  const getProfile = async (username: string): Promise<{ profile: any; usage: UsageStats }> => {
    setIsLoading(true);
    try {
      const response = await callAPI("profile", { username });
      return {
        profile: response.data?.data,
        usage: response.usage,
      };
    } finally {
      setIsLoading(false);
    }
  };

  // Get user posts
  const getUserPosts = async (username: string): Promise<{ posts: any[]; usage: UsageStats }> => {
    setIsLoading(true);
    try {
      const response = await callAPI("user_posts", { username });
      return {
        posts: response.data?.data?.items || [],
        usage: response.usage,
      };
    } finally {
      setIsLoading(false);
    }
  };

  // Search by hashtag
  const searchHashtag = async (hashtag: string): Promise<{ results: any[]; usage: UsageStats }> => {
    setIsLoading(true);
    try {
      const response = await callAPI("hashtag", { hashtag });
      return {
        results: response.data?.data?.items || [],
        usage: response.usage,
      };
    } finally {
      setIsLoading(false);
    }
  };

  // Search by location
  const searchLocation = async (query: string): Promise<{ results: any[]; usage: UsageStats }> => {
    setIsLoading(true);
    try {
      const response = await callAPI("location", { query });
      // instagram-looter2 API with select=places returns { places: [...] }
      const apiData = response.data?.data || response.data || {};
      const placesArray = apiData.places || apiData.items || [];
      
      // Parse places into a usable format
      const results = placesArray.map((item: any) => {
        const placeData = item.place || item;
        const location = placeData.location || {};
        return {
          pk: location.pk || location.facebook_places_id || `place_${item.position}`,
          name: placeData.title || location.name || "",
          title: placeData.title || location.name || "",
          subtitle: placeData.subtitle || "",
          address: location.address || location.short_name || "",
          city: location.city || "",
          lat: location.lat,
          lng: location.lng,
          external_id: location.external_id || location.external_id_source,
          media_count: location.media_count,
        };
      });
      
      return {
        results,
        usage: response.usage,
      };
    } finally {
      setIsLoading(false);
    }
  };

  // Get today's usage
  const { data: todayUsage, refetch: refetchUsage } = useQuery({
    queryKey: ["ig-looter-usage", currentWorkspace?.id],
    queryFn: async () => {
      if (!currentWorkspace?.id || !isMetodopare) return null;
      
      const today = new Date().toISOString().split('T')[0];
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return null;

      const { data } = await supabase
        .from("ig_looter_usage")
        .select("*")
        .eq("workspace_id", currentWorkspace.id)
        .eq("user_id", user.id)
        .eq("usage_date", today)
        .maybeSingle();

      return data;
    },
    enabled: !!currentWorkspace?.id && isMetodopare,
  });

  // Get recent searches
  const { data: recentSearches, refetch: refetchSearches } = useQuery({
    queryKey: ["ig-searches", currentWorkspace?.id],
    queryFn: async () => {
      if (!currentWorkspace?.id || !isMetodopare) return [];

      const { data, error } = await supabase
        .from("ig_searches")
        .select("*")
        .eq("workspace_id", currentWorkspace.id)
        .order("created_at", { ascending: false })
        .limit(50);

      if (error) throw error;
      return data || [];
    },
    enabled: !!currentWorkspace?.id && isMetodopare,
  });

  // Get cached profiles
  const { data: cachedProfiles, refetch: refetchProfiles } = useQuery({
    queryKey: ["ig-profiles", currentWorkspace?.id],
    queryFn: async () => {
      if (!currentWorkspace?.id || !isMetodopare) return [];

      const { data, error } = await supabase
        .from("ig_profiles")
        .select("*")
        .eq("workspace_id", currentWorkspace.id)
        .order("created_at", { ascending: false })
        .limit(100);

      if (error) throw error;
      return data || [];
    },
    enabled: !!currentWorkspace?.id && isMetodopare,
  });

  // Get collections
  const { data: collections, refetch: refetchCollections } = useQuery({
    queryKey: ["ig-collections", currentWorkspace?.id],
    queryFn: async () => {
      if (!currentWorkspace?.id || !isMetodopare) return [];

      const { data, error } = await supabase
        .from("ig_collections")
        .select("*")
        .eq("workspace_id", currentWorkspace.id)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data || [];
    },
    enabled: !!currentWorkspace?.id && isMetodopare,
  });

  // Save profile to cache
  const saveProfile = useMutation({
    mutationFn: async (profile: any) => {
      if (!currentWorkspace?.id) throw new Error("No workspace");

      // Handle different API response structures
      const instagramId = profile.pk || profile.id || profile.username;
      const followersCount = profile.follower_count || profile.edge_followed_by?.count || null;
      const followingCount = profile.following_count || profile.edge_follow?.count || null;
      const mediaCount = profile.media_count || profile.edge_owner_to_timeline_media?.count || null;
      const isBusiness = profile.is_business_account || profile.is_business || false;
      const profilePicUrl = profile.profile_pic_url_hd || profile.profile_pic_url || null;
      
      const { data, error } = await supabase
        .from("ig_profiles")
        .upsert({
          workspace_id: currentWorkspace.id,
          instagram_id: String(instagramId),
          username: profile.username,
          full_name: profile.full_name || null,
          biography: profile.biography || null,
          external_url: profile.external_url || null,
          profile_pic_url: profilePicUrl,
          followers_count: followersCount,
          following_count: followingCount,
          media_count: mediaCount,
          is_business: isBusiness,
          is_verified: profile.is_verified || false,
          category: profile.category_name || profile.category || null,
          raw_data: profile,
          last_fetched_at: new Date().toISOString(),
        }, {
          onConflict: "workspace_id,username"
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["ig-profiles"] });
      toast.success("Perfil guardado");
    },
    onError: (error) => {
      toast.error(`Erro ao guardar perfil: ${error.message}`);
    }
  });

  // Create collection
  const createCollection = useMutation({
    mutationFn: async ({ name, description, color, icon, tags }: {
      name: string;
      description?: string;
      color?: string;
      icon?: string;
      tags?: string[];
    }) => {
      if (!currentWorkspace?.id) throw new Error("No workspace");
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const { data, error } = await supabase
        .from("ig_collections")
        .insert({
          workspace_id: currentWorkspace.id,
          name,
          description,
          color: color || "#6366f1",
          icon: icon || "folder",
          tags,
          created_by: user.id,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["ig-collections"] });
      toast.success("Coleção criada");
    },
    onError: (error) => {
      toast.error(`Erro ao criar coleção: ${error.message}`);
    }
  });

  // Add profile to collection
  const addToCollection = useMutation({
    mutationFn: async ({ collectionId, profileId, notes, tags }: {
      collectionId: string;
      profileId: string;
      notes?: string;
      tags?: string[];
    }) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const { data, error } = await supabase
        .from("ig_collection_items")
        .insert({
          collection_id: collectionId,
          item_type: "profile",
          profile_id: profileId,
          notes,
          tags,
          added_by: user.id,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["ig-collections"] });
      toast.success("Adicionado à coleção");
    },
    onError: (error) => {
      toast.error(`Erro: ${error.message}`);
    }
  });

  // Analyze profile with AI
  const analyzeProfile = async (profileData: {
    username: string;
    full_name?: string;
    biography?: string;
    external_url?: string;
    followers_count?: number;
    following_count?: number;
    media_count?: number;
    is_business?: boolean;
    is_verified?: boolean;
    category?: string;
    recent_captions?: string[];
    recent_hashtags?: string[];
    city_name?: string;
  }) => {
    setIsLoading(true);
    try {
      const response = await callAIAnalysis("analyze_profile", profileData);
      return response.data;
    } finally {
      setIsLoading(false);
    }
  };

  // Analyze media with AI
  const analyzeMedia = async (mediaData: {
    caption: string;
    hashtags?: string[];
    posted_at?: string;
    niche_context?: string;
  }) => {
    setIsLoading(true);
    try {
      const response = await callAIAnalysis("analyze_media", mediaData);
      return response.data;
    } finally {
      setIsLoading(false);
    }
  };

  return {
    isMetodopare,
    isLoading,
    searchUsers,
    getProfile,
    getUserPosts,
    searchHashtag,
    searchLocation,
    analyzeProfile,
    analyzeMedia,
    todayUsage,
    refetchUsage,
    recentSearches,
    refetchSearches,
    cachedProfiles,
    refetchProfiles,
    collections,
    refetchCollections,
    saveProfile,
    createCollection,
    addToCollection,
  };
}
