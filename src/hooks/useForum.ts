import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { emitKernelEvent } from "@/lib/kernelEmitter";

export interface ForumCategory {
  id: string;
  workspace_id: string;
  name: string;
  slug: string;
  description: string | null;
  icon: string | null;
  sort_order: number;
}

export interface ForumTopic {
  id: string;
  workspace_id: string;
  category_id: string | null;
  author_id: string;
  title: string;
  content: string;
  is_pinned: boolean;
  is_locked: boolean;
  views_count: number;
  replies_count: number;
  moderation_status: string;
  comments_enabled: boolean;
  created_at: string;
  updated_at: string;
  author_name?: string;
  author_avatar?: string | null;
}

export interface ForumPost {
  id: string;
  workspace_id: string;
  topic_id: string;
  author_id: string;
  content: string;
  is_best_answer: boolean;
  moderation_status: string;
  created_at: string;
  author_name?: string;
  author_avatar?: string | null;
}

export interface ForumReactionCount {
  reaction_type: string;
  count: number;
}

async function enrichWithProfiles<T extends { author_id: string }>(items: T[]): Promise<(T & { author_name?: string; author_avatar?: string | null })[]> {
  if (items.length === 0) return items;
  const authorIds = [...new Set(items.map(i => i.author_id))];
  const { data: profiles } = await supabase
    .from("profiles")
    .select("user_id, full_name, avatar_url")
    .in("user_id", authorIds);

  const profileMap = new Map<string, { full_name: string | null; avatar_url: string | null }>();
  profiles?.forEach(p => profileMap.set(p.user_id, p));

  return items.map(item => ({
    ...item,
    author_name: profileMap.get(item.author_id)?.full_name || undefined,
    author_avatar: profileMap.get(item.author_id)?.avatar_url || null,
  }));
}

export function useForumCategories(workspaceId: string | undefined) {
  return useQuery({
    queryKey: ["forum-categories", workspaceId],
    queryFn: async () => {
      if (!workspaceId) return [];
      const { data, error } = await supabase
        .from("forum_categories")
        .select("*")
        .eq("workspace_id", workspaceId)
        .eq("is_active", true)
        .order("sort_order");
      if (error) throw error;
      return data as ForumCategory[];
    },
    enabled: !!workspaceId,
  });
}

export function useForumTopics(workspaceId: string | undefined, categoryId?: string) {
  return useQuery({
    queryKey: ["forum-topics", workspaceId, categoryId],
    queryFn: async () => {
      if (!workspaceId) return [];
      let query = supabase
        .from("forum_topics")
        .select("*")
        .eq("workspace_id", workspaceId)
        .eq("moderation_status", "approved")
        .order("is_pinned", { ascending: false })
        .order("updated_at", { ascending: false });

      if (categoryId) query = query.eq("category_id", categoryId);

      const { data, error } = await query.limit(50);
      if (error) throw error;
      return enrichWithProfiles(data as ForumTopic[]);
    },
    enabled: !!workspaceId,
  });
}

export function useForumTopic(topicId: string | undefined) {
  return useQuery({
    queryKey: ["forum-topic", topicId],
    queryFn: async () => {
      if (!topicId) return null;
      const { data, error } = await supabase
        .from("forum_topics")
        .select("*")
        .eq("id", topicId)
        .single();
      if (error) throw error;
      const enriched = await enrichWithProfiles([data as ForumTopic]);
      return enriched[0];
    },
    enabled: !!topicId,
  });
}

export function useForumPosts(topicId: string | undefined) {
  return useQuery({
    queryKey: ["forum-posts", topicId],
    queryFn: async () => {
      if (!topicId) return [];
      const { data, error } = await supabase
        .from("forum_posts")
        .select("*")
        .eq("topic_id", topicId)
        .eq("moderation_status", "approved")
        .order("created_at", { ascending: true });
      if (error) throw error;
      return enrichWithProfiles(data as ForumPost[]);
    },
    enabled: !!topicId,
  });
}

export function useForumReactionCounts(topicId?: string, postId?: string) {
  return useQuery({
    queryKey: ["forum-reaction-counts", topicId, postId],
    queryFn: async () => {
      let query = supabase.from("forum_reactions").select("reaction_type");
      if (topicId) query = query.eq("topic_id", topicId).is("post_id", null);
      if (postId) query = query.eq("post_id", postId);

      const { data, error } = await query;
      if (error) throw error;

      const counts: Record<string, number> = {};
      data?.forEach(r => {
        counts[r.reaction_type] = (counts[r.reaction_type] || 0) + 1;
      });
      return counts;
    },
    enabled: !!(topicId || postId),
  });
}

