import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import type { ClientEntitlement, SessionConsumption, EntitlementStatus } from "@/types/product";

// Fetch entitlements for a product
export function useProductEntitlements(productId: string | undefined) {
  const { currentWorkspace } = useWorkspace();

  return useQuery({
    queryKey: ["product-entitlements", productId],
    queryFn: async () => {
      if (!productId || !currentWorkspace?.id) return [];

      const { data, error } = await supabase
        .from("client_entitlements")
        .select(`
          *,
          contact:contacts(id, name),
          company:companies(id, name)
        `)
        .eq("product_id", productId)
        .eq("workspace_id", currentWorkspace.id)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data as ClientEntitlement[];
    },
    enabled: !!productId && !!currentWorkspace?.id,
  });
}

// Fetch entitlements for a contact/company
export function useClientEntitlements(params: { contactId?: string; companyId?: string }) {
  const { currentWorkspace } = useWorkspace();

  return useQuery({
    queryKey: ["client-entitlements", params.contactId, params.companyId],
    queryFn: async () => {
      if (!currentWorkspace?.id) return [];
      if (!params.contactId && !params.companyId) return [];

      let query = supabase
        .from("client_entitlements")
        .select(`
          *,
          product:products(*)
        `)
        .eq("workspace_id", currentWorkspace.id)
        .order("created_at", { ascending: false });

      if (params.contactId) {
        query = query.eq("contact_id", params.contactId);
      }
      if (params.companyId) {
        query = query.eq("company_id", params.companyId);
      }

      const { data, error } = await query;

      if (error) throw error;
      return data as ClientEntitlement[];
    },
    enabled: !!currentWorkspace?.id && (!!params.contactId || !!params.companyId),
  });
}

// Create entitlement
export function useCreateEntitlement() {
  const queryClient = useQueryClient();
  const { currentWorkspace } = useWorkspace();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (input: {
      productId: string;
      contactId?: string;
      companyId?: string;
      leadId?: string;
      opportunityId?: string;
      proposalId?: string;
      totalUnits: number;
      unitName?: string;
      expiryDate?: string;
      notes?: string;
    }) => {
      if (!currentWorkspace?.id || !user?.id) {
        throw new Error("Workspace ou utilizador não encontrado");
      }

      const { data, error } = await supabase
        .from("client_entitlements")
        .insert({
          workspace_id: currentWorkspace.id,
          product_id: input.productId,
          contact_id: input.contactId,
          company_id: input.companyId,
          lead_id: input.leadId,
          opportunity_id: input.opportunityId,
          proposal_id: input.proposalId,
          total_units: input.totalUnits,
          unit_name: input.unitName || 'sessão',
          expiry_date: input.expiryDate,
          notes: input.notes,
          created_by: user.id,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["product-entitlements", variables.productId] });
      queryClient.invalidateQueries({ queryKey: ["client-entitlements"] });
      toast.success("Pacote criado com sucesso!");
    },
    onError: (error) => {
      toast.error("Erro ao criar pacote: " + error.message);
    },
  });
}

// Update entitlement status
export function useUpdateEntitlement() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: {
      id: string;
      status?: EntitlementStatus;
      notes?: string;
      expiryDate?: string | null;
    }) => {
      const updateData: Record<string, any> = {
        updated_at: new Date().toISOString(),
      };

      if (input.status !== undefined) updateData.status = input.status;
      if (input.notes !== undefined) updateData.notes = input.notes;
      if (input.expiryDate !== undefined) updateData.expiry_date = input.expiryDate;

      const { data, error } = await supabase
        .from("client_entitlements")
        .update(updateData)
        .eq("id", input.id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["product-entitlements"] });
      queryClient.invalidateQueries({ queryKey: ["client-entitlements"] });
      toast.success("Pacote atualizado!");
    },
    onError: (error) => {
      toast.error("Erro ao atualizar pacote: " + error.message);
    },
  });
}

// Fetch consumptions for an entitlement
export function useSessionConsumptions(entitlementId: string | undefined) {
  const { currentWorkspace } = useWorkspace();

  return useQuery({
    queryKey: ["session-consumptions", entitlementId],
    queryFn: async () => {
      if (!entitlementId || !currentWorkspace?.id) return [];

      const { data, error } = await supabase
        .from("session_consumptions")
        .select("*")
        .eq("entitlement_id", entitlementId)
        .eq("workspace_id", currentWorkspace.id)
        .order("session_date", { ascending: false });

      if (error) throw error;
      return data as SessionConsumption[];
    },
    enabled: !!entitlementId && !!currentWorkspace?.id,
  });
}

// Register session consumption
export function useRegisterConsumption() {
  const queryClient = useQueryClient();
  const { currentWorkspace } = useWorkspace();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (input: {
      entitlementId: string;
      unitsConsumed?: number;
      sessionDate?: string;
      notes?: string;
    }) => {
      if (!currentWorkspace?.id || !user?.id) {
        throw new Error("Workspace ou utilizador não encontrado");
      }

      const { data, error } = await supabase
        .from("session_consumptions")
        .insert({
          workspace_id: currentWorkspace.id,
          entitlement_id: input.entitlementId,
          units_consumed: input.unitsConsumed || 1,
          session_date: input.sessionDate || new Date().toISOString(),
          notes: input.notes,
          performed_by: user.id,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["session-consumptions", variables.entitlementId] });
      queryClient.invalidateQueries({ queryKey: ["product-entitlements"] });
      queryClient.invalidateQueries({ queryKey: ["client-entitlements"] });
      toast.success("Sessão registada!");
    },
    onError: (error) => {
      toast.error("Erro ao registar sessão: " + error.message);
    },
  });
}

// Delete consumption
export function useDeleteConsumption() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, entitlementId }: { id: string; entitlementId: string }) => {
      const { error } = await supabase
        .from("session_consumptions")
        .delete()
        .eq("id", id);

      if (error) throw error;
      return { entitlementId };
    },
    onSuccess: ({ entitlementId }) => {
      queryClient.invalidateQueries({ queryKey: ["session-consumptions", entitlementId] });
      queryClient.invalidateQueries({ queryKey: ["product-entitlements"] });
      queryClient.invalidateQueries({ queryKey: ["client-entitlements"] });
      toast.success("Registo removido!");
    },
    onError: (error) => {
      toast.error("Erro ao remover registo: " + error.message);
    },
  });
}
