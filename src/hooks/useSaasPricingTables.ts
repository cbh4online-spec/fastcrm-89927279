import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

export type SaasPricingType = "segment" | "volume" | "promotional" | "tiered";
export type SaasTargetSegment = "startup" | "smb" | "enterprise" | "agency" | "partner" | "reseller";

export interface SaasPricingTable {
  id: string;
  workspace_id: string | null;
  name: string;
  description: string | null;
  pricing_type: SaasPricingType;
  target_segment: SaasTargetSegment | null;
  base_price: number | null;
  discount_percent: number | null;
  valid_from: string | null;
  valid_until: string | null;
  is_active: boolean;
  is_default: boolean;
  priority: number;
  created_at: string;
  updated_at: string;
  created_by: string | null;
}

export interface SaasPricingItem {
  id: string;
  pricing_table_id: string;
  plan_key: string;
  unit_price: number;
  discount_percent: number;
  volume_tiers: unknown;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface CreateSaasPricingTableInput {
  name: string;
  description?: string;
  pricing_type: SaasPricingType;
  target_segment?: string;
  base_price?: number;
  discount_percent?: number;
  valid_from?: string;
  valid_until?: string;
  is_active?: boolean;
  is_default?: boolean;
  priority?: number;
}

export interface UpdateSaasPricingTableInput extends Partial<CreateSaasPricingTableInput> {
  id: string;
}

export const pricingTypeLabels: Record<SaasPricingType, string> = {
  segment: "Por Segmento",
  volume: "Por Volume",
  promotional: "Promocional",
  tiered: "Por Escalões",
};

export const targetSegmentLabels: Record<SaasTargetSegment, string> = {
  startup: "Startup",
  smb: "PME",
  enterprise: "Enterprise",
  agency: "Agência",
  partner: "Parceiro",
  reseller: "Revendedor",
};

export function useSaasPricingTables() {
  const { currentWorkspace } = useWorkspace();

  return useQuery({
    queryKey: ["saas-pricing-tables", currentWorkspace?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("saas_pricing_tables")
        .select("*")
        .or(`workspace_id.is.null,workspace_id.eq.${currentWorkspace?.id}`)
        .order("priority", { ascending: false })
        .order("name", { ascending: true });

      if (error) throw error;
      return data as SaasPricingTable[];
    },
    enabled: !!currentWorkspace?.id,
  });
}

export function useSaasPricingTable(id: string | undefined) {
  return useQuery({
    queryKey: ["saas-pricing-table", id],
    queryFn: async () => {
      if (!id) return null;

      const { data, error } = await supabase
        .from("saas_pricing_tables")
        .select("*")
        .eq("id", id)
        .single();

      if (error) throw error;
      return data as SaasPricingTable;
    },
    enabled: !!id,
  });
}

export function useSaasPricingItems(pricingTableId: string | undefined) {
  return useQuery({
    queryKey: ["saas-pricing-items", pricingTableId],
    queryFn: async () => {
      if (!pricingTableId) return [];

      const { data, error } = await supabase
        .from("saas_pricing_items")
        .select("*")
        .eq("pricing_table_id", pricingTableId)
        .order("created_at", { ascending: true });

      if (error) throw error;
      return data as SaasPricingItem[];
    },
    enabled: !!pricingTableId,
  });
}

export function useCreateSaasPricingTable() {
  const queryClient = useQueryClient();
  const { currentWorkspace } = useWorkspace();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (input: CreateSaasPricingTableInput) => {
      const { data, error } = await supabase
        .from("saas_pricing_tables")
        .insert({
          ...input,
          workspace_id: currentWorkspace?.id,
          created_by: user?.id,
        })
        .select()
        .single();

      if (error) throw error;
      return data as SaasPricingTable;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["saas-pricing-tables"] });
      toast.success("Tabela de preços criada com sucesso!");
    },
    onError: (error) => {
      toast.error("Erro ao criar tabela: " + error.message);
    },
  });
}

export function useUpdateSaasPricingTable() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...input }: UpdateSaasPricingTableInput) => {
      const { data, error } = await supabase
        .from("saas_pricing_tables")
        .update({
          ...input,
          updated_at: new Date().toISOString(),
        })
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      return data as SaasPricingTable;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["saas-pricing-tables"] });
      queryClient.invalidateQueries({ queryKey: ["saas-pricing-table", data.id] });
      toast.success("Tabela de preços atualizada com sucesso!");
    },
    onError: (error) => {
      toast.error("Erro ao atualizar tabela: " + error.message);
    },
  });
}

export function useDeleteSaasPricingTable() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("saas_pricing_tables")
        .delete()
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["saas-pricing-tables"] });
      toast.success("Tabela de preços eliminada com sucesso!");
    },
    onError: (error) => {
      toast.error("Erro ao eliminar tabela: " + error.message);
    },
  });
}
