import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { toast } from "sonner";

export interface ContextBlockAttachment {
  id: string;
  block_id: string;
  workspace_id: string;
  attachment_type: 'url' | 'file';
  file_name: string;
  file_url: string | null;
  file_size: number | null;
  mime_type: string | null;
  uploaded_by: string | null;
  created_at: string;
}

export function useContextAttachments(blockId: string | undefined) {
  const { currentWorkspace } = useWorkspace();

  return useQuery({
    queryKey: ["context-attachments", blockId],
    queryFn: async () => {
      if (!blockId) return [];
      const { data, error } = await supabase
        .from("context_block_attachments" as any)
        .select("*")
        .eq("block_id", blockId)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data || []) as unknown as ContextBlockAttachment[];
    },
    enabled: !!blockId && !!currentWorkspace?.id,
  });
}

export function useAddUrlAttachment() {
  const queryClient = useQueryClient();
  const { currentWorkspace } = useWorkspace();

  return useMutation({
    mutationFn: async ({ blockId, url, name }: { blockId: string; url: string; name: string }) => {
      const { data: userData } = await supabase.auth.getUser();
      const { error } = await supabase
        .from("context_block_attachments" as any)
        .insert({
          block_id: blockId,
          workspace_id: currentWorkspace?.id,
          attachment_type: 'url',
          file_name: name,
          file_url: url,
          uploaded_by: userData.user?.id || null,
        } as any);
      if (error) throw error;
    },
    onSuccess: (_, vars) => {
      queryClient.invalidateQueries({ queryKey: ["context-attachments", vars.blockId] });
      toast.success("Link adicionado");
    },
    onError: (err: Error) => toast.error("Erro: " + err.message),
  });
}

export function useUploadFileAttachment() {
  const queryClient = useQueryClient();
  const { currentWorkspace } = useWorkspace();

  return useMutation({
    mutationFn: async ({ blockId, file }: { blockId: string; file: File }) => {
      const { data: userData } = await supabase.auth.getUser();
      const path = `${currentWorkspace?.id}/${blockId}/${Date.now()}_${file.name}`;

      const { error: uploadError } = await supabase.storage
        .from("context-attachments")
        .upload(path, file);
      if (uploadError) throw uploadError;

      const { data: urlData } = supabase.storage
        .from("context-attachments")
        .getPublicUrl(path);

      const { error } = await supabase
        .from("context_block_attachments" as any)
        .insert({
          block_id: blockId,
          workspace_id: currentWorkspace?.id,
          attachment_type: 'file',
          file_name: file.name,
          file_url: urlData.publicUrl,
          file_size: file.size,
          mime_type: file.type,
          uploaded_by: userData.user?.id || null,
        } as any);
      if (error) throw error;
    },
    onSuccess: (_, vars) => {
      queryClient.invalidateQueries({ queryKey: ["context-attachments", vars.blockId] });
      toast.success("Ficheiro carregado");
    },
    onError: (err: Error) => toast.error("Erro ao carregar: " + err.message),
  });
}

export function useDeleteAttachment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ attachmentId, blockId }: { attachmentId: string; blockId: string }) => {
      const { error } = await supabase
        .from("context_block_attachments" as any)
        .delete()
        .eq("id", attachmentId);
      if (error) throw error;
      return blockId;
    },
    onSuccess: (blockId) => {
      queryClient.invalidateQueries({ queryKey: ["context-attachments", blockId] });
      toast.success("Anexo removido");
    },
    onError: (err: Error) => toast.error("Erro: " + err.message),
  });
}
