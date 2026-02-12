import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export function useToggleForumReaction(workspaceId: string | undefined) {
  const qc = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async ({ topicId, postId, reactionType }: { topicId?: string; postId?: string; reactionType: string }) => {
      if (!workspaceId || !user) throw new Error("Sem sessão");

      let query = supabase.from("forum_reactions").select("id, reaction_type").eq("user_id", user.id);
      if (topicId) query = query.eq("topic_id", topicId).is("post_id", null);
      if (postId) query = query.eq("post_id", postId);

      const { data: existing } = await query.maybeSingle();

      if (existing) {
        await supabase.from("forum_reactions").delete().eq("id", existing.id);
        if (existing.reaction_type === reactionType) return { action: "removed" };
      }

      await supabase.from("forum_reactions").insert({
        workspace_id: workspaceId,
        topic_id: topicId || null,
        post_id: postId || null,
        user_id: user.id,
        reaction_type: reactionType,
      } as any);

      return { action: "added" };
    },
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ["forum-reaction-counts", vars.topicId, vars.postId] });
      qc.invalidateQueries({ queryKey: ["forum-user-reaction", vars.topicId, vars.postId] });
    },
  });
}
