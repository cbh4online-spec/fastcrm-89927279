import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

export type LeadChefScheduledMessageStatus =
  | "scheduled"
  | "sent"
  | "cancelled"
  | "failed";

export interface LeadChefScheduledMessage {
  id: string;
  workspace_id: string;
  lead_id: string | null;
  profile_id: string | null;
  agent_id: string | null;
  source_appointment_id: string | null;
  template_id: string | null;
  channel: string;
  rendered_body: string;
  scheduled_for: string;
  status: LeadChefScheduledMessageStatus;
  cancel_reason: string | null;
  sent_at: string | null;
  cancelled_at: string | null;
  attempts: number;
  last_error: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

export function useLeadChefScheduledMessagesByLead(leadId?: string | null) {
  const { currentWorkspace } = useWorkspace();
  const workspaceId = currentWorkspace?.id;
  return useQuery({
    queryKey: ["leadchef-scheduled-messages", workspaceId, leadId],
    enabled: !!workspaceId && !!leadId,
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("leadchef_scheduled_messages")
        .select("*")
        .eq("workspace_id", workspaceId)
        .eq("lead_id", leadId)
        .order("scheduled_for", { ascending: false });
      if (error) throw error;
      return (data ?? []) as LeadChefScheduledMessage[];
    },
  });
}

export function useLeadChefPendingScheduledMessages() {
  const { currentWorkspace } = useWorkspace();
  const { user } = useAuth();
  const workspaceId = currentWorkspace?.id;
  return useQuery({
    queryKey: ["leadchef-scheduled-messages-pending", workspaceId, user?.id],
    enabled: !!workspaceId,
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("leadchef_scheduled_messages")
        .select("*, leads!inner(name, assigned_to)")
        .eq("workspace_id", workspaceId)
        .eq("status", "scheduled")
        .order("scheduled_for", { ascending: true })
        .limit(50);
      if (error) throw error;
      return (data ?? []) as Array<LeadChefScheduledMessage & { leads: { name: string; assigned_to: string | null } }>;
    },
  });
}

export function useCancelLeadChefScheduledMessage() {
  const qc = useQueryClient();
  const { currentWorkspace } = useWorkspace();
  const { user } = useAuth();
  const workspaceId = currentWorkspace?.id;
  return useMutation({
    mutationFn: async (id: string) => {
      if (!workspaceId) throw new Error("Workspace não selecionado.");
      const { error } = await (supabase as any)
        .from("leadchef_scheduled_messages")
        .update({
          status: "cancelled",
          cancel_reason: "manual",
          cancelled_at: new Date().toISOString(),
          cancelled_by: user?.id ?? null,
        })
        .eq("id", id)
        .eq("workspace_id", workspaceId)
        .eq("status", "scheduled");
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["leadchef-scheduled-messages"] });
      qc.invalidateQueries({ queryKey: ["leadchef-scheduled-messages-pending"] });
      toast.success("Envio cancelado.");
    },
    onError: (e: any) => toast.error(e?.message || "Não foi possível cancelar."),
  });
}
