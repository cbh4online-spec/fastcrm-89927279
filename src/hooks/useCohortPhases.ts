import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { toast } from "sonner";

export interface CohortPhase {
  id: string;
  workspace_id: string;
  cohort_id: string;
  phase_order: number;
  title: string;
  location: string | null;
  start_date: string; // ISO date (yyyy-mm-dd)
  end_date: string;
  start_time: string | null; // HH:mm[:ss]
  end_time: string | null;
  notes: string | null;
}

export interface CohortPhaseInput {
  phase_order: number;
  title: string;
  location?: string | null;
  start_date: string;
  end_date: string;
  start_time?: string | null;
  end_time?: string | null;
  notes?: string | null;
}

export function useCohortPhases(cohortId: string | undefined) {
  const queryClient = useQueryClient();
  const { currentWorkspace } = useWorkspace();
  const wsId = currentWorkspace?.id;

  const phasesQuery = useQuery({
    queryKey: ["sj-cohort-phases", cohortId],
    enabled: !!cohortId,
    queryFn: async (): Promise<CohortPhase[]> => {
      const { data, error } = await supabase
        .from("sj_course_phases" as never)
        .select("*")
        .eq("cohort_id", cohortId!)
        .order("phase_order", { ascending: true });
      if (error) throw error;
      return (data || []) as unknown as CohortPhase[];
    },
  });

  /**
   * Substitui em massa todas as fases de uma cohort.
   * Estratégia: apaga as existentes e insere as novas dentro da mesma transação lógica.
   */
  const replacePhases = useMutation({
    mutationFn: async ({
      cohortId: cId,
      phases,
    }: {
      cohortId: string;
      phases: CohortPhaseInput[];
    }) => {
      if (!wsId) throw new Error("Workspace não encontrado");
      if (!cId) throw new Error("Cohort obrigatória");

      // Apaga existentes
      const { error: delErr } = await supabase
        .from("sj_course_phases" as never)
        .delete()
        .eq("cohort_id", cId);
      if (delErr) throw delErr;

      if (!phases.length) return [];

      const payload = phases.map((p, idx) => ({
        workspace_id: wsId,
        cohort_id: cId,
        phase_order: p.phase_order ?? idx + 1,
        title: p.title.trim(),
        location: p.location?.trim() || null,
        start_date: p.start_date,
        end_date: p.end_date,
        start_time: p.start_time || null,
        end_time: p.end_time || null,
        notes: p.notes?.trim() || null,
      }));

      const { data, error } = await supabase
        .from("sj_course_phases" as never)
        .insert(payload)
        .select();
      if (error) throw error;
      return (data || []) as unknown as CohortPhase[];
    },
    onSuccess: (_data, vars) => {
      queryClient.invalidateQueries({ queryKey: ["sj-cohort-phases", vars.cohortId] });
      queryClient.invalidateQueries({ queryKey: ["sj-cohorts"] });
    },
    onError: (err) => {
      console.error("[useCohortPhases] replace error:", err);
      toast.error(err instanceof Error ? err.message : "Erro a guardar fases");
    },
  });

  return {
    phases: phasesQuery.data || [],
    isLoading: phasesQuery.isLoading,
    replacePhases,
    refetch: phasesQuery.refetch,
  };
}
