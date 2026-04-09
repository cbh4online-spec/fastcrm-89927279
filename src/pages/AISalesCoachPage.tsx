import { useState, useEffect } from "react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Loader2, TrendingUp, AlertTriangle, Target, Zap, RefreshCw, ShieldAlert, BarChart3, Brain, ArrowUpRight, ArrowDownRight, Minus, Search, PlayCircle, Download } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { motion } from "framer-motion";
import {
  usePipelineRisk,
  useGeneratePipelineRisk,
  useMultiPipelineIntel,
  useGenerateMultiPipelineIntel,
  useSalesCoachOverview,
} from "@/hooks/useSalesCoach";
import {
  useAllDealReports,
  useGenerateDealIntelligenceReport,
  useDealIntelligenceReport,
} from "@/hooks/useDealIntelligenceCoach";
import { useBulkDealIntelligence, useActiveOpportunities } from "@/hooks/useBulkDealIntelligence";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { formatDistanceToNow } from "date-fns";
import { pt } from "date-fns/locale";
import type { DealRiskItem, RiskSignal, NextAction, DealIntelligenceReport, PipelineComparison, BottleneckStage } from "@/types/ai-sales-coach";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell
} from "recharts";
import { useIsMobile } from "@/hooks/use-mobile";

// ── Overview Bar ──────────────────────────────────────────────────────────────
function CoachOverviewBar() {
  const { data: overview } = useSalesCoachOverview();
  const genRisk = useGeneratePipelineRisk();
  const genMulti = useGenerateMultiPipelineIntel();
  const { analyzeAll, progress: bulkProgress } = useBulkDealIntelligence();
  const { fetch: fetchOpps } = useActiveOpportunities();
  const isAnalyzing = genRisk.isPending || genMulti.isPending || bulkProgress.isRunning;

  const handleAnalyze = async () => {
    genRisk.mutate(undefined);
    genMulti.mutate();
    const opps = await fetchOpps();
    if (opps.length > 0) {
      analyzeAll(opps.map((o) => o.id));
    }
  };

  const healthColor = (score: number) =>
    score >= 80 ? "text-green-500" : score >= 60 ? "text-amber-500" : "text-red-500";

  return (
    <div className="space-y-3 mb-4 sm:mb-6">
      {overview && (
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant="outline" className="px-2 py-1 text-xs sm:text-sm gap-1.5">
            <ShieldAlert className={`h-3.5 w-3.5 ${healthColor(overview.pipeline_health_score)}`} />
            {overview.pipeline_health_score}/100
          </Badge>
          <Badge variant="outline" className="px-2 py-1 text-xs sm:text-sm gap-1.5">
            <AlertTriangle className="h-3.5 w-3.5 text-amber-500" />
            €{Number(overview.total_at_risk_value).toLocaleString('pt-PT')}
          </Badge>
          <Badge variant="outline" className="px-2 py-1 text-xs sm:text-sm gap-1.5 text-red-500">
            🔴 {overview.critical_deals_count} críticos
          </Badge>
          <Badge variant="outline" className="px-2 py-1 text-xs sm:text-sm gap-1.5">
            ⏱ {overview.stalled_deals_count} parados
          </Badge>
        </div>
      )}
      <div className="flex items-center justify-between gap-2">
        {overview && (
          <span className="text-[10px] sm:text-xs text-muted-foreground truncate">
            Actualizado {formatDistanceToNow(new Date(overview.last_analysis), { locale: pt, addSuffix: true })}
          </span>
        )}
        <Button onClick={handleAnalyze} disabled={isAnalyzing} size="sm" className="shrink-0 h-8 text-xs sm:text-sm">
          {isAnalyzing ? <Loader2 className="h-4 w-4 animate-spin mr-1.5" /> : <RefreshCw className="h-4 w-4 mr-1.5" />}
          {isAnalyzing ? 'A analisar...' : 'Analisar'}
        </Button>
      </div>
    </div>
  );
}

