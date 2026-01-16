import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { useAuth } from "@/contexts/AuthContext";

const CREDITS_PER_MONTH = 500;

interface CreditUsage {
  used: number;
  total: number;
  remaining: number;
}

export function useCredits(moduleId: string = "prospecting") {
  const { currentWorkspace } = useWorkspace();
  const { user } = useAuth();
  const queryClient = useQueryClient();

  // Get current month's credit usage
  const { data: usage, isLoading } = useQuery({
    queryKey: ["credits", currentWorkspace?.id, moduleId],
    queryFn: async (): Promise<CreditUsage> => {
      if (!currentWorkspace) return { used: 0, total: CREDITS_PER_MONTH, remaining: CREDITS_PER_MONTH };

      const startOfMonth = new Date();
      startOfMonth.setDate(1);
      startOfMonth.setHours(0, 0, 0, 0);

      const { data, error } = await supabase
        .from("credit_consumption_logs")
        .select("credits_consumed")
        .eq("workspace_id", currentWorkspace.id)
        .eq("module_id", moduleId)
        .gte("created_at", startOfMonth.toISOString());

      if (error) throw error;

      const used = data?.reduce((sum, log) => sum + (log.credits_consumed || 0), 0) || 0;
      
      return {
        used,
        total: CREDITS_PER_MONTH,
        remaining: Math.max(0, CREDITS_PER_MONTH - used),
      };
    },
    enabled: !!currentWorkspace,
  });

  // Consume credits
  const consumeCredits = useMutation({
    mutationFn: async ({
      credits,
      actionKey,
      actionDescription,
      entityType,
      entityId,
    }: {
      credits: number;
      actionKey: string;
      actionDescription?: string;
      entityType?: string;
      entityId?: string;
    }) => {
      if (!currentWorkspace || !user) throw new Error("Not authenticated");

      const { error } = await supabase.from("credit_consumption_logs").insert({
        workspace_id: currentWorkspace.id,
        module_id: moduleId,
        action_key: actionKey,
        action_description: actionDescription,
        credits_consumed: credits,
        user_id: user.id,
        entity_type: entityType,
        entity_id: entityId,
      });

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["credits", currentWorkspace?.id, moduleId] });
    },
  });

  return {
    usage: usage || { used: 0, total: CREDITS_PER_MONTH, remaining: CREDITS_PER_MONTH },
    isLoading,
    consumeCredits,
    hasCredits: (usage?.remaining || 0) > 0,
  };
}
