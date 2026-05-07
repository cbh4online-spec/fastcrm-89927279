/**
 * FastCRM Call Center Operations — React Query hooks (Fase 1R)
 */
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { toast } from "sonner";

const ws = (id?: string | null) => id || "";

// ===== Generic CRUD factory =====
function makeList<T>(table: string, key: string) {
  return () => {
    const { currentWorkspace } = useWorkspace();
    return useQuery({
      queryKey: [key, currentWorkspace?.id],
      enabled: !!currentWorkspace?.id,
      queryFn: async () => {
        const { data, error } = await (supabase as any).from(table)
          .select("*").eq("workspace_id", ws(currentWorkspace?.id))
          .order("created_at", { ascending: false });
        if (error) throw error;
        return (data || []) as T[];
      },
    });
  };
}

function makeUpsert(table: string, key: string) {
  return () => {
    const qc = useQueryClient();
    const { currentWorkspace } = useWorkspace();
    return useMutation({
      mutationFn: async (input: any) => {
        const payload = { ...input, workspace_id: ws(currentWorkspace?.id) };
        if (input.id) {
          const { error } = await (supabase as any).from(table).update(payload).eq("id", input.id);
          if (error) throw error;
          return input.id;
        }
        const { data, error } = await (supabase as any).from(table).insert(payload).select("id").single();
        if (error) throw error;
        return data.id;
      },
      onSuccess: () => {
        qc.invalidateQueries({ queryKey: [key, currentWorkspace?.id] });
        toast.success("Guardado");
      },
      onError: (e: any) => toast.error(e.message),
    });
  };
}

function makeDelete(table: string, key: string) {
  return () => {
    const qc = useQueryClient();
    const { currentWorkspace } = useWorkspace();
    return useMutation({
      mutationFn: async (id: string) => {
        const { error } = await (supabase as any).from(table).delete().eq("id", id);
        if (error) throw error;
        return id;
      },
      onSuccess: () => {
        qc.invalidateQueries({ queryKey: [key, currentWorkspace?.id] });
        toast.success("Removido");
      },
      onError: (e: any) => toast.error(e.message),
    });
  };
}

// ===== Queues =====
export const useVoiceQueues = makeList<any>("voice_queues", "voice_queues");
export const useUpsertVoiceQueue = makeUpsert("voice_queues", "voice_queues");
export const useDeleteVoiceQueue = makeDelete("voice_queues", "voice_queues");

// ===== Queue Members =====
export const useVoiceQueueMembers = makeList<any>("voice_queue_members", "voice_queue_members");
export const useUpsertVoiceQueueMember = makeUpsert("voice_queue_members", "voice_queue_members");
export const useDeleteVoiceQueueMember = makeDelete("voice_queue_members", "voice_queue_members");

// ===== IVR =====
export const useVoiceIvrMenus = makeList<any>("voice_ivr_menus", "voice_ivr_menus");
export const useUpsertVoiceIvrMenu = makeUpsert("voice_ivr_menus", "voice_ivr_menus");
export const useDeleteVoiceIvrMenu = makeDelete("voice_ivr_menus", "voice_ivr_menus");

export const useVoiceIvrOptions = makeList<any>("voice_ivr_options", "voice_ivr_options");
export const useUpsertVoiceIvrOption = makeUpsert("voice_ivr_options", "voice_ivr_options");
export const useDeleteVoiceIvrOption = makeDelete("voice_ivr_options", "voice_ivr_options");

// ===== Routing =====
export const useVoiceRoutingRules = makeList<any>("voice_routing_rules", "voice_routing_rules");
export const useUpsertVoiceRoutingRule = makeUpsert("voice_routing_rules", "voice_routing_rules");
export const useDeleteVoiceRoutingRule = makeDelete("voice_routing_rules", "voice_routing_rules");

// ===== Business Hours =====
export const useVoiceBusinessHours = makeList<any>("voice_business_hours", "voice_business_hours");
export const useUpsertVoiceBusinessHours = makeUpsert("voice_business_hours", "voice_business_hours");
export const useDeleteVoiceBusinessHours = makeDelete("voice_business_hours", "voice_business_hours");

// ===== SLA =====
export const useVoiceSlaPolicies = makeList<any>("voice_sla_policies", "voice_sla_policies");
export const useUpsertVoiceSlaPolicy = makeUpsert("voice_sla_policies", "voice_sla_policies");
export const useDeleteVoiceSlaPolicy = makeDelete("voice_sla_policies", "voice_sla_policies");

// ===== Callbacks =====
export const useVoiceCallbacks = makeList<any>("voice_callback_requests", "voice_callbacks");
export const useUpsertVoiceCallback = makeUpsert("voice_callback_requests", "voice_callbacks");
export const useDeleteVoiceCallback = makeDelete("voice_callback_requests", "voice_callbacks");

// ===== Agent Status =====
export const useVoiceAgentStatus = makeList<any>("voice_agent_status", "voice_agent_status");
export const useUpsertVoiceAgentStatus = makeUpsert("voice_agent_status", "voice_agent_status");

// ===== Queue Events (logs) =====
export function useVoiceQueueEvents(limit = 100) {
  const { currentWorkspace } = useWorkspace();
  return useQuery({
    queryKey: ["voice_queue_events", currentWorkspace?.id, limit],
    enabled: !!currentWorkspace?.id,
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("voice_queue_events")
        .select("*")
        .eq("workspace_id", ws(currentWorkspace?.id))
        .order("created_at", { ascending: false })
        .limit(limit);
      if (error) throw error;
      return data || [];
    },
  });
}

// ===== Edge function helpers =====
export function useCompleteCallback() {
  const qc = useQueryClient();
  const { currentWorkspace } = useWorkspace();
  return useMutation({
    mutationFn: async (input: { callback_id: string; outcome: string; notes?: string; create_followup?: boolean }) => {
      const { data, error } = await supabase.functions.invoke("voice-complete-callback", {
        body: { workspace_id: currentWorkspace?.id, ...input },
      });
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["voice_callbacks", currentWorkspace?.id] });
      toast.success("Callback concluído");
    },
    onError: (e: any) => toast.error(e.message),
  });
}

export function useMissedCallRecovery() {
  const qc = useQueryClient();
  const { currentWorkspace } = useWorkspace();
  return useMutation({
    mutationFn: async (input: { call_log_id: string; mode?: "manual" | "automatic" }) => {
      const { data, error } = await supabase.functions.invoke("voice-missed-call-recovery", {
        body: { workspace_id: currentWorkspace?.id, ...input },
      });
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["voice_callbacks", currentWorkspace?.id] });
      toast.success("Recuperação iniciada");
    },
    onError: (e: any) => toast.error(e.message),
  });
}
