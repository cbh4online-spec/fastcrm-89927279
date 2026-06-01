import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import type { EquipmentStatus, EquipmentUnit, EquipmentHistoryEvent } from "../types";

export function useEquipmentUnits(filters?: {
  status?: EquipmentStatus;
  search?: string;
  clientId?: string;
  productId?: string;
}) {
  const { currentWorkspace } = useWorkspace();
  const wid = currentWorkspace?.id;

  return useQuery({
    queryKey: ["equipment-units", wid, filters?.status, filters?.search, filters?.clientId, filters?.productId],
    queryFn: async () => {
      if (!wid) return [] as EquipmentUnit[];
      let q = supabase
        .from("equipment_units")
        .select(
          `*,
           product:products(id,name,sku),
           current_contract:rental_contracts(id,contract_number),
           current_client:companies(id,name)`,
        )
        .eq("workspace_id", wid)
        .order("updated_at", { ascending: false })
        .limit(500);
      if (filters?.status) q = q.eq("status", filters.status);
      if (filters?.clientId) q = q.eq("current_client_company_id", filters.clientId);
      if (filters?.productId) q = q.eq("product_id", filters.productId);
      if (filters?.search) q = q.ilike("serial_number", `%${filters.search}%`);
      const { data, error } = await q;
      if (error) throw error;
      return (data ?? []) as unknown as EquipmentUnit[];
    },
    enabled: !!wid,
  });
}

export function useEquipmentUnit(id: string | undefined) {
  const { currentWorkspace } = useWorkspace();
  const wid = currentWorkspace?.id;
  return useQuery({
    queryKey: ["equipment-unit", id],
    queryFn: async () => {
      if (!id || !wid) return null;
      const { data, error } = await supabase
        .from("equipment_units")
        .select(
          `*,
           product:products(id,name,sku),
           current_contract:rental_contracts(id,contract_number,status,start_date,end_date),
           current_client:companies(id,name,tax_id)`,
        )
        .eq("id", id)
        .eq("workspace_id", wid)
        .maybeSingle();
      if (error) throw error;
      return data as unknown as EquipmentUnit | null;
    },
    enabled: !!id && !!wid,
  });
}

export function useEquipmentHistory(unitId: string | undefined) {
  return useQuery({
    queryKey: ["equipment-history", unitId],
    queryFn: async () => {
      if (!unitId) return [] as EquipmentHistoryEvent[];
      const { data, error } = await supabase
        .from("equipment_unit_history")
        .select("*")
        .eq("equipment_unit_id", unitId)
        .order("occurred_at", { ascending: false })
        .limit(200);
      if (error) throw error;
      return (data ?? []) as unknown as EquipmentHistoryEvent[];
    },
    enabled: !!unitId,
  });
}
