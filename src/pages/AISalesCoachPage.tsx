import { useState } from "react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Loader2, TrendingUp, AlertTriangle, Target, Zap, RefreshCw, ShieldAlert, BarChart3, Brain, ArrowUpRight, ArrowDownRight, Minus, Search } from "lucide-react";
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
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { formatDistanceToNow } from "date-fns";
import { pt } from "date-fns/locale";
import type { DealRiskItem, RiskSignal, NextAction, DealIntelligenceReport, PipelineComparison, BottleneckStage } from "@/types/ai-sales-coach";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell
} from "recharts";

// ── Overview Bar ──────────────────────────────────────────────────────────────
function CoachOverviewBar() {
  const { data: overview } = useSalesCoachOverview();
  const genRisk = useGeneratePipelineRisk();
  const genMulti = useGenerateMultiPipelineIntel();
  const isAnalyzing = genRisk.isPending || genMulti.isPending;

  const handleAnalyze = () => {
    genRisk.mutate(undefined);
    genMulti.mutate();
  };

  const healthColor = (score: number) =>
    score >= 80 ? "text-green-500" : score >= 60 ? "text-amber-500" : "text-red-500";

  return (
    <div className="flex flex-wrap items-center gap-3 mb-6">
      {overview && (
        <>
          <Badge variant="outline" className="px-3 py-1.5 text-sm gap-1.5">
            <ShieldAlert className={`h-4 w-4 ${healthColor(overview.pipeline_health_score)}`} />
            Score: {overview.pipeline_health_score}/100
          </Badge>
          <Badge variant="outline" className="px-3 py-1.5 text-sm gap-1.5">
            <AlertTriangle className="h-4 w-4 text-amber-500" />
            €{Number(overview.total_at_risk_value).toLocaleString('pt-PT')} em risco
          </Badge>
          <Badge variant="outline" className="px-3 py-1.5 text-sm gap-1.5 text-red-500">
            🔴 {overview.critical_deals_count} críticos
          </Badge>
          <Badge variant="outline" className="px-3 py-1.5 text-sm gap-1.5">
            ⏱ {overview.stalled_deals_count} parados
          </Badge>
          <span className="text-xs text-muted-foreground ml-auto">
            Actualizado {formatDistanceToNow(new Date(overview.last_analysis), { locale: pt, addSuffix: true })}
          </span>
        </>
      )}
      <Button onClick={handleAnalyze} disabled={isAnalyzing} size="sm" className="ml-auto">
        {isAnalyzing ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <RefreshCw className="h-4 w-4 mr-2" />}
        {isAnalyzing ? 'A analisar...' : 'Analisar Pipeline'}
      </Button>
    </div>
  );
}

