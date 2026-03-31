import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { toast } from "sonner";

export type Candidate = {
  id: string;
  workspace_id: string;
  full_name: string;
  email: string | null;
  phone: string | null;
  linkedin_url: string | null;
  portfolio_url: string | null;
  cv_path: string | null;
  cover_letter: string | null;
  source: string;
  tags: string[];
  notes: string | null;
  avatar_url: string | null;
  created_at: string;
  updated_at: string;
};

export function useCandidates() {
  const { currentWorkspace } = useWorkspace();
  const wsId = currentWorkspace?.id;
  return useQuery({
    queryKey: ["hr-candidates", wsId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("hr_candidates" as any)
        .select("*")
        .eq("workspace_id", wsId!)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as unknown as Candidate[];
    },
    enabled: !!wsId,
  });
}

export function useCandidate(id: string | undefined) {
  const { currentWorkspace } = useWorkspace();
  const wsId = currentWorkspace?.id;
  return useQuery({
    queryKey: ["hr-candidate", wsId, id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("hr_candidates" as any)
        .select("*")
        .eq("id", id!)
        .single();
      if (error) throw error;
      return data as unknown as Candidate;
    },
    enabled: !!wsId && !!id,
  });
}

export function useCreateCandidate() {
  const qc = useQueryClient();
  const { currentWorkspace } = useWorkspace();
  const wsId = currentWorkspace?.id;
  return useMutation({
    mutationFn: async (values: Partial<Candidate>) => {
      const { data, error } = await supabase
        .from("hr_candidates" as any)
        .insert({ ...values, workspace_id: wsId })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      toast.success("Candidato criado");
      qc.invalidateQueries({ queryKey: ["hr-candidates", wsId] });
    },
    onError: () => toast.error("Erro ao criar candidato"),
  });
}

export function useUpdateCandidate() {
  const qc = useQueryClient();
  const { currentWorkspace } = useWorkspace();
  const wsId = currentWorkspace?.id;
  return useMutation({
    mutationFn: async ({ id, ...values }: Partial<Candidate> & { id: string }) => {
      const { data, error } = await supabase
        .from("hr_candidates" as any)
        .update({ ...values, updated_at: new Date().toISOString() })
        .eq("id", id)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      toast.success("Candidato atualizado");
      qc.invalidateQueries({ queryKey: ["hr-candidates", wsId] });
      qc.invalidateQueries({ queryKey: ["hr-candidate"] });
    },
    onError: () => toast.error("Erro ao atualizar candidato"),
  });
}

export function useDeleteCandidate() {
  const qc = useQueryClient();
  const { currentWorkspace } = useWorkspace();
  const wsId = currentWorkspace?.id;
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("hr_candidates" as any).delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Candidato eliminado");
      qc.invalidateQueries({ queryKey: ["hr-candidates", wsId] });
    },
    onError: () => toast.error("Erro ao eliminar candidato"),
  });
}