export function useUserReaction(topicId?: string, postId?: string) {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["forum-user-reaction", topicId, postId, user?.id],
    queryFn: async () => {
      if (!user) return null;
      let query = supabase.from("forum_reactions").select("id, reaction_type").eq("user_id", user.id);
      if (topicId) query = query.eq("topic_id", topicId).is("post_id", null);
      if (postId) query = query.eq("post_id", postId);

      const { data, error } = await query.maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!(user && (topicId || postId)),
  });
}

export function useCreateForumTopic(workspaceId: string | undefined) {
  const qc = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async ({ title, content, categoryId, commentsEnabled = true }: { title: string; content: string; categoryId?: string; commentsEnabled?: boolean }) => {
      if (!workspaceId || !user) throw new Error("Sem sessão");

      let moderationStatus = "approved";
      const { data: filters } = await supabase
        .from("moderation_filters")
        .select("banned_words")
        .eq("workspace_id", workspaceId)
        .maybeSingle();

      if (filters?.banned_words) {
        const text = `${title} ${content}`.toLowerCase();
        const found = (filters.banned_words as string[]).filter(w => text.includes(w.toLowerCase()));
        if (found.length > 0) moderationStatus = "flagged";
      }

      const { data, error } = await supabase.from("forum_topics").insert({
        workspace_id: workspaceId,
        author_id: user.id,
        title,
        content,
        category_id: categoryId || null,
        moderation_status: moderationStatus,
        comments_enabled: commentsEnabled,
      } as any).select().single();
      if (error) throw error;

      if (moderationStatus === "flagged") {
        await supabase.from("moderation_queue").insert({
          workspace_id: workspaceId,
          entity_type: "forum_topic",
          entity_id: data.id,
          reason: "Palavras proibidas detetadas",
          flagged_text: `${title} ${content}`.substring(0, 200),
        });
      }

      return data;
    },
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ["forum-topics"] });
      toast.success("Tópico criado!");
      console.log('[COMMUNITY-FASTCLUB] TOPIC_CREATED', { id: data?.id });
      if (workspaceId) {
        emitKernelEvent({
          workspace_id: workspaceId,
          type: 'COMMUNITY.TOPIC_CREATED',
          entity_kind: 'forum_topic',
          entity_id: data?.id ?? 'unknown',
          source_module: 'community-fastclub',
          payload: {
            category_id: data?.category_id,
            moderation_status: data?.moderation_status,
            comments_enabled: data?.comments_enabled,
          },
        });
      }
    },
    onError: (err) => {
      toast.error("Erro ao criar tópico");
      console.error('[COMMUNITY-FASTCLUB] TOPIC_CREATE_FAILED', (err as Error).message);
    },
  });
}

export function useCreateForumPost(workspaceId: string | undefined) {
  const qc = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async ({ topicId, content }: { topicId: string; content: string }) => {
      if (!workspaceId || !user) throw new Error("Sem sessão");

      let moderationStatus = "approved";
      const { data: filters } = await supabase
        .from("moderation_filters")
        .select("banned_words")
        .eq("workspace_id", workspaceId)
        .maybeSingle();

      if (filters?.banned_words) {
        const found = (filters.banned_words as string[]).filter(w => content.toLowerCase().includes(w.toLowerCase()));
        if (found.length > 0) moderationStatus = "flagged";
      }

      const { data, error } = await supabase.from("forum_posts").insert({
        workspace_id: workspaceId,
        topic_id: topicId,
        author_id: user.id,
        content,
        moderation_status: moderationStatus,
      }).select().single();
      if (error) throw error;

      const { data: t } = await supabase.from("forum_topics").select("replies_count").eq("id", topicId).single();
      if (t) {
        await supabase.from("forum_topics").update({ replies_count: (t.replies_count || 0) + 1 }).eq("id", topicId);
      }

      return data;
    },
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ["forum-posts"] });
      qc.invalidateQueries({ queryKey: ["forum-topics"] });
      toast.success("Resposta publicada!");
      console.log('[COMMUNITY-FASTCLUB] POST_CREATED', { id: data?.id, topic_id: data?.topic_id });
      if (workspaceId) {
        emitKernelEvent({
          workspace_id: workspaceId,
          type: 'COMMUNITY.POST_CREATED',
          entity_kind: 'forum_post',
          entity_id: data?.id ?? 'unknown',
          source_module: 'community-fastclub',
          payload: { topic_id: data?.topic_id },
        });
      }
    },
    onError: (err) => {
      toast.error("Erro ao publicar resposta");
      console.error('[COMMUNITY-FASTCLUB] POST_CREATE_FAILED', (err as Error).message);
    },
  });
}
