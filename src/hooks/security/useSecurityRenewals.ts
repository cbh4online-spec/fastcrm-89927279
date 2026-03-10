import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { toast } from "sonner";

export function useSecurityRenewals(filters?: { stage?: string }) {
  const { currentWorkspace } = useWorkspace();
  const workspaceId = currentWorkspace?.id;
  const qc = useQueryClient();

  const { data: renewals = [], isLoading } = useQuery({
    queryKey: ["security-renewals", workspaceId, filters],
    queryFn: async () => {
      if (!workspaceId) return [];
      let query = supabase
        .from("security_renewals")
        .select("*, security_contracts(contract_type, contract_status, start_date, end_date, commercial_terms_json, security_systems(system_type, security_installation_sites(site_name)), security_clients(company_name, contact_name))")
        .eq("workspace_id", workspaceId)
        .order("renewal_due_date", { ascending: true });
      if (filters?.stage) query = query.eq("renewal_stage", filters.stage);
      const { data, error } = await query;
      if (error) throw error;
      return data ?? [];
    },
    enabled: !!workspaceId,
  });

  const createRenewal = useMutation({
    mutationFn: async (values: Record<string, any>) => {
      const payload = { ...values, workspace_id: workspaceId } as any;
      const { data, error } = await supabase.from("security_renewals").insert(payload).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["security-renewals"] }); toast.success("Renovação criada"); },
    onError: (e: any) => toast.error(e.message),
  });

  const updateRenewal = useMutation({
    mutationFn: async ({ id, ...values }: Record<string, any>) => {
      const { data, error } = await supabase.from("security_renewals").update(values).eq("id", id).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["security-renewals"] });
      qc.invalidateQueries({ queryKey: ["security-renewal-activities"] });
      toast.success("Renovação atualizada");
    },
    onError: (e: any) => toast.error(e.message),
  });

  const advanceStage = useMutation({
    mutationFn: async ({ id, newStage, notes }: { id: string; newStage: string; notes?: string }) => {
      const updates: Record<string, any> = { renewal_stage: newStage };
      if (notes) updates.result_notes = notes;
      if (newStage === "renewed") updates.new_contract_id = null; // placeholder
      const { data, error } = await supabase.from("security_renewals").update(updates).eq("id", id).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["security-renewals"] });
      qc.invalidateQueries({ queryKey: ["security-renewal"] });
      qc.invalidateQueries({ queryKey: ["security-renewal-activities"] });
      toast.success("Estágio atualizado");
    },
    onError: (e: any) => toast.error(e.message),
  });

  const logContact = useMutation({
    mutationFn: async ({ id, response }: { id: string; response: string }) => {
      const { data: current } = await supabase.from("security_renewals").select("contact_attempts").eq("id", id).single();
      const attempts = ((current as any)?.contact_attempts || 0) + 1;
      const { data, error } = await supabase.from("security_renewals").update({
        contact_attempts: attempts,
        last_contact_at: new Date().toISOString(),
        client_response: response,
      }).eq("id", id).select().single();
      if (error) throw error;
      // Log activity
      await supabase.from("security_renewal_activities").insert({
        renewal_id: id,
        workspace_id: (data as any).workspace_id,
        activity_type: "contact",
        description: `Contacto #${attempts}: ${response}`,
        user_id: (await supabase.auth.getUser()).data?.user?.id,
        metadata: { attempt: attempts, response },
      } as any);
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["security-renewals"] });
      qc.invalidateQueries({ queryKey: ["security-renewal"] });
      qc.invalidateQueries({ queryKey: ["security-renewal-activities"] });
      toast.success("Contacto registado");
    },
    onError: (e: any) => toast.error(e.message),
  });

  const addRenewalNote = useMutation({
    mutationFn: async ({ renewalId, note }: { renewalId: string; note: string }) => {
      const { data: user } = await supabase.auth.getUser();
      const { data, error } = await supabase.from("security_renewal_activities").insert({
        renewal_id: renewalId,
        workspace_id: workspaceId,
        activity_type: "note",
        description: note,
        user_id: user?.user?.id,
      } as any).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["security-renewal-activities"] });
      toast.success("Nota adicionada");
    },
    onError: (e: any) => toast.error(e.message),
  });

  // Trigger auto-create renewals
  const triggerAutoCreate = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.rpc("auto_create_security_renewals" as any);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["security-renewals"] });
      toast.success("Renovações verificadas");
    },
    onError: (e: any) => toast.error(e.message),
  });

  return { renewals, isLoading, createRenewal, updateRenewal, advanceStage, logContact, addRenewalNote, triggerAutoCreate };
}

export function useSecurityRenewal(id: string | undefined) {
  return useQuery({
    queryKey: ["security-renewal", id],
    queryFn: async () => {
      if (!id) return null;
      const { data, error } = await supabase
        .from("security_renewals")
        .select("*, security_contracts(*, security_systems(*, security_installation_sites(*)), security_clients(*))")
        .eq("id", id)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!id,
  });
}

export function useRenewalActivities(renewalId: string | undefined) {
  return useQuery({
    queryKey: ["security-renewal-activities", renewalId],
    queryFn: async () => {
      if (!renewalId) return [];
      const { data, error } = await supabase
        .from("security_renewal_activities")
        .select("*")
        .eq("renewal_id", renewalId)
        .order("created_at", { ascending: true });
      if (error) throw error;
      return data ?? [];
    },
    enabled: !!renewalId,
  });
}
