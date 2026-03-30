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
  usage_count: number;
  created_at: string;
}

export function useTicketCannedResponses() {
  const { currentWorkspace } = useWorkspace();
  const workspaceId = currentWorkspace?.id;
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ["ticket-canned-responses", workspaceId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("ticket_canned_responses")
        .select("*")
        .eq("workspace_id", workspaceId!)
        .order("usage_count", { ascending: false });
      if (error) throw error;
      return (data || []) as CannedResponse[];
    },
    enabled: !!workspaceId,
  });

  const create = useMutation({
    mutationFn: async (input: { title: string; content: string; category?: string; shortcut?: string }) => {
      const { data, error } = await supabase
        .from("ticket_canned_responses")
        .insert({ ...input, workspace_id: workspaceId! })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["ticket-canned-responses"] }),
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("ticket_canned_responses").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["ticket-canned-responses"] }),
  });

  return { responses: query.data || [], isLoading: query.isLoading, create, remove };
}
