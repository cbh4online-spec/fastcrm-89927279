import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { useFastMatchProfile } from "./useFastMatchProfile";
import { toast } from "sonner";

export interface FastMatchConnection {
  id: string;
  workspace_id: string;
  profile_a_id: string;
  profile_b_id: string;
  unlocked_at: string;
  unlocked_by: string;
  credits_consumed: number;
  source: string;
  crm_opportunity_id: string | null;
  crm_contact_id: string | null;
  crm_company_id: string | null;
  status: string;
  created_at: string;
}

export function useFastMatchConnections() {
  const { currentWorkspace } = useWorkspace();
  const { data: profile } = useFastMatchProfile();

  return useQuery({
    queryKey: ["fastmatch-connections", currentWorkspace?.id, profile?.id],
    queryFn: async () => {
      if (!profile) return [];

      const { data, error } = await supabase
        .from("fastmatch_connections")
        .select("*")
        .eq("workspace_id", currentWorkspace!.id)
        .eq("status", "active")
        .or(`profile_a_id.eq.${profile.id},profile_b_id.eq.${profile.id}`)
        .order("unlocked_at", { ascending: false });

      if (error) throw error;
      return (data || []) as FastMatchConnection[];
    },
    enabled: !!profile && !!currentWorkspace,
  });
}

export function useUnlockConnection() {
  const { currentWorkspace } = useWorkspace();
  const { data: profile } = useFastMatchProfile();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ otherProfileId, quotaSource }: { otherProfileId: string; quotaSource: string }) => {
      if (!profile || !currentWorkspace) throw new Error("Not authenticated");

      const { data, error } = await supabase
        .from("fastmatch_connections")
        .insert({
          workspace_id: currentWorkspace.id,
          profile_a_id: profile.id,
          profile_b_id: otherProfileId,
          unlocked_by: profile.user_id,
          source: quotaSource,
        })
        .select()
        .single();

      if (error) throw error;
      return data as FastMatchConnection;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["fastmatch-connections"] });
      queryClient.invalidateQueries({ queryKey: ["fastmatch-profile"] });
      toast.success("Conexão desbloqueada com sucesso!");
    },
    onError: () => {
      toast.error("Erro ao desbloquear conexão.");
    },
  });
}
