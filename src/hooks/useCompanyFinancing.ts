import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

export type FinancingRating = "A" | "B" | "C" | "D";
export type DocumentationStatus = "pendente" | "ok";
export type PaymentFrequency = "mensal" | "trimestral";
export type SimulationStatus = "simulacao" | "activo" | "concluido" | "cancelado";

export interface CompanyFinancing {
  id: string;
  workspace_id: string;
  company_id: string;
  plafond_amount: number | null;
  rating: FinancingRating | null;
  documentation_status: DocumentationStatus;
  documentation_notes: string | null;
  request_date: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface FinancingSimulation {
  id: string;
  workspace_id: string;
  company_id: string;
  label: string | null;
  operation_value: number;
  payment_frequency: PaymentFrequency;
  duration_months: number;
  installment_value: number;
  interest_rate: number | null;
  status: SimulationStatus;
  start_date: string | null;
  end_date: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export function useCompanyFinancing(companyId: string | undefined) {
  const { currentWorkspace } = useWorkspace();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const workspaceId = currentWorkspace?.id;

  const financingQuery = useQuery({
    queryKey: ["company-financing", companyId],
    queryFn: async () => {
      if (!companyId) return null;
      const { data, error } = await (supabase as any)
        .from("company_financing")
        .select("*")
        .eq("company_id", companyId)
        .maybeSingle();
      if (error) throw error;
      return data as CompanyFinancing | null;
    },
    enabled: !!companyId,
  });

  const simulationsQuery = useQuery({
    queryKey: ["company-financing-simulations", companyId],
    queryFn: async () => {
      if (!companyId) return [];
      const { data, error } = await (supabase as any)
        .from("company_financing_simulations")
        .select("*")
        .eq("company_id", companyId)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data || []) as FinancingSimulation[];
    },
    enabled: !!companyId,
  });

  const upsertFinancing = useMutation({
    mutationFn: async (input: Partial<CompanyFinancing>) => {
      if (!workspaceId || !companyId) throw new Error("Sem workspace ou empresa");
      const payload = {
        ...input,
        workspace_id: workspaceId,
        company_id: companyId,
        created_by: user?.id,
      };
      const { data, error } = await (supabase as any)
        .from("company_financing")
        .upsert(payload, { onConflict: "company_id" })
        .select()
        .single();
      if (error) throw error;
      return data as CompanyFinancing;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["company-financing", companyId] });
      toast.success("Financiamento atualizado");
    },
    onError: (err: Error) => toast.error("Erro ao atualizar", { description: err.message }),
  });

  const createSimulation = useMutation({
    mutationFn: async (input: Omit<Partial<FinancingSimulation>, "id">) => {
      if (!workspaceId || !companyId) throw new Error("Sem workspace ou empresa");
      const { data, error } = await (supabase as any)
        .from("company_financing_simulations")
        .insert({
          ...input,
          workspace_id: workspaceId,
          company_id: companyId,
          created_by: user?.id,
        })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["company-financing-simulations", companyId] });
      toast.success("Simulação criada");
    },
    onError: (err: Error) => toast.error("Erro ao criar simulação", { description: err.message }),
  });

  const updateSimulation = useMutation({
    mutationFn: async ({ id, ...patch }: Partial<FinancingSimulation> & { id: string }) => {
      const { data, error } = await (supabase as any)
        .from("company_financing_simulations")
        .update(patch)
        .eq("id", id)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["company-financing-simulations", companyId] });
      toast.success("Simulação atualizada");
    },
    onError: (err: Error) => toast.error("Erro ao atualizar", { description: err.message }),
  });

  const deleteSimulation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await (supabase as any)
        .from("company_financing_simulations")
        .delete()
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["company-financing-simulations", companyId] });
      toast.success("Simulação eliminada");
    },
    onError: (err: Error) => toast.error("Erro ao eliminar", { description: err.message }),
  });

  return {
    financing: financingQuery.data ?? null,
    simulations: simulationsQuery.data ?? [],
    isLoading: financingQuery.isLoading || simulationsQuery.isLoading,
    upsertFinancing: upsertFinancing.mutateAsync,
    createSimulation: createSimulation.mutateAsync,
    updateSimulation: updateSimulation.mutateAsync,
    deleteSimulation: deleteSimulation.mutateAsync,
    isSaving: upsertFinancing.isPending || createSimulation.isPending || updateSimulation.isPending,
  };
}
