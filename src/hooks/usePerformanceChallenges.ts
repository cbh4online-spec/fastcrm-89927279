import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useWorkspace } from "@/contexts/WorkspaceContext";

export interface PerformanceChallenge {
  id: string;
  workspace_id: string;
  challenge_name: string;
  challenge_type: string;
  description: string | null;
  metric_type: string;
  start_date: string;
  end_date: string;
  target_value: number;
  scope_type: string;
  scope_id: string | null;
  reward_type: string | null;
  reward_value: string | null;
  status: string;
  created_at: string;
}

export interface ChallengeParticipant {
  id: string;
  challenge_id: string;
  user_id: string;
  current_value: number;
  rank_position: number | null;
  points: number;
  updated_at: string;
  user_name?: string;
  avatar_url?: string | null;
}

export function usePerformanceChallenges(status?: string) {
  const { currentWorkspace } = useWorkspace();
  const wid = currentWorkspace?.id;

  return useQuery({
    queryKey: ["performance-challenges", wid, status],
    enabled: !!wid,
    queryFn: async () => {
      let query = supabase
        .from("performance_challenges")
        .select("*")
        .eq("workspace_id", wid!)
        .order("created_at", { ascending: false });

      if (status) query = query.eq("status", status);

      const { data, error } = await query;
      if (error) throw error;
      return (data || []) as PerformanceChallenge[];
    },
  });
}

export function useChallengeParticipants(challengeId: string | null) {
  return useQuery({
    queryKey: ["challenge-participants", challengeId],
    enabled: !!challengeId,
    refetchInterval: 30_000,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("challenge_participants")
        .select("*")
        .eq("challenge_id", challengeId!)
        .order("rank_position", { ascending: true });

      if (error) throw error;

      const userIds = (data || []).map((p: any) => p.user_id);
      const { data: profiles } = await supabase
        .from("profiles")
        .select("id, full_name, avatar_url")
        .in("id", userIds);

      const profileMap = new Map((profiles || []).map((p: any) => [p.id, p]));

      return (data || []).map((p: any) => ({
        ...p,
        user_name: profileMap.get(p.user_id)?.full_name || "Utilizador",
        avatar_url: profileMap.get(p.user_id)?.avatar_url || null,
      })) as ChallengeParticipant[];
    },
  });
}

export function useCreateChallenge() {
  const { currentWorkspace } = useWorkspace();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (challenge: Partial<PerformanceChallenge>) => {
      const { data, error } = await supabase
        .from("performance_challenges")
        .insert([{ ...challenge, workspace_id: currentWorkspace!.id } as any])
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["performance-challenges"] });
    },
  });
}

export function useJoinChallenge() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ challengeId, userId }: { challengeId: string; userId: string }) => {
      const { data, error } = await supabase
        .from("challenge_participants")
        .insert({ challenge_id: challengeId, user_id: userId })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: (_, vars) => {
      queryClient.invalidateQueries({ queryKey: ["challenge-participants", vars.challengeId] });
    },
  });
}
