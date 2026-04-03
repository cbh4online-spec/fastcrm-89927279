import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { toast } from "sonner";

export type GeofenceZone = {
  id: string;
  workspace_id: string;
  name: string;
  latitude: number;
  longitude: number;
  radius_meters: number;
  address: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
};

const QK = "hr-geofence-zones";

export function useHRGeofenceZones() {
  const { currentWorkspace } = useWorkspace();
  const wsId = currentWorkspace?.id;

  return useQuery({
    queryKey: [QK, wsId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("hr_geofence_zones" as any)
        .select("*")
        .eq("workspace_id", wsId!)
        .order("name");
      if (error) throw error;
      return data as unknown as GeofenceZone[];
    },
    enabled: !!wsId,
  });
}

export function useCreateGeofenceZone() {
  const qc = useQueryClient();
  const { currentWorkspace } = useWorkspace();
  const wsId = currentWorkspace?.id;

  return useMutation({
    mutationFn: async (zone: { name: string; latitude: number; longitude: number; radius_meters: number; address?: string }) => {
      const { error } = await supabase
        .from("hr_geofence_zones" as any)
        .insert({ ...zone, workspace_id: wsId });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Zona criada");
      qc.invalidateQueries({ queryKey: [QK] });
    },
    onError: () => toast.error("Erro ao criar zona"),
  });
}

export function useUpdateGeofenceZone() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...data }: Partial<GeofenceZone> & { id: string }) => {
      const { error } = await supabase
        .from("hr_geofence_zones" as any)
        .update(data)
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Zona atualizada");
      qc.invalidateQueries({ queryKey: [QK] });
    },
    onError: () => toast.error("Erro ao atualizar zona"),
  });
}

export function useDeleteGeofenceZone() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("hr_geofence_zones" as any)
        .delete()
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Zona eliminada");
      qc.invalidateQueries({ queryKey: [QK] });
    },
    onError: () => toast.error("Erro ao eliminar zona"),
  });
}
