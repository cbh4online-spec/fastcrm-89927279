import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { toast } from "sonner";

export function useSecurityMaintenancePlans() {
  const { currentWorkspace } = useWorkspace();
  const workspaceId = currentWorkspace?.id;
  const qc = useQueryClient();

  const { data: plans = [], isLoading } = useQuery({
    queryKey: ["security-maintenance-plans", workspaceId],
    queryFn: async () => {
      if (!workspaceId) return [];
      const { data, error } = await supabase
        .from("security_maintenance_plans")
        .select("*, security_systems(system_type, security_installation_sites(site_name)), security_contracts(contract_type, contract_status)")
        .eq("workspace_id", workspaceId)
        .order("next_visit_at", { ascending: true });
      if (error) throw error;
      return data ?? [];
    },
    enabled: !!workspaceId,
  });

  const createPlan = useMutation({
    mutationFn: async (values: Record<string, any>) => {
      const payload = { ...values, workspace_id: workspaceId } as any;
      const { data, error } = await supabase.from("security_maintenance_plans").insert(payload).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["security-maintenance-plans"] }); toast.success("Plano de manutenção criado"); },
    onError: (e: any) => toast.error(e.message),
  });

  const updatePlan = useMutation({
    mutationFn: async ({ id, ...values }: Record<string, any>) => {
      const { data, error } = await supabase.from("security_maintenance_plans").update(values).eq("id", id).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["security-maintenance-plans"] }); toast.success("Plano atualizado"); },
    onError: (e: any) => toast.error(e.message),
  });

  return { plans, isLoading, createPlan, updatePlan };
}

export function useSecurityMaintenanceVisits(planId?: string) {
  const { currentWorkspace } = useWorkspace();
  const workspaceId = currentWorkspace?.id;
  const qc = useQueryClient();

  const { data: visits = [], isLoading } = useQuery({
    queryKey: ["security-maintenance-visits", workspaceId, planId],
    queryFn: async () => {
      if (!workspaceId) return [];
      let query = supabase
        .from("security_maintenance_visits")
        .select("*, security_systems(system_type, security_installation_sites(site_name)), security_maintenance_plans(frequency_type)")
        .eq("workspace_id", workspaceId)
        .order("scheduled_at", { ascending: true });
      if (planId) query = query.eq("maintenance_plan_id", planId);
      const { data, error } = await query;
      if (error) throw error;
      return data ?? [];
    },
    enabled: !!workspaceId,
  });

  const createVisit = useMutation({
    mutationFn: async (values: Record<string, any>) => {
      const payload = { ...values, workspace_id: workspaceId } as any;
      const { data, error } = await supabase.from("security_maintenance_visits").insert(payload).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["security-maintenance-visits"] }); toast.success("Visita criada"); },
    onError: (e: any) => toast.error(e.message),
  });

  const updateVisit = useMutation({
    mutationFn: async ({ id, ...values }: Record<string, any>) => {
      const { data, error } = await supabase.from("security_maintenance_visits").update(values).eq("id", id).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["security-maintenance-visits"] }); toast.success("Visita atualizada"); },
    onError: (e: any) => toast.error(e.message),
  });

  return { visits, isLoading, createVisit, updateVisit };
}
