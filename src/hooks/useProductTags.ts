import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { toast } from "sonner";

export function useProductTags(productId?: string) {
  const { currentWorkspace } = useWorkspace();
  const qc = useQueryClient();

  const query = useQuery({
    queryKey: ["product-tags", productId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("product_tags" as any)
        .select("id, tag, created_at")
        .eq("product_id", productId!)
        .order("tag");
      if (error) throw error;
      return (data || []) as { id: string; tag: string; created_at: string }[];
    },
    enabled: !!productId,
  });

  const addTag = useMutation({
    mutationFn: async (tag: string) => {
      const { error } = await supabase
        .from("product_tags" as any)
        .insert({
          workspace_id: currentWorkspace!.id,
          product_id: productId!,
          tag: tag.trim().toLowerCase(),
        });
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["product-tags", productId] });
      qc.invalidateQueries({ queryKey: ["workspace-tags"] });
    },
    onError: (err: any) => {
      if (err?.code === "23505") {
        toast.info("Tag já existe neste produto");
      } else {
        toast.error("Erro ao adicionar tag");
      }
    },
  });

  const removeTag = useMutation({
    mutationFn: async (tagId: string) => {
      const { error } = await supabase
        .from("product_tags" as any)
        .delete()
        .eq("id", tagId);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["product-tags", productId] });
      qc.invalidateQueries({ queryKey: ["workspace-tags"] });
    },
    onError: () => toast.error("Erro ao remover tag"),
  });

  return { tags: query.data || [], isLoading: query.isLoading, addTag, removeTag };
}

/** All unique tags in the workspace — for filters and autocomplete */
export function useWorkspaceTags() {
  const { currentWorkspace } = useWorkspace();

  return useQuery({
    queryKey: ["workspace-tags", currentWorkspace?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("product_tags" as any)
        .select("tag")
        .eq("workspace_id", currentWorkspace!.id);
      if (error) throw error;
      const unique = [...new Set((data || []).map((d: any) => d.tag as string))].sort();
      return unique;
    },
    enabled: !!currentWorkspace?.id,
    staleTime: 1000 * 60 * 5,
  });
}
