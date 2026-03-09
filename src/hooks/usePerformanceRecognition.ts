import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useWorkspace } from "@/contexts/WorkspaceContext";

export interface PerformanceRecognition {
  id: string;
  workspace_id: string;
  user_id: string | null;
  recognition_type: string;
  title: string;
  description: string | null;
  criteria_json: Record<string, unknown>;
  reward_type: string | null;
  period_start: string | null;
  period_end: string | null;
  created_at: string;
  user_name?: string;
  avatar_url?: string | null;
}

export const RECOGNITION_TYPES = [
  { value: "closer_of_month", label: "Closer do Mês", icon: "🏆" },
  { value: "pipeline_builder", label: "Pipeline Builder", icon: "🚀" },
  { value: "deal_hunter", label: "Deal Hunter", icon: "🎯" },
  { value: "top_converter", label: "Top Converter", icon: "⚡" },
  { value: "fastest_closer", label: "Fastest Closer", icon: "🏎️" },
];

export function usePerformanceRecognition(limit = 10) {
  const { currentWorkspace } = useWorkspace();
  const wid = currentWorkspace?.id;

  return useQuery({
    queryKey: ["performance-recognition", wid, limit],
    enabled: !!wid,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("performance_recognition")
        .select("*")
        .eq("workspace_id", wid!)
        .order("created_at", { ascending: false })
        .limit(limit);

      if (error) throw error;

      const userIds = (data || []).filter((r: any) => r.user_id).map((r: any) => r.user_id);
      let profileMap = new Map();
      if (userIds.length > 0) {
        const { data: profiles } = await supabase
          .from("profiles")
          .select("id, full_name, avatar_url")
          .in("id", userIds);
        profileMap = new Map((profiles || []).map((p: any) => [p.id, p]));
      }

      return (data || []).map((r: any) => ({
        ...r,
        user_name: r.user_id ? profileMap.get(r.user_id)?.full_name || "Utilizador" : null,
        avatar_url: r.user_id ? profileMap.get(r.user_id)?.avatar_url || null : null,
      })) as PerformanceRecognition[];
    },
  });
}

export function useCreateRecognition() {
  const { currentWorkspace } = useWorkspace();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (recognition: Partial<PerformanceRecognition>) => {
      const { data, error } = await supabase
        .from("performance_recognition")
        .insert([{ ...recognition, workspace_id: currentWorkspace!.id } as any])
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["performance-recognition"] });
    },
  });
}
