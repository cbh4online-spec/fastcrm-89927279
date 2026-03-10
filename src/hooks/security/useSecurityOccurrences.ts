import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { toast } from "sonner";

export function useSecurityOccurrences(filters?: { status?: string; severity?: string }) {
  const { currentWorkspace } = useWorkspace();
  const workspaceId = currentWorkspace?.id;
  const qc = useQueryClient();

  const { data: occurrences = [], isLoading } = useQuery({
    queryKey: ["security-occurrences", workspaceId, filters],
    queryFn: async () => {
      if (!workspaceId) return [];
      let query = supabase
        .from("security_occurrences")
        .select("*, security_systems(system_type, security_installation_sites(site_name))")
        .eq("workspace_id", workspaceId)
        .order("created_at", { ascending: false });
      if (filters?.status) query = query.eq("status", filters.status);
      if (filters?.severity) query = query.eq("severity", filters.severity);
      const { data, error } = await query;
      if (error) throw error;
      return data ?? [];
    },
    enabled: !!workspaceId,
  });

  const createOccurrence = useMutation({
    mutationFn: async (values: Record<string, any>) => {
      const payload = { ...values, workspace_id: workspaceId } as any;
      const { data, error } = await supabase.from("security_occurrences").insert(payload).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["security-occurrences"] }); toast.success("Ocorrência criada"); },
    onError: (e: any) => toast.error(e.message),
  });

  const updateOccurrence = useMutation({
    mutationFn: async ({ id, ...values }: Record<string, any>) => {
      const { data, error } = await supabase.from("security_occurrences").update(values).eq("id", id).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["security-occurrences"] }); toast.success("Ocorrência atualizada"); },
    onError: (e: any) => toast.error(e.message),
  });

  const closeOccurrence = useMutation({
    mutationFn: async ({ id, resolution_summary }: { id: string; resolution_summary: string }) => {
      if (!resolution_summary?.trim()) throw new Error("É obrigatório indicar a resolução ou motivo de fecho.");
      const { data: user } = await supabase.auth.getUser();
      const { data, error } = await supabase.from("security_occurrences").update({
        status: "closed",
        resolution_summary,
        resolved_at: new Date().toISOString(),
        resolved_by: user?.user?.id,
      }).eq("id", id).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["security-occurrences"] }); toast.success("Ocorrência fechada"); },
    onError: (e: any) => toast.error(e.message),
  });

  return { occurrences, isLoading, createOccurrence, updateOccurrence, closeOccurrence };
}

export function useSecurityOccurrence(id: string | undefined) {
  return useQuery({
    queryKey: ["security-occurrence", id],
    queryFn: async () => {
      if (!id) return null;
      const { data, error } = await supabase
        .from("security_occurrences")
        .select("*, security_systems(*, security_installation_sites(*)), security_system_zones(zone_name), security_installed_devices(brand, model, device_type)")
        .eq("id", id)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!id,
  });
}
