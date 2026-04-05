import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Loader2, Trophy } from "lucide-react";

interface VariantMetrics {
  variant: string;
  enrolled: number;
  sent: number;
  opened: number;
  clicked: number;
  replied: number;
  openRate: number;
  clickRate: number;
  replyRate: number;
}

interface SDRABTestResultsProps {
  campaignId: string;
  variants: { name: string; weight: number }[];
}

export function SDRABTestResults({ campaignId, variants }: SDRABTestResultsProps) {
  const { data: results = [], isLoading } = useQuery({
    queryKey: ["sdr-ab-results", campaignId],
    queryFn: async () => {
      // Get all enrollments with their variant
      const { data: enrollments, error } = await (supabase as any)
        .from("sdr_enrollments")
        .select("id, message_variant, status")
        .eq("campaign_id", campaignId);

      if (error) throw error;

      // Get step logs for these enrollments
      const ids = (enrollments || []).map((e: any) => e.id);
      if (!ids.length) return [];

      const { data: logs } = await (supabase as any)
        .from("sdr_sequence_step_logs")
        .select("sdr_enrollment_id, status, opened_at, clicked_at, replied_at")
        .in("sdr_enrollment_id", ids);

      // Group by variant
      const variantMap = new Map<string, { enrolled: number; sent: number; opened: number; clicked: number; replied: number }>();

      for (const v of variants) {
        variantMap.set(v.name, { enrolled: 0, sent: 0, opened: 0, clicked: 0, replied: 0 });
      }
      // Handle unassigned
      variantMap.set("—", { enrolled: 0, sent: 0, opened: 0, clicked: 0, replied: 0 });

      for (const e of enrollments || []) {
        const key = e.message_variant || "—";
        if (!variantMap.has(key)) variantMap.set(key, { enrolled: 0, sent: 0, opened: 0, clicked: 0, replied: 0 });
        variantMap.get(key)!.enrolled++;
      }

      // Build lookup: enrollment_id -> variant
      const enrollVariant = new Map<string, string>();
      for (const e of enrollments || []) {
        enrollVariant.set(e.id, e.message_variant || "—");
      }

      for (const log of logs || []) {
        const key = enrollVariant.get(log.sdr_enrollment_id) || "—";
        const m = variantMap.get(key);
        if (!m) continue;
        if (log.status === "sent") m.sent++;
        if (log.opened_at) m.opened++;
        if (log.clicked_at) m.clicked++;
        if (log.replied_at) m.replied++;
      }

      const results: VariantMetrics[] = [];
      for (const [variant, m] of variantMap) {
        if (m.enrolled === 0 && variant === "—") continue;
        results.push({
          variant,
          ...m,
          openRate: m.sent > 0 ? (m.opened / m.sent) * 100 : 0,
          clickRate: m.sent > 0 ? (m.clicked / m.sent) * 100 : 0,
          replyRate: m.sent > 0 ? (m.replied / m.sent) * 100 : 0,
        });
      }

      return results;
    },
    enabled: !!campaignId && variants.length > 1,
    staleTime: 30_000,
  });

  if (variants.length <= 1) return null;
  if (isLoading) {
    return (
      <Card>
        <CardContent className="py-8 flex justify-center">
          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  if (!results.length) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Resultados A/B</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground text-center py-4">Sem dados suficientes para comparar variantes.</p>
        </CardContent>
      </Card>
    );
  }

  // Find winner by reply rate
  const winner = results.reduce((a, b) => (a.replyRate > b.replyRate ? a : b));

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2">
          Resultados A/B
          {winner.sent >= 10 && (
            <Badge variant="default" className="text-[10px]">
              <Trophy className="h-2.5 w-2.5 mr-0.5" />
              Líder: {winner.variant}
            </Badge>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b text-left">
                <th className="pb-2 font-medium text-muted-foreground text-xs">Variante</th>
                <th className="pb-2 font-medium text-muted-foreground text-xs text-right">Enrolled</th>
                <th className="pb-2 font-medium text-muted-foreground text-xs text-right">Sent</th>
                <th className="pb-2 font-medium text-muted-foreground text-xs text-right">Open %</th>
                <th className="pb-2 font-medium text-muted-foreground text-xs text-right">Click %</th>
                <th className="pb-2 font-medium text-muted-foreground text-xs text-right">Reply %</th>
              </tr>
            </thead>
            <tbody>
              {results.map((r) => (
                <tr key={r.variant} className={`border-b last:border-0 ${r.variant === winner.variant && winner.sent >= 10 ? "bg-primary/5" : ""}`}>
                  <td className="py-2">
                    <Badge variant="outline" className="text-xs">{r.variant}</Badge>
                  </td>
                  <td className="py-2 text-right">{r.enrolled}</td>
                  <td className="py-2 text-right">{r.sent}</td>
                  <td className="py-2 text-right font-medium">{r.openRate.toFixed(1)}%</td>
                  <td className="py-2 text-right font-medium">{r.clickRate.toFixed(1)}%</td>
                  <td className="py-2 text-right font-bold">{r.replyRate.toFixed(1)}%</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
}
