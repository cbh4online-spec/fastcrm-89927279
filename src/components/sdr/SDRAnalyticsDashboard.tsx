import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Loader2, TrendingUp } from "lucide-react";
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid, Legend } from "recharts";
import { SDRSendTimeHeatmap } from "./SDRSendTimeHeatmap";
import { SDRABTestResults } from "./SDRABTestResults";

interface SDRAnalyticsDashboardProps {
  campaignId?: string | null;
  campaigns?: any[];
}

export function SDRAnalyticsDashboard({ campaignId, campaigns = [] }: SDRAnalyticsDashboardProps) {
  const { currentWorkspace } = useWorkspace();

  // Fetch daily stats (last 30 days)
  const { data: dailyStats = [], isLoading } = useQuery({
    queryKey: ["sdr-daily-stats", currentWorkspace?.id, campaignId],
    queryFn: async () => {
      const thirtyDaysAgo = new Date(Date.now() - 30 * 86400000).toISOString().slice(0, 10);
      let query = (supabase as any)
        .from("sdr_daily_stats")
        .select("*")
        .eq("workspace_id", currentWorkspace!.id)
        .gte("stat_date", thirtyDaysAgo)
        .order("stat_date");

      if (campaignId) {
        query = query.eq("campaign_id", campaignId);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data || [];
    },
    enabled: !!currentWorkspace?.id,
    staleTime: 60_000,
  });

  // Aggregate by date for chart
  const chartData = useMemo(() => {
    const byDate = new Map<string, { date: string; sent: number; opened: number; replied: number; clicked: number }>();

    for (const row of dailyStats) {
      const existing = byDate.get(row.stat_date) || { date: row.stat_date, sent: 0, opened: 0, replied: 0, clicked: 0 };
      existing.sent += row.sent || 0;
      existing.opened += row.opened || 0;
      existing.replied += row.replied || 0;
      existing.clicked += row.clicked || 0;
      byDate.set(row.stat_date, existing);
    }

    return Array.from(byDate.values()).sort((a, b) => a.date.localeCompare(b.date));
  }, [dailyStats]);

  // Campaign comparison table
  const campaignComparison = useMemo(() => {
    if (campaignId) return [];
    const byCampaign = new Map<string, { name: string; sent: number; opened: number; clicked: number; replied: number; meetings: number }>();

    for (const row of dailyStats) {
      const camp = campaigns.find((c) => c.id === row.campaign_id);
      const name = camp?.name || "Desconhecida";
      const existing = byCampaign.get(row.campaign_id) || { name, sent: 0, opened: 0, clicked: 0, replied: 0, meetings: 0 };
      existing.sent += row.sent || 0;
      existing.opened += row.opened || 0;
      existing.clicked += row.clicked || 0;
      existing.replied += row.replied || 0;
      existing.meetings += row.meetings || 0;
      byCampaign.set(row.campaign_id, existing);
    }

    return Array.from(byCampaign.values())
      .map((c) => ({
        ...c,
        openRate: c.sent > 0 ? (c.opened / c.sent) * 100 : 0,
        replyRate: c.sent > 0 ? (c.replied / c.sent) * 100 : 0,
      }))
      .sort((a, b) => b.replyRate - a.replyRate);
  }, [dailyStats, campaigns, campaignId]);

  // Get selected campaign's AB variants
  const selectedCampaign = campaigns.find((c) => c.id === campaignId);
  const abVariants = (selectedCampaign?.ab_testing_config as any)?.variants || [];

  if (isLoading) {
    return (
      <div className="flex justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Trend Chart */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <TrendingUp className="h-4 w-4" />
            Tendência — Últimos 30 dias
            {campaignId && selectedCampaign && (
              <Badge variant="secondary" className="text-[10px]">{selectedCampaign.name}</Badge>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {chartData.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">
              Sem dados de analytics. As métricas são agregadas diariamente.
            </p>
          ) : (
            <ResponsiveContainer width="100%" height={280}>
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                <XAxis
                  dataKey="date"
                  tickFormatter={(v) => {
                    const d = new Date(v);
                    return `${d.getDate()}/${d.getMonth() + 1}`;
                  }}
                  className="text-[10px]"
                  tick={{ fontSize: 10 }}
                />
                <YAxis tick={{ fontSize: 10 }} />
                <Tooltip
                  labelFormatter={(v) => new Date(v).toLocaleDateString("pt-PT")}
                  contentStyle={{ fontSize: "12px" }}
                />
                <Legend wrapperStyle={{ fontSize: "11px" }} />
                <Line type="monotone" dataKey="sent" name="Enviados" stroke="hsl(var(--primary))" strokeWidth={2} dot={false} />
                <Line type="monotone" dataKey="opened" name="Abertos" stroke="#10b981" strokeWidth={2} dot={false} />
                <Line type="monotone" dataKey="clicked" name="Cliques" stroke="#8b5cf6" strokeWidth={2} dot={false} />
                <Line type="monotone" dataKey="replied" name="Respostas" stroke="#f59e0b" strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>

      {/* A/B Test Results */}
      {campaignId && abVariants.length > 1 && (
        <SDRABTestResults campaignId={campaignId} variants={abVariants} />
      )}

      {/* Send Time Heatmap */}
      <SDRSendTimeHeatmap campaignId={campaignId} />

      {/* Campaign Comparison */}
      {!campaignId && campaignComparison.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Comparação entre Campanhas</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left">
                    <th className="pb-2 font-medium text-muted-foreground text-xs">Campanha</th>
                    <th className="pb-2 font-medium text-muted-foreground text-xs text-right">Sent</th>
                    <th className="pb-2 font-medium text-muted-foreground text-xs text-right">Open %</th>
                    <th className="pb-2 font-medium text-muted-foreground text-xs text-right">Reply %</th>
                    <th className="pb-2 font-medium text-muted-foreground text-xs text-right">Meetings</th>
                  </tr>
                </thead>
                <tbody>
                  {campaignComparison.map((c, i) => (
                    <tr key={i} className="border-b last:border-0">
                      <td className="py-2 font-medium max-w-[200px] truncate">{c.name}</td>
                      <td className="py-2 text-right">{c.sent}</td>
                      <td className="py-2 text-right">{c.openRate.toFixed(1)}%</td>
                      <td className="py-2 text-right font-bold">{c.replyRate.toFixed(1)}%</td>
                      <td className="py-2 text-right">{c.meetings}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
