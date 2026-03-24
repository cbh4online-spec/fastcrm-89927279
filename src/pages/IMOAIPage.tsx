import { useState, useEffect } from "react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { Progress } from "@/components/ui/progress";
import { useIMOAI, useGrowthScoreHistory } from "@/hooks/useIMOAI";
import { toast } from "sonner";
import {
  TrendingUp, TrendingDown, RefreshCw, Target, Zap,
  BarChart3, Users, Calendar, ArrowUpRight, ArrowDownRight,
  Clock, CheckCircle2, AlertTriangle, Lightbulb, Compass,
  ChevronRight, ExternalLink, Star,
} from "lucide-react";
import {
  PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, ReferenceLine, RadialBarChart, RadialBar,
} from "recharts";
import { motion, AnimatePresence } from "framer-motion";
import type {
  MarketSignal, GrowthOpportunity, ChannelAnalysis,
  ReactivationTarget, QuickWin, RoadmapItem, UntappedSegment,
  CompetitiveSignal, SegmentAnalysis,
} from "@/types/imo-ai";

const PERIOD_OPTIONS = [
  { label: "30 dias", value: 30 },
  { label: "90 dias", value: 90 },
  { label: "180 dias", value: 180 },
  { label: "1 ano", value: 365 },
];

const SIGNAL_ICONS: Record<string, string> = {
  trend_up: "📈", trend_down: "📉", seasonal: "🔄", anomaly: "⚠️", opportunity: "💡",
};

const IMPACT_COLORS: Record<string, string> = {
  very_high: "bg-emerald-500/20 text-emerald-400 border-emerald-500/30",
  high: "bg-blue-500/20 text-blue-400 border-blue-500/30",
  medium: "bg-amber-500/20 text-amber-400 border-amber-500/30",
  low: "bg-muted text-muted-foreground border-border",
};

const EFFORT_COLORS: Record<string, string> = {
  low: "bg-emerald-500/20 text-emerald-400",
  medium: "bg-amber-500/20 text-amber-400",
  high: "bg-red-500/20 text-red-400",
};

const CATEGORY_LABELS: Record<string, string> = {
  acquisition: "Aquisição", retention: "Retenção", expansion: "Expansão",
  reactivation: "Reactivação", product: "Produto", channel: "Canal",
};

const PIE_COLORS = [
  "hsl(var(--primary))", "hsl(var(--accent))", "#10b981", "#f59e0b",
  "#ef4444", "#8b5cf6", "#ec4899", "#06b6d4", "#84cc16", "#f97316",
];

