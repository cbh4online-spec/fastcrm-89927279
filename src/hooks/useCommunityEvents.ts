import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

export interface CommunityEvent {
  id: string;
  workspace_id: string;
  title: string;
  description: string | null;
  event_type: string;
  starts_at: string;
  ends_at: string | null;
  link: string | null;
  created_by: string | null;
  created_at: string;
}

export function useCommunityEvents(workspaceId: string | undefined) {
  return useQuery({
    queryKey: ["community-events", workspaceId],
    queryFn: async () => {
      if (!workspaceId) return [];
      const { data, error } = await supabase
        .from("community_events")
        .select("*")
        .eq("workspace_id", workspaceId)
        .gte("starts_at", new Date().toISOString())
        .order("starts_at");
      if (error) throw error;
      return data as CommunityEvent[];
    },
    enabled: !!workspaceId,
  });
}

export function useUpcomingEvent(workspaceId: string | undefined) {
  return useQuery({
    queryKey: ["community-upcoming-event", workspaceId],
    queryFn: async () => {
      if (!workspaceId) return null;
      const { data, error } = await supabase
        .from("community_events")
        .select("*")
        .eq("workspace_id", workspaceId)
        .gte("starts_at", new Date().toISOString())
        .order("starts_at")
        .limit(1)
        .maybeSingle();
      if (error) throw error;
      return data as CommunityEvent | null;
    },
    enabled: !!workspaceId,
  });
}

export function useCreateCommunityEvent(workspaceId: string | undefined) {
  const qc = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (event: Omit<CommunityEvent, "id" | "workspace_id" | "created_by" | "created_at">) => {
      if (!workspaceId || !user) throw new Error("Sem sessão");
      const { error } = await supabase.from("community_events").insert({
        workspace_id: workspaceId,
        created_by: user.id,
        ...event,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["community-events"] });
      qc.invalidateQueries({ queryKey: ["community-upcoming-event"] });
      toast.success("Evento criado!");
    },
    onError: () => toast.error("Erro ao criar evento"),
  });
}
