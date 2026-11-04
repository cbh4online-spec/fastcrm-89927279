import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import type { BgiPeriod } from "@/hooks/useBgiIndicators";

export interface BgiObjective {
  id: string; indicator_id: string; period_type: BgiPeriod; period_start: string;
  target_value: number; direction: "gte" | "lte"; notes: string | null;
}

export const objectiveSchema = z.object({
  indicator_id: z.string().regex(/^[a-z0-9_]{1,64}$/, "Indicador inválido"),
  target_value: z.number({ invalid_type_error: "Indique um número" }).positive("O alvo tem de ser maior que zero").max(1e12),
  direction: z.enum(["gte", "lte"]),
  notes: z.string().trim().max(500, "Máximo 500 caracteres").optional(),
});
export type ObjectiveInput = z.infer<typeof objectiveSchema>;

export function useBgiObjectives(period: BgiPeriod, periodStart: string | undefined) {
  const { currentWorkspace } = useWorkspace();
  const wsId = currentWorkspace?.id;
  const qc = useQueryClient();
  const key = ["bgi-objectives", wsId, period, periodStart];

  const query = useQuery({
    queryKey: key,
    enabled: !!wsId && !!periodStart,
    queryFn: async (): Promise<BgiObjective[]> => {
      const { data, error } = await supabase.from("bgi_objectives")
        .select("id, indicator_id, period_type, period_start, target_value, direction, notes")
        .eq("workspace_id", wsId!).eq("period_type", period).eq("period_start", periodStart!)
        .is("archived_at", null).order("created_at");
      if (error) throw error;
      return (data ?? []).map((r) => ({ ...r, target_value: Number(r.target_value) })) as BgiObjective[];
    },
  });

  const friendly = (e: { code?: string; message: string }) =>
    new Error(e.code === "23505" ? "Já existe um objetivo para este indicador neste período"
      : e.code === "42501" || /row-level/i.test(e.message) ? "Sem permissão para alterar objetivos" : e.message);

  const upsert = useMutation({
    mutationFn: async (input: ObjectiveInput & { id?: string }) => {
      if (!wsId || !periodStart) throw new Error("Período não disponível");
      const v = objectiveSchema.parse(input);
      const row = { ...v, notes: v.notes || null };
      const res = input.id
        ? await supabase.from("bgi_objectives").update(row).eq("id", input.id).select("id")
        : await supabase.from("bgi_objectives").insert({ ...row, workspace_id: wsId, period_type: period, period_start: periodStart }).select("id");
      if (res.error) throw friendly(res.error);
      if (!res.data?.length) throw new Error("Sem permissão para alterar objetivos");
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["bgi-objectives", wsId] }),
  });

  const archive = useMutation({
    mutationFn: async (id: string) => {
      const { data, error } = await supabase.from("bgi_objectives").update({ archived_at: new Date().toISOString() }).eq("id", id).select("id");
      if (error) throw friendly(error);
      if (!data?.length) throw new Error("Sem permissão para alterar objetivos");
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["bgi-objectives", wsId] }),
  });

  return { ...query, upsert, archive };
}
