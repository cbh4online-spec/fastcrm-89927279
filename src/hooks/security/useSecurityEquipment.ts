import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { toast } from "sonner";

export function useSecurityEquipmentCatalog() {
  const { currentWorkspace } = useWorkspace();
  const workspaceId = currentWorkspace?.id;
  const qc = useQueryClient();

  const { data: items = [], isLoading } = useQuery({
    queryKey: ["security-equipment-catalog", workspaceId],
    queryFn: async () => {
      if (!workspaceId) return [];
      const { data, error } = await supabase
        .from("security_equipment_catalog")
        .select("*")
        .eq("workspace_id", workspaceId)
        .order("brand", { ascending: true });
      if (error) throw error;
      return data ?? [];
    },
    enabled: !!workspaceId,
  });

  const createItem = useMutation({
    mutationFn: async (values: Record<string, any>) => {
      const { data, error } = await supabase
        .from("security_equipment_catalog")
        .insert({ ...values, workspace_id: workspaceId })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["security-equipment-catalog"] });
      toast.success("Equipamento adicionado ao catálogo");
    },
    onError: (e: any) => toast.error(e.message),
  });

  const updateItem = useMutation({
    mutationFn: async ({ id, ...values }: Record<string, any>) => {
      const { data, error } = await supabase
        .from("security_equipment_catalog")
        .update(values)
        .eq("id", id)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["security-equipment-catalog"] });
      toast.success("Equipamento atualizado");
    },
    onError: (e: any) => toast.error(e.message),
  });

  return { items, isLoading, createItem, updateItem };
}
