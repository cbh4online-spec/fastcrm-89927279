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
        .order("priority_score", { ascending: false })
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
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["security-occurrences"] });
      qc.invalidateQueries({ queryKey: ["security-occurrence-activities"] });
      toast.success("Ocorrência atualizada");
    },
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
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["security-occurrences"] });
      qc.invalidateQueries({ queryKey: ["security-occurrence-activities"] });
      toast.success("Ocorrência fechada");
    },
    onError: (e: any) => toast.error(e.message),
  });

  const escalateOccurrence = useMutation({
    mutationFn: async ({ id, reason }: { id: string; reason: string }) => {
      const { data: current } = await supabase.from("security_occurrences").select("escalation_level").eq("id", id).single();
      const newLevel = ((current as any)?.escalation_level || 0) + 1;
      const { data, error } = await supabase.from("security_occurrences").update({
        escalation_level: newLevel,
        escalated_at: new Date().toISOString(),
        escalation_reason: reason,
      }).eq("id", id).select().single();
      if (error) throw error;
      // Log escalation activity
      await supabase.from("security_occurrence_activities").insert({
        occurrence_id: id,
        workspace_id: (data as any).workspace_id,
        activity_type: "escalation",
        description: `Escalada para nível ${newLevel}: ${reason}`,
        user_id: (await supabase.auth.getUser()).data?.user?.id,
        metadata: { level: newLevel, reason },
      } as any);
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["security-occurrences"] });
      qc.invalidateQueries({ queryKey: ["security-occurrence-activities"] });
      toast.success("Ocorrência escalada");
    },
    onError: (e: any) => toast.error(e.message),
  });

  const addOccurrenceNote = useMutation({
    mutationFn: async ({ occurrenceId, workspaceId: wsId, note }: { occurrenceId: string; workspaceId: string; note: string }) => {
      const { data: user } = await supabase.auth.getUser();
      const { data, error } = await supabase.from("security_occurrence_activities").insert({
        occurrence_id: occurrenceId,
        workspace_id: wsId,
        activity_type: "note",
        description: note,
        user_id: user?.user?.id,
      } as any).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["security-occurrence-activities"] });
      toast.success("Nota adicionada");
    },
    onError: (e: any) => toast.error(e.message),
  });

  return { occurrences, isLoading, createOccurrence, updateOccurrence, closeOccurrence, escalateOccurrence, addOccurrenceNote };
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

export function useOccurrenceActivities(occurrenceId: string | undefined) {
  return useQuery({
    queryKey: ["security-occurrence-activities", occurrenceId],
    queryFn: async () => {
      if (!occurrenceId) return [];
      const { data, error } = await supabase
        .from("security_occurrence_activities")
        .select("*")
        .eq("occurrence_id", occurrenceId)
        .order("created_at", { ascending: true });
      if (error) throw error;
      return data ?? [];
    },
    enabled: !!occurrenceId,
  });
}
