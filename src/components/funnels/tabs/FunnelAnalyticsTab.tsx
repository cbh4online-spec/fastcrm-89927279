import { useState } from "react";
import { format, subDays } from "date-fns";
import { BarChart3, TrendingUp, Eye, Target, Users, CalendarIcon, Brain, Loader2, Lightbulb, AlertTriangle, DollarSign, Coins, MousePointerClick, ShieldCheck, Mail, Globe } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useFunnelSteps, useFunnelStepStats } from "@/hooks/useFunnels";
import { useFunnelConversionKPIs } from "@/hooks/useFunnelConversionKPIs";
import { useFunnelCtaRanking, useFunnelUtmBreakdown } from "@/hooks/useFunnelAnalyticsData";
import { supabase } from "@/integrations/supabase/client";
import { useAIGate } from "@/hooks/useAIGate";
import { triggerNoCreditsDialog } from "@/hooks/useNoCreditsDialog";
import { toast } from "sonner";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RTooltip,
  ResponsiveContainer,
} from "recharts";

interface Props {
  funnelId: string;
}

interface AIInsight {
  score: number;
  bottleneck: string;
  suggestions: string[];
  revenue_forecast: string;
}

const COLORS = ["hsl(var(--primary))", "hsl(var(--chart-2))", "hsl(var(--chart-3))", "hsl(var(--chart-4))", "hsl(var(--chart-5))"];

