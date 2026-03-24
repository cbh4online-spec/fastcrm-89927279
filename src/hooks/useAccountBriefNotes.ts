import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

export function useAccountBriefNotes(accountId: string | undefined) {
  const { currentWorkspace } = useWorkspace();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const workspaceId = currentWorkspace?.id;

  const notesQuery = useQuery({
    queryKey: ["account-brief-notes", accountId],
    queryFn: async () => {
      if (!accountId) return [];
      const { data, error } = await supabase
        .from("account_brief_notes")
        .select("*")
        .eq("account_id", accountId)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data || [];
    },
    enabled: !!accountId,
  });

  const addNote = useMutation({
    mutationFn: async (noteText: string) => {
      if (!workspaceId || !user || !accountId) throw new Error("Dados em falta");
      const { error } = await supabase.from("account_brief_notes").insert({
        workspace_id: workspaceId,
        account_id: accountId,
        author_user_id: user.id,
        note_text: noteText,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Nota adicionada");
      queryClient.invalidateQueries({ queryKey: ["account-brief-notes", accountId] });
    },
  });

  const deleteNote = useMutation({
    mutationFn: async (noteId: string) => {
      const { error } = await supabase.from("account_brief_notes").delete().eq("id", noteId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["account-brief-notes", accountId] });
    },
  });

  return {
    notes: notesQuery.data || [],
    isLoading: notesQuery.isLoading,
    addNote,
    deleteNote,
  };
}
