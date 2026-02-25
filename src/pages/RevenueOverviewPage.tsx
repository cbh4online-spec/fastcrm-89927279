import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Loader2, TrendingUp, AlertTriangle, ShieldCheck, Activity, PieChart, Lightbulb } from "lucide-react";
import { useMultiPipelineIntelligence, PipelineIntelligence } from "@/hooks/useMultiPipelineIntelligence";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from "recharts";

function healthColor(score: number): string {
  if (score >= 70) return "hsl(142 76% 36%)";
  if (score >= 50) return "hsl(38 92% 50%)";
  return "hsl(0 84% 60%)";
}

function confidenceColor(score: number): string {
  if (score >= 70) return "hsl(142 76% 36%)";
  if (score >= 50) return "hsl(38 92% 50%)";
  return "hsl(0 84% 60%)";
}

function PipelineCard({ pipeline }: { pipeline: PipelineIntelligence }) {
  return (
    <Card className="border border-border/60">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base font-semibold">{pipeline.name}</CardTitle>
          <Badge
            variant="outline"
            className="text-xs"
            style={{ borderColor: healthColor(pipeline.health_index), color: healthColor(pipeline.health_index) }}
          >
            {pipeline.health_index}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="grid grid-cols-2 gap-3 text-sm">
          <div>
            <p className="text-muted-foreground text-xs">Risk Ratio</p>
            <p className="font-medium">{Math.round(pipeline.risk_ratio * 100)}%</p>
          </div>
          <div>
            <p className="text-muted-foreground text-xs">Confidence</p>
            <p className="font-medium">{pipeline.forecast_confidence}%</p>
          </div>
          <div>
            <p className="text-muted-foreground text-xs">Revenue Share</p>
            <p className="font-medium">{Math.round(pipeline.revenue_share * 100)}%</p>
          </div>
          <div>
            <p className="text-muted-foreground text-xs">Velocity</p>
            <p className="font-medium">
              {pipeline.velocity_index.toFixed(2)}x
              {pipeline.velocity_index > 1.2 && (
                <span className="text-destructive ml-1 text-xs">slow</span>
              )}
            </p>
          </div>
        </div>
        <div className="flex items-center justify-between text-xs text-muted-foreground pt-2 border-t border-border/40">
          <span>{pipeline.deal_count} deals</span>
          <span>
            {new Intl.NumberFormat("en", { style: "currency", currency: "EUR", maximumFractionDigits: 0 }).format(pipeline.total_value)}
          </span>
        </div>
      </CardContent>
    </Card>
  );
}

function InsightItem({ text }: { text: string }) {
  const isRisk = text.includes("risk") || text.includes("slow") || text.includes("low");
  const isConcentration = text.includes("concentrated") || text.includes("Revenue");
  const Icon = isRisk ? AlertTriangle : isConcentration ? PieChart : ShieldCheck;
  const color = isRisk ? "text-destructive" : isConcentration ? "text-amber-500" : "text-emerald-500";

  return (
    <div className="flex items-start gap-3 py-2">
      <Icon className={`h-4 w-4 mt-0.5 shrink-0 ${color}`} />
      <p className="text-sm text-foreground">{text}</p>
    </div>
  );
}

