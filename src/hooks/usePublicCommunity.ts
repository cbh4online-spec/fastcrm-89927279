import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export function usePublicCommunitySettings(slug: string | undefined) {
  return useQuery({
    queryKey: ["public-community-settings", slug],
    queryFn: async () => {
      if (!slug) return null;
      const { data, error } = await supabase
        .from("community_settings")
        .select("*")
        .eq("slug", slug)
        .eq("is_discoverable", true)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!slug,
  });
}

export function usePublicCommunityTopics(workspaceId: string | undefined) {
  return useQuery({
    queryKey: ["public-community-topics", workspaceId],
    queryFn: async () => {
      if (!workspaceId) return [];
      const { data, error } = await supabase
        .from("forum_topics")
        .select("*, forum_categories(name, icon, color)")
        .eq("workspace_id", workspaceId)
        .order("is_pinned", { ascending: false })
        .order("created_at", { ascending: false })
        .limit(20);
      if (error) throw error;
      return data || [];
    },
    enabled: !!workspaceId,
  });
}

export function usePublicCommunityCategories(workspaceId: string | undefined) {
  return useQuery({
    queryKey: ["public-community-categories", workspaceId],
    queryFn: async () => {
      if (!workspaceId) return [];
      const { data, error } = await supabase
        .from("forum_categories")
        .select("*")
        .eq("workspace_id", workspaceId)
        .order("sort_order");
      if (error) throw error;
      return data || [];
    },
    enabled: !!workspaceId,
  });
}

export function usePublicCommunityEvents(workspaceId: string | undefined) {
  return useQuery({
    queryKey: ["public-community-events", workspaceId],
    queryFn: async () => {
      if (!workspaceId) return [];
      const { data, error } = await supabase
        .from("community_events")
        .select("*")
        .eq("workspace_id", workspaceId)
        .gte("event_date", new Date().toISOString())
        .order("event_date")
        .limit(5);
      if (error) throw error;
      return data || [];
    },
    enabled: !!workspaceId,
  });
}

export function usePublicTopicDetail(topicId: string | undefined) {
  return useQuery({
    queryKey: ["public-topic-detail", topicId],
    queryFn: async () => {
      if (!topicId) return null;
      const { data, error } = await supabase
        .from("forum_topics")
        .select("*, forum_categories(name, icon, color)")
        .eq("id", topicId)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!topicId,
  });
}

export function usePublicTopicPosts(topicId: string | undefined) {
  return useQuery({
    queryKey: ["public-topic-posts", topicId],
    queryFn: async () => {
      if (!topicId) return [];
      const { data, error } = await supabase
        .from("forum_posts")
        .select("*")
        .eq("topic_id", topicId)
        .order("created_at");
      if (error) throw error;
      return data || [];
    },
    enabled: !!topicId,
  });
}

export function usePublicCommunityMembers(workspaceId: string | undefined) {
  return useQuery({
    queryKey: ["public-community-members", workspaceId],
    queryFn: async () => {
      if (!workspaceId) return [];
      const { data: members, error } = await supabase
        .from("workspace_members")
        .select("id, user_id, role, created_at")
        .eq("workspace_id", workspaceId)
        .order("created_at", { ascending: true });
      if (error) throw error;
      if (!members || members.length === 0) return [];

      const userIds = members.map((m) => m.user_id);
      const { data: profiles } = await supabase
        .from("profiles")
        .select("user_id, full_name, avatar_url")
        .in("user_id", userIds);
      const profileMap = new Map(profiles?.map((p) => [p.user_id, p]));

      return members.map((m) => ({
        ...m,
        profile: profileMap.get(m.user_id) || null,
      }));
    },
    enabled: !!workspaceId,
  });
}

export function usePublicCommunityLinks(workspaceId: string | undefined) {
  return useQuery({
    queryKey: ["public-community-links", workspaceId],
    queryFn: async () => {
      if (!workspaceId) return [];
      const { data, error } = await supabase
        .from("community_links")
        .select("*")
        .eq("workspace_id", workspaceId)
        .order("sort_order");
      if (error) throw error;
      return data || [];
    },
    enabled: !!workspaceId,
  });
}
