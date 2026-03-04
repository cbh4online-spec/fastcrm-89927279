import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { toast } from "sonner";

export interface ContextBlockComment {
  id: string;
  block_id: string;
  workspace_id: string;
  user_id: string;
  content: string;
  created_at: string;
  updated_at: string;
  // joined
  user_name?: string;
  user_avatar?: string;
}

export function useContextComments(blockId: string | undefined) {
  const { currentWorkspace } = useWorkspace();

  return useQuery({
    queryKey: ["context-comments", blockId],
    queryFn: async () => {
      if (!blockId) return [];
      const { data, error } = await supabase
        .from("context_block_comments" as any)
        .select("*")
        .eq("block_id", blockId)
        .order("created_at", { ascending: true });
      if (error) throw error;

      // Enrich with profile info
      const comments = (data || []) as any[];
      if (!comments.length) return [] as ContextBlockComment[];

      const userIds = [...new Set(comments.map(c => c.user_id))];
      const { data: profiles } = await supabase
        .from("profiles")
        .select("id, full_name, avatar_url")
        .in("id", userIds);

      const profileMap = new Map((profiles || []).map(p => [p.id, p]));

      return comments.map(c => ({
        ...c,
        user_name: profileMap.get(c.user_id)?.full_name || "Utilizador",
        user_avatar: profileMap.get(c.user_id)?.avatar_url || null,
      })) as ContextBlockComment[];
    },
    enabled: !!blockId && !!currentWorkspace?.id,
  });
}

export function useCreateComment() {
  const queryClient = useQueryClient();
  const { currentWorkspace } = useWorkspace();

  return useMutation({
    mutationFn: async ({ blockId, content }: { blockId: string; content: string }) => {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) throw new Error("Não autenticado");

      const { error } = await supabase
        .from("context_block_comments" as any)
        .insert({
          block_id: blockId,
          workspace_id: currentWorkspace?.id,
          user_id: userData.user.id,
          content,
        } as any);
      if (error) throw error;
    },
    onSuccess: (_, vars) => {
      queryClient.invalidateQueries({ queryKey: ["context-comments", vars.blockId] });
    },
    onError: (err: Error) => toast.error("Erro: " + err.message),
  });
}

export function useDeleteComment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ commentId, blockId }: { commentId: string; blockId: string }) => {
      const { error } = await supabase
        .from("context_block_comments" as any)
        .delete()
        .eq("id", commentId);
      if (error) throw error;
      return blockId;
    },
    onSuccess: (blockId) => {
      queryClient.invalidateQueries({ queryKey: ["context-comments", blockId] });
    },
    onError: (err: Error) => toast.error("Erro: " + err.message),
  });
}
