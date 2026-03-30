import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useWorkspace } from "@/hooks/useWorkspace";
import { subDays, format, startOfWeek } from "date-fns";

interface PeriodMetric {
  period: string;
  total: number;
  recovered: number;
  rate: number;
  value: number;
}

interface SequenceMetric {
  sequence_id: string | null;
  sequence_name: string;
  total: number;
  recovered: number;
  rate: number;
  value: number;
}

interface RecoveryMetrics {
  totalAbandoned: number;
  totalRecovered: number;
  globalRate: number;
  totalValueRecovered: number;
  timeline: PeriodMetric[];
  bySequence: SequenceMetric[];
}

export function useRecoveryMetrics(days: number = 90) {
  const { currentWorkspace } = useWorkspace();
  const workspaceId = currentWorkspace?.id;

  return useQuery({
    queryKey: ["recovery-metrics", workspaceId, days],
    enabled: !!workspaceId,
    queryFn: async (): Promise<RecoveryMetrics> => {
      const since = subDays(new Date(), days).toISOString();

      const { data: carts, error } = await supabase
        .from("store_abandoned_carts")
        .select("id, recovery_status, subtotal, recovered_value, abandoned_at, recovered_at, sequence_id")
        .eq("workspace_id", workspaceId!)
        .gte("abandoned_at", since);

      if (error) throw error;

      const rows = carts ?? [];
      const totalAbandoned = rows.length;
      const recoveredRows = rows.filter(r => r.recovery_status === "recovered");
      const totalRecovered = recoveredRows.length;
      const globalRate = totalAbandoned > 0 ? Math.round((totalRecovered / totalAbandoned) * 100) : 0;
      const totalValueRecovered = recoveredRows.reduce((s, r) => s + (Number(r.recovered_value) || Number(r.subtotal) || 0), 0);

      // Group by week
      const weekMap = new Map<string, { total: number; recovered: number; value: number }>();
      for (const row of rows) {
        const week = format(startOfWeek(new Date(row.abandoned_at!), { weekStartsOn: 1 }), "yyyy-MM-dd");
        const entry = weekMap.get(week) ?? { total: 0, recovered: 0, value: 0 };
        entry.total++;
        if (row.recovery_status === "recovered") {
          entry.recovered++;
          entry.value += Number(row.recovered_value) || Number(row.subtotal) || 0;
        }
        weekMap.set(week, entry);
      }

      const timeline: PeriodMetric[] = Array.from(weekMap.entries())
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([period, d]) => ({
          period: format(new Date(period), "dd/MM"),
          total: d.total,
          recovered: d.recovered,
          rate: d.total > 0 ? Math.round((d.recovered / d.total) * 100) : 0,
          value: Math.round(d.value * 100) / 100,
        }));

      // Group by sequence
      const seqMap = new Map<string | null, { total: number; recovered: number; value: number }>();
      for (const row of rows) {
        const key = row.sequence_id ?? null;
        const entry = seqMap.get(key) ?? { total: 0, recovered: 0, value: 0 };
        entry.total++;
        if (row.recovery_status === "recovered") {
          entry.recovered++;
          entry.value += Number(row.recovered_value) || Number(row.subtotal) || 0;
        }
        seqMap.set(key, entry);
      }

      // Fetch sequence names
      const seqIds = Array.from(seqMap.keys()).filter(Boolean) as string[];
      let seqNames: Record<string, string> = {};
      if (seqIds.length > 0) {
        const { data: seqs } = await supabase
          .from("email_sequences")
          .select("id, name")
          .in("id", seqIds);
        if (seqs) {
          seqNames = Object.fromEntries(seqs.map(s => [s.id, s.name]));
        }
      }

      const bySequence: SequenceMetric[] = Array.from(seqMap.entries())
        .map(([sid, d]) => ({
          sequence_id: sid,
          sequence_name: sid ? (seqNames[sid] || "Sequência desconhecida") : "Sem sequência",
          total: d.total,
          recovered: d.recovered,
          rate: d.total > 0 ? Math.round((d.recovered / d.total) * 100) : 0,
          value: Math.round(d.value * 100) / 100,
        }))
        .sort((a, b) => b.value - a.value);

      return { totalAbandoned, totalRecovered, globalRate, totalValueRecovered, timeline, bySequence };
    },
  });
}
