import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { toast } from "sonner";

export type HelpdeskTrigger =
  | "on_create"
  | "on_sla_warning"
  | "on_sla_breach"
  | "on_status_change"
  | "on_priority_change";

export type HelpdeskActionType =
  | "auto_assign_round_robin"
  | "auto_assign_specific"
  | "escalate"
  | "change_priority"
  | "add_tag"
  | "send_notification"
  | "change_status";

export interface HelpdeskAutomation {
  id: string;
  workspace_id: string;
  name: string;
  trigger_event: HelpdeskTrigger;
  conditions: Record<string, unknown>;
  action_type: HelpdeskActionType;
  action_config: Record<string, unknown>;
  is_active: boolean;
  execution_count: number;
  last_executed_at: string | null;
  created_at: string;
  updated_at: string;
}

const TRIGGER_LABELS: Record<HelpdeskTrigger, string> = {
  on_create: "Ticket criado",
  on_sla_warning: "SLA em risco",
  on_sla_breach: "SLA violado",
  on_status_change: "Estado alterado",
  on_priority_change: "Prioridade alterada",
};

const ACTION_LABELS: Record<HelpdeskActionType, string> = {
  auto_assign_round_robin: "Auto-atribuir (round-robin)",
  auto_assign_specific: "Atribuir a agente específico",
  escalate: "Escalar",
  change_priority: "Alterar prioridade",
  add_tag: "Adicionar tag",
  send_notification: "Enviar notificação",
  change_status: "Alterar estado",
};

export { TRIGGER_LABELS, ACTION_LABELS };

export function useHelpdeskAutomations() {
  const { currentWorkspace } = useWorkspace();
  const workspaceId = currentWorkspace?.id;
  const queryClient = useQueryClient();
  const queryKey = ["helpdesk-automations", workspaceId];

  const query = useQuery({
    queryKey,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("helpdesk_automations" as any)
        .select("*")
        .eq("workspace_id", workspaceId!)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data || []) as unknown as HelpdeskAutomation[];
    },
    enabled: !!workspaceId,
  });

  const create = useMutation({
    mutationFn: async (rule: Omit<HelpdeskAutomation, "id" | "workspace_id" | "execution_count" | "last_executed_at" | "created_at" | "updated_at">) => {
      const { data, error } = await supabase
        .from("helpdesk_automations" as any)
        .insert({ ...rule, workspace_id: workspaceId! } as any)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey });
      toast.success("Automação criada com sucesso");
    },
    onError: () => toast.error("Erro ao criar automação"),
  });

  const update = useMutation({
    mutationFn: async ({ id, ...updates }: Partial<HelpdeskAutomation> & { id: string }) => {
      const { data, error } = await supabase
        .from("helpdesk_automations" as any)
        .update({ ...updates, updated_at: new Date().toISOString() } as any)
        .eq("id", id)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey });
      toast.success("Automação atualizada");
    },
    onError: () => toast.error("Erro ao atualizar automação"),
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("helpdesk_automations" as any)
        .delete()
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey });
      toast.success("Automação removida");
    },
    onError: () => toast.error("Erro ao remover automação"),
  });

  const toggleActive = useMutation({
    mutationFn: async ({ id, is_active }: { id: string; is_active: boolean }) => {
      const { error } = await supabase
        .from("helpdesk_automations" as any)
        .update({ is_active, updated_at: new Date().toISOString() } as any)
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey });
    },
  });

  return {
    automations: query.data || [],
    isLoading: query.isLoading,
    create,
    update,
    remove,
    toggleActive,
  };
}
