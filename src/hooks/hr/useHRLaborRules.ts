import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { toast } from "sonner";

export interface LaborRules {
  weekly_hours_limit: number;
  max_daily_hours: number;
  max_overtime_hours_employee: number;
  max_overtime_hours_company: number;
  overtime_multiplier_weekday_first: number;
  overtime_multiplier_weekday_next: number;
  overtime_multiplier_holiday: number;
  annual_vacation_days: number;
  probation_days_general: number;
  probation_days_complex: number;
  probation_days_executive: number;
  minimum_wage: number;
  meal_allowance_exempt: number;
  weekly_rest_days: number;
  weekly_rest_day_name: string;
  min_rest_between_shifts_hours: number;
  mandatory_break_after_hours: number;
  mandatory_public_holidays: number;
  public_holidays: string[];
}

export interface CountryLaborRule {
  id: string;
  workspace_id: string;
  country_code: string;
  country_name: string;
  is_active: boolean;
  rules: LaborRules;
  created_at: string;
  updated_at: string;
}

const QUERY_KEY = "hr-country-labor-rules";

export function useAllLaborRules() {
  const { currentWorkspace } = useWorkspace();
  return useQuery({
    queryKey: [QUERY_KEY, currentWorkspace?.id],
    queryFn: async () => {
      if (!currentWorkspace?.id) return [];
      const { data, error } = await supabase
        .from("hr_country_labor_rules")
        .select("*")
        .eq("workspace_id", currentWorkspace.id)
        .order("country_name");
      if (error) throw error;
      return (data ?? []) as unknown as CountryLaborRule[];
    },
    enabled: !!currentWorkspace?.id,
  });
}

export function useActiveLaborRules() {
  const { currentWorkspace } = useWorkspace();
  return useQuery({
    queryKey: [QUERY_KEY, currentWorkspace?.id, "active"],
    queryFn: async () => {
      if (!currentWorkspace?.id) return null;
      const { data, error } = await supabase
        .from("hr_country_labor_rules")
        .select("*")
        .eq("workspace_id", currentWorkspace.id)
        .eq("is_active", true)
        .maybeSingle();
      if (error) throw error;
      return data as unknown as CountryLaborRule | null;
    },
    enabled: !!currentWorkspace?.id,
  });
}

export function useUpsertLaborRules() {
  const qc = useQueryClient();
  const { currentWorkspace } = useWorkspace();
  return useMutation({
    mutationFn: async (input: { country_code: string; country_name: string; rules: LaborRules; is_active?: boolean }) => {
      if (!currentWorkspace?.id) throw new Error("Sem workspace");
      const { error } = await supabase
        .from("hr_country_labor_rules")
        .upsert({
          workspace_id: currentWorkspace.id,
          country_code: input.country_code,
          country_name: input.country_name,
          rules: input.rules as any,
          is_active: input.is_active ?? true,
          updated_at: new Date().toISOString(),
        }, { onConflict: "workspace_id,country_code" });
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [QUERY_KEY] });
      toast.success("Regras laborais guardadas");
    },
    onError: () => toast.error("Erro ao guardar regras laborais"),
  });
}

export function useSetActiveCountry() {
  const qc = useQueryClient();
  const { currentWorkspace } = useWorkspace();
  return useMutation({
    mutationFn: async (countryCode: string) => {
      if (!currentWorkspace?.id) throw new Error("Sem workspace");
      // Deactivate all
      await supabase
        .from("hr_country_labor_rules")
        .update({ is_active: false, updated_at: new Date().toISOString() })
        .eq("workspace_id", currentWorkspace.id);
      // Activate selected
      const { error } = await supabase
        .from("hr_country_labor_rules")
        .update({ is_active: true, updated_at: new Date().toISOString() })
        .eq("workspace_id", currentWorkspace.id)
        .eq("country_code", countryCode);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [QUERY_KEY] });
      toast.success("País activo actualizado");
    },
  });
}

export const PORTUGAL_DEFAULT_RULES: LaborRules = {
  weekly_hours_limit: 40,
  max_daily_hours: 8,
  max_overtime_hours_employee: 150,
  max_overtime_hours_company: 175,
  overtime_multiplier_weekday_first: 1.25,
  overtime_multiplier_weekday_next: 1.375,
  overtime_multiplier_holiday: 1.50,
  annual_vacation_days: 22,
  probation_days_general: 90,
  probation_days_complex: 180,
  probation_days_executive: 240,
  minimum_wage: 870,
  meal_allowance_exempt: 10.20,
  weekly_rest_days: 1,
  weekly_rest_day_name: "Domingo",
  min_rest_between_shifts_hours: 11,
  mandatory_break_after_hours: 5,
  mandatory_public_holidays: 13,
  public_holidays: [
    "01-01", "Sexta-feira Santa", "Domingo de Páscoa",
    "04-25", "05-01", "Corpo de Deus",
    "06-10", "08-15", "10-05", "11-01", "12-01", "12-08", "12-25"
  ],
};
