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
    queryKey: ["sj-cohort-phases", cohortId, wsId],
    enabled: !!cohortId && !!wsId,
    queryFn: async (): Promise<CohortPhase[]> => {
      // Control Plane endpoint — frontend never queries Supabase directly for phases.
      const { data, error } = await supabase.functions.invoke("cp-cohort-phases", {
        method: "GET" as never,
        // edge function reads from query string
        headers: {},
        body: undefined,
        // @ts-expect-error: invoke supports query via 2nd arg in newer SDKs; fall back to URL
      });
      // Fallback: invoke ignores query string. Use direct fetch.
      void data; void error;
      const url = new URL(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/cp-cohort-phases`
      );
      url.searchParams.set("workspace_id", wsId!);
      url.searchParams.set("cohort_id", cohortId!);
      const session = (await supabase.auth.getSession()).data.session;
      const res = await fetch(url.toString(), {
        headers: {
          Authorization: `Bearer ${session?.access_token ?? ""}`,
          apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
        },
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok && !json?.fallback) {
        throw new Error(json?.error || "Erro a obter fases");
      }
      return (json?.phases || []) as CohortPhase[];
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

      const { data, error } = await (supabase
        .from("sj_course_phases" as never) as never as ReturnType<typeof supabase.from>)
        .insert(payload as never)
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
