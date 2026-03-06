import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { toast } from "sonner";
import { emitKernelEvent } from "@/lib/kernelEmitter";
import { BankPartner, CreditType, BankTerms, CommissionRate } from "../types";

interface CreateBankPartnerInput {
  name: string;
  logo_url?: string;
  contact_name?: string;
  contact_email?: string;
  contact_phone?: string;
  credit_types: CreditType[];
  terms: BankTerms[];
  commission_rates: CommissionRate[];
  notes?: string;
}

interface UpdateBankPartnerInput extends Partial<CreateBankPartnerInput> {
  id: string;
  is_active?: boolean;
}

export function useBankPartners() {
  const { currentWorkspace } = useWorkspace();

  return useQuery({
    queryKey: ["bank-partners", currentWorkspace?.id],
    queryFn: async () => {
      if (!currentWorkspace?.id) return [];

      const { data, error } = await (supabase as any)
        .from("bank_partners")
        .select("*")
        .eq("workspace_id", currentWorkspace.id)
        .order("name");

      if (error) throw error;
      return data as BankPartner[];
    },
    enabled: !!currentWorkspace?.id,
  });
}

export function useCreateBankPartner() {
  const queryClient = useQueryClient();
  const { currentWorkspace } = useWorkspace();

  return useMutation({
    mutationFn: async (input: CreateBankPartnerInput) => {
      if (!currentWorkspace?.id) throw new Error("No workspace selected");

      const { data, error } = await (supabase as any)
        .from("bank_partners")
        .insert({
          workspace_id: currentWorkspace.id,
          name: input.name,
          logo_url: input.logo_url,
          is_active: true,
          contact_name: input.contact_name,
          contact_email: input.contact_email,
          contact_phone: input.contact_phone,
          credit_types: input.credit_types,
          terms: input.terms,
          commission_rates: input.commission_rates,
          notes: input.notes,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (data: any) => {
      queryClient.invalidateQueries({ queryKey: ["bank-partners"] });
      toast.success("Parceiro bancário adicionado");
      console.log(`[VERTICAL-CREDIT] Bank partner added id=${data.id} name=${data.name}`);
      if (currentWorkspace?.id) {
        emitKernelEvent({
          workspace_id: currentWorkspace.id,
          type: "CREDIT.BANK_ADDED",
          entity_kind: "bank_partner",
          entity_id: data.id,
          source_module: "vertical-credit",
          payload: {
            name: data.name,
            credit_types: data.credit_types,
          },
        });
      }
    },
    onError: (error: Error) => {
      console.error(`[VERTICAL-CREDIT] Bank partner add failed: ${error.message}`);
      toast.error("Erro ao adicionar parceiro", { description: error.message });
    },
  });
}

export function useUpdateBankPartner() {
  const queryClient = useQueryClient();
  const { currentWorkspace } = useWorkspace();

  return useMutation({
    mutationFn: async (input: UpdateBankPartnerInput) => {
      if (!currentWorkspace?.id) throw new Error("No workspace selected");

      const { id, ...updateData } = input;

      const { data, error } = await (supabase as any)
        .from("bank_partners")
        .update({ ...updateData, updated_at: new Date().toISOString() })
        .eq("id", id)
        .eq("workspace_id", currentWorkspace.id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (data: any) => {
      queryClient.invalidateQueries({ queryKey: ["bank-partners"] });
      toast.success("Parceiro atualizado");
      console.log(`[VERTICAL-CREDIT] Bank partner updated id=${data.id}`);
    },
    onError: (error: Error) => {
      console.error(`[VERTICAL-CREDIT] Bank partner update failed: ${error.message}`);
      toast.error("Erro ao atualizar parceiro", { description: error.message });
    },
  });
}

export function useDeleteBankPartner() {
  const queryClient = useQueryClient();
  const { currentWorkspace } = useWorkspace();

  return useMutation({
    mutationFn: async (id: string) => {
      if (!currentWorkspace?.id) throw new Error("No workspace selected");

      const { error } = await (supabase as any)
        .from("bank_partners")
        .delete()
        .eq("id", id)
        .eq("workspace_id", currentWorkspace.id);

      if (error) throw error;
      return id;
    },
    onSuccess: (deletedId: string) => {
      queryClient.invalidateQueries({ queryKey: ["bank-partners"] });
      toast.success("Parceiro removido");
      console.log(`[VERTICAL-CREDIT] Bank partner deleted id=${deletedId}`);
    },
    onError: (error: Error) => {
      console.error(`[VERTICAL-CREDIT] Bank partner delete failed: ${error.message}`);
      toast.error("Erro ao remover parceiro", { description: error.message });
    },
  });
}

export function useBanksByType(creditType: CreditType) {
  const { data: allBanks } = useBankPartners();
  return (allBanks || []).filter(
    (bank) => bank.is_active && bank.credit_types.includes(creditType)
  );
}