import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { toast } from "sonner";

export function useSecuritySystems() {
  const { currentWorkspace } = useWorkspace();
  const workspaceId = currentWorkspace?.id;
  const qc = useQueryClient();

  const { data: systems = [], isLoading } = useQuery({
    queryKey: ["security-systems", workspaceId],
    queryFn: async () => {
      if (!workspaceId) return [];
      const { data, error } = await supabase
        .from("security_systems")
        .select("*, security_installation_sites(site_name, locality)")
        .eq("workspace_id", workspaceId)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
    enabled: !!workspaceId,
  });

  const createSystem = useMutation({
    mutationFn: async (values: Record<string, any>) => {
      const { data, error } = await supabase
        .from("security_systems")
        .insert({ ...values, workspace_id: workspaceId })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["security-systems"] });
      toast.success("Sistema criado com sucesso");
    },
    onError: (e: any) => toast.error(e.message),
  });

  const updateSystem = useMutation({
    mutationFn: async ({ id, ...values }: Record<string, any>) => {
      const { data, error } = await supabase
        .from("security_systems")
        .update(values)
        .eq("id", id)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["security-systems"] });
      toast.success("Sistema atualizado");
    },
    onError: (e: any) => toast.error(e.message),
  });

  return { systems, isLoading, createSystem, updateSystem };
}

export function useSecuritySystem(id: string | undefined) {
  const { currentWorkspace } = useWorkspace();
  const workspaceId = currentWorkspace?.id;

  return useQuery({
    queryKey: ["security-system", id],
    queryFn: async () => {
      if (!id) return null;
      const { data, error } = await supabase
        .from("security_systems")
        .select("*, security_installation_sites(*), security_system_zones(*), security_installed_devices(*, security_equipment_catalog(brand, model, reference))")
        .eq("id", id)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!id && !!workspaceId,
  });
}

export function useSecurityZones(systemId: string | undefined) {
  return useQuery({
    queryKey: ["security-zones", systemId],
    queryFn: async () => {
      if (!systemId) return [];
      const { data, error } = await supabase
        .from("security_system_zones")
        .select("*")
        .eq("system_id", systemId)
        .order("sort_order");
      if (error) throw error;
      return data ?? [];
    },
    enabled: !!systemId,
  });
}

export function useSecurityInstalledDevices(systemId: string | undefined) {
  return useQuery({
    queryKey: ["security-installed-devices", systemId],
    queryFn: async () => {
      if (!systemId) return [];
      const { data, error } = await supabase
        .from("security_installed_devices")
        .select("*, security_equipment_catalog(brand, model, reference), security_system_zones(zone_name)")
        .eq("system_id", systemId)
        .order("created_at");
      if (error) throw error;
      return data ?? [];
    },
    enabled: !!systemId,
  });
}
