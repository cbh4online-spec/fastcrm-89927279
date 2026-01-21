import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { toast } from "sonner";
import { 
  CreditProposal, 
  ProposalStatus, 
  CreditType,
  RequiredDocument 
} from "../types";

interface CreateProposalInput {
  entity_type: "contact" | "company";
  entity_id: string;
  entity_name: string;
  credit_type: CreditType;
  purpose: string;
  amount_requested: number;
  term_months: number;
  property_value?: number;
  property_location?: string;
  vehicle_brand?: string;
  vehicle_model?: string;
  vehicle_year?: number;
  vehicle_value?: number;
}

interface UpdateProposalInput {
  id: string;
  status?: ProposalStatus;
  amount_requested?: number;
  term_months?: number;
  notes?: string;
  assigned_to?: string;
  approved_amount?: number;
  approved_rate?: number;
  approved_term?: number;
  approved_monthly_payment?: number;
  selected_bank_id?: string;
}

export function useCreditProposals(filters?: {
  status?: ProposalStatus[];
  credit_type?: CreditType;
  search?: string;
}) {
  const { currentWorkspace } = useWorkspace();

  return useQuery({
    queryKey: ["credit-proposals", currentWorkspace?.id, filters],
    queryFn: async () => {
      if (!currentWorkspace?.id) return [];

      let query = (supabase as any)
        .from("credit_proposals")
        .select("*")
        .eq("workspace_id", currentWorkspace.id)
        .order("created_at", { ascending: false });

      if (filters?.status && filters.status.length > 0) {
        query = query.in("status", filters.status);
      }

      if (filters?.credit_type) {
        query = query.eq("credit_type", filters.credit_type);
      }

      if (filters?.search) {
        query = query.or(
          `reference_number.ilike.%${filters.search}%,entity_name.ilike.%${filters.search}%`
        );
      }

      const { data, error } = await query;

      if (error) throw error;
      return data as CreditProposal[];
    },
    enabled: !!currentWorkspace?.id,
  });
}

export function useCreditProposal(id: string | undefined) {
  const { currentWorkspace } = useWorkspace();

  return useQuery({
    queryKey: ["credit-proposal", id],
    queryFn: async () => {
      if (!id || !currentWorkspace?.id) return null;

      const { data, error } = await (supabase as any)
        .from("credit_proposals")
        .select("*")
        .eq("id", id)
        .eq("workspace_id", currentWorkspace.id)
        .single();

      if (error) throw error;
      return data as CreditProposal;
    },
    enabled: !!id && !!currentWorkspace?.id,
  });
}

export function useCreateCreditProposal() {
  const queryClient = useQueryClient();
  const { currentWorkspace } = useWorkspace();

  return useMutation({
    mutationFn: async (input: CreateProposalInput) => {
      if (!currentWorkspace?.id) throw new Error("No workspace selected");

      const year = new Date().getFullYear();
      const { count } = await (supabase as any)
        .from("credit_proposals")
        .select("*", { count: "exact", head: true })
        .eq("workspace_id", currentWorkspace.id);

      const reference_number = `CR-${year}-${String((count || 0) + 1).padStart(4, "0")}`;
      const required_documents = getRequiredDocuments(input.credit_type);

      let ltv_ratio: number | undefined;
      if (input.credit_type === "habitacao" && input.property_value) {
        ltv_ratio = (input.amount_requested / input.property_value) * 100;
      }

      const { data: userData } = await supabase.auth.getUser();

      const { data, error } = await (supabase as any)
        .from("credit_proposals")
        .insert({
          workspace_id: currentWorkspace.id,
          reference_number,
          entity_type: input.entity_type,
          entity_id: input.entity_id,
          entity_name: input.entity_name,
          credit_type: input.credit_type,
          purpose: input.purpose,
          amount_requested: input.amount_requested,
          term_months: input.term_months,
          property_value: input.property_value,
          property_location: input.property_location,
          ltv_ratio,
          vehicle_brand: input.vehicle_brand,
          vehicle_model: input.vehicle_model,
          vehicle_year: input.vehicle_year,
          vehicle_value: input.vehicle_value,
          status: "draft",
          status_history: [],
          current_stage_since: new Date().toISOString(),
          bank_submissions: [],
          required_documents,
          documents_complete: false,
          created_by: userData.user?.id || "",
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["credit-proposals"] });
      toast.success("Proposta de crédito criada com sucesso");
    },
    onError: (error: Error) => {
      toast.error("Erro ao criar proposta", { description: error.message });
    },
  });
}

export function useUpdateCreditProposal() {
  const queryClient = useQueryClient();
  const { currentWorkspace } = useWorkspace();

  return useMutation({
    mutationFn: async (input: UpdateProposalInput) => {
      if (!currentWorkspace?.id) throw new Error("No workspace selected");

      const { id, ...updateData } = input;

      const { data, error } = await (supabase as any)
        .from("credit_proposals")
        .update({
          ...updateData,
          updated_at: new Date().toISOString(),
        })
        .eq("id", id)
        .eq("workspace_id", currentWorkspace.id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (data: any) => {
      queryClient.invalidateQueries({ queryKey: ["credit-proposals"] });
      queryClient.invalidateQueries({ queryKey: ["credit-proposal", data.id] });
      toast.success("Proposta atualizada com sucesso");
    },
    onError: (error: Error) => {
      toast.error("Erro ao atualizar proposta", { description: error.message });
    },
  });
}

export function useDeleteCreditProposal() {
  const queryClient = useQueryClient();
  const { currentWorkspace } = useWorkspace();

  return useMutation({
    mutationFn: async (id: string) => {
      if (!currentWorkspace?.id) throw new Error("No workspace selected");

      const { error } = await (supabase as any)
        .from("credit_proposals")
        .delete()
        .eq("id", id)
        .eq("workspace_id", currentWorkspace.id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["credit-proposals"] });
      toast.success("Proposta eliminada com sucesso");
    },
    onError: (error: Error) => {
      toast.error("Erro ao eliminar proposta", { description: error.message });
    },
  });
}

function getRequiredDocuments(creditType: CreditType): RequiredDocument[] {
  const commonDocs: RequiredDocument[] = [
    { id: "1", type: "id_card", name: "Cartão de Cidadão", is_required: true, is_uploaded: false },
    { id: "2", type: "irs", name: "Declaração IRS (último ano)", is_required: true, is_uploaded: false },
    { id: "3", type: "salary_receipt", name: "Recibos de Vencimento (3 meses)", is_required: true, is_uploaded: false },
    { id: "4", type: "bank_statement", name: "Extratos Bancários (3 meses)", is_required: true, is_uploaded: false },
  ];

  switch (creditType) {
    case "habitacao":
      return [
        ...commonDocs,
        { id: "5", type: "property_deed", name: "Caderneta Predial", is_required: true, is_uploaded: false },
      ];
    case "automovel":
      return [
        ...commonDocs,
        { id: "5", type: "vehicle_docs", name: "Proposta/Fatura do Veículo", is_required: true, is_uploaded: false },
      ];
    case "empresarial":
      return [
        { id: "1", type: "id_card", name: "CC do(s) Sócio(s)", is_required: true, is_uploaded: false },
        { id: "2", type: "business_license", name: "Certidão Permanente", is_required: true, is_uploaded: false },
        { id: "3", type: "financial_statements", name: "Balanço e Demonstração de Resultados", is_required: true, is_uploaded: false },
      ];
    default:
      return commonDocs;
  }
}
