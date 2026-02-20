import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { toast } from "sonner";

export interface BioBlock {
  id: string;
  bio_page_id: string;
  workspace_id: string;
  block_type: string;
  content: Record<string, any>;
  order_index: number;
  is_visible: boolean;
  rules: Record<string, any> | null;
  created_at: string;
}

export type BioBlockType =
  | "link" | "button" | "text" | "image" | "video"
  | "form" | "product" | "social" | "divider" | "embed"
  | "whatsapp" | "calendar" | "countdown" | "faq"
  | "testimonials" | "carousel" | "hero" | "feature";

export function useBioBlocks(pageId: string | null) {
  return useQuery({
    queryKey: ["bio-blocks", pageId],
    queryFn: async () => {
      if (!pageId) return [];
      const { data, error } = await supabase
        .from("bio_blocks")
        .select("*")
        .eq("bio_page_id", pageId)
        .order("order_index", { ascending: true });
      if (error) throw error;
      return data as BioBlock[];
    },
    enabled: !!pageId,
  });
}

export function useCreateBioBlock() {
  const qc = useQueryClient();
  const { currentWorkspace } = useWorkspace();
  return useMutation({
    mutationFn: async (input: {
      bio_page_id: string;
      block_type: string;
      content?: Record<string, any>;
      order_index?: number;
    }) => {
      if (!currentWorkspace?.id) throw new Error("Sem workspace");
      const { data, error } = await supabase
        .from("bio_blocks")
        .insert({ ...input, workspace_id: currentWorkspace.id } as any)
        .select()
        .single();
      if (error) throw error;
      return data as BioBlock;
    },
    onSuccess: (d) => {
      qc.invalidateQueries({ queryKey: ["bio-blocks", d.bio_page_id] });
    },
    onError: (e) => toast.error("Erro: " + e.message),
  });
}

export function useUpdateBioBlock() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, bio_page_id, ...input }: Partial<BioBlock> & { id: string; bio_page_id: string }) => {
      const { data, error } = await supabase
        .from("bio_blocks")
        .update(input as any)
        .eq("id", id)
      .select()
      .maybeSingle();
    if (error) throw error;
    if (!data) throw new Error("Bloco não encontrado ou sem permissão");
    return { ...data, bio_page_id } as BioBlock;
    },
    onSuccess: (d) => {
      qc.invalidateQueries({ queryKey: ["bio-blocks", d.bio_page_id] });
    },
    onError: (e) => toast.error("Erro: " + e.message),
  });
}

export function useDeleteBioBlock() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, pageId }: { id: string; pageId: string }) => {
      const { error } = await supabase.from("bio_blocks").delete().eq("id", id);
      if (error) throw error;
      return pageId;
    },
    onSuccess: (pageId) => {
      qc.invalidateQueries({ queryKey: ["bio-blocks", pageId] });
      toast.success("Bloco removido");
    },
    onError: (e) => toast.error("Erro: " + e.message),
  });
}

export function useReorderBioBlocks() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ pageId, blocks }: { pageId: string; blocks: { id: string; order_index: number }[] }) => {
      const updates = blocks.map((b) =>
        supabase.from("bio_blocks").update({ order_index: b.order_index }).eq("id", b.id)
      );
      await Promise.all(updates);
      return pageId;
    },
    onSuccess: (pageId) => {
      qc.invalidateQueries({ queryKey: ["bio-blocks", pageId] });
    },
    onError: (e) => toast.error("Erro ao reordenar: " + e.message),
  });
}
