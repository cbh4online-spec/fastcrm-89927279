import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Clock } from "lucide-react";

interface SDRSendTimeHeatmapProps {
  campaignId?: string | null;
}

const DAYS = ["Seg", "Ter", "Qua", "Qui", "Sex", "Sáb", "Dom"];
const HOURS = Array.from({ length: 24 }, (_, i) => i);

export function SDRSendTimeHeatmap({ campaignId }: SDRSendTimeHeatmapProps) {
  const { currentWorkspace } = useWorkspace();

  const { data: heatmapData } = useQuery({
    queryKey: ["sdr-heatmap", currentWorkspace?.id, campaignId],
    queryFn: async () => {
      // Get opened_at timestamps from step logs
      let query = supabase
        .from("sdr_sequence_step_logs")
        .select("opened_at")
        .eq("workspace_id", currentWorkspace!.id)
        .not("opened_at", "is", null)
        .limit(1000);

      if (campaignId) {
        // Get enrollment IDs for this campaign
        const { data: enrollments } = await supabase
          .from("sdr_enrollments")
          .select("id")
          .eq("campaign_id", campaignId);
        const ids = (enrollments || []).map((e: any) => e.id);
        if (!ids.length) return null;
        query = query.in("sdr_enrollment_id", ids);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data || [];
    },
    enabled: !!currentWorkspace?.id,
    staleTime: 120_000,
  });

  const grid = useMemo(() => {
    // 7 days x 24 hours
    const g: number[][] = Array.from({ length: 7 }, () => Array(24).fill(0));

    if (!heatmapData?.length) return g;

    for (const log of heatmapData) {
      const d = new Date(log.opened_at);
      const day = (d.getDay() + 6) % 7; // Mon=0
      const hour = d.getHours();
      g[day][hour]++;
    }
    return g;
  }, [heatmapData]);

  const maxVal = useMemo(() => Math.max(...grid.flat(), 1), [grid]);
  const totalOpens = useMemo(() => grid.flat().reduce((a, b) => a + b, 0), [grid]);

  if (totalOpens === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Clock className="h-4 w-4" />
            Melhores Horários de Abertura
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground text-center py-6">
            Sem dados de abertura suficientes para gerar o heatmap.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2">
          <Clock className="h-4 w-4" />
          Melhores Horários de Abertura
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <div className="min-w-[600px]">
            {/* Hour labels */}
            <div className="flex ml-10 mb-1">
              {HOURS.filter((h) => h % 3 === 0).map((h) => (
                <div key={h} className="text-[9px] text-muted-foreground" style={{ width: `${100 / 24 * 3}%` }}>
                  {h.toString().padStart(2, "0")}h
                </div>
              ))}
            </div>

            {/* Grid */}
            {DAYS.map((day, di) => (
              <div key={day} className="flex items-center gap-1 mb-0.5">
                <span className="text-[10px] text-muted-foreground w-8 text-right">{day}</span>
                <div className="flex flex-1 gap-px">
                  {HOURS.map((h) => {
                    const val = grid[di][h];
                    const intensity = val / maxVal;
                    return (
                      <div
                        key={h}
                        className="flex-1 aspect-square rounded-sm cursor-default"
                        style={{
                          backgroundColor: intensity > 0
                            ? `hsl(var(--primary) / ${0.1 + intensity * 0.8})`
                            : "hsl(var(--muted) / 0.3)",
                          minHeight: "12px",
                        }}
                        title={`${day} ${h}h: ${val} abertura${val !== 1 ? "s" : ""}`}
                      />
                    );
                  })}
                </div>
              </div>
            ))}

            {/* Legend */}
            <div className="flex items-center justify-end gap-1 mt-2">
              <span className="text-[9px] text-muted-foreground">Menos</span>
              {[0.1, 0.3, 0.5, 0.7, 0.9].map((v) => (
                <div
                  key={v}
                  className="w-3 h-3 rounded-sm"
                  style={{ backgroundColor: `hsl(var(--primary) / ${v})` }}
                />
              ))}
              <span className="text-[9px] text-muted-foreground">Mais</span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
