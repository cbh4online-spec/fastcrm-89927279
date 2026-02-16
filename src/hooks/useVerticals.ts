import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { toast } from "sonner";

export interface Vertical {
  id: string;
  workspace_id: string;
  name: string;
  slug: string;
  description: string | null;
  color_theme: string | null;
  status: string;
  created_at: string;
  updated_at: string;
}

export function useVerticals() {
  const { currentWorkspace } = useWorkspace();
  return useQuery({
    queryKey: ["verticals", currentWorkspace?.id],
    queryFn: async () => {
      if (!currentWorkspace?.id) return [];
      const { data, error } = await supabase
        .from("verticals")
        .select("*")
        .eq("workspace_id", currentWorkspace.id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as Vertical[];
    },
    enabled: !!currentWorkspace?.id,
  });
}

export function useVertical(id: string | null) {
  return useQuery({
    queryKey: ["vertical", id],
    queryFn: async () => {
      if (!id) return null;
      const { data, error } = await supabase
        .from("verticals")
        .select("*")
        .eq("id", id)
        .single();
      if (error) throw error;
      return data as Vertical;
    },
    enabled: !!id,
  });
}

export function useCreateVertical() {
  const qc = useQueryClient();
  const { currentWorkspace } = useWorkspace();
  return useMutation({
    mutationFn: async (input: { name: string; slug: string; description?: string; color_theme?: string }) => {
      if (!currentWorkspace?.id) throw new Error("Sem workspace");
      const { data, error } = await supabase
        .from("verticals")
        .insert({ ...input, workspace_id: currentWorkspace.id })
        .select()
        .single();
      if (error) throw error;
      return data as Vertical;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["verticals"] });
      toast.success("Vertical criada");
    },
    onError: (e) => toast.error("Erro: " + e.message),
  });
}

export function useUpdateVertical() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...input }: Partial<Vertical> & { id: string }) => {
      const { data, error } = await supabase
        .from("verticals")
        .update(input)
        .eq("id", id)
        .select()
        .single();
      if (error) throw error;
      return data as Vertical;
    },
    onSuccess: (d) => {
      qc.invalidateQueries({ queryKey: ["verticals"] });
      qc.invalidateQueries({ queryKey: ["vertical", d.id] });
      toast.success("Vertical atualizada");
    },
    onError: (e) => toast.error("Erro: " + e.message),
  });
}

export function useDeleteVertical() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("verticals").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["verticals"] });
      toast.success("Vertical eliminada");
    },
    onError: (e) => toast.error("Erro: " + e.message),
  });
}
