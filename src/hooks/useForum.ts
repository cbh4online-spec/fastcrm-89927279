import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

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
  created_at: string;
  updated_at: string;
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
      return data as ForumTopic[];
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
      return data as ForumTopic;
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
      return data as ForumPost[];
    },
    enabled: !!topicId,
  });
}

export function useCreateForumTopic(workspaceId: string | undefined) {
  const qc = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async ({ title, content, categoryId }: { title: string; content: string; categoryId?: string }) => {
      if (!workspaceId || !user) throw new Error("Sem sessão");

      // Auto-moderation
      let moderationStatus = "approved";
      const { data: filters } = await supabase
        .from("moderation_filters")
        .select("banned_words")
        .eq("workspace_id", workspaceId)
        .single();

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
      }).select().single();
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
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["forum-topics"] }); toast.success("Tópico criado!"); },
    onError: () => toast.error("Erro ao criar tópico"),
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
        .single();

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

      // Update replies count
      const { data: t } = await supabase.from("forum_topics").select("replies_count").eq("id", topicId).single();
      if (t) {
        await supabase.from("forum_topics").update({ replies_count: (t.replies_count || 0) + 1 }).eq("id", topicId);
      }

      return data;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["forum-posts"] }); qc.invalidateQueries({ queryKey: ["forum-topics"] }); toast.success("Resposta publicada!"); },
    onError: () => toast.error("Erro ao publicar resposta"),
  });
}
