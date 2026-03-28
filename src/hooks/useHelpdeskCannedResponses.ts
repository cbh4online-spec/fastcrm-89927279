import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useWorkspace } from "@/contexts/WorkspaceContext";

export interface CannedResponse {
  id: string;
  workspace_id: string;
  title: string;
  content: string;
  category: string | null;
  shortcut: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export function useHelpdeskCannedResponses() {
  const { currentWorkspace } = useWorkspace();
  const queryClient = useQueryClient();
  const workspaceId = currentWorkspace?.id;

  const { data: responses = [], isLoading } = useQuery({
    queryKey: ["helpdesk-canned-responses", workspaceId],
    queryFn: async () => {
      if (!workspaceId) return [];
      const { data, error } = await supabase
        .from("support_canned_responses")
        .select("*")
        .eq("workspace_id", workspaceId)
        .order("title");
      if (error) throw error;
      return (data || []) as CannedResponse[];
    },
    enabled: !!workspaceId,
  });

  const createResponse = useMutation({
    mutationFn: async (input: { title: string; content: string; category?: string; shortcut?: string }) => {
      if (!workspaceId) throw new Error("No workspace");
      const { data: { user } } = await supabase.auth.getUser();
      const { data, error } = await supabase
        .from("support_canned_responses")
        .insert({
          workspace_id: workspaceId,
          title: input.title,
          content: input.content,
          category: input.category || null,
          shortcut: input.shortcut || null,
          created_by: user?.id || null,
        })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["helpdesk-canned-responses"] }),
  });

  const updateResponse = useMutation({
    mutationFn: async (input: { id: string; title?: string; content?: string; category?: string; shortcut?: string }) => {
      const { id, ...updates } = input;
      const { error } = await supabase
        .from("support_canned_responses")
        .update({ ...updates, updated_at: new Date().toISOString() } as any)
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["helpdesk-canned-responses"] }),
  });

  const deleteResponse = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("support_canned_responses").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["helpdesk-canned-responses"] }),
  });

  return { responses, isLoading, createResponse, updateResponse, deleteResponse };
}