// ── Pipeline Risk Tab ─────────────────────────────────────────────────────────
function PipelineRiskTab() {
  const { data: report, isLoading } = usePipelineRisk();

  if (isLoading) return <div className="flex justify-center py-12"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div>;
  if (!report) return (
    <Card className="text-center py-12">
      <CardContent>
        <p className="text-muted-foreground">Sem análise disponível. Clique em "Analisar Pipeline" para gerar.</p>
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
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard label="Pipeline Health" value={`${report.pipeline_health_score}/100`}
          icon={<ShieldAlert className="h-5 w-5" />}
          color={report.pipeline_health_score >= 80 ? 'text-green-500' : report.pipeline_health_score >= 60 ? 'text-amber-500' : 'text-red-500'} />
        <MetricCard label="Valor em Risco" value={`€${Number(report.at_risk_value).toLocaleString('pt-PT')}`}
          sub={`${report.at_risk_count} deals`} icon={<AlertTriangle className="h-5 w-5" />} color="text-amber-500" />
        <MetricCard label="Negócios Críticos" value={String(report.critical_count)}
          icon={<Target className="h-5 w-5" />} color="text-red-500" />
        <MetricCard label="Idade Média" value={`${report.avg_deal_age_days ?? 0} dias`}
          icon={<BarChart3 className="h-5 w-5" />} color="text-muted-foreground" />
      </div>

      {/* Executive Summary */}
      {report.executive_summary && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <Brain className="h-4 w-4 text-primary" /> Sumário Executivo
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground leading-relaxed">{report.executive_summary}</p>
          </CardContent>
        </Card>
      )}

      {/* Top 3 Priorities */}
      {report.top_3_priorities && report.top_3_priorities.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">🎯 Top 3 Prioridades</CardTitle>
          </CardHeader>
          <CardContent>
            <ol className="space-y-2">
              {report.top_3_priorities.map((p, i) => (
                <li key={i} className="flex items-start gap-3">
                  <Badge variant="outline" className="mt-0.5 shrink-0">{i + 1}</Badge>
                  <span className="text-sm">{p}</span>
                </li>
              ))}
            </ol>
          </CardContent>
        </Card>
      )}

      {/* Risk Breakdown Chart */}
      {report.risk_breakdown && Object.keys(report.risk_breakdown).length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Distribuição de Riscos</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-48">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={Object.entries(report.risk_breakdown).map(([k, v]) => ({ name: k, count: v }))}>
                  <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                  <YAxis allowDecimals={false} />
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

      {/* Deal Risk Table */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Deals em Risco</CardTitle>
          <CardDescription>{report.deal_risks?.length ?? 0} deals identificados</CardDescription>
        </CardHeader>
        <CardContent>
          {report.deal_risks && report.deal_risks.length > 0 ? (
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
          ) : (
            <p className="text-center text-muted-foreground py-8">Nenhum risco identificado. Pipeline saudável! 🎉</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

// ── Deal Intelligence Tab ─────────────────────────────────────────────────────
function DealIntelligenceTab() {
  const [selectedDealId, setSelectedDealId] = useState<string | null>(null);
  const { data: allReports, isLoading } = useAllDealReports();
  const { data: selectedReport } = useDealIntelligenceReport(selectedDealId ?? undefined);
  const generateMutation = useGenerateDealIntelligenceReport();

  const severityIcon: Record<string, string> = { critical: '🔴', high: '🟠', medium: '🟡', low: '🔵' };

  if (isLoading) return <div className="flex justify-center py-12"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div>;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* Deal List */}
      <div className="space-y-3">
        <h3 className="text-sm font-medium text-muted-foreground">Deals Analisados ({allReports?.length ?? 0})</h3>
        {allReports && allReports.length > 0 ? (
          <div className="space-y-2 max-h-[60vh] overflow-y-auto pr-1">
            {allReports.map(r => (
              <button
                key={r.id}
                onClick={() => setSelectedDealId(r.opportunity_id)}
                className={`w-full text-left p-3 rounded-lg border transition-colors ${
                  selectedDealId === r.opportunity_id ? 'border-primary bg-primary/5' : 'border-border hover:bg-muted/50'
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="text-sm font-medium truncate">{r.coaching_summary?.slice(0, 40) ?? r.opportunity_id.slice(0, 8)}</span>
                  <Badge variant="outline" className={r.health_score >= 70 ? 'text-green-500' : r.health_score >= 40 ? 'text-amber-500' : 'text-red-500'}>
                    {r.health_score}
                  </Badge>
                </div>
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <span>Win: {r.win_probability}%</span>
                  <span>·</span>
                  <span>{r.sentiment}</span>
                </div>
              </button>
            ))}
          </div>
        ) : (
          <Card className="text-center py-8">
            <CardContent>
              <p className="text-muted-foreground text-sm">Sem análises. Use o botão no detalhe de cada oportunidade.</p>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Deal Detail Panel */}
      <div className="lg:col-span-2">
        {selectedReport ? (
          <DealIntelligencePanel report={selectedReport} />
        ) : (
          <Card className="text-center py-16">
            <CardContent>
              <Search className="h-8 w-8 text-muted-foreground mx-auto mb-3" />
              <p className="text-muted-foreground">Seleccione um deal para ver a análise detalhada</p>
            </CardContent>
          </Card>
        )}
      </div>
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
    <div className="space-y-4">
      {/* Win Probability + Health */}
      <div className="grid grid-cols-2 gap-4">
        <Card>
          <CardContent className="pt-4 text-center">
            <motion.div
              className={`text-4xl font-bold ${probColor}`}
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.5 }}
            >
              {report.win_probability}%
            </motion.div>
            <p className="text-xs text-muted-foreground mt-1">Win Probability</p>
            {report.win_probability_delta != null && (
              <div className="flex items-center justify-center gap-1 mt-1">
                {trendIcon}
                <span className="text-xs">{report.win_probability_delta > 0 ? '+' : ''}{report.win_probability_delta}%</span>
              </div>
            )}
            <Badge variant="outline" className="mt-2 text-xs">
              {report.confidence_level === 'high' ? 'Alta confiança' : report.confidence_level === 'medium' ? 'Confiança média' : 'Baixa confiança'}
            </Badge>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="text-center mb-3">
              <span className="text-2xl font-bold">{report.health_score}</span>
              <span className="text-muted-foreground">/100</span>
              <p className="text-xs text-muted-foreground">Health Score</p>
            </div>
            <Progress value={report.health_score} className="h-2" />
            <div className="flex items-center justify-between mt-2 text-xs text-muted-foreground">
              <span>Tendência: {report.health_trend === 'improving' ? '📈 A melhorar' : report.health_trend === 'declining' ? '📉 A piorar' : '➡️ Estável'}</span>
              <Badge variant="outline">{report.sentiment}</Badge>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Coaching Summary */}
      {report.coaching_summary && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <Brain className="h-4 w-4 text-primary" /> Coaching
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm leading-relaxed">{report.coaching_summary}</p>
            {report.sentiment_reasoning && (
              <p className="text-xs text-muted-foreground mt-2 italic">{report.sentiment_reasoning}</p>
            )}
          </CardContent>
        </Card>
      )}

      {/* Risk Signals */}
      {report.risk_signals && report.risk_signals.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">⚠️ Sinais de Risco</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {report.risk_signals.map((signal: RiskSignal, i: number) => (
              <div key={i} className="flex items-start gap-2">
                <AlertTriangle className={`h-4 w-4 mt-0.5 shrink-0 ${severityColor[signal.severity]}`} />
                <div>
                  <Badge variant="outline" className="text-xs mb-1">{signal.type}</Badge>
                  <p className="text-sm">{signal.description}</p>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Next Actions */}
      {report.next_actions && report.next_actions.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">🎯 Próximas Acções</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {report.next_actions.map((action: NextAction, i: number) => (
              <div key={i} className="flex items-start gap-3">
                <Badge className="mt-0.5 shrink-0">{action.priority}</Badge>
                <div className="flex-1">
                  <p className="text-sm font-medium">{action.action}</p>
                  <p className="text-xs text-muted-foreground italic">{action.rationale}</p>
                  <Badge variant="outline" className="text-xs mt-1">Prazo: {action.due_days} dias</Badge>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Strengths & Weaknesses */}
      <div className="grid grid-cols-2 gap-4">
        {report.key_strengths && report.key_strengths.length > 0 && (
          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-base text-green-500">✅ Pontos Fortes</CardTitle></CardHeader>
            <CardContent>
              <ul className="space-y-1 text-sm">
                {report.key_strengths.map((s, i) => <li key={i}>• {s}</li>)}
              </ul>
            </CardContent>
          </Card>
        )}
        {report.key_weaknesses && report.key_weaknesses.length > 0 && (
          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-base text-red-500">❌ Pontos Fracos</CardTitle></CardHeader>
            <CardContent>
              <ul className="space-y-1 text-sm">
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
  const { data: report, isLoading } = useMultiPipelineIntel();
  const genMulti = useGenerateMultiPipelineIntel();

  if (isLoading) return <div className="flex justify-center py-12"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div>;
  if (!report) return (
    <Card className="text-center py-12">
      <CardContent>
        <p className="text-muted-foreground mb-4">Sem análise multi-pipeline disponível.</p>
        <Button onClick={() => genMulti.mutate()} disabled={genMulti.isPending}>
          {genMulti.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Zap className="h-4 w-4 mr-2" />}
          Gerar Análise
        </Button>
      </CardContent>
    </Card>
  );

  return (
    <div className="space-y-6">
      {/* Pipeline Comparison */}
      {report.pipeline_comparison && report.pipeline_comparison.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Comparação de Pipelines</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-muted-foreground">
                    <th className="text-left py-2 pr-4">Pipeline</th>
                    <th className="text-right py-2 pr-4">Deals</th>
                    <th className="text-right py-2 pr-4">Valor</th>
                    <th className="text-right py-2 pr-4">Win Rate</th>
                    <th className="text-right py-2 pr-4">Ciclo Médio</th>
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
          </CardContent>
        </Card>
      )}

      {/* Patterns */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {report.winning_patterns && report.winning_patterns.length > 0 && (
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base text-green-500">🏆 Padrões de Sucesso</CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2 text-sm">
                {report.winning_patterns.map((p, i) => <li key={i} className="flex items-start gap-2"><span className="text-green-500">✓</span>{p}</li>)}
              </ul>
            </CardContent>
          </Card>
        )}
        {report.losing_patterns && report.losing_patterns.length > 0 && (
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base text-red-500">⚠️ Padrões de Perda</CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2 text-sm">
                {report.losing_patterns.map((p, i) => <li key={i} className="flex items-start gap-2"><span className="text-red-500">✗</span>{p}</li>)}
              </ul>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Bottleneck Stages Chart */}
      {report.bottleneck_stages && report.bottleneck_stages.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Fases com Maior Estagnação</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-48">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={(report.bottleneck_stages as BottleneckStage[]).map(b => ({
                    name: b.stage_name, days: b.avg_days_stuck, dropRate: b.drop_rate,
                  }))}
                  layout="vertical"
                >
                  <XAxis type="number" />
                  <YAxis type="category" dataKey="name" width={120} tick={{ fontSize: 12 }} />
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
          <CardHeader className="pb-2">
            <CardTitle className="text-base">💡 Insights Estratégicos</CardTitle>
          </CardHeader>
          <CardContent>
            <ol className="space-y-3">
              {report.strategic_insights.map((insight, i) => (
                <li key={i} className="flex items-start gap-3">
                  <Badge variant="outline" className="shrink-0 mt-0.5">{i + 1}</Badge>
                  <p className="text-sm">{insight}</p>
                </li>
              ))}
            </ol>
          </CardContent>
        </Card>
      )}

      {/* Growth Opportunities */}
      {report.growth_opportunities && report.growth_opportunities.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">🌱 Oportunidades de Crescimento</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2 text-sm">
              {report.growth_opportunities.map((g, i) => <li key={i} className="flex items-start gap-2">🌱 {g}</li>)}
            </ul>
          </CardContent>
        </Card>
      )}

      {report.generated_at && (
        <p className="text-xs text-muted-foreground text-right">
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
      <CardContent className="pt-4">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs text-muted-foreground">{label}</span>
          <span className={color}>{icon}</span>
        </div>
        <p className={`text-2xl font-bold ${color}`}>{value}</p>
        {sub && <p className="text-xs text-muted-foreground mt-1">{sub}</p>}
      </CardContent>
    </Card>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────
export default function AISalesCoachPage() {
  return (
    <DashboardLayout>
      <div className="p-4 md:p-6 space-y-4">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <TrendingUp className="h-6 w-6 text-primary" />
            AI Sales Coach
          </h1>
          <p className="text-muted-foreground text-sm mt-1">
            Intelligence estratégica sobre o pipeline de vendas
          </p>
        </div>

        <CoachOverviewBar />

        <Tabs defaultValue="risk" className="space-y-4">
          <TabsList>
            <TabsTrigger value="risk" className="gap-1.5">
              <ShieldAlert className="h-4 w-4" /> Pipeline Risk
            </TabsTrigger>
            <TabsTrigger value="deals" className="gap-1.5">
              <Target className="h-4 w-4" /> Deal Intelligence
            </TabsTrigger>
            <TabsTrigger value="multi" className="gap-1.5">
              <BarChart3 className="h-4 w-4" /> Multi-Pipeline
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