export default function RevenueOverviewPage() {
  const { data, isLoading, error } = useMultiPipelineIntelligence();

  return (
    <DashboardLayout>
      <ScrollArea className="h-[calc(100vh-5rem)]">
        <div className="p-4 md:p-6 space-y-6">
          {/* Header */}
          <div className="space-y-1">
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold">Revenue Overview</h1>
              <Badge variant="outline" className="text-xs font-normal">Executive</Badge>
            </div>
            <p className="text-sm text-muted-foreground">
              Compare pipeline performance, risk, and revenue concentration.
            </p>
          </div>

          {isLoading && (
            <div className="flex items-center justify-center py-20">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          )}

          {error && (
            <Card className="border-destructive/30 bg-destructive/5">
              <CardContent className="py-6 text-center text-sm text-destructive">
                Failed to load pipeline intelligence.
              </CardContent>
            </Card>
          )}

          {data && !isLoading && (
            <>
              {data.pipelines.length === 0 ? (
                <Card>
                  <CardContent className="py-12 text-center">
                    <Activity className="h-10 w-10 mx-auto mb-3 text-muted-foreground/40" />
                    <p className="text-sm text-muted-foreground">
                      Not enough data yet. Each pipeline needs at least 5 active deals.
                    </p>
                  </CardContent>
                </Card>
              ) : (
                <>
                  {/* Section 1 — Pipeline Cards */}
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {data.pipelines.map((p) => (
                      <PipelineCard key={p.pipeline_id} pipeline={p} />
                    ))}
                  </div>

                  {/* Section 2 — Charts */}
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                    <Card>
                      <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium flex items-center gap-2">
                          <TrendingUp className="h-4 w-4 text-muted-foreground" />
                          Health Index
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <ResponsiveContainer width="100%" height={200}>
                          <BarChart
                            data={data.pipelines.map((p) => ({
                              name: p.name.length > 16 ? p.name.slice(0, 14) + "…" : p.name,
                              value: p.health_index,
                              fill: healthColor(p.health_index),
                            }))}
                            layout="vertical"
                            margin={{ left: 0, right: 16, top: 4, bottom: 4 }}
                          >
                            <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                            <XAxis type="number" domain={[0, 100]} tick={{ fontSize: 11 }} />
                            <YAxis dataKey="name" type="category" width={100} tick={{ fontSize: 11 }} />
                            <Tooltip formatter={(v: number) => [`${v}`, "Health"]} />
                            <Bar dataKey="value" radius={[0, 4, 4, 0]} barSize={20}>
                              {data.pipelines.map((p, i) => (
                                <Cell key={i} fill={healthColor(p.health_index)} />
                              ))}
                            </Bar>
                          </BarChart>
                        </ResponsiveContainer>
                      </CardContent>
                    </Card>

                    <Card>
                      <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium flex items-center gap-2">
                          <ShieldCheck className="h-4 w-4 text-muted-foreground" />
                          Forecast Confidence
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <ResponsiveContainer width="100%" height={200}>
                          <BarChart
                            data={data.pipelines.map((p) => ({
                              name: p.name.length > 16 ? p.name.slice(0, 14) + "…" : p.name,
                              value: p.forecast_confidence,
                              fill: confidenceColor(p.forecast_confidence),
                            }))}
                            layout="vertical"
                            margin={{ left: 0, right: 16, top: 4, bottom: 4 }}
                          >
                            <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                            <XAxis type="number" domain={[0, 100]} tick={{ fontSize: 11 }} />
                            <YAxis dataKey="name" type="category" width={100} tick={{ fontSize: 11 }} />
                            <Tooltip formatter={(v: number) => [`${v}%`, "Confidence"]} />
                            <Bar dataKey="value" radius={[0, 4, 4, 0]} barSize={20}>
                              {data.pipelines.map((p, i) => (
                                <Cell key={i} fill={confidenceColor(p.forecast_confidence)} />
                              ))}
                            </Bar>
                          </BarChart>
                        </ResponsiveContainer>
                      </CardContent>
                    </Card>
                  </div>

                  {/* Section 3 — Executive Insights */}
                  {data.insights.length > 0 && (
                    <Card>
                      <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium flex items-center gap-2">
                          <Lightbulb className="h-4 w-4 text-amber-500" />
                          Executive Insights
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="divide-y divide-border/40">
                        {data.insights.map((insight, i) => (
                          <InsightItem key={i} text={insight} />
                        ))}
                      </CardContent>
                    </Card>
                  )}
                </>
              )}
            </>
          )}
        </div>
      </ScrollArea>
    </DashboardLayout>
  );
}
