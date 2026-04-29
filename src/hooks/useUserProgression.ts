import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useWorkspace } from "@/contexts/WorkspaceContext";

export interface UserProgression {
  id: string;
  user_id: string;
  workspace_id: string;
  total_xp: number;
  current_level: number;
  modules_completed: number;
  quizzes_passed: number;
  badges_earned: number;
  last_activity_at: string;
}

export interface LeaderboardEntry {
  workspace_id: string;
  user_id: string;
  full_name: string | null;
  avatar_url: string | null;
  total_xp: number;
  current_level: number;
  modules_completed: number;
  quizzes_passed: number;
  badges_earned: number;
  rank: number;
  last_activity_at: string;
}

const LEVEL_THRESHOLDS = [0, 100, 250, 500, 1000, 1750, 2750, 4000, 5500, 7500];

export function getLevelInfo(xp: number, level: number) {
  const currentMin = LEVEL_THRESHOLDS[level - 1] ?? 0;
  const nextMin = LEVEL_THRESHOLDS[level] ?? LEVEL_THRESHOLDS[LEVEL_THRESHOLDS.length - 1];
  const isMax = level >= 10;
  const range = Math.max(1, nextMin - currentMin);
  const inLevel = Math.max(0, xp - currentMin);
  const progressPct = isMax ? 100 : Math.min(100, (inLevel / range) * 100);
  const xpToNext = isMax ? 0 : Math.max(0, nextMin - xp);
  return { currentMin, nextMin, progressPct, xpToNext, isMax };
}

export function useUserProgression() {
  const { user } = useAuth();
  const { currentWorkspace } = useWorkspace();

  return useQuery({
    queryKey: ["user-progression", user?.id, currentWorkspace?.id],
    queryFn: async () => {
      if (!user?.id || !currentWorkspace?.id) return null;
      const { data } = await supabase
        .from("user_progression" as any)
        .select("*")
        .eq("user_id", user.id)
        .eq("workspace_id", currentWorkspace.id)
        .maybeSingle();
      return (data as unknown as UserProgression) ?? {
        id: "",
        user_id: user.id,
        workspace_id: currentWorkspace.id,
        total_xp: 0,
        current_level: 1,
        modules_completed: 0,
        quizzes_passed: 0,
        badges_earned: 0,
        last_activity_at: new Date().toISOString(),
      };
    },
    enabled: !!user?.id && !!currentWorkspace?.id,
    staleTime: 30 * 1000,
  });
}

export function useWorkspaceLeaderboard() {
  const { currentWorkspace } = useWorkspace();
  return useQuery({
    queryKey: ["workspace-leaderboard", currentWorkspace?.id],
    queryFn: async () => {
      if (!currentWorkspace?.id) return [];
      const { data } = await supabase
        .from("workspace_progression_leaderboard" as any)
        .select("*")
        .eq("workspace_id", currentWorkspace.id)
        .order("rank", { ascending: true });
      return (data as unknown as LeaderboardEntry[]) ?? [];
    },
    enabled: !!currentWorkspace?.id,
    staleTime: 60 * 1000,
  });
}

export function useUserBadges() {
  const { user } = useAuth();
  const { currentWorkspace } = useWorkspace();
  return useQuery({
    queryKey: ["user-badges", user?.id, currentWorkspace?.id],
    queryFn: async () => {
      if (!user?.id || !currentWorkspace?.id) return [];
      const { data } = await supabase
        .from("user_badges" as any)
        .select("*, badge:badge_id(*)")
        .eq("user_id", user.id)
        .eq("workspace_id", currentWorkspace.id)
        .order("earned_at", { ascending: false });
      return (data as any[]) ?? [];
    },
    enabled: !!user?.id && !!currentWorkspace?.id,
    staleTime: 60 * 1000,
  });
}