export function FunnelAnalyticsTab({ funnelId }: Props) {
  const [dateFrom, setDateFrom] = useState(format(subDays(new Date(), 30), "yyyy-MM-dd"));
  const [dateTo, setDateTo] = useState(format(new Date(), "yyyy-MM-dd"));
  const [aiInsights, setAiInsights] = useState<AIInsight | null>(null);
  const [aiLoading, setAiLoading] = useState(false);
  const { canRun, showUpgrade, overageLabel } = useAIGate("medium");

  const { data: steps = [] } = useFunnelSteps(funnelId);
  const { data: rawStats = [] } = useFunnelStepStats(funnelId, dateFrom, dateTo);
  const { data: kpis } = useFunnelConversionKPIs(funnelId, dateFrom, dateTo);
  const { data: ctaRanking = [] } = useFunnelCtaRanking(funnelId, dateFrom, dateTo);
  const { data: utmBreakdown = [] } = useFunnelUtmBreakdown(funnelId, dateFrom, dateTo);

  const analyzeWithAI = async () => {
    if (showUpgrade) { triggerNoCreditsDialog({ actionLabel: "Analisar funil com IA" }); return; }
    setAiLoading(true);
    try {
      const { data, error } = await (supabase as any).functions.invoke("funnel-ai-insights", { body: { funnel_id: funnelId } });
      if (error) throw error;
      if (data?.error) { toast.error(data.error); return; }
      setAiInsights(data);
    } catch (e: any) { toast.error("Erro ao gerar insights: " + e.message); }
    finally { setAiLoading(false); }
  };

  const getScoreColor = (score: number) => score >= 80 ? "text-green-500" : score >= 50 ? "text-amber-500" : "text-destructive";

  // Legacy stats aggregation
  const statsByStep: Record<string, Record<string, number>> = {};
  for (const stat of rawStats) {
    if (!statsByStep[stat.step_id]) statsByStep[stat.step_id] = {};
    statsByStep[stat.step_id][stat.event_type] = (statsByStep[stat.step_id][stat.event_type] || 0) + (stat.count || 0);
    if (stat.event_type === "sale") {
      statsByStep[stat.step_id]["sale_amount"] = (statsByStep[stat.step_id]["sale_amount"] || 0) + Number(stat.amount || 0);
    }
  }
  const getStat = (stepId: string, type: string) => statsByStep[stepId]?.[type] || 0;

  const totalViews = steps.reduce((sum, s) => sum + getStat(s.id, "page_view"), 0);
  const totalOptins = steps.reduce((sum, s) => sum + getStat(s.id, "optin"), 0);
  const totalRevenue = steps.reduce((sum, s) => sum + getStat(s.id, "sale_amount"), 0);

  const funnelData = steps.map((step) => ({
    name: step.name,
    views: getStat(step.id, "page_view"),
    optins: getStat(step.id, "optin"),
    sales: getStat(step.id, "sale"),
  }));

  // Conversion funnel
  const conversionStages = [
    { name: "Visitantes", value: kpis?.step_views || totalViews },
    { name: "Form Starts", value: kpis?.form_starts || 0 },
    { name: "Leads", value: kpis?.leads_captured || totalOptins },
    { name: "CRM", value: kpis?.contacts_created || 0 },
    { name: "CTA Clicks", value: kpis?.cta_clicks || 0 },
  ];

  return (
    <div className="space-y-6">
      {/* Date + AI */}
      <div className="flex items-center justify-between gap-2">
        <Button onClick={analyzeWithAI} disabled={aiLoading} variant="outline" className="gap-2">
          {aiLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Brain className="h-4 w-4" />}
          {aiInsights ? "Reanalisar com IA" : "Analisar com IA"}
          {overageLabel && <Badge variant="outline" className="ml-1 text-[10px]"><Coins className="h-3 w-3 mr-1" />{overageLabel}</Badge>}
        </Button>
        <div className="flex items-center gap-2 border rounded-lg px-3 py-1.5 bg-background">
          <Input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} className="border-0 p-0 h-auto w-auto text-sm min-w-0" />
          <span className="text-muted-foreground">→</span>
          <Input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} className="border-0 p-0 h-auto w-auto text-sm min-w-0" />
          <CalendarIcon className="h-4 w-4 text-muted-foreground" />
        </div>
      </div>

      <Tabs defaultValue="consumo">
        <TabsList>
          <TabsTrigger value="consumo">Consumo</TabsTrigger>
          <TabsTrigger value="captacao">Captação</TabsTrigger>
          <TabsTrigger value="conversao">Conversão</TabsTrigger>
        </TabsList>

        {/* CONSUMO */}
        <TabsContent value="consumo" className="space-y-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Card className="border-border/50">
              <CardContent className="pt-4 pb-3">
                <div className="flex items-center gap-2 text-muted-foreground mb-1"><Eye className="h-4 w-4" /><span className="text-xs font-medium">Step Views</span></div>
                <p className="text-2xl font-bold">{(kpis?.step_views || totalViews).toLocaleString()}</p>
              </CardContent>
            </Card>
            <Card className="border-border/50">
              <CardContent className="pt-4 pb-3">
                <div className="flex items-center gap-2 text-muted-foreground mb-1"><Users className="h-4 w-4" /><span className="text-xs font-medium">Sessões Únicas</span></div>
                <p className="text-2xl font-bold">{(kpis?.unique_sessions || 0).toLocaleString()}</p>
              </CardContent>
            </Card>
            <Card className="border-border/50">
              <CardContent className="pt-4 pb-3">
                <div className="flex items-center gap-2 text-muted-foreground mb-1"><Target className="h-4 w-4" /><span className="text-xs font-medium">Opt-in Rate</span></div>
                <p className="text-2xl font-bold">{(kpis?.optin_rate || (totalViews > 0 ? ((totalOptins / totalViews) * 100) : 0)).toFixed(1)}%</p>
              </CardContent>
            </Card>
            <Card className="border-border/50">
              <CardContent className="pt-4 pb-3">
                <div className="flex items-center gap-2 text-muted-foreground mb-1"><TrendingUp className="h-4 w-4" /><span className="text-xs font-medium">Receita</span></div>
                <p className="text-2xl font-bold">{totalRevenue > 0 ? `€${totalRevenue.toLocaleString()}` : "€0"}</p>
              </CardContent>
            </Card>
          </div>

          <Card className="border-border/50">
            <CardHeader className="pb-2"><CardTitle className="text-sm flex items-center gap-2"><BarChart3 className="h-4 w-4 text-primary" />Performance por Step</CardTitle></CardHeader>
            <CardContent>
              {funnelData.length > 0 ? (
                <ResponsiveContainer width="100%" height={250}>
                  <BarChart data={funnelData}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-border/30" />
                    <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                    <YAxis tick={{ fontSize: 11 }} />
                    <RTooltip />
                    <Bar dataKey="views" fill="hsl(var(--primary))" name="Views" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="optins" fill="hsl(var(--chart-2))" name="Opt-ins" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="sales" fill="hsl(var(--chart-3))" name="Vendas" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-[250px] flex items-center justify-center text-sm text-muted-foreground">Sem dados no período</div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* CAPTAÇÃO */}
        <TabsContent value="captacao" className="space-y-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Card className="border-border/50">
              <CardContent className="pt-4 pb-3">
                <div className="flex items-center gap-2 text-muted-foreground mb-1"><Users className="h-4 w-4" /><span className="text-xs font-medium">Leads Captados</span></div>
                <p className="text-2xl font-bold">{(kpis?.leads_captured || totalOptins).toLocaleString()}</p>
              </CardContent>
            </Card>
            <Card className="border-border/50">
              <CardContent className="pt-4 pb-3">
                <div className="flex items-center gap-2 text-muted-foreground mb-1"><Users className="h-4 w-4" /><span className="text-xs font-medium">Contactos CRM</span></div>
                <p className="text-2xl font-bold">{(kpis?.contacts_created || 0).toLocaleString()}</p>
              </CardContent>
            </Card>
            <Card className="border-border/50">
              <CardContent className="pt-4 pb-3">
                <div className="flex items-center gap-2 text-muted-foreground mb-1"><ShieldCheck className="h-4 w-4" /><span className="text-xs font-medium">Consentimentos</span></div>
                <p className="text-2xl font-bold">{(kpis?.consent_given_count || 0).toLocaleString()}</p>
              </CardContent>
            </Card>
            <Card className="border-border/50">
              <CardContent className="pt-4 pb-3">
                <div className="flex items-center gap-2 text-muted-foreground mb-1"><Mail className="h-4 w-4" /><span className="text-xs font-medium">Marketing Opt-ins</span></div>
                <p className="text-2xl font-bold">{(kpis?.marketing_optins || 0).toLocaleString()}</p>
              </CardContent>
            </Card>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <Card className="border-border/50">
              <CardContent className="pt-4 pb-3">
                <div className="text-muted-foreground text-xs font-medium mb-1">Form Starts</div>
                <p className="text-2xl font-bold">{(kpis?.form_starts || 0).toLocaleString()}</p>
              </CardContent>
            </Card>
            <Card className="border-border/50">
              <CardContent className="pt-4 pb-3">
                <div className="text-muted-foreground text-xs font-medium mb-1">Form Submits</div>
                <p className="text-2xl font-bold">{(kpis?.form_submits || 0).toLocaleString()}</p>
                {(kpis?.form_failures || 0) > 0 && (
                  <p className="text-xs text-destructive">{kpis!.form_failures} falhados</p>
                )}
              </CardContent>
            </Card>
          </div>

          {/* UTM Breakdown */}
          {utmBreakdown.length > 0 && (
            <Card className="border-border/50">
              <CardHeader className="pb-2"><CardTitle className="text-sm flex items-center gap-2"><Globe className="h-4 w-4 text-primary" />Conversão por Origem (UTM)</CardTitle></CardHeader>
              <CardContent>
                <div className="space-y-1">
                  <div className="grid grid-cols-4 text-xs font-medium text-muted-foreground pb-2 border-b">
                    <span>Origem</span><span className="text-right">Sessões</span><span className="text-right">Leads</span><span className="text-right">Conv. %</span>
                  </div>
                  {utmBreakdown.slice(0, 10).map((row) => (
                    <div key={row.source} className="grid grid-cols-4 text-sm py-1.5 border-b border-border/30">
                      <span className="font-medium truncate">{row.source}</span>
                      <span className="text-right text-muted-foreground">{row.sessions}</span>
                      <span className="text-right text-muted-foreground">{row.leads}</span>
                      <span className="text-right font-medium">{row.conversion_rate.toFixed(1)}%</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* CONVERSÃO */}
        <TabsContent value="conversao" className="space-y-4">
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            <Card className="border-border/50">
              <CardContent className="pt-4 pb-3">
                <div className="flex items-center gap-2 text-muted-foreground mb-1"><MousePointerClick className="h-4 w-4" /><span className="text-xs font-medium">CTA Clicks</span></div>
                <p className="text-2xl font-bold">{(kpis?.cta_clicks || 0).toLocaleString()}</p>
              </CardContent>
            </Card>
            <Card className="border-border/50">
              <CardContent className="pt-4 pb-3">
                <div className="flex items-center gap-2 text-muted-foreground mb-1"><Target className="h-4 w-4" /><span className="text-xs font-medium">CTA CTR</span></div>
                <p className="text-2xl font-bold">{(kpis?.cta_ctr || 0).toFixed(1)}%</p>
              </CardContent>
            </Card>
            <Card className="border-border/50">
              <CardContent className="pt-4 pb-3">
                <div className="flex items-center gap-2 text-muted-foreground mb-1"><TrendingUp className="h-4 w-4" /><span className="text-xs font-medium">Completion Rate</span></div>
                <p className="text-2xl font-bold">{(kpis?.completion_rate || 0).toFixed(1)}%</p>
              </CardContent>
            </Card>
          </div>

          {/* Conversion funnel visual */}
          <Card className="border-border/50">
            <CardHeader className="pb-2"><CardTitle className="text-sm flex items-center gap-2"><TrendingUp className="h-4 w-4 text-primary" />Funil de Conversão</CardTitle></CardHeader>
            <CardContent>
              <div className="space-y-4 py-4">
                {conversionStages.map((stage, i) => {
                  const maxValue = Math.max(...conversionStages.map(s => s.value), 1);
                  const width = Math.max((stage.value / maxValue) * 100, 5);
                  const prevValue = i > 0 ? conversionStages[i - 1].value : stage.value;
                  const rate = prevValue > 0 ? ((stage.value / prevValue) * 100).toFixed(1) : "0";
                  return (
                    <div key={stage.name}>
                      <div className="flex items-center justify-between text-sm mb-1">
                        <span className="font-medium">{stage.name}</span>
                        <span className="text-muted-foreground">
                          {stage.value.toLocaleString()}
                          {i > 0 && <span className="ml-1 text-xs">({rate}%)</span>}
                        </span>
                      </div>
                      <div className="h-8 bg-muted/30 rounded-lg overflow-hidden">
                        <div className="h-full rounded-lg transition-all duration-500" style={{ width: `${width}%`, backgroundColor: COLORS[i % COLORS.length] }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>

          {/* CTA Ranking */}
          {ctaRanking.length > 0 && (
            <Card className="border-border/50">
              <CardHeader className="pb-2"><CardTitle className="text-sm flex items-center gap-2"><MousePointerClick className="h-4 w-4 text-primary" />Ranking de CTAs por Step</CardTitle></CardHeader>
              <CardContent>
                <div className="space-y-1">
                  <div className="grid grid-cols-4 text-xs font-medium text-muted-foreground pb-2 border-b">
                    <span>Step</span><span className="text-right">Views</span><span className="text-right">Clicks</span><span className="text-right">CTR</span>
                  </div>
                  {ctaRanking.map((row) => (
                    <div key={row.step_id} className="grid grid-cols-4 text-sm py-1.5 border-b border-border/30">
                      <span className="font-medium truncate">{row.step_name}</span>
                      <span className="text-right text-muted-foreground">{row.views}</span>
                      <span className="text-right text-muted-foreground">{row.clicks}</span>
                      <span className="text-right font-medium">{row.ctr.toFixed(1)}%</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>

      {/* AI Insights */}
      {aiLoading && (
        <Card className="flex flex-col items-center justify-center py-12">
          <Loader2 className="h-10 w-10 animate-spin text-primary mb-4" />
          <p className="text-muted-foreground">A analisar dados com IA...</p>
        </Card>
      )}

      {aiInsights && !aiLoading && (
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <Brain className="h-5 w-5 text-primary" />
            <h3 className="font-semibold">Análise IA do Funil</h3>
            <Badge variant="secondary" className="text-xs">Gemini</Badge>
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader className="pb-2"><CardTitle className="text-sm flex items-center gap-2"><TrendingUp className="h-4 w-4" />Score</CardTitle></CardHeader>
              <CardContent><span className={`text-4xl font-bold ${getScoreColor(aiInsights.score)}`}>{aiInsights.score}/100</span></CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2"><CardTitle className="text-sm flex items-center gap-2"><DollarSign className="h-4 w-4" />Previsão</CardTitle></CardHeader>
              <CardContent><p className="text-lg font-medium">{aiInsights.revenue_forecast}</p></CardContent>
            </Card>
            <Card className="md:col-span-2">
              <CardHeader className="pb-2"><CardTitle className="text-sm flex items-center gap-2"><AlertTriangle className="h-4 w-4 text-amber-500" />Gargalo</CardTitle></CardHeader>
              <CardContent><p className="text-muted-foreground">{aiInsights.bottleneck}</p></CardContent>
            </Card>
            <Card className="md:col-span-2">
              <CardHeader className="pb-2"><CardTitle className="text-sm flex items-center gap-2"><Lightbulb className="h-4 w-4 text-primary" />Sugestões</CardTitle></CardHeader>
              <CardContent>
                <ul className="space-y-2">
                  {aiInsights.suggestions.map((s, i) => (
                    <li key={i} className="flex items-start gap-2 text-sm">
                      <span className="text-primary font-bold mt-0.5">{i + 1}.</span>
                      <span className="text-muted-foreground">{s}</span>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          </div>
        </div>
      )}
    </div>
  );
}
