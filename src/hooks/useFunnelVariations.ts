import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { toast } from "sonner";

export interface FunnelVariation {
  id: string;
  step_id: string;
  workspace_id: string;
  name: string;
  traffic_percentage: number;
  is_control: boolean;
  content: Record<string, unknown>;
  conversion_rate: number | null;
  created_at: string;
  updated_at: string;
}

export function useFunnelVariations(stepId: string | null) {
  return useQuery({
    queryKey: ["funnel-variations", stepId],
    queryFn: async () => {
      if (!stepId) return [];
      const { data, error } = await supabase
        .from("funnel_variations")
        .select("*")
        .eq("step_id", stepId)
        .order("created_at", { ascending: true });
      if (error) throw error;
      return data as FunnelVariation[];
    },
    enabled: !!stepId,
  });
}

export function useCreateVariation() {
  const qc = useQueryClient();
  const { currentWorkspace } = useWorkspace();
  return useMutation({
    mutationFn: async (input: { step_id: string; name: string; traffic_percentage?: number }) => {
      if (!currentWorkspace?.id) throw new Error("Sem workspace");
      const { data, error } = await supabase
        .from("funnel_variations")
        .insert({ ...input, workspace_id: currentWorkspace.id })
        .select()
        .single();
      if (error) throw error;
      return data as FunnelVariation;
    },
    onSuccess: (d) => {
      qc.invalidateQueries({ queryKey: ["funnel-variations", d.step_id] });
      toast.success("Variação criada");
    },
    onError: (e) => toast.error("Erro: " + e.message),
  });
}

export function useUpdateVariation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...input }: Partial<FunnelVariation> & { id: string }) => {
      const updateData: Record<string, unknown> = { ...input };
      const { data, error } = await supabase
        .from("funnel_variations")
        .update(updateData as any)
        .eq("id", id)
        .select()
        .single();
      if (error) throw error;
      return data as FunnelVariation;
    },
    onSuccess: (d) => {
      qc.invalidateQueries({ queryKey: ["funnel-variations", d.step_id] });
    },
    onError: (e) => toast.error("Erro: " + e.message),
  });
}

export function useDeleteVariation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, stepId }: { id: string; stepId: string }) => {
      const { error } = await supabase.from("funnel_variations").delete().eq("id", id);
      if (error) throw error;
      return stepId;
    },
    onSuccess: (stepId) => {
      qc.invalidateQueries({ queryKey: ["funnel-variations", stepId] });
      toast.success("Variação eliminada");
    },
    onError: (e) => toast.error("Erro: " + e.message),
  });
}
