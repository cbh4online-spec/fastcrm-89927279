import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import type { RentalContract, RentalStatus } from "../types";

export function useRentalContracts(filters?: { status?: RentalStatus; search?: string }) {
  const { currentWorkspace } = useWorkspace();
  const wid = currentWorkspace?.id;

  return useQuery({
    queryKey: ["rental-contracts", wid, filters?.status, filters?.search],
    queryFn: async () => {
      if (!wid) return [] as RentalContract[];
      let q = supabase
        .from("rental_contracts")
        .select(
          `*,
           end_client:companies!rental_contracts_end_client_company_id_fkey(id,name,tax_id),
           financier:companies!rental_contracts_financier_company_id_fkey(id,name,tax_id)`,
        )
        .eq("workspace_id", wid)
        .order("created_at", { ascending: false })
        .limit(200);
      if (filters?.status) q = q.eq("status", filters.status);
      if (filters?.search) q = q.ilike("contract_number", `%${filters.search}%`);
      const { data, error } = await q;
      if (error) throw error;
      return (data ?? []) as unknown as RentalContract[];
    },
    enabled: !!wid,
  });
}

export function useRentalContract(id: string | undefined) {
  const { currentWorkspace } = useWorkspace();
  const wid = currentWorkspace?.id;

  return useQuery({
    queryKey: ["rental-contract", id],
    queryFn: async () => {
      if (!id || !wid) return null;
      const { data, error } = await supabase
        .from("rental_contracts")
        .select(
          `*,
           end_client:companies!rental_contracts_end_client_company_id_fkey(id,name,tax_id,email,phone,address),
           financier:companies!rental_contracts_financier_company_id_fkey(id,name,tax_id),
           items:rental_contract_items(*, product:products(id,name,sku))`,
        )
        .eq("id", id)
        .eq("workspace_id", wid)
        .maybeSingle();
      if (error) throw error;
      return data as unknown as RentalContract | null;
    },
    enabled: !!id && !!wid,
  });
}

export function useRentalContractEvents(contractId: string | undefined) {
  return useQuery({
    queryKey: ["rental-contract-events", contractId],
    queryFn: async () => {
      if (!contractId) return [];
      const { data, error } = await supabase
        .from("rental_contract_events")
        .select("*")
        .eq("contract_id", contractId)
        .order("occurred_at", { ascending: false })
        .limit(200);
      if (error) throw error;
      return data ?? [];
    },
    enabled: !!contractId,
  });
}

export function useContractEquipment(contractId: string | undefined) {
  return useQuery({
    queryKey: ["rental-contract-equipment", contractId],
    queryFn: async () => {
      if (!contractId) return [];
      const { data, error } = await supabase
        .from("equipment_units")
        .select("*, product:products(id,name,sku)")
        .eq("current_contract_id", contractId)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
    enabled: !!contractId,
  });
}
