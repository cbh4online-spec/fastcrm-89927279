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

  // Global search
  const searchUsers = async (query: string): Promise<{ results: IGSearchResult[]; usage: UsageStats }> => {
    setIsLoading(true);
    try {
      const response = await callAPI("search", { query });
      const items = response.data?.data?.items || [];
      return {
        results: items.map((item: any) => ({
          pk: item.pk || item.id,
          username: item.username,
          full_name: item.full_name || "",
          profile_pic_url: item.profile_pic_url || "",
          is_verified: item.is_verified || false,
          is_private: item.is_private || false,
          follower_count: item.follower_count,
        })),
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
      return {
        results: response.data?.data?.items || [],
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

      const { data, error } = await supabase
        .from("ig_profiles")
        .upsert({
          workspace_id: currentWorkspace.id,
          instagram_id: profile.pk || profile.id,
          username: profile.username,
          full_name: profile.full_name,
          biography: profile.biography,
          external_url: profile.external_url,
          profile_pic_url: profile.profile_pic_url || profile.profile_pic_url_hd,
          followers_count: profile.follower_count,
          following_count: profile.following_count,
          media_count: profile.media_count,
          is_business: profile.is_business_account,
          is_verified: profile.is_verified,
          category: profile.category,
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

  return {
    isMetodopare,
    isLoading,
    searchUsers,
    getProfile,
    getUserPosts,
    searchHashtag,
    searchLocation,
    todayUsage,
    refetchUsage,
    cachedProfiles,
    refetchProfiles,
    collections,
    refetchCollections,
    saveProfile,
    createCollection,
    addToCollection,
  };
}
