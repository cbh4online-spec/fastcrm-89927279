import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

export interface ModerationItem {
  id: string;
  workspace_id: string;
  entity_type: string;
  entity_id: string;
  reason: string;
  flagged_text: string | null;
  status: string | null;
  reviewed_by: string | null;
  reviewed_at: string | null;
  created_at: string;
}

export interface ModerationFiltersConfig {
  id: string;
  workspace_id: string;
  banned_words: string[] | null;
  regex_patterns: string[] | null;
  auto_flag_threshold: number | null;
  max_reports_before_hide: number | null;
}

export function useModerationQueue(workspaceId: string | undefined, statusFilter?: string) {
  return useQuery({
    queryKey: ["moderation-queue", workspaceId, statusFilter],
    queryFn: async () => {
      if (!workspaceId) return [];
      let query = supabase
        .from("moderation_queue")
        .select("*")
        .eq("workspace_id", workspaceId)
        .order("created_at", { ascending: false });

      if (statusFilter && statusFilter !== "all") {
        query = query.eq("status", statusFilter);
      }

      const { data, error } = await query.limit(100);
      if (error) throw error;
      return data as ModerationItem[];
    },
    enabled: !!workspaceId,
  });
}

export function useReviewModerationItem(workspaceId: string | undefined) {
  const qc = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async ({ itemId, action }: { itemId: string; action: "approved" | "rejected" }) => {
      if (!user) throw new Error("Sem sessão");

      // Get the item to know its entity info
      const { data: item, error: fetchErr } = await supabase
        .from("moderation_queue")
        .select("*")
        .eq("id", itemId)
        .single();
      if (fetchErr) throw fetchErr;

      // Update moderation queue status
      const { error } = await supabase
        .from("moderation_queue")
        .update({
          status: action,
          reviewed_by: user.id,
          reviewed_at: new Date().toISOString(),
        })
        .eq("id", itemId);
      if (error) throw error;

      // Update the entity's moderation_status
      if (item.entity_type === "c2c_listing") {
        await supabase
          .from("c2c_listings")
          .update({ moderation_status: action, status: action === "rejected" ? "removed" : "active" })
          .eq("id", item.entity_id);
      } else if (item.entity_type === "forum_topic") {
        await supabase
          .from("forum_topics")
          .update({ moderation_status: action })
          .eq("id", item.entity_id);
      } else if (item.entity_type === "forum_post") {
        await supabase
          .from("forum_posts")
          .update({ moderation_status: action })
          .eq("id", item.entity_id);
      }
    },
    onSuccess: (_, { action }) => {
      qc.invalidateQueries({ queryKey: ["moderation-queue"] });
      toast.success(action === "approved" ? "Conteúdo aprovado" : "Conteúdo rejeitado");
    },
    onError: () => toast.error("Erro ao processar"),
  });
}

export function useModerationFilters(workspaceId: string | undefined) {
  return useQuery({
    queryKey: ["moderation-filters", workspaceId],
    queryFn: async () => {
      if (!workspaceId) return null;
      const { data, error } = await supabase
        .from("moderation_filters")
        .select("*")
        .eq("workspace_id", workspaceId)
        .single();
      if (error && error.code !== "PGRST116") throw error;
      return data as ModerationFiltersConfig | null;
    },
    enabled: !!workspaceId,
  });
}

export function useUpdateModerationFilters(workspaceId: string | undefined) {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async (updates: { banned_words?: string[]; regex_patterns?: string[]; auto_flag_threshold?: number; max_reports_before_hide?: number }) => {
      if (!workspaceId) throw new Error("Sem workspace");

      const { data: existing } = await supabase
        .from("moderation_filters")
        .select("id")
        .eq("workspace_id", workspaceId)
        .single();

      if (existing) {
        const { error } = await supabase
          .from("moderation_filters")
          .update({ ...updates, updated_at: new Date().toISOString() })
          .eq("workspace_id", workspaceId);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("moderation_filters")
          .insert({ workspace_id: workspaceId, ...updates });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["moderation-filters"] });
      toast.success("Filtros atualizados");
    },
    onError: () => toast.error("Erro ao atualizar filtros"),
  });
}
