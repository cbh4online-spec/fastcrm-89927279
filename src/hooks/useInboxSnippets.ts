import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

export interface InboxSnippetRow {
  id: string;
  workspace_id: string;
  user_id: string;
  shortcut: string;
  title: string;
  content: string;
  description: string | null;
  is_personal: boolean;
  usage_count: number;
  last_used_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface SnippetInput {
  shortcut: string;
  title: string;
  content: string;
  description?: string | null;
  is_personal?: boolean;
}

const TABLE = "inbox_snippets" as const;

export function useInboxSnippets() {
  const { currentWorkspace } = useWorkspace();
  return useQuery({
    queryKey: ["inbox_snippets", currentWorkspace?.id],
    queryFn: async () => {
      if (!currentWorkspace?.id) return [];
      const { data, error } = await (supabase as any)
        .from(TABLE)
        .select("*")
        .eq("workspace_id", currentWorkspace.id)
        .order("is_personal", { ascending: true })
        .order("shortcut", { ascending: true });
      if (error) throw error;
      return (data || []) as InboxSnippetRow[];
    },
    enabled: !!currentWorkspace?.id,
  });
}

export function useCreateInboxSnippet() {
  const qc = useQueryClient();
  const { currentWorkspace } = useWorkspace();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (input: SnippetInput) => {
      if (!currentWorkspace?.id || !user?.id) {
        throw new Error("Workspace ou utilizador não disponível");
      }
      const { data, error } = await (supabase as any)
        .from(TABLE)
        .insert({
          workspace_id: currentWorkspace.id,
          user_id: user.id,
          shortcut: input.shortcut,
          title: input.title,
          content: input.content,
          description: input.description ?? null,
          is_personal: input.is_personal ?? false,
        })
        .select()
        .single();
      if (error) throw error;
      return data as InboxSnippetRow;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["inbox_snippets", currentWorkspace?.id] });
      toast.success("Snippet criado");
    },
    onError: (err: any) => {
      const msg = err?.message ?? "";
      if (msg.includes("duplicate") || msg.includes("unique")) {
        toast.error("Já existe um snippet com esse atalho neste workspace.");
      } else {
        toast.error("Erro ao criar snippet: " + (msg || "desconhecido"));
      }
    },
  });
}

export function useUpdateInboxSnippet() {
  const qc = useQueryClient();
  const { currentWorkspace } = useWorkspace();

  return useMutation({
    mutationFn: async ({ id, ...input }: SnippetInput & { id: string }) => {
      const { error } = await (supabase as any)
        .from(TABLE)
        .update({
          shortcut: input.shortcut,
          title: input.title,
          content: input.content,
          description: input.description ?? null,
          is_personal: input.is_personal ?? false,
        })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["inbox_snippets", currentWorkspace?.id] });
      toast.success("Snippet atualizado");
    },
    onError: (err: any) => {
      const msg = err?.message ?? "";
      if (msg.includes("duplicate") || msg.includes("unique")) {
        toast.error("Já existe um snippet com esse atalho.");
      } else {
        toast.error("Erro ao atualizar: " + msg);
      }
    },
  });
}

export function useDeleteInboxSnippet() {
  const qc = useQueryClient();
  const { currentWorkspace } = useWorkspace();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await (supabase as any).from(TABLE).delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["inbox_snippets", currentWorkspace?.id] });
      toast.success("Snippet eliminado");
    },
    onError: (err: any) => {
      toast.error("Erro a eliminar: " + (err?.message ?? ""));
    },
  });
}