export default function IMOAIPage() {
  const {
    marketInsight, growthInsight, isLoadingMarket, isLoadingGrowth,
    isGenerating, generateAnalysis, generateAsync, lastUpdated,
  } = useIMOAI();
  const { data: scoreHistory } = useGrowthScoreHistory();
  const [periodDays, setPeriodDays] = useState(90);
  const [expandedOpp, setExpandedOpp] = useState<number | null>(null);

  // Auto-generate on first visit
  useEffect(() => {
    if (!marketInsight && !growthInsight && !isLoadingMarket && !isLoadingGrowth && !isGenerating) {
      generateAsync({ analysisType: "both", forceRefresh: false }).catch(() => {
        toast.error("Erro ao gerar análise inicial");
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleRefresh = () => {
    generateAnalysis({ analysisType: "both", forceRefresh: true, periodDays }, {
      onSuccess: () => toast.success("Análise actualizada com sucesso"),
      onError: () => toast.error("Erro ao actualizar análise"),
    });
  };

  const handlePeriodChange = (days: number) => {
    setPeriodDays(days);
    generateAnalysis({ analysisType: "both", forceRefresh: true, periodDays: days }, {
      onSuccess: () => toast.success("Análise actualizada"),
      onError: () => toast.error("Erro ao actualizar análise"),
    });
  };

  const isLoading = isLoadingMarket || isLoadingGrowth;
  const hasData = !!marketInsight || !!growthInsight;

  const growthScore = growthInsight?.growth_score ?? null;
  const scoreColor = growthScore !== null
    ? growthScore >= 80 ? "text-emerald-400" : growthScore >= 60 ? "text-amber-400" : growthScore >= 40 ? "text-orange-400" : "text-red-400"
    : "";

  return (
    <DashboardLayout>
      <div className="space-y-6 p-4 md:p-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <Compass className="h-7 w-7 text-primary" />
              IMO AI
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              Inteligência de Mercado e Oportunidades
            </p>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            {/* Period selector */}
            <div className="flex gap-1 bg-muted/50 rounded-lg p-1">
              {PERIOD_OPTIONS.map((p) => (
                <Button
                  key={p.value}
                  variant={periodDays === p.value ? "secondary" : "ghost"}
                  size="sm"
                  className="text-xs h-7 px-2"
                  onClick={() => handlePeriodChange(p.value)}
                  disabled={isGenerating}
                >
                  {p.label}
                </Button>
              ))}
            </div>

            {lastUpdated && (
              <Badge variant="outline" className="text-xs">
                <Clock className="h-3 w-3 mr-1" />
                {formatTimeAgo(lastUpdated)}
              </Badge>
            )}

            <Button size="sm" variant="outline" onClick={async () => {
              try {
                const { supabase } = await import("@/integrations/supabase/client");
                const { useWorkspace } = await import("@/contexts/WorkspaceContext");
                toast.info("A pesquisar dados de mercado reais...");
                const { data, error } = await supabase.functions.invoke('firecrawl-market-search', {
                  body: { sectors: marketInsight?.dominant_sectors ?? ['tecnologia', 'PME'], country: 'pt', analysis_depth: 'quick' },
                });
                if (error) throw error;
                toast.success(`Dados de mercado actualizados com ${data?.sources_used ?? 0} fontes web`);
                handleRefresh();
              } catch (e: any) { toast.error(`Erro: ${e.message}`); }
            }}>
              <Globe className="h-4 w-4 mr-1" />
              Dados Reais Web
            </Button>

            <Button size="sm" onClick={handleRefresh} disabled={isGenerating}>
              <RefreshCw className={`h-4 w-4 mr-1 ${isGenerating ? "animate-spin" : ""}`} />
              {isGenerating ? "A analisar..." : "Actualizar"}
            </Button>
          </div>
        </div>

        {/* Empty state */}
        {!hasData && !isLoading && !isGenerating && (
          <Card className="border-dashed">
            <CardContent className="flex flex-col items-center justify-center py-16 text-center">
              <motion.div
                animate={{ scale: [1, 1.05, 1] }}
                transition={{ repeat: Infinity, duration: 2 }}
                className="h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center mb-6"
              >
                <Compass className="h-8 w-8 text-primary" />
              </motion.div>
              <h3 className="text-lg font-semibold mb-2">Análise ainda não gerada</h3>
              <p className="text-sm text-muted-foreground max-w-md mb-6">
                A IMO AI analisa os dados do teu CRM para identificar tendências de mercado
                e oportunidades de crescimento específicas para o teu negócio.
              </p>
              <Button onClick={() => generateAnalysis({ analysisType: "both", forceRefresh: true })}>
                🚀 Gerar primeira análise
              </Button>
              <p className="text-xs text-muted-foreground mt-3">⏱ Estimativa: ~30 segundos</p>
            </CardContent>
          </Card>
        )}

        {/* Loading skeleton */}
        {(isLoading || isGenerating) && !hasData && (
          <div className="space-y-4">
            <Skeleton className="h-40 w-full" />
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Skeleton className="h-24" /><Skeleton className="h-24" /><Skeleton className="h-24" />
            </div>
          </div>
        )}

        {/* Growth Score Hero */}
        {hasData && (
          <>
            <GrowthScoreHero
              score={growthScore}
              delta={growthInsight?.growth_score_delta ?? null}
              topPriority={growthInsight?.top_priority ?? null}
              scoreColor={scoreColor}
            />

            {/* Tabs */}
            <Tabs defaultValue="mercado" className="space-y-4">
              <TabsList className="w-full justify-start overflow-x-auto">
                <TabsTrigger value="mercado" className="text-xs">
                  <BarChart3 className="h-3.5 w-3.5 mr-1" /> Mercado
                </TabsTrigger>
                <TabsTrigger value="crescimento" className="text-xs">
                  <TrendingUp className="h-3.5 w-3.5 mr-1" /> Crescimento
                </TabsTrigger>
                <TabsTrigger value="canais" className="text-xs">
                  <Zap className="h-3.5 w-3.5 mr-1" /> Canais
                </TabsTrigger>
                <TabsTrigger value="reactivacao" className="text-xs">
                  <Users className="h-3.5 w-3.5 mr-1" /> Reactivação
                </TabsTrigger>
                <TabsTrigger value="roadmap" className="text-xs">
                  <Target className="h-3.5 w-3.5 mr-1" /> Roadmap
                </TabsTrigger>
              </TabsList>

              {/* Tab: Mercado */}
              <TabsContent value="mercado" className="space-y-6">
                {marketInsight ? (
                  <>
                    {/* Key findings */}
                    {marketInsight.key_findings && marketInsight.key_findings.length > 0 && (
                      <Card>
                        <CardHeader className="pb-3">
                          <CardTitle className="text-base flex items-center gap-2">
                            <Star className="h-4 w-4 text-amber-400" /> Descobertas Chave
                          </CardTitle>
                        </CardHeader>
                        <CardContent>
                          <ul className="space-y-2">
                            {marketInsight.key_findings.map((f, i) => (
                              <li key={i} className="flex items-start gap-2 text-sm">
                                <CheckCircle2 className="h-4 w-4 text-primary mt-0.5 shrink-0" />
                                {f}
                              </li>
                            ))}
                          </ul>
                        </CardContent>
                      </Card>
                    )}

                    {/* Summary */}
                    {marketInsight.market_summary && (
                      <Card>
                        <CardContent className="pt-6">
                          <p className="text-sm leading-relaxed text-muted-foreground">
                            {marketInsight.market_summary}
                          </p>
                        </CardContent>
                      </Card>
                    )}

                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                      {/* Sector distribution pie */}
                      <Card>
                        <CardHeader className="pb-2">
                          <CardTitle className="text-base">Distribuição Sectorial</CardTitle>
                        </CardHeader>
                        <CardContent>
                          <SectorChart data={marketInsight.sector_distribution} />
                        </CardContent>
                      </Card>

                      {/* Demand Calendar */}
                      <Card>
                        <CardHeader className="pb-2">
                          <CardTitle className="text-base">Calendário de Procura</CardTitle>
                          <CardDescription className="text-xs">Índice mensal (1.0 = baseline)</CardDescription>
                        </CardHeader>
                        <CardContent>
                          <DemandChart
                            data={marketInsight.demand_calendar}
                            peakMonths={marketInsight.peak_months}
                            lowMonths={marketInsight.low_months}
                          />
                        </CardContent>
                      </Card>
                    </div>

                    {/* Market Signals */}
                    {marketInsight.market_signals.length > 0 && (
                      <div>
                        <h3 className="text-sm font-semibold mb-3">Sinais de Mercado</h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          {marketInsight.market_signals
                            .sort((a, b) => b.confidence - a.confidence)
                            .map((signal, i) => (
                              <MarketSignalCard key={i} signal={signal} />
                            ))}
                        </div>
                      </div>
                    )}

                    {/* Untapped segments */}
                    {marketInsight.untapped_segments.length > 0 && (
                      <div>
                        <h3 className="text-sm font-semibold mb-3">Segmentos por Explorar</h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                          {marketInsight.untapped_segments.map((seg, i) => (
                            <Card key={i}>
                              <CardContent className="pt-4 space-y-2">
                                <p className="font-medium text-sm">{seg.segment}</p>
                                <div className="flex gap-2">
                                  <Badge variant="outline" className="text-xs">{seg.estimated_size}</Badge>
                                  <Badge variant="outline" className={`text-xs ${seg.entry_difficulty === 'easy' ? 'border-emerald-500/50 text-emerald-400' : seg.entry_difficulty === 'hard' ? 'border-red-500/50 text-red-400' : 'border-amber-500/50 text-amber-400'}`}>
                                    {seg.entry_difficulty === 'easy' ? 'Fácil' : seg.entry_difficulty === 'hard' ? 'Difícil' : 'Médio'}
                                  </Badge>
                                </div>
                                <p className="text-xs text-muted-foreground">{seg.rationale}</p>
                              </CardContent>
                            </Card>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Competitive Signals */}
                    {marketInsight.competitive_signals.length > 0 && (
                      <div>
                        <h3 className="text-sm font-semibold mb-3">Sinais Competitivos</h3>
                        <div className="space-y-3">
                          {marketInsight.competitive_signals.map((cs, i) => (
                            <Card key={i}>
                              <CardContent className="pt-4 grid grid-cols-1 md:grid-cols-3 gap-3 text-sm">
                                <div><span className="text-xs text-muted-foreground block mb-1">Sinal</span>{cs.signal}</div>
                                <div><span className="text-xs text-muted-foreground block mb-1">Implicação</span>{cs.implication}</div>
                                <div><span className="text-xs text-muted-foreground block mb-1">Acção recomendada</span><span className="text-primary">{cs.recommended_action}</span></div>
                              </CardContent>
                            </Card>
                          ))}
                        </div>
                      </div>
                    )}
                  </>
                ) : (
                  <EmptyTabState label="Mercado" />
                )}
              </TabsContent>

              {/* Tab: Crescimento */}
              <TabsContent value="crescimento" className="space-y-6">
                {growthInsight ? (
                  <>
                    {growthInsight.growth_summary && (
                      <Card>
                        <CardContent className="pt-6">
                          <p className="text-sm leading-relaxed text-muted-foreground">{growthInsight.growth_summary}</p>
                        </CardContent>
                      </Card>
                    )}

                    {/* Opportunities */}
                    {growthInsight.opportunities.length > 0 && (
                      <div>
                        <h3 className="text-sm font-semibold mb-3">Oportunidades de Crescimento</h3>
                        <div className="space-y-3">
                          {growthInsight.opportunities
                            .sort((a, b) => a.rank - b.rank)
                            .map((opp, i) => (
                              <OpportunityCard
                                key={i}
                                opportunity={opp}
                                isExpanded={expandedOpp === i}
                                onToggle={() => setExpandedOpp(expandedOpp === i ? null : i)}
                              />
                            ))}
                        </div>
                      </div>
                    )}

                    {/* Segment Analysis */}
                    {growthInsight.segment_analysis.length > 0 && (
                      <Card>
                        <CardHeader className="pb-2">
                          <CardTitle className="text-base">Análise de Segmentos</CardTitle>
                        </CardHeader>
                        <CardContent>
                          <div className="overflow-x-auto">
                            <table className="w-full text-sm">
                              <thead>
                                <tr className="border-b border-border text-left text-xs text-muted-foreground">
                                  <th className="py-2 pr-4">Segmento</th>
                                  <th className="py-2 pr-4">Penetração</th>
                                  <th className="py-2 pr-4">Win Rate</th>
                                  <th className="py-2 pr-4">Potencial</th>
                                  <th className="py-2">Recomendação</th>
                                </tr>
                              </thead>
                              <tbody>
                                {growthInsight.segment_analysis.map((seg, i) => (
                                  <tr key={i} className="border-b border-border/50">
                                    <td className="py-2 pr-4 font-medium">{seg.segment}</td>
                                    <td className="py-2 pr-4">{Math.round((seg.current_penetration ?? 0) * 100)}%</td>
                                    <td className="py-2 pr-4">{Math.round((seg.win_rate ?? 0) * 100)}%</td>
                                    <td className="py-2 pr-4">
                                      <Badge variant="outline" className={`text-xs ${seg.growth_potential === 'high' ? 'border-emerald-500/50 text-emerald-400' : seg.growth_potential === 'low' ? 'border-muted text-muted-foreground' : 'border-amber-500/50 text-amber-400'}`}>
                                        {seg.growth_potential === 'high' ? 'Alto' : seg.growth_potential === 'low' ? 'Baixo' : 'Médio'}
                                      </Badge>
                                    </td>
                                    <td className="py-2 text-muted-foreground">{seg.recommendation}</td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        </CardContent>
                      </Card>
                    )}
                  </>
                ) : (
                  <EmptyTabState label="Crescimento" />
                )}
              </TabsContent>

              {/* Tab: Canais */}
              <TabsContent value="canais" className="space-y-6">
                {growthInsight?.channel_analysis && growthInsight.channel_analysis.length > 0 ? (
                  <>
                    <Card>
                      <CardHeader className="pb-2">
                        <CardTitle className="text-base">Performance por Canal</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="overflow-x-auto">
                          <table className="w-full text-sm">
                            <thead>
                              <tr className="border-b border-border text-left text-xs text-muted-foreground">
                                <th className="py-2 pr-4">Canal</th>
                                <th className="py-2 pr-4">Deals</th>
                                <th className="py-2 pr-4">Conversão</th>
                                <th className="py-2 pr-4">Valor Médio</th>
                                <th className="py-2 pr-4">Performance</th>
                                <th className="py-2">Recomendação</th>
                              </tr>
                            </thead>
                            <tbody>
                              {growthInsight.channel_analysis.map((ch, i) => (
                                <tr key={i} className={`border-b border-border/50 ${ch.performance === 'underperforming' ? 'bg-amber-500/5' : ''}`}>
                                  <td className="py-2 pr-4 font-medium capitalize">{ch.channel}</td>
                                  <td className="py-2 pr-4">{ch.deal_count ?? '-'}</td>
                                  <td className="py-2 pr-4">{ch.conversion_rate != null ? `${Math.round(ch.conversion_rate * 100)}%` : '-'}</td>
                                  <td className="py-2 pr-4">{ch.avg_deal_value != null ? `€${ch.avg_deal_value.toLocaleString('pt-PT')}` : '-'}</td>
                                  <td className="py-2 pr-4">
                                    <Badge variant="outline" className={`text-xs ${ch.performance === 'strong' ? 'border-emerald-500/50 text-emerald-400' : ch.performance === 'underperforming' ? 'border-amber-500/50 text-amber-400' : ''}`}>
                                      {ch.performance === 'strong' ? 'Forte' : ch.performance === 'underperforming' ? 'Subperformante' : 'Médio'}
                                    </Badge>
                                  </td>
                                  <td className="py-2 text-xs text-muted-foreground">{ch.recommendation}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </CardContent>
                    </Card>

                    {/* Channel bar chart */}
                    <Card>
                      <CardHeader className="pb-2">
                        <CardTitle className="text-base">Comparação de Canais</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <ChannelBarChart channels={growthInsight.channel_analysis} />
                      </CardContent>
                    </Card>
                  </>
                ) : (
                  <EmptyTabState label="Canais" />
                )}
              </TabsContent>

              {/* Tab: Reactivação */}
              <TabsContent value="reactivacao" className="space-y-6">
                {growthInsight ? (
                  <>
                    {growthInsight.reactivation_targets.length > 0 && (
                      <div>
                        <h3 className="text-sm font-semibold mb-3">Contactos para Reactivar</h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          {growthInsight.reactivation_targets.map((target, i) => (
                            <ReactivationCard key={i} target={target} />
                          ))}
                        </div>
                      </div>
                    )}

                    {growthInsight.quick_wins.length > 0 && (
                      <div>
                        <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
                          <Zap className="h-4 w-4 text-amber-400" /> Quick Wins
                        </h3>
                        <div className="space-y-2">
                          {growthInsight.quick_wins.slice(0, 5).map((qw, i) => (
                            <QuickWinCard key={i} quickWin={qw} />
                          ))}
                        </div>
                      </div>
                    )}

                    {growthInsight.reactivation_targets.length === 0 && growthInsight.quick_wins.length === 0 && (
                      <EmptyTabState label="Reactivação" />
                    )}
                  </>
                ) : (
                  <EmptyTabState label="Reactivação" />
                )}
              </TabsContent>

              {/* Tab: Roadmap */}
              <TabsContent value="roadmap" className="space-y-6">
                {growthInsight?.roadmap_90d && growthInsight.roadmap_90d.length > 0 ? (
                  <div className="space-y-4">
                    <h3 className="text-sm font-semibold">Roadmap de Crescimento — 90 Dias</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                      {growthInsight.roadmap_90d.map((phase, i) => (
                        <RoadmapPhaseCard key={i} phase={phase} index={i} />
                      ))}
                    </div>
                  </div>
                ) : (
                  <EmptyTabState label="Roadmap" />
                )}
              </TabsContent>
            </Tabs>
          </>
        )}
      </div>
    </DashboardLayout>
  );
}

// ── Sub-components ─────────────────────────────────────────────────

function GrowthScoreHero({ score, delta, topPriority, scoreColor }: {
  score: number | null; delta: number | null; topPriority: string | null; scoreColor: string;
}) {
  if (score === null) return null;

  const gaugeData = [{ value: score, fill: score >= 80 ? '#10b981' : score >= 60 ? '#f59e0b' : score >= 40 ? '#f97316' : '#ef4444' }];

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
      <Card className="border-primary/20 bg-gradient-to-r from-card to-primary/5">
        <CardContent className="pt-6 flex flex-col md:flex-row items-center gap-6">
          <div className="flex flex-col items-center">
            <div className="relative w-32 h-32">
              <ResponsiveContainer>
                <RadialBarChart cx="50%" cy="50%" innerRadius="70%" outerRadius="100%" barSize={12} data={gaugeData} startAngle={180} endAngle={0}>
                  <RadialBar background dataKey="value" cornerRadius={6} max={100} />
                </RadialBarChart>
              </ResponsiveContainer>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className={`text-3xl font-bold ${scoreColor}`}>{score}</span>
                <span className="text-[10px] text-muted-foreground">/ 100</span>
              </div>
            </div>
            <p className="text-xs text-muted-foreground mt-1">Score de Crescimento</p>
            {delta !== null ? (
              <div className={`flex items-center gap-1 text-xs mt-1 ${delta >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                {delta >= 0 ? <ArrowUpRight className="h-3 w-3" /> : <ArrowDownRight className="h-3 w-3" />}
                {delta >= 0 ? '+' : ''}{delta} desde última análise
              </div>
            ) : (
              <span className="text-[10px] text-muted-foreground mt-1">Primeira análise</span>
            )}
          </div>

          {topPriority && (
            <div className="flex-1 text-center md:text-left">
              <div className="flex items-center gap-2 mb-2 justify-center md:justify-start">
                <Target className="h-4 w-4 text-primary" />
                <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Prioridade Máxima</span>
              </div>
              <p className="text-base font-medium leading-relaxed">{topPriority}</p>
            </div>
          )}
        </CardContent>
      </Card>
    </motion.div>
  );
}

function MarketSignalCard({ signal }: { signal: MarketSignal }) {
  return (
    <Card>
      <CardContent className="pt-4 space-y-2">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-2">
            <span className="text-lg">{SIGNAL_ICONS[signal.signal_type] ?? '📊'}</span>
            <span className="font-medium text-sm">{signal.title}</span>
          </div>
          <Badge variant="outline" className={`text-[10px] ${signal.strength === 'strong' ? 'border-emerald-500/50 text-emerald-400' : signal.strength === 'moderate' ? 'border-amber-500/50 text-amber-400' : 'border-muted'}`}>
            {signal.strength === 'strong' ? 'Forte' : signal.strength === 'moderate' ? 'Moderado' : 'Fraco'}
          </Badge>
        </div>
        <p className="text-sm text-muted-foreground">{signal.description}</p>
        <p className="text-xs italic text-muted-foreground/70">{signal.evidence}</p>
        <div className="flex items-center gap-2">
          {signal.sector && <Badge variant="secondary" className="text-[10px]">{signal.sector}</Badge>}
          <div className="flex-1">
            <Progress value={signal.confidence * 100} className="h-1" />
          </div>
          <span className="text-[10px] text-muted-foreground">{Math.round(signal.confidence * 100)}%</span>
        </div>
      </CardContent>
    </Card>
  );
}

function OpportunityCard({ opportunity: opp, isExpanded, onToggle }: {
  opportunity: GrowthOpportunity; isExpanded: boolean; onToggle: () => void;
}) {
  return (
    <Card className="cursor-pointer" onClick={onToggle}>
      <CardContent className="pt-4 space-y-2">
        <div className="flex items-center gap-3">
          <div className="flex items-center justify-center h-8 w-8 rounded-full bg-primary/10 text-primary text-sm font-bold shrink-0">
            {opp.rank}
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-medium text-sm truncate">{opp.title}</p>
            <div className="flex gap-2 mt-1 flex-wrap">
              <Badge variant="secondary" className="text-[10px]">{CATEGORY_LABELS[opp.category] ?? opp.category}</Badge>
              <Badge variant="outline" className={`text-[10px] ${IMPACT_COLORS[opp.expected_impact] ?? ''}`}>
                Impacto: {opp.expected_impact === 'very_high' ? 'Muito alto' : opp.expected_impact === 'high' ? 'Alto' : opp.expected_impact === 'medium' ? 'Médio' : 'Baixo'}
              </Badge>
              <Badge variant="outline" className={`text-[10px] ${EFFORT_COLORS[opp.effort_required] ?? ''}`}>
                Esforço: {opp.effort_required === 'low' ? 'Baixo' : opp.effort_required === 'medium' ? 'Médio' : 'Alto'}
              </Badge>
              <Badge variant="outline" className="text-[10px]">
                <Clock className="h-2.5 w-2.5 mr-0.5" />{opp.time_to_impact_days}d
              </Badge>
            </div>
          </div>
          <ChevronRight className={`h-4 w-4 text-muted-foreground transition-transform ${isExpanded ? 'rotate-90' : ''}`} />
        </div>

        <AnimatePresence>
          {isExpanded && (
            <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
              <div className="pt-2 space-y-2 border-t border-border/50 mt-2">
                <p className="text-sm text-muted-foreground">{opp.description}</p>
                <p className="text-xs italic text-muted-foreground/70">{opp.evidence}</p>
                {opp.specific_actions.length > 0 && (
                  <div>
                    <p className="text-xs font-semibold mb-1">Acções:</p>
                    <ul className="space-y-1">
                      {opp.specific_actions.map((a, i) => (
                        <li key={i} className="text-xs flex items-start gap-1.5">
                          <CheckCircle2 className="h-3 w-3 text-primary mt-0.5 shrink-0" />{a}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
                {opp.target_segment && (
                  <Badge variant="outline" className="text-[10px]">Segmento alvo: {opp.target_segment}</Badge>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </CardContent>
    </Card>
  );
}

function ReactivationCard({ target }: { target: ReactivationTarget }) {
  const daysColor = target.last_interaction_days > 90 ? 'text-red-400' : 'text-amber-400';
  return (
    <Card>
      <CardContent className="pt-4 flex items-start gap-3">
        <div className="h-10 w-10 rounded-full bg-muted flex items-center justify-center text-sm font-semibold shrink-0">
          {(target.contact_name ?? '?').charAt(0).toUpperCase()}
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-medium text-sm">{target.contact_name}</p>
          <p className={`text-xs ${daysColor}`}>Sem actividade há {target.last_interaction_days} dias</p>
          <p className="text-xs text-muted-foreground mt-1">{target.reactivation_reason}</p>
        </div>
      </CardContent>
    </Card>
  );
}

function QuickWinCard({ quickWin }: { quickWin: QuickWin }) {
  const effortColor = quickWin.effort_hours <= 2 ? 'text-emerald-400' : quickWin.effort_hours <= 8 ? 'text-amber-400' : 'text-muted-foreground';
  return (
    <Card>
      <CardContent className="pt-3 pb-3 flex items-center gap-3">
        <Lightbulb className="h-4 w-4 text-amber-400 shrink-0" />
        <div className="flex-1">
          <p className="text-sm font-medium">{quickWin.action}</p>
          <p className="text-xs text-muted-foreground italic">{quickWin.expected_result}</p>
        </div>
        <Badge variant="outline" className={`text-[10px] ${effortColor}`}>~{quickWin.effort_hours}h</Badge>
      </CardContent>
    </Card>
  );
}

function RoadmapPhaseCard({ phase, index }: { phase: RoadmapItem; index: number }) {
  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: index * 0.1 }}>
      <Card className="h-full">
        <CardContent className="pt-4 space-y-3">
          <div className="flex items-center gap-2">
            <div className="h-6 w-6 rounded-full bg-primary/20 flex items-center justify-center text-xs font-bold text-primary">
              {index + 1}
            </div>
            <Badge variant="outline" className="text-[10px]">Semanas {phase.week_range}</Badge>
          </div>
          <p className="font-medium text-sm">{phase.focus}</p>
          <ul className="space-y-1">
            {phase.actions.map((a, i) => (
              <li key={i} className="text-xs flex items-start gap-1.5 text-muted-foreground">
                <ChevronRight className="h-3 w-3 mt-0.5 shrink-0" />{a}
              </li>
            ))}
          </ul>
          <div className="pt-2 border-t border-border/50">
            <p className="text-[10px] text-muted-foreground">
              <span className="font-semibold">KPI:</span> {phase.kpi}
            </p>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}

function SectorChart({ data }: { data: Record<string, number> }) {
  const chartData = Object.entries(data).map(([name, value]) => ({ name, value }));
  if (chartData.length === 0) return <p className="text-sm text-muted-foreground">Sem dados sectoriais</p>;
  return (
    <ResponsiveContainer width="100%" height={220}>
      <PieChart>
        <Pie data={chartData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80} label={({ name, value }) => `${name} (${value}%)`} labelLine={false} className="text-[10px]">
          {chartData.map((_, i) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
        </Pie>
        <Tooltip formatter={(v: number) => `${v}%`} />
      </PieChart>
    </ResponsiveContainer>
  );
}

function DemandChart({ data, peakMonths, lowMonths }: { data: Record<string, number>; peakMonths: string[]; lowMonths: string[] }) {
  const chartData = Object.entries(data).map(([month, value]) => ({
    month,
    value,
    fill: value > 1.2 ? '#10b981' : value < 0.8 ? '#f59e0b' : 'hsl(var(--primary))',
  }));
  if (chartData.length === 0) return <p className="text-sm text-muted-foreground">Sem dados de procura</p>;
  return (
    <div className="space-y-3">
      <ResponsiveContainer width="100%" height={200}>
        <BarChart data={chartData}>
          <CartesianGrid strokeDasharray="3 3" className="stroke-border/30" />
          <XAxis dataKey="month" className="text-[10px]" tick={{ fill: 'hsl(var(--muted-foreground))' }} />
          <YAxis className="text-[10px]" tick={{ fill: 'hsl(var(--muted-foreground))' }} />
          <Tooltip formatter={(v: number) => `${v}x`} labelFormatter={(l) => `${l}`} />
          <ReferenceLine y={1} stroke="hsl(var(--muted-foreground))" strokeDasharray="3 3" label={{ value: 'Baseline', position: 'right', fill: 'hsl(var(--muted-foreground))', fontSize: 10 }} />
          <Bar dataKey="value" radius={[4, 4, 0, 0]}>
            {chartData.map((entry, i) => <Cell key={i} fill={entry.fill} />)}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
      <div className="flex gap-2 flex-wrap">
        {peakMonths.map(m => <Badge key={m} className="text-[10px] bg-emerald-500/20 text-emerald-400">🔥 {m}</Badge>)}
        {lowMonths.map(m => <Badge key={m} variant="outline" className="text-[10px] text-amber-400">📉 {m}</Badge>)}
      </div>
    </div>
  );
}

function ChannelBarChart({ channels }: { channels: ChannelAnalysis[] }) {
  const chartData = channels.map(c => ({
    channel: c.channel,
    conversion: Math.round((c.conversion_rate ?? 0) * 100),
    value: c.avg_deal_value ?? 0,
  }));
  return (
    <ResponsiveContainer width="100%" height={250}>
      <BarChart data={chartData}>
        <CartesianGrid strokeDasharray="3 3" className="stroke-border/30" />
        <XAxis dataKey="channel" className="text-[10px]" tick={{ fill: 'hsl(var(--muted-foreground))' }} />
        <YAxis yAxisId="left" className="text-[10px]" tick={{ fill: 'hsl(var(--muted-foreground))' }} />
        <YAxis yAxisId="right" orientation="right" className="text-[10px]" tick={{ fill: 'hsl(var(--muted-foreground))' }} />
        <Tooltip />
        <Bar yAxisId="left" dataKey="conversion" name="Conversão %" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
        <Bar yAxisId="right" dataKey="value" name="Valor médio €" fill="hsl(var(--accent))" radius={[4, 4, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}

function EmptyTabState({ label }: { label: string }) {
  return (
    <Card className="border-dashed">
      <CardContent className="py-12 text-center">
        <p className="text-sm text-muted-foreground">Sem dados de {label}. Gera uma análise para começar.</p>
      </CardContent>
    </Card>
  );
}

function formatTimeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const hours = Math.floor(diff / 3600000);
  if (hours < 1) return "há poucos minutos";
  if (hours === 1) return "há 1 hora";
  if (hours < 24) return `há ${hours} horas`;
  const days = Math.floor(hours / 24);
  return `há ${days} dia${days > 1 ? 's' : ''}`;
}
