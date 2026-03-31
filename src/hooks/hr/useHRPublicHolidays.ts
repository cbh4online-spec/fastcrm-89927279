import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { toast } from "sonner";

export type HRPublicHoliday = {
  id: string;
  workspace_id: string;
  name: string;
  date: string;
  country: string;
  is_mandatory: boolean;
};

export function useHRPublicHolidays(year?: number) {
  const { currentWorkspace } = useWorkspace();
  const wsId = currentWorkspace?.id;
  const y = year ?? new Date().getFullYear();

  return useQuery({
    queryKey: ["hr-public-holidays", wsId, y],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("hr_public_holidays" as any)
        .select("*")
        .eq("workspace_id", wsId!)
        .gte("date", `${y}-01-01`)
        .lte("date", `${y}-12-31`)
        .order("date");
      if (error) throw error;
      return data as unknown as HRPublicHoliday[];
    },
    enabled: !!wsId,
  });
}

export function useCreatePublicHoliday() {
  const qc = useQueryClient();
  const { currentWorkspace } = useWorkspace();
  const wsId = currentWorkspace?.id;

  return useMutation({
    mutationFn: async (values: { name: string; date: string; country?: string; is_mandatory?: boolean }) => {
      const { data, error } = await supabase
        .from("hr_public_holidays" as any)
        .insert({ ...values, workspace_id: wsId })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      toast.success("Feriado adicionado");
      qc.invalidateQueries({ queryKey: ["hr-public-holidays"] });
    },
    onError: () => toast.error("Erro ao adicionar feriado"),
  });
}

export function useDeletePublicHoliday() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("hr_public_holidays" as any).delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Feriado removido");
      qc.invalidateQueries({ queryKey: ["hr-public-holidays"] });
    },
    onError: () => toast.error("Erro ao remover feriado"),
  });
}

// Seed Portuguese public holidays for a year
export function useSeedPortugueseHolidays() {
  const qc = useQueryClient();
  const { currentWorkspace } = useWorkspace();
  const wsId = currentWorkspace?.id;

  return useMutation({
    mutationFn: async (year: number) => {
      const holidays = [
        { name: "Ano Novo", date: `${year}-01-01` },
        { name: "Dia da Liberdade", date: `${year}-04-25` },
        { name: "Dia do Trabalhador", date: `${year}-05-01` },
        { name: "Dia de Portugal", date: `${year}-06-10` },
        { name: "Assunção de Nossa Senhora", date: `${year}-08-15` },
        { name: "Implantação da República", date: `${year}-10-05` },
        { name: "Dia de Todos os Santos", date: `${year}-11-01` },
        { name: "Restauração da Independência", date: `${year}-12-01` },
        { name: "Imaculada Conceição", date: `${year}-12-08` },
        { name: "Natal", date: `${year}-12-25` },
      ];

      const rows = holidays.map((h) => ({ ...h, workspace_id: wsId, country: "PT", is_mandatory: true }));
      const { error } = await supabase.from("hr_public_holidays" as any).upsert(rows, { onConflict: "workspace_id,date" });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Feriados PT adicionados");
      qc.invalidateQueries({ queryKey: ["hr-public-holidays"] });
    },
    onError: () => toast.error("Erro ao adicionar feriados"),
  });
}