// ── Pipeline Risk Tab ─────────────────────────────────────────────────────────
function PipelineRiskTab() {
  const isMobile = useIsMobile();
  const { data: report, isLoading } = usePipelineRisk();

  if (isLoading) return <div className="flex justify-center py-12"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div>;
  if (!report) return (
    <Card className="text-center py-12">
      <CardContent>
        <p className="text-sm text-muted-foreground">Sem análise disponível. Clique em "Analisar" para gerar.</p>
      </CardContent>
    </Card>
  );

  const severityColor: Record<string, string> = {
    critical: 'bg-red-500/10 text-red-500 border-red-500/20',
    high: 'bg-orange-500/10 text-orange-500 border-orange-500/20',
    medium: 'bg-amber-500/10 text-amber-500 border-amber-500/20',
    low: 'bg-blue-500/10 text-blue-500 border-blue-500/20',
  };

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
        <MetricCard label="Pipeline Health" value={`${report.pipeline_health_score}/100`}
          icon={<ShieldAlert className="h-4 w-4 sm:h-5 sm:w-5" />}
          color={report.pipeline_health_score >= 80 ? 'text-green-500' : report.pipeline_health_score >= 60 ? 'text-amber-500' : 'text-red-500'} />
        <MetricCard label="Em Risco" value={`€${Number(report.at_risk_value).toLocaleString('pt-PT')}`}
          sub={`${report.at_risk_count} deals`} icon={<AlertTriangle className="h-4 w-4 sm:h-5 sm:w-5" />} color="text-amber-500" />
        <MetricCard label="Críticos" value={String(report.critical_count)}
          icon={<Target className="h-4 w-4 sm:h-5 sm:w-5" />} color="text-red-500" />
        <MetricCard label="Idade Média" value={`${report.avg_deal_age_days ?? 0}d`}
          icon={<BarChart3 className="h-4 w-4 sm:h-5 sm:w-5" />} color="text-muted-foreground" />
      </div>

      {/* Executive Summary */}
      {report.executive_summary && (
        <Card>
          <CardHeader className="pb-2 px-3 sm:px-6">
            <CardTitle className="text-sm sm:text-base flex items-center gap-2">
              <Brain className="h-4 w-4 text-primary" /> Sumário Executivo
            </CardTitle>
          </CardHeader>
          <CardContent className="px-3 sm:px-6">
            <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">{report.executive_summary}</p>
          </CardContent>
        </Card>
      )}

      {/* Top 3 Priorities */}
      {report.top_3_priorities && report.top_3_priorities.length > 0 && (
        <Card>
          <CardHeader className="pb-2 px-3 sm:px-6">
            <CardTitle className="text-sm sm:text-base">🎯 Top 3 Prioridades</CardTitle>
          </CardHeader>
          <CardContent className="px-3 sm:px-6">
            <ol className="space-y-2">
              {report.top_3_priorities.map((p, i) => (
                <li key={i} className="flex items-start gap-2 sm:gap-3">
                  <Badge variant="outline" className="mt-0.5 shrink-0 text-xs">{i + 1}</Badge>
                  <span className="text-xs sm:text-sm">{p}</span>
                </li>
              ))}
            </ol>
          </CardContent>
        </Card>
      )}

      {/* Risk Breakdown Chart */}
      {report.risk_breakdown && Object.keys(report.risk_breakdown).length > 0 && (
        <Card>
          <CardHeader className="pb-2 px-3 sm:px-6">
            <CardTitle className="text-sm sm:text-base">Distribuição de Riscos</CardTitle>
          </CardHeader>
          <CardContent className="px-1 sm:px-6">
            <div className="h-40 sm:h-48">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={Object.entries(report.risk_breakdown).map(([k, v]) => ({ name: k, count: v }))}>
                  <XAxis dataKey="name" tick={{ fontSize: 10 }} />
                  <YAxis allowDecimals={false} width={30} tick={{ fontSize: 10 }} />
                  <Tooltip />
                  <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                    {Object.entries(report.risk_breakdown).map(([k], i) => (
                      <Cell key={i} fill={k === 'stalled' ? '#f59e0b' : k === 'overdue' ? '#ef4444' : k === 'low_probability' ? '#3b82f6' : '#8b5cf6'} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Deal Risk — Mobile: cards / Desktop: table */}
      <Card>
        <CardHeader className="pb-2 px-3 sm:px-6">
          <CardTitle className="text-sm sm:text-base">Deals em Risco</CardTitle>
          <CardDescription className="text-xs">{report.deal_risks?.length ?? 0} deals identificados</CardDescription>
        </CardHeader>
        <CardContent className="px-3 sm:px-6">
          {report.deal_risks && report.deal_risks.length > 0 ? (
            isMobile ? (
              <div className="space-y-2">
                {report.deal_risks.map((risk: DealRiskItem, i: number) => (
                  <div key={i} className="p-2.5 rounded-lg border bg-muted/20">
                    <div className="flex items-start justify-between gap-2 mb-1.5">
                      <p className="text-xs font-medium truncate flex-1">{risk.opportunity_name}</p>
                      <Badge variant="outline" className={`text-[10px] shrink-0 ${severityColor[risk.severity]}`}>
                        {risk.severity}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-2 text-[10px] text-muted-foreground mb-1">
                      <span>{risk.stage}</span>
                      <span>•</span>
                      <span className="font-semibold text-foreground">€{risk.value?.toLocaleString('pt-PT')}</span>
                    </div>
                    {risk.recommended_action && (
                      <p className="text-[10px] text-muted-foreground line-clamp-2">{risk.recommended_action}</p>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b text-muted-foreground">
                      <th className="text-left py-2 pr-4">Deal</th>
                      <th className="text-left py-2 pr-4">Stage</th>
                      <th className="text-right py-2 pr-4">Valor</th>
                      <th className="text-left py-2 pr-4">Severidade</th>
                      <th className="text-left py-2">Acção Recomendada</th>
                    </tr>
                  </thead>
                  <tbody>
                    {report.deal_risks.map((risk: DealRiskItem, i: number) => (
                      <tr key={i} className="border-b border-border/50">
                        <td className="py-2.5 pr-4 font-medium">{risk.opportunity_name}</td>
                        <td className="py-2.5 pr-4 text-muted-foreground">{risk.stage}</td>
                        <td className="py-2.5 pr-4 text-right">€{risk.value?.toLocaleString('pt-PT')}</td>
                        <td className="py-2.5 pr-4">
                          <Badge variant="outline" className={severityColor[risk.severity]}>
                            {risk.severity}
                          </Badge>
                        </td>
                        <td className="py-2.5 text-muted-foreground text-xs">{risk.recommended_action}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )
          ) : (
            <p className="text-center text-muted-foreground py-8 text-sm">Nenhum risco identificado. Pipeline saudável! 🎉</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

// ── Deal Intelligence Tab ─────────────────────────────────────────────────────
function DealIntelligenceTab() {
  const isMobile = useIsMobile();
  const [selectedDealId, setSelectedDealId] = useState<string | null>(null);
  const [opportunities, setOpportunities] = useState<Array<{id: string; title: string; stage_name: string; value: number}>>([]);
  const { data: allReports, isLoading } = useAllDealReports();
  const { data: selectedReport } = useDealIntelligenceReport(selectedDealId ?? undefined);
  const { analyzeAll, progress } = useBulkDealIntelligence();
  const { fetch: fetchOpps } = useActiveOpportunities();

  useEffect(() => {
    fetchOpps().then(setOpportunities);
  }, [fetchOpps]);

  const handleBulkAnalyze = () => {
    const ids = opportunities.map((o) => o.id);
    if (ids.length === 0) return;
    analyzeAll(ids);
  };

  const enrichedDeals = (allReports ?? []).map((r) => {
    const opp = opportunities.find((o) => o.id === r.opportunity_id);
    return {
      ...r,
      opp_title: opp?.title ?? r.coaching_summary?.slice(0, 40) ?? r.opportunity_id.slice(0, 8),
      opp_stage: opp?.stage_name ?? '',
      opp_value: opp?.value ?? 0,
    };
  });

  if (isLoading) return <div className="flex justify-center py-12"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div>;

  // On mobile, if a deal is selected, show only the detail panel with a back button
  const showDetailOnMobile = isMobile && selectedDealId && selectedReport;

  return (
    <div className="space-y-4">
      {/* Bulk Analyze Bar */}
      <Card>
        <CardContent className="pt-3 sm:pt-4 px-3 sm:px-6 flex flex-wrap items-center gap-2 sm:gap-3">
          <div className="flex-1 min-w-0">
            <p className="text-xs sm:text-sm font-medium">
              {enrichedDeals.length > 0
                ? `${enrichedDeals.length} deals analisados`
                : `${opportunities.length} oportunidades por analisar`}
            </p>
            {progress.isRunning && (
              <div className="mt-2 space-y-1">
                <Progress value={progress.total > 0 ? ((progress.completed + progress.failed) / progress.total) * 100 : 0} className="h-2" />
                <p className="text-[10px] sm:text-xs text-muted-foreground">
                  {progress.completed + progress.failed}/{progress.total}
                  {progress.failed > 0 && <span className="text-destructive"> ({progress.failed} erros)</span>}
                </p>
              </div>
            )}
          </div>
          <Button onClick={handleBulkAnalyze} disabled={progress.isRunning || opportunities.length === 0} size="sm" className="shrink-0 h-8 text-xs">
            {progress.isRunning ? <Loader2 className="h-4 w-4 animate-spin mr-1.5" /> : <PlayCircle className="h-4 w-4 mr-1.5" />}
            {progress.isRunning ? 'A analisar...' : isMobile ? 'Analisar Todos' : 'Analisar Todos os Deals'}
          </Button>
        </CardContent>
      </Card>

      {/* Mobile detail view with back */}
      {showDetailOnMobile ? (
        <div className="space-y-3">
          <Button variant="ghost" size="sm" className="h-8 text-xs" onClick={() => setSelectedDealId(null)}>
            ← Voltar à lista
          </Button>
          <DealIntelligencePanel report={selectedReport} />
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:gap-6 lg:grid-cols-3">
          {/* Deal List */}
          <div className="space-y-3">
            <h3 className="text-xs sm:text-sm font-medium text-muted-foreground">Deals Analisados ({enrichedDeals.length})</h3>
            {enrichedDeals.length > 0 ? (
              <div className="space-y-2 max-h-[50vh] sm:max-h-[60vh] overflow-y-auto pr-1">
                {enrichedDeals.map((r) => (
                  <button
                    key={r.id}
                    onClick={() => setSelectedDealId(r.opportunity_id)}
                    className={`w-full text-left p-2.5 sm:p-3 rounded-lg border transition-colors active:scale-[0.98] ${
                      selectedDealId === r.opportunity_id ? 'border-primary bg-primary/5' : 'border-border hover:bg-muted/50'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2 mb-1">
                      <span className="text-xs sm:text-sm font-medium truncate">{r.opp_title}</span>
                      <Badge variant="outline" className={`text-[10px] sm:text-xs shrink-0 ${r.health_score >= 70 ? 'text-green-500' : r.health_score >= 40 ? 'text-amber-500' : 'text-red-500'}`}>
                        {r.health_score}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-1.5 sm:gap-2 text-[10px] sm:text-xs text-muted-foreground flex-wrap">
                      {r.opp_stage && <Badge variant="secondary" className="text-[10px] px-1.5 py-0">{r.opp_stage}</Badge>}
                      {r.opp_value > 0 && <span>€{r.opp_value.toLocaleString('pt-PT')}</span>}
                      <span>Win: {r.win_probability}%</span>
                    </div>
                  </button>
                ))}
              </div>
            ) : (
              <Card className="text-center py-6 sm:py-8">
                <CardContent>
                  <PlayCircle className="h-6 w-6 sm:h-8 sm:w-8 text-muted-foreground mx-auto mb-2" />
                  <p className="text-muted-foreground text-xs sm:text-sm">Clique em "Analisar Todos" para começar.</p>
                </CardContent>
              </Card>
            )}
          </div>

          {/* Deal Detail Panel — hidden on mobile when no selection (shown via showDetailOnMobile) */}
          {!isMobile && (
            <div className="lg:col-span-2">
              {selectedReport ? (
                <DealIntelligencePanel report={selectedReport} />
              ) : (
                <Card className="text-center py-12 sm:py-16">
                  <CardContent>
                    <Search className="h-6 w-6 sm:h-8 sm:w-8 text-muted-foreground mx-auto mb-3" />
                    <p className="text-muted-foreground text-xs sm:text-sm">Seleccione um deal para ver a análise</p>
                  </CardContent>
                </Card>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function DealIntelligencePanel({ report }: { report: DealIntelligenceReport }) {
  const trendIcon = report.win_probability_delta
    ? report.win_probability_delta > 0 ? <ArrowUpRight className="h-4 w-4 text-green-500" />
    : report.win_probability_delta < 0 ? <ArrowDownRight className="h-4 w-4 text-red-500" />
    : <Minus className="h-4 w-4 text-muted-foreground" />
    : null;

  const probColor = report.win_probability >= 70 ? 'text-green-500' : report.win_probability >= 40 ? 'text-amber-500' : 'text-red-500';
  const severityColor: Record<string, string> = {
    critical: 'text-red-500', high: 'text-orange-500', medium: 'text-amber-500', low: 'text-blue-500',
  };

  return (
    <div className="space-y-3 sm:space-y-4">
      {/* Win Probability + Health */}
      <div className="grid grid-cols-2 gap-3 sm:gap-4">
        <Card>
          <CardContent className="pt-3 sm:pt-4 text-center px-2 sm:px-4">
            <motion.div
              className={`text-2xl sm:text-4xl font-bold ${probColor}`}
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.5 }}
            >
              {report.win_probability}%
            </motion.div>
            <p className="text-[10px] sm:text-xs text-muted-foreground mt-1">Win Probability</p>
            {report.win_probability_delta != null && (
              <div className="flex items-center justify-center gap-1 mt-1">
                {trendIcon}
                <span className="text-[10px] sm:text-xs">{report.win_probability_delta > 0 ? '+' : ''}{report.win_probability_delta}%</span>
              </div>
            )}
            <Badge variant="outline" className="mt-2 text-[10px] sm:text-xs">
              {report.confidence_level === 'high' ? 'Alta' : report.confidence_level === 'medium' ? 'Média' : 'Baixa'}
            </Badge>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-3 sm:pt-4 px-2 sm:px-4">
            <div className="text-center mb-2 sm:mb-3">
              <span className="text-xl sm:text-2xl font-bold">{report.health_score}</span>
              <span className="text-muted-foreground text-xs sm:text-sm">/100</span>
              <p className="text-[10px] sm:text-xs text-muted-foreground">Health Score</p>
            </div>
            <Progress value={report.health_score} className="h-2" />
            <div className="flex items-center justify-between mt-2 text-[10px] sm:text-xs text-muted-foreground gap-1">
              <span className="truncate">{report.health_trend === 'improving' ? '📈 Melhorar' : report.health_trend === 'declining' ? '📉 Piorar' : '➡️ Estável'}</span>
              <Badge variant="outline" className="text-[10px] shrink-0">{report.sentiment}</Badge>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Coaching Summary */}
      {report.coaching_summary && (
        <Card>
          <CardHeader className="pb-2 px-3 sm:px-6">
            <CardTitle className="text-sm sm:text-base flex items-center gap-2">
              <Brain className="h-4 w-4 text-primary" /> Coaching
            </CardTitle>
          </CardHeader>
          <CardContent className="px-3 sm:px-6">
            <p className="text-xs sm:text-sm leading-relaxed">{report.coaching_summary}</p>
            {report.sentiment_reasoning && (
              <p className="text-[10px] sm:text-xs text-muted-foreground mt-2 italic">{report.sentiment_reasoning}</p>
            )}
          </CardContent>
        </Card>
      )}

      {/* Risk Signals */}
      {report.risk_signals && report.risk_signals.length > 0 && (
        <Card>
          <CardHeader className="pb-2 px-3 sm:px-6">
            <CardTitle className="text-sm sm:text-base">⚠️ Sinais de Risco</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 px-3 sm:px-6">
            {report.risk_signals.map((signal: RiskSignal, i: number) => (
              <div key={i} className="flex items-start gap-2">
                <AlertTriangle className={`h-3.5 w-3.5 sm:h-4 sm:w-4 mt-0.5 shrink-0 ${severityColor[signal.severity]}`} />
                <div className="min-w-0">
                  <Badge variant="outline" className="text-[10px] mb-0.5">{signal.type}</Badge>
                  <p className="text-xs sm:text-sm">{signal.description}</p>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Next Actions */}
      {report.next_actions && report.next_actions.length > 0 && (
        <Card>
          <CardHeader className="pb-2 px-3 sm:px-6">
            <CardTitle className="text-sm sm:text-base">🎯 Próximas Acções</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 px-3 sm:px-6">
            {report.next_actions.map((action: NextAction, i: number) => (
              <div key={i} className="flex items-start gap-2 sm:gap-3">
                <Badge className="mt-0.5 shrink-0 text-[10px]">{action.priority}</Badge>
                <div className="flex-1 min-w-0">
                  <p className="text-xs sm:text-sm font-medium">{action.action}</p>
                  <p className="text-[10px] sm:text-xs text-muted-foreground italic line-clamp-2">{action.rationale}</p>
                  <Badge variant="outline" className="text-[10px] mt-1">{action.due_days}d</Badge>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Strengths & Weaknesses */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
        {report.key_strengths && report.key_strengths.length > 0 && (
          <Card>
            <CardHeader className="pb-2 px-3 sm:px-6"><CardTitle className="text-sm text-green-500">✅ Pontos Fortes</CardTitle></CardHeader>
            <CardContent className="px-3 sm:px-6">
              <ul className="space-y-1 text-xs sm:text-sm">
                {report.key_strengths.map((s, i) => <li key={i}>• {s}</li>)}
              </ul>
            </CardContent>
          </Card>
        )}
        {report.key_weaknesses && report.key_weaknesses.length > 0 && (
          <Card>
            <CardHeader className="pb-2 px-3 sm:px-6"><CardTitle className="text-sm text-red-500">❌ Pontos Fracos</CardTitle></CardHeader>
            <CardContent className="px-3 sm:px-6">
              <ul className="space-y-1 text-xs sm:text-sm">
                {report.key_weaknesses.map((w, i) => <li key={i}>• {w}</li>)}
              </ul>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}

// ── Multi-Pipeline Tab ────────────────────────────────────────────────────────
function MultiPipelineTab() {
  const isMobile = useIsMobile();
  const { data: report, isLoading } = useMultiPipelineIntel();
  const genMulti = useGenerateMultiPipelineIntel();

  if (isLoading) return <div className="flex justify-center py-12"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div>;
  if (!report) return (
    <Card className="text-center py-12">
      <CardContent>
        <p className="text-sm text-muted-foreground mb-4">Sem análise multi-pipeline.</p>
        <Button onClick={() => genMulti.mutate()} disabled={genMulti.isPending} size="sm">
          {genMulti.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Zap className="h-4 w-4 mr-2" />}
          Gerar Análise
        </Button>
      </CardContent>
    </Card>
  );

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Pipeline Comparison */}
      {report.pipeline_comparison && report.pipeline_comparison.length > 0 && (
        <Card>
          <CardHeader className="pb-2 px-3 sm:px-6">
            <CardTitle className="text-sm sm:text-base">Comparação de Pipelines</CardTitle>
          </CardHeader>
          <CardContent className="px-3 sm:px-6">
            {isMobile ? (
              <div className="space-y-2">
                {(report.pipeline_comparison as PipelineComparison[]).map((p, i) => (
                  <div key={i} className="p-2.5 rounded-lg border bg-muted/20">
                    <div className="flex items-center justify-between mb-1.5">
                      <p className="text-xs font-medium">{p.name}</p>
                      <Badge variant="outline" className={`text-[10px] ${p.health_score >= 70 ? 'text-green-500' : p.health_score >= 40 ? 'text-amber-500' : 'text-red-500'}`}>
                        {p.health_score}
                      </Badge>
                    </div>
                    <div className="grid grid-cols-2 gap-x-3 gap-y-1 text-[10px] text-muted-foreground">
                      <span>Deals: <strong className="text-foreground">{p.deal_count}</strong></span>
                      <span>Valor: <strong className="text-foreground">€{p.total_value?.toLocaleString('pt-PT')}</strong></span>
                      <span>Win Rate: <strong className={p.win_rate >= 0.5 ? 'text-green-500' : p.win_rate >= 0.3 ? 'text-amber-500' : 'text-red-500'}>{Math.round(p.win_rate * 100)}%</strong></span>
                      <span>Ciclo: <strong className="text-foreground">{p.avg_cycle_days}d</strong></span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b text-muted-foreground">
                      <th className="text-left py-2 pr-4">Pipeline</th>
                      <th className="text-right py-2 pr-4">Deals</th>
                      <th className="text-right py-2 pr-4">Valor</th>
                      <th className="text-right py-2 pr-4">Win Rate</th>
                      <th className="text-right py-2 pr-4">Ciclo</th>
                      <th className="text-right py-2">Score</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(report.pipeline_comparison as PipelineComparison[]).map((p, i) => (
                      <tr key={i} className="border-b border-border/50">
                        <td className="py-2.5 pr-4 font-medium">{p.name}</td>
                        <td className="py-2.5 pr-4 text-right">{p.deal_count}</td>
                        <td className="py-2.5 pr-4 text-right">€{p.total_value?.toLocaleString('pt-PT')}</td>
                        <td className="py-2.5 pr-4 text-right">
                          <span className={p.win_rate >= 0.5 ? 'text-green-500' : p.win_rate >= 0.3 ? 'text-amber-500' : 'text-red-500'}>
                            {Math.round(p.win_rate * 100)}%
                          </span>
                        </td>
                        <td className="py-2.5 pr-4 text-right">{p.avg_cycle_days}d</td>
                        <td className="py-2.5 text-right">
                          <Badge variant="outline" className={p.health_score >= 70 ? 'text-green-500' : p.health_score >= 40 ? 'text-amber-500' : 'text-red-500'}>
                            {p.health_score}
                          </Badge>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Patterns */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
        {report.winning_patterns && report.winning_patterns.length > 0 && (
          <Card>
            <CardHeader className="pb-2 px-3 sm:px-6">
              <CardTitle className="text-sm sm:text-base text-green-500">🏆 Padrões de Sucesso</CardTitle>
            </CardHeader>
            <CardContent className="px-3 sm:px-6">
              <ul className="space-y-2 text-xs sm:text-sm">
                {report.winning_patterns.map((p, i) => <li key={i} className="flex items-start gap-2"><span className="text-green-500 shrink-0">✓</span><span>{p}</span></li>)}
              </ul>
            </CardContent>
          </Card>
        )}
        {report.losing_patterns && report.losing_patterns.length > 0 && (
          <Card>
            <CardHeader className="pb-2 px-3 sm:px-6">
              <CardTitle className="text-sm sm:text-base text-red-500">⚠️ Padrões de Perda</CardTitle>
            </CardHeader>
            <CardContent className="px-3 sm:px-6">
              <ul className="space-y-2 text-xs sm:text-sm">
                {report.losing_patterns.map((p, i) => <li key={i} className="flex items-start gap-2"><span className="text-red-500 shrink-0">✗</span><span>{p}</span></li>)}
              </ul>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Bottleneck Stages Chart */}
      {report.bottleneck_stages && report.bottleneck_stages.length > 0 && (
        <Card>
          <CardHeader className="pb-2 px-3 sm:px-6">
            <CardTitle className="text-sm sm:text-base">Fases com Maior Estagnação</CardTitle>
          </CardHeader>
          <CardContent className="px-1 sm:px-6">
            <div className="h-40 sm:h-48">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={(report.bottleneck_stages as BottleneckStage[]).map(b => ({
                    name: b.stage_name, days: b.avg_days_stuck, dropRate: b.drop_rate,
                  }))}
                  layout="vertical"
                >
                  <XAxis type="number" tick={{ fontSize: 10 }} />
                  <YAxis type="category" dataKey="name" width={isMobile ? 70 : 120} tick={{ fontSize: isMobile ? 9 : 12 }} />
                  <Tooltip formatter={(v: any) => [`${v} dias`, 'Média']} />
                  <Bar dataKey="days" radius={[0, 4, 4, 0]}>
                    {(report.bottleneck_stages as BottleneckStage[]).map((b, i) => (
                      <Cell key={i} fill={b.drop_rate > 0.3 ? '#ef4444' : b.drop_rate > 0.15 ? '#f59e0b' : '#22c55e'} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Strategic Insights */}
      {report.strategic_insights && report.strategic_insights.length > 0 && (
        <Card>
          <CardHeader className="pb-2 px-3 sm:px-6">
            <CardTitle className="text-sm sm:text-base">💡 Insights Estratégicos</CardTitle>
          </CardHeader>
          <CardContent className="px-3 sm:px-6">
            <ol className="space-y-2 sm:space-y-3">
              {report.strategic_insights.map((insight, i) => (
                <li key={i} className="flex items-start gap-2 sm:gap-3">
                  <Badge variant="outline" className="shrink-0 mt-0.5 text-[10px]">{i + 1}</Badge>
                  <p className="text-xs sm:text-sm">{insight}</p>
                </li>
              ))}
            </ol>
          </CardContent>
        </Card>
      )}

      {/* Growth Opportunities */}
      {report.growth_opportunities && report.growth_opportunities.length > 0 && (
        <Card>
          <CardHeader className="pb-2 px-3 sm:px-6">
            <CardTitle className="text-sm sm:text-base">🌱 Oportunidades de Crescimento</CardTitle>
          </CardHeader>
          <CardContent className="px-3 sm:px-6">
            <ul className="space-y-2 text-xs sm:text-sm">
              {report.growth_opportunities.map((g, i) => <li key={i} className="flex items-start gap-2">🌱 {g}</li>)}
            </ul>
          </CardContent>
        </Card>
      )}

      {report.generated_at && (
        <p className="text-[10px] sm:text-xs text-muted-foreground text-right">
          Última análise: {formatDistanceToNow(new Date(report.generated_at), { locale: pt, addSuffix: true })}
        </p>
      )}
    </div>
  );
}

// ── Metric Card ───────────────────────────────────────────────────────────────
function MetricCard({ label, value, sub, icon, color }: {
  label: string; value: string; sub?: string; icon: React.ReactNode; color: string;
}) {
  return (
    <Card>
      <CardContent className="pt-3 sm:pt-4 px-3 sm:px-4">
        <div className="flex items-center justify-between mb-1 sm:mb-2">
          <span className="text-[10px] sm:text-xs text-muted-foreground truncate">{label}</span>
          <span className={`${color} shrink-0`}>{icon}</span>
        </div>
        <p className={`text-base sm:text-2xl font-bold ${color}`}>{value}</p>
        {sub && <p className="text-[10px] sm:text-xs text-muted-foreground mt-0.5 sm:mt-1">{sub}</p>}
      </CardContent>
    </Card>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────
export default function AISalesCoachPage() {
  const { data: riskReport } = usePipelineRisk();
  const { data: multiReport } = useMultiPipelineIntel();
  const { data: dealReports } = useAllDealReports();
  const { fetch: fetchOppsForExport } = useActiveOpportunities();
  const [exporting, setExporting] = useState(false);

  const handleExport = async () => {
    setExporting(true);
    try {
      const { exportSalesCoachPdf } = await import("@/utils/exportSalesCoachPdf");
      const opps = await fetchOppsForExport();
      exportSalesCoachPdf({
        riskReport: riskReport ?? null,
        multiReport: multiReport ?? null,
        dealReports: dealReports ?? [],
        opportunities: opps,
      });
    } finally {
      setExporting(false);
    }
  };

  return (
    <DashboardLayout>
      <div className="p-4 sm:p-6 space-y-4">
        {/* Header */}
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <h1 className="text-lg sm:text-2xl font-bold flex items-center gap-2">
              <TrendingUp className="h-5 w-5 sm:h-6 sm:w-6 text-primary shrink-0" />
              <span className="truncate">AI Sales Coach</span>
            </h1>
            <p className="text-[10px] sm:text-sm text-muted-foreground mt-0.5">
              Intelligence estratégica sobre o pipeline
            </p>
          </div>
          <Button variant="outline" size="sm" onClick={handleExport} disabled={exporting} className="shrink-0 h-8 text-xs sm:text-sm">
            {exporting ? <Loader2 className="h-4 w-4 animate-spin mr-1.5" /> : <Download className="h-4 w-4 mr-1.5" />}
            <span className="hidden sm:inline">Exportar PDF</span>
            <span className="sm:hidden">PDF</span>
          </Button>
        </div>

        <CoachOverviewBar />

        <Tabs defaultValue="risk" className="space-y-4">
          <TabsList className="w-full sm:w-auto overflow-x-auto scrollbar-none">
            <TabsTrigger value="risk" className="gap-1 sm:gap-1.5 text-xs sm:text-sm flex-1 sm:flex-none">
              <ShieldAlert className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
              <span className="hidden xs:inline">Pipeline</span> Risk
            </TabsTrigger>
            <TabsTrigger value="deals" className="gap-1 sm:gap-1.5 text-xs sm:text-sm flex-1 sm:flex-none">
              <Target className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
              <span className="hidden xs:inline">Deal</span> Intel
            </TabsTrigger>
            <TabsTrigger value="multi" className="gap-1 sm:gap-1.5 text-xs sm:text-sm flex-1 sm:flex-none">
              <BarChart3 className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
              Multi<span className="hidden xs:inline">-Pipeline</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="risk"><PipelineRiskTab /></TabsContent>
          <TabsContent value="deals"><DealIntelligenceTab /></TabsContent>
          <TabsContent value="multi"><MultiPipelineTab /></TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
}
