import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface EbookNote {
  id: string;
  workspace_id: string;
  ebook_id: string;
  user_id: string;
  page_number: number;
  note_text: string;
  note_type: string;
  created_at: string;
  updated_at: string;
}

export function useEbookNotes(ebookId: string | undefined, workspaceId: string | undefined) {
  const queryClient = useQueryClient();
  const queryKey = ["ebook-notes", ebookId];

  const { data: notes = [], isLoading } = useQuery({
    queryKey,
    enabled: !!ebookId && !!workspaceId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("ebook_notes")
        .select("*")
        .eq("ebook_id", ebookId!)
        .eq("workspace_id", workspaceId!)
        .order("page_number", { ascending: true })
        .order("created_at", { ascending: true });
      if (error) throw error;
      return (data ?? []) as EbookNote[];
    },
  });

  const addNote = useMutation({
    mutationFn: async (params: { pageNumber: number; noteText: string; noteType?: string }) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Não autenticado");
      const { error } = await supabase.from("ebook_notes").insert({
        ebook_id: ebookId!,
        workspace_id: workspaceId!,
        user_id: user.id,
        page_number: params.pageNumber,
        note_text: params.noteText,
        note_type: params.noteType || "note",
      });
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey }),
  });

  const updateNote = useMutation({
    mutationFn: async (params: { noteId: string; noteText: string }) => {
      const { error } = await supabase
        .from("ebook_notes")
        .update({ note_text: params.noteText, updated_at: new Date().toISOString() })
        .eq("id", params.noteId);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey }),
  });

  const deleteNote = useMutation({
    mutationFn: async (noteId: string) => {
      const { error } = await supabase.from("ebook_notes").delete().eq("id", noteId);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey }),
  });

  const pagesWithNotes = new Set(notes.map((n) => n.page_number));

  return { notes, isLoading, addNote, updateNote, deleteNote, pagesWithNotes };
}
