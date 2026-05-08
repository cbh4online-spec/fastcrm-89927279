import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { useLeadChefPermissions } from "./useLeadChefPermissions";

export interface LeadChefMonthlyPoint {
  month: string; // YYYY-MM
  label: string; // Mai/26
  created: number;
  won: number;
  conversion: number;
}

const MONTH_LABELS = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];

export function useLeadChefConversionTrend(months = 6) {
  const { currentWorkspace } = useWorkspace();
  const perms = useLeadChefPermissions();
  const wsId = currentWorkspace?.id;

  return useQuery({
    queryKey: ["leadchef-conversion-trend", wsId, months],
    enabled: !!wsId && perms.canViewTeam,
    queryFn: async (): Promise<LeadChefMonthlyPoint[]> => {
      const sb = supabase as any;
      const now = new Date();
      const start = new Date(now.getFullYear(), now.getMonth() - (months - 1), 1);
      const startIso = start.toISOString();

      const [leadsRes, profilesRes] = await Promise.all([
        sb.from("leads").select("id, created_at").eq("workspace_id", wsId).gte("created_at", startIso).limit(5000),
        sb.from("leadchef_lead_profiles").select("stage, updated_at").eq("workspace_id", wsId).eq("stage", "won").gte("updated_at", startIso).limit(5000),
      ]);

      const buckets = new Map<string, { created: number; won: number }>();
      for (let i = 0; i < months; i++) {
        const d = new Date(start.getFullYear(), start.getMonth() + i, 1);
        const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
        buckets.set(key, { created: 0, won: 0 });
      }
      const keyOf = (iso: string) => {
        const d = new Date(iso);
        return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      };

      (leadsRes.data ?? []).forEach((l: any) => {
        const k = keyOf(l.created_at);
        const b = buckets.get(k);
        if (b) b.created++;
      });
      (profilesRes.data ?? []).forEach((p: any) => {
        const k = keyOf(p.updated_at);
        const b = buckets.get(k);
        if (b) b.won++;
      });

      return Array.from(buckets.entries()).map(([month, v]) => {
        const [y, m] = month.split("-");
        return {
          month,
          label: `${MONTH_LABELS[parseInt(m, 10) - 1]}/${y.slice(2)}`,
          created: v.created,
          won: v.won,
          conversion: v.created ? Math.round((v.won / v.created) * 100) : 0,
        };
      });
    },
  });
}
