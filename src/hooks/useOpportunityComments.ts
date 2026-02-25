import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useWorkspace } from "@/contexts/WorkspaceContext";

export interface OpportunityComment {
  id: string;
  opportunity_id: string;
  workspace_id: string;
  user_id: string;
  parent_id: string | null;
  content: string;
  mentions: string[];
  created_at: string;
  updated_at: string;
  profile?: {
    full_name: string | null;
    avatar_url: string | null;
  } | null;
}

export function useOpportunityComments(opportunityId: string | undefined) {
  const queryClient = useQueryClient();
  const { currentWorkspace } = useWorkspace();

  const query = useQuery({
    queryKey: ["opportunity_comments", opportunityId],
    queryFn: async () => {
      if (!opportunityId || !currentWorkspace) return [];

      const { data: comments, error } = await supabase
        .from("opportunity_comments")
        .select("*")
        .eq("opportunity_id", opportunityId)
        .eq("workspace_id", currentWorkspace.id)
        .order("created_at", { ascending: true });

      if (error) throw error;

      // Fetch profiles for all unique user_ids
      const userIds = [...new Set(comments.map((c: any) => c.user_id))];
      const { data: profiles } = await supabase
        .from("profiles")
        .select("user_id, full_name, avatar_url")
        .in("user_id", userIds);

      const profileMap = new Map(profiles?.map((p: any) => [p.user_id, p]) || []);

      return comments.map((c: any) => ({
        ...c,
        mentions: c.mentions || [],
        profile: profileMap.get(c.user_id) || null,
      })) as OpportunityComment[];
    },
    enabled: !!opportunityId && !!currentWorkspace,
  });

  // Realtime subscription
  useEffect(() => {
    if (!opportunityId) return;

    const channel = supabase
      .channel(`opp-comments-${opportunityId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "opportunity_comments",
          filter: `opportunity_id=eq.${opportunityId}`,
        },
        () => {
          queryClient.invalidateQueries({ queryKey: ["opportunity_comments", opportunityId] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [opportunityId, queryClient]);

  return query;
}

export function useAddComment() {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const { currentWorkspace } = useWorkspace();

  return useMutation({
    mutationFn: async ({
      opportunityId,
      content,
      parentId,
      mentions,
    }: {
      opportunityId: string;
      content: string;
      parentId?: string | null;
      mentions?: string[];
    }) => {
      if (!user || !currentWorkspace) throw new Error("Not authenticated");

      const { data, error } = await supabase
        .from("opportunity_comments")
        .insert({
          opportunity_id: opportunityId,
          workspace_id: currentWorkspace.id,
          user_id: user.id,
          content,
          parent_id: parentId || null,
          mentions: mentions || [],
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["opportunity_comments", data.opportunity_id] });
    },
  });
}

export function useDeleteComment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ commentId, opportunityId }: { commentId: string; opportunityId: string }) => {
      const { error } = await supabase
        .from("opportunity_comments")
        .delete()
        .eq("id", commentId);

      if (error) throw error;
      return { opportunityId };
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["opportunity_comments", data.opportunityId] });
    },
  });
}
