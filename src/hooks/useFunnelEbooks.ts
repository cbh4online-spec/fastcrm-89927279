import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { toast } from "sonner";

const sb = supabase as any;

export function useFunnelEbooks(funnelId: string | null) {
  return useQuery({
    queryKey: ["funnel-ebooks", funnelId],
    queryFn: async () => {
      if (!funnelId) return [];
      const { data, error } = await sb
        .from("funnel_ebooks")
        .select("*, ebooks(id, title, status)")
        .eq("funnel_id", funnelId)
        .order("order_index", { ascending: true });
      if (error) throw error;
      return data;
    },
    enabled: !!funnelId,
  });
}

export function useAddFunnelEbook() {
  const qc = useQueryClient();
  const { currentWorkspace } = useWorkspace();
  return useMutation({
    mutationFn: async (input: { funnel_id: string; ebook_id: string; position?: string; order_index?: number }) => {
      if (!currentWorkspace?.id) throw new Error("Sem workspace");
      const { data, error } = await sb
        .from("funnel_ebooks")
        .insert({ ...input, workspace_id: currentWorkspace.id })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: (d: any) => {
      qc.invalidateQueries({ queryKey: ["funnel-ebooks", d.funnel_id] });
      toast.success("eBook associado ao funil");
    },
    onError: (e: Error) => toast.error("Erro: " + e.message),
  });
}

export function useRemoveFunnelEbook() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, funnelId }: { id: string; funnelId: string }) => {
      const { error } = await sb.from("funnel_ebooks").delete().eq("id", id);
      if (error) throw error;
      return funnelId;
    },
    onSuccess: (funnelId: string) => {
      qc.invalidateQueries({ queryKey: ["funnel-ebooks", funnelId] });
      toast.success("eBook removido do funil");
    },
    onError: (e: Error) => toast.error("Erro: " + e.message),
  });
}
