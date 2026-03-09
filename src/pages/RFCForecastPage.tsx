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

  // Trend data from snapshots (reversed for chronological order)
  const trendData = (snapshots || []).slice().reverse().map((s: any, i: number) => ({
    label: `S${i + 1}`,
    most_likely: s.most_likely_revenue,
    best_case: s.best_case_revenue,
    worst_case: s.worst_case_revenue,
    target: s.target_revenue,
    closed: s.closed_revenue,
  }));

  // Top deals driving forecast
  const openDeals = (dealScores || [])
    .filter((d: any) => d.opportunities?.status && !["won", "lost"].includes(d.opportunities.status));
  const topDrivers = openDeals
    .sort((a: any, b: any) => ((b.opportunities?.value || 0) * b.probability_score) - ((a.opportunities?.value || 0) * a.probability_score))
    .slice(0, 10);
  const topThreats = openDeals
    .sort((a: any, b: any) => b.risk_score - a.risk_score)
    .slice(0, 10);

  // Risk distribution
  const riskDistribution = [
    { name: "Baixo (<30)", count: openDeals.filter((d: any) => d.risk_score < 30).length, value: openDeals.filter((d: any) => d.risk_score < 30).reduce((s: number, d: any) => s + (d.opportunities?.value || 0), 0) },
    { name: "Médio (30-60)", count: openDeals.filter((d: any) => d.risk_score >= 30 && d.risk_score < 60).length, value: openDeals.filter((d: any) => d.risk_score >= 30 && d.risk_score < 60).reduce((s: number, d: any) => s + (d.opportunities?.value || 0), 0) },
    { name: "Alto (≥60)", count: openDeals.filter((d: any) => d.risk_score >= 60).length, value: openDeals.filter((d: any) => d.risk_score >= 60).reduce((s: number, d: any) => s + (d.opportunities?.value || 0), 0) },
  ];

  const riskColors = ["#34d399", "#fbbf24", "#f87171"];

  return (
    <DashboardLayout>
      <div className="p-6 space-y-6 max-w-[1400px] mx-auto">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate("/dashboard/revenue-flight-control")}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-xl font-bold">Forecast Trends</h1>
            <p className="text-sm text-muted-foreground">Evolução e composição do forecast</p>
          </div>
        </div>

        {/* Current vs Target */}
        {latest && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card>
              <CardContent className="pt-4">
                <p className="text-xs text-muted-foreground">Target</p>
                <p className="text-2xl font-bold">{formatCurrency(latest.target_revenue)}</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-4">
                <p className="text-xs text-muted-foreground">Most Likely</p>
                <p className="text-2xl font-bold text-primary">{formatCurrency(latest.most_likely_revenue)}</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-4">
                <p className="text-xs text-muted-foreground">Gap</p>
                <p className={cn("text-2xl font-bold", latest.forecast_gap > 0 ? "text-red-400" : "text-emerald-400")}>
                  {latest.forecast_gap > 0 ? "-" : "+"}{formatCurrency(Math.abs(latest.forecast_gap))}
                </p>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Forecast Trend */}
        {trendData.length > 1 && (
          <Card>
            <CardHeader><CardTitle className="text-sm">Evolução do Forecast</CardTitle></CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={trendData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="label" stroke="hsl(var(--muted-foreground))" fontSize={12} />
                  <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} tickFormatter={(v) => `€${(v/1000).toFixed(0)}K`} />
                  <Tooltip formatter={(v: any) => formatCurrency(v)} />
                  <Legend />
                  <Line type="monotone" dataKey="target" stroke="#94a3b8" strokeDasharray="5 5" name="Target" />
                  <Line type="monotone" dataKey="best_case" stroke="#34d399" name="Best Case" />
                  <Line type="monotone" dataKey="most_likely" stroke="hsl(var(--primary))" strokeWidth={2} name="Most Likely" />
                  <Line type="monotone" dataKey="worst_case" stroke="#f87171" name="Worst Case" />
                  <Line type="monotone" dataKey="closed" stroke="#22d3ee" name="Fechado" />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Risk Distribution */}
          <Card>
            <CardHeader><CardTitle className="text-sm">Distribuição de Risco</CardTitle></CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={250}>
                <BarChart data={riskDistribution}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="name" stroke="hsl(var(--muted-foreground))" fontSize={11} />
                  <YAxis stroke="hsl(var(--muted-foreground))" fontSize={11} />
                  <Tooltip formatter={(v: any) => formatCurrency(v)} />
                  <Bar dataKey="value" name="Valor em Risco">
                    {riskDistribution.map((_, i) => <Cell key={i} fill={riskColors[i]} />)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
              <div className="flex gap-4 mt-3 justify-center">
                {riskDistribution.map((r, i) => (
                  <div key={r.name} className="text-center">
                    <p className="text-lg font-bold" style={{ color: riskColors[i] }}>{r.count}</p>
                    <p className="text-[10px] text-muted-foreground">{r.name}</p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Top Drivers */}
          <Card>
            <CardHeader><CardTitle className="text-sm flex items-center gap-2"><TrendingUp className="h-4 w-4 text-emerald-400" /> Top 10 — Impulsionam Forecast</CardTitle></CardHeader>
            <CardContent>
              <div className="space-y-2 max-h-[300px] overflow-y-auto">
                {topDrivers.map((d: any) => (
                  <div key={d.id} className="flex items-center justify-between p-2 rounded bg-muted/20 cursor-pointer hover:bg-muted/40" onClick={() => navigate(`/dashboard/opportunities/${d.opportunity_id}`)}>
                    <div className="truncate flex-1">
                      <p className="text-xs font-medium truncate">{d.opportunities?.title}</p>
                    </div>
                    <div className="flex items-center gap-2">
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
          <CardHeader><CardTitle className="text-sm flex items-center gap-2"><TrendingDown className="h-4 w-4 text-red-400" /> Top 10 — Ameaçam Forecast</CardTitle></CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
              {topThreats.map((d: any) => (
                <div key={d.id} className="flex items-center justify-between p-3 rounded bg-red-500/5 border border-red-500/10 cursor-pointer hover:bg-red-500/10" onClick={() => navigate(`/dashboard/opportunities/${d.opportunity_id}`)}>
                  <div className="truncate flex-1">
                    <p className="text-xs font-medium truncate">{d.opportunities?.title}</p>
                    <p className="text-[10px] text-muted-foreground">{d.recommended_action}</p>
                  </div>
                  <div className="flex items-center gap-2">
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
