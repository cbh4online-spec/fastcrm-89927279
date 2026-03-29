import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { toast } from "sonner";

export function useMetaLeads(filters?: {
  status?: string;
  limit?: number;
}) {
  const { currentWorkspace } = useWorkspace();
  const workspaceId = currentWorkspace?.id;

  return useQuery({
    queryKey: ["meta-leads", workspaceId, filters],
    queryFn: async () => {
      if (!workspaceId) return [];
      let query = supabase
        .from("meta_leads" as any)
        .select("*")
        .eq("workspace_id", workspaceId)
        .order("received_at", { ascending: false })
        .limit(filters?.limit || 100);

      if (filters?.status) {
        query = query.eq("processing_status", filters.status);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data ?? [];
    },
    enabled: !!workspaceId,
    refetchInterval: 30_000,
  });
}

export function useReprocessLead() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (leadId: string) => {
      const { error } = await supabase
        .from("meta_leads" as any)
        .update({ processing_status: "pending", error_message: null })
        .eq("id", leadId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["meta-leads"] });
      toast.success("Lead recolocado na fila");
    },
  });
}

export function useMetaLeadStats() {
  const { currentWorkspace } = useWorkspace();
  const workspaceId = currentWorkspace?.id;

  return useQuery({
    queryKey: ["meta-lead-stats", workspaceId],
    queryFn: async () => {
      if (!workspaceId) return { total: 0, pending: 0, processed: 0, failed: 0 };

      const { data, error } = await supabase
        .from("meta_leads" as any)
        .select("processing_status")
        .eq("workspace_id", workspaceId);

      if (error) throw error;
      const leads = data ?? [];

      return {
        total: leads.length,
        pending: leads.filter((l: any) => l.processing_status === "pending").length,
        processed: leads.filter((l: any) => l.processing_status === "processed").length,
        failed: leads.filter((l: any) => l.processing_status === "failed").length,
      };
    },
    enabled: !!workspaceId,
  });
}

export function useMetaWebhookEvents(limit = 50) {
  const { currentWorkspace } = useWorkspace();
  const workspaceId = currentWorkspace?.id;

  return useQuery({
    queryKey: ["meta-webhook-events", workspaceId, limit],
    queryFn: async () => {
      if (!workspaceId) return [];
      const { data, error } = await supabase
        .from("meta_webhook_events" as any)
        .select("*")
        .eq("workspace_id", workspaceId)
        .order("created_at", { ascending: false })
        .limit(limit);
      if (error) throw error;
      return data ?? [];
    },
    enabled: !!workspaceId,
  });
}

export function useMetaFieldMappings() {
  const { currentWorkspace } = useWorkspace();
  const workspaceId = currentWorkspace?.id;
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ["meta-field-mappings", workspaceId],
    queryFn: async () => {
      if (!workspaceId) return [];
      const { data, error } = await supabase
        .from("meta_lead_field_mappings" as any)
        .select("*")
        .eq("workspace_id", workspaceId)
        .order("meta_field_name");
      if (error) throw error;
      return data ?? [];
    },
    enabled: !!workspaceId,
  });

  const upsertMapping = useMutation({
    mutationFn: async (mapping: {
      id?: string;
      meta_field_name: string;
      crm_field_name: string;
      crm_entity?: string;
      transform_rule?: string;
      form_id?: string | null;
    }) => {
      if (!workspaceId) throw new Error("No workspace");
      const { error } = await supabase
        .from("meta_lead_field_mappings" as any)
        .upsert({
          ...mapping,
          workspace_id: workspaceId,
          updated_at: new Date().toISOString(),
        });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["meta-field-mappings"] });
      toast.success("Mapeamento guardado");
    },
  });

  return { ...query, upsertMapping };
}
