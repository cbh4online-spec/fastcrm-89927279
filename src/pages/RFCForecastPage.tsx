import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, TrendingUp, TrendingDown, Target } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  useRevenueFlightSnapshot,
  useDealProbabilityScores,
  formatCurrency,
  getTargetStatus,
} from "@/hooks/useRevenueFlightControl";
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, Legend } from "recharts";

function RFCForecastPage() {
  const navigate = useNavigate();
  const { data: snapshots, isLoading } = useRevenueFlightSnapshot();
  const { data: dealScores } = useDealProbabilityScores();

  const latest = snapshots?.[0];

  const trendData = (snapshots || []).slice().reverse().map((s: any, i: number) => ({
    label: `S${i + 1}`,
    most_likely: s.most_likely_revenue,
    best_case: s.best_case_revenue,
    worst_case: s.worst_case_revenue,
    target: s.target_revenue,
    closed: s.closed_revenue,
  }));

  const openDeals = (dealScores || [])
    .filter((d: any) => d.opportunities?.status && !["won", "lost"].includes(d.opportunities.status));
  const topDrivers = openDeals
    .sort((a: any, b: any) => ((b.opportunities?.value || 0) * b.probability_score) - ((a.opportunities?.value || 0) * a.probability_score))
    .slice(0, 10);
  const topThreats = openDeals
    .sort((a: any, b: any) => b.risk_score - a.risk_score)
    .slice(0, 10);

  const riskDistribution = [
    { name: "Baixo", count: openDeals.filter((d: any) => d.risk_score < 30).length, value: openDeals.filter((d: any) => d.risk_score < 30).reduce((s: number, d: any) => s + (d.opportunities?.value || 0), 0) },
    { name: "Médio", count: openDeals.filter((d: any) => d.risk_score >= 30 && d.risk_score < 60).length, value: openDeals.filter((d: any) => d.risk_score >= 30 && d.risk_score < 60).reduce((s: number, d: any) => s + (d.opportunities?.value || 0), 0) },
    { name: "Alto", count: openDeals.filter((d: any) => d.risk_score >= 60).length, value: openDeals.filter((d: any) => d.risk_score >= 60).reduce((s: number, d: any) => s + (d.opportunities?.value || 0), 0) },
  ];

  const riskColors = ["#34d399", "#fbbf24", "#f87171"];

  return (
    <DashboardLayout>
      <div className="p-4 sm:p-6 space-y-4 sm:space-y-6 max-w-[1400px] mx-auto">
        <div className="flex items-center gap-2 sm:gap-3">
          <Button variant="ghost" size="icon" className="shrink-0 h-8 w-8 sm:h-9 sm:w-9" onClick={() => navigate("/dashboard/revenue-flight-control")}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div className="min-w-0">
            <h1 className="text-base sm:text-xl font-bold">Forecast Trends</h1>
            <p className="text-[10px] sm:text-sm text-muted-foreground">Evolução e composição do forecast</p>
          </div>
        </div>

        {/* Current vs Target */}
        {latest && (
          <div className="grid grid-cols-3 gap-2 sm:gap-4">
            <Card>
              <CardContent className="pt-3 sm:pt-4 px-2.5 sm:px-4">
                <p className="text-[10px] sm:text-xs text-muted-foreground">Target</p>
                <p className="text-base sm:text-2xl font-bold">{formatCurrency(latest.target_revenue)}</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-3 sm:pt-4 px-2.5 sm:px-4">
                <p className="text-[10px] sm:text-xs text-muted-foreground">Most Likely</p>
                <p className="text-base sm:text-2xl font-bold text-primary">{formatCurrency(latest.most_likely_revenue)}</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-3 sm:pt-4 px-2.5 sm:px-4">
                <p className="text-[10px] sm:text-xs text-muted-foreground">Gap</p>
                <p className={cn("text-base sm:text-2xl font-bold", latest.forecast_gap > 0 ? "text-red-400" : "text-emerald-400")}>
                  {latest.forecast_gap > 0 ? "-" : "+"}{formatCurrency(Math.abs(latest.forecast_gap))}
                </p>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Forecast Trend */}
        {trendData.length > 1 && (
          <Card>
            <CardHeader className="px-3 sm:px-6"><CardTitle className="text-xs sm:text-sm">Evolução do Forecast</CardTitle></CardHeader>
            <CardContent className="px-1 sm:px-6">
              <ResponsiveContainer width="100%" height={250}>
                <LineChart data={trendData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="label" stroke="hsl(var(--muted-foreground))" fontSize={10} />
                  <YAxis stroke="hsl(var(--muted-foreground))" fontSize={10} tickFormatter={(v) => `€${(v/1000).toFixed(0)}K`} width={50} />
                  <Tooltip formatter={(v: any) => formatCurrency(v)} />
                  <Legend wrapperStyle={{ fontSize: 10 }} />
                  <Line type="monotone" dataKey="target" stroke="#94a3b8" strokeDasharray="5 5" name="Target" />
                  <Line type="monotone" dataKey="best_case" stroke="#34d399" name="Best" />
                  <Line type="monotone" dataKey="most_likely" stroke="hsl(var(--primary))" strokeWidth={2} name="Likely" />
                  <Line type="monotone" dataKey="worst_case" stroke="#f87171" name="Worst" />
                  <Line type="monotone" dataKey="closed" stroke="#22d3ee" name="Fechado" />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        )}

        <div className="grid grid-cols-1 gap-4 sm:gap-6 lg:grid-cols-2">
          {/* Risk Distribution */}
          <Card>
            <CardHeader className="px-3 sm:px-6"><CardTitle className="text-xs sm:text-sm">Distribuição de Risco</CardTitle></CardHeader>
            <CardContent className="px-1 sm:px-6">
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={riskDistribution}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="name" stroke="hsl(var(--muted-foreground))" fontSize={10} />
                  <YAxis stroke="hsl(var(--muted-foreground))" fontSize={10} tickFormatter={(v) => `€${(v/1000).toFixed(0)}K`} width={50} />
                  <Tooltip formatter={(v: any) => formatCurrency(v)} />
                  <Bar dataKey="value" name="Valor em Risco">
                    {riskDistribution.map((_, i) => <Cell key={i} fill={riskColors[i]} />)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
              <div className="flex gap-4 mt-3 justify-center">
                {riskDistribution.map((r, i) => (
                  <div key={r.name} className="text-center">
                    <p className="text-base sm:text-lg font-bold" style={{ color: riskColors[i] }}>{r.count}</p>
                    <p className="text-[10px] text-muted-foreground">{r.name}</p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Top Drivers */}
          <Card>
            <CardHeader className="px-3 sm:px-6">
              <CardTitle className="text-xs sm:text-sm flex items-center gap-2">
                <TrendingUp className="h-4 w-4 text-emerald-400 shrink-0" />
                <span className="truncate">Top 10 — Impulsionam Forecast</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="px-3 sm:px-6">
              <div className="space-y-2 max-h-[300px] overflow-y-auto">
                {topDrivers.map((d: any) => (
                  <div key={d.id} className="flex items-center justify-between gap-2 p-2 rounded bg-muted/20 cursor-pointer hover:bg-muted/40 active:scale-[0.98]" onClick={() => navigate(`/dashboard/opportunities/${d.opportunity_id}`)}>
                    <p className="text-xs font-medium truncate flex-1 min-w-0">{d.opportunities?.title}</p>
                    <div className="flex items-center gap-1.5 shrink-0">
                      <span className="text-xs font-semibold">{formatCurrency(d.opportunities?.value || 0)}</span>
                      <Badge variant="outline" className="text-[10px] text-emerald-400 border-emerald-400/30">{d.probability_score}%</Badge>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Top Threats */}
        <Card>
          <CardHeader className="px-3 sm:px-6">
            <CardTitle className="text-xs sm:text-sm flex items-center gap-2">
              <TrendingDown className="h-4 w-4 text-red-400 shrink-0" />
              <span className="truncate">Top 10 — Ameaçam Forecast</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="px-3 sm:px-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {topThreats.map((d: any) => (
                <div key={d.id} className="flex items-center justify-between gap-2 p-2.5 sm:p-3 rounded bg-red-500/5 border border-red-500/10 cursor-pointer hover:bg-red-500/10 active:scale-[0.98]" onClick={() => navigate(`/dashboard/opportunities/${d.opportunity_id}`)}>
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-medium truncate">{d.opportunities?.title}</p>
                    <p className="text-[10px] text-muted-foreground line-clamp-1">{d.recommended_action}</p>
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0">
                    <span className="text-xs font-semibold">{formatCurrency(d.opportunities?.value || 0)}</span>
                    <Badge variant="outline" className="text-[10px] text-red-400 border-red-400/30">R:{d.risk_score}</Badge>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}

export default RFCForecastPage;
