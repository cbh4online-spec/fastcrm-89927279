import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { toast } from "sonner";
import type {
  CommunicationChannelType,
  CommunicationChannelStatus,
} from "@/integrations/communication";

export interface CommunicationChannel {
  id: string;
  workspace_id: string;
  channel_type: CommunicationChannelType;
  display_name: string;
  provider_name: string | null;
  provider_instance_id: string | null;
  status: CommunicationChannelStatus;
  default_country: string | null;
  default_language: string | null;
  assigned_team_id: string | null;
  routing_rules: Record<string, unknown>;
  settings: Record<string, unknown>;
  metadata: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

export interface CommunicationChannelAccount {
  id: string;
  workspace_id: string;
  channel_id: string;
  channel_type: CommunicationChannelType;
  account_name: string | null;
  account_identifier: string | null;
  provider_name: string | null;
  credentials_secret_name: string | null;
  webhook_url: string | null;
  webhook_token: string | null;
  active: boolean;
  metadata: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

export function useCommunicationChannels() {
  const { currentWorkspace } = useWorkspace();
  return useQuery({
    queryKey: ["communication-channels", currentWorkspace?.id],
    queryFn: async () => {
      if (!currentWorkspace?.id) return [];
      const { data, error } = await (supabase as any)
        .from("communication_channels")
        .select("*")
        .eq("workspace_id", currentWorkspace.id)
        .order("created_at", { ascending: true });
      if (error) throw error;
      return (data ?? []) as CommunicationChannel[];
    },
    enabled: !!currentWorkspace?.id,
  });
}

export function useCommunicationChannelAccounts(channelId?: string) {
  const { currentWorkspace } = useWorkspace();
  return useQuery({
    queryKey: ["communication-channel-accounts", currentWorkspace?.id, channelId],
    queryFn: async () => {
      if (!currentWorkspace?.id) return [];
      let q = (supabase as any)
        .from("communication_channel_accounts")
        .select("*")
        .eq("workspace_id", currentWorkspace.id)
        .order("created_at", { ascending: true });
      if (channelId) q = q.eq("channel_id", channelId);
      const { data, error } = await q;
      if (error) throw error;
      return (data ?? []) as CommunicationChannelAccount[];
    },
    enabled: !!currentWorkspace?.id,
  });
}

export function useUpsertCommunicationChannel() {
  const qc = useQueryClient();
  const { currentWorkspace } = useWorkspace();
  return useMutation({
    mutationFn: async (input: Partial<CommunicationChannel> & { channel_type: CommunicationChannelType; display_name: string }) => {
      if (!currentWorkspace?.id) throw new Error("Sem workspace");
      const { data, error } = await (supabase as any)
        .from("communication_channels")
        .upsert({ workspace_id: currentWorkspace.id, ...input })
        .select()
        .single();
      if (error) throw error;
      return data as CommunicationChannel;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["communication-channels"] });
      toast.success("Canal guardado");
    },
    onError: (e: any) => toast.error(e.message ?? "Erro ao guardar canal"),
  });
}

export function useToggleCommunicationChannelStatus() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, status }: { id: string; status: CommunicationChannelStatus }) => {
      const { error } = await (supabase as any)
        .from("communication_channels")
        .update({ status })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["communication-channels"] });
      toast.success("Estado do canal atualizado");
    },
    onError: (e: any) => toast.error(e.message ?? "Erro ao atualizar canal"),
  });
}
