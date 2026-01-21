import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { toast } from "sonner";
import { FinancialProfile, ExistingCredit, Asset } from "../types";

interface CreateFinancialProfileInput {
  entity_type: "contact" | "company";
  entity_id: string;
  monthly_income: number;
  annual_income: number;
  income_type: "employment" | "self_employed" | "business" | "rental" | "pension" | "other";
  income_stability: "stable" | "variable" | "seasonal";
  monthly_expenses: number;
  existing_credits?: ExistingCredit[];
  assets?: Asset[];
  notes?: string;
}

interface UpdateFinancialProfileInput extends Partial<CreateFinancialProfileInput> {
  id: string;
}

export function useFinancialProfile(entityType: "contact" | "company", entityId: string | undefined) {
  const { currentWorkspace } = useWorkspace();

  return useQuery({
    queryKey: ["financial-profile", entityType, entityId],
    queryFn: async () => {
      if (!entityId || !currentWorkspace?.id) return null;

      const { data, error } = await (supabase as any)
        .from("financial_profiles")
        .select("*")
        .eq("entity_type", entityType)
        .eq("entity_id", entityId)
        .eq("workspace_id", currentWorkspace.id)
        .maybeSingle();

      if (error) throw error;
      return data as FinancialProfile | null;
    },
    enabled: !!entityId && !!currentWorkspace?.id,
  });
}

export function useCreateFinancialProfile() {
  const queryClient = useQueryClient();
  const { currentWorkspace } = useWorkspace();

  return useMutation({
    mutationFn: async (input: CreateFinancialProfileInput) => {
      if (!currentWorkspace?.id) throw new Error("No workspace selected");

      const totalMonthlyInstallments = (input.existing_credits || []).reduce(
        (sum, c) => sum + c.monthly_installment, 0
      );
      const effortRate = input.monthly_income > 0
        ? ((totalMonthlyInstallments + input.monthly_expenses) / input.monthly_income) * 100
        : 0;
      const disposableIncome = input.monthly_income - input.monthly_expenses - totalMonthlyInstallments;
      const debtToIncomeRatio = input.monthly_income > 0
        ? (totalMonthlyInstallments / input.monthly_income) * 100
        : 0;
      const totalAssetsValue = (input.assets || []).reduce((sum, a) => sum + a.estimated_value, 0);

      const { data, error } = await (supabase as any)
        .from("financial_profiles")
        .insert({
          workspace_id: currentWorkspace.id,
          entity_type: input.entity_type,
          entity_id: input.entity_id,
          monthly_income: input.monthly_income,
          annual_income: input.annual_income,
          income_type: input.income_type,
          income_stability: input.income_stability,
          monthly_expenses: input.monthly_expenses,
          existing_credits: input.existing_credits || [],
          total_monthly_installments: totalMonthlyInstallments,
          effort_rate: Math.round(effortRate * 100) / 100,
          disposable_income: disposableIncome,
          debt_to_income_ratio: Math.round(debtToIncomeRatio * 100) / 100,
          assets: input.assets || [],
          total_assets_value: totalAssetsValue,
          notes: input.notes,
        })
        .select()
        .single();

      if (error) throw error;
      return data as FinancialProfile;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["financial-profile", data.entity_type, data.entity_id] });
      toast.success("Perfil financeiro criado");
    },
    onError: (error: Error) => {
      toast.error("Erro ao criar perfil financeiro", { description: error.message });
    },
  });
}

export function useUpdateFinancialProfile() {
  const queryClient = useQueryClient();
  const { currentWorkspace } = useWorkspace();

  return useMutation({
    mutationFn: async (input: UpdateFinancialProfileInput) => {
      if (!currentWorkspace?.id) throw new Error("No workspace selected");

      const { id, ...updateData } = input;

      const { data, error } = await (supabase as any)
        .from("financial_profiles")
        .update({ ...updateData, updated_at: new Date().toISOString() })
        .eq("id", id)
        .eq("workspace_id", currentWorkspace.id)
        .select()
        .single();

      if (error) throw error;
      return data as FinancialProfile;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["financial-profile", data.entity_type, data.entity_id] });
      toast.success("Perfil financeiro atualizado");
    },
    onError: (error: Error) => {
      toast.error("Erro ao atualizar perfil", { description: error.message });
    },
  });
}
