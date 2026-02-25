import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useWorkspace } from "@/contexts/WorkspaceContext";

export type LifecycleStage = 'visitor' | 'lead' | 'prospect' | 'sales' | 'onboarding' | 'customer' | 'churned';

export interface LifecycleStageCounts {
  stage: LifecycleStage;
  count: number;
}

export const LIFECYCLE_STAGES: { stage: LifecycleStage; label: string; icon: string; color: string }[] = [
  { stage: 'visitor', label: 'Visitantes', icon: '🌐', color: 'hsl(210, 70%, 55%)' },
  { stage: 'lead', label: 'Leads', icon: '📋', color: 'hsl(270, 60%, 55%)' },
  { stage: 'prospect', label: 'Prospects', icon: '🎯', color: 'hsl(30, 80%, 55%)' },
  { stage: 'sales', label: 'Vendas', icon: '💼', color: 'hsl(340, 70%, 55%)' },
  { stage: 'onboarding', label: 'Onboarding', icon: '🚀', color: 'hsl(180, 60%, 45%)' },
  { stage: 'customer', label: 'Customer Success', icon: '✅', color: 'hsl(140, 60%, 45%)' },
  { stage: 'churned', label: 'Churned', icon: '⚠️', color: 'hsl(0, 60%, 50%)' },
];

export const LIFECYCLE_STAGE_LABELS: Record<LifecycleStage, string> = {
  visitor: 'Visitante',
  lead: 'Lead',
  prospect: 'Prospect',
  sales: 'Vendas',
  onboarding: 'Onboarding',
  customer: 'Cliente',
  churned: 'Churned',
};

export function useLifecycleCounts() {
  const { currentWorkspace } = useWorkspace();

  return useQuery({
    queryKey: ["lifecycle-counts", currentWorkspace?.id],
    queryFn: async () => {
      if (!currentWorkspace?.id) return [];

      const { data, error } = await supabase
        .from("contacts")
        .select("lifecycle_stage")
        .eq("workspace_id", currentWorkspace.id)
        .is("deleted_at", null);

      if (error) throw error;

      const counts: Record<string, number> = {};
      for (const stage of LIFECYCLE_STAGES) {
        counts[stage.stage] = 0;
      }
      for (const row of data || []) {
        const stage = (row as any).lifecycle_stage as string;
        if (stage in counts) {
          counts[stage]++;
        }
      }

      return LIFECYCLE_STAGES.filter(s => s.stage !== 'churned').map(s => ({
        stage: s.stage,
        count: counts[s.stage] || 0,
      })) as LifecycleStageCounts[];
    },
    enabled: !!currentWorkspace?.id,
  });
}

export function useUpdateLifecycleStage() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ contactId, stage }: { contactId: string; stage: LifecycleStage }) => {
      const { error } = await supabase
        .from("contacts")
        .update({ lifecycle_stage: stage } as any)
        .eq("id", contactId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["lifecycle-counts"] });
    },
  });
}
