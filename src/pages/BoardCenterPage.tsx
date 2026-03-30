import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useExecutiveSnapshot, useDecisionPacks, useGenerateBrief, useActOnDecision, useExecutiveSnapshots } from "@/hooks/useExecutiveBoard";
import { InvestorViewCards } from "@/components/executive/InvestorViewCards";
import { useWorkspace } from "@/hooks/useWorkspace";
import { RefreshCw, TrendingUp, AlertTriangle, Target, Lightbulb, Clock, CheckCircle, XCircle, Loader2, Shield, BarChart3, Eye } from "lucide-react";

const NARRATIVE_LABELS: Record<string, string> = {
  growth: "Crescimento",
  stabilization: "Estabilização",
  recovery: "Recuperação",
  restructuring: "Reestruturação",
  scale_preparation: "Preparação para Escala",
};

const NARRATIVE_COLORS: Record<string, string> = {
  growth: "bg-green-100 text-green-800",
  stabilization: "bg-blue-100 text-blue-800",
  recovery: "bg-yellow-100 text-yellow-800",
  restructuring: "bg-orange-100 text-orange-800",
  scale_preparation: "bg-purple-100 text-purple-800",
};

const RISK_COLORS: Record<string, string> = {
  low: "bg-green-100 text-green-800",
  medium: "bg-yellow-100 text-yellow-800",
  high: "bg-orange-100 text-orange-800",
  critical: "bg-red-100 text-red-800",
};

export default function BoardCenterPage() {
  const { currentWorkspace } = useWorkspace();
  const wsId = currentWorkspace?.id;
  const [mode, setMode] = useState<"board" | "investor">("board");

  const { data: snapshot, isLoading } = useExecutiveSnapshot(wsId);
  const { data: decisionPacks = [] } = useDecisionPacks(wsId, "pending");
  const { data: history = [] } = useExecutiveSnapshots(wsId);
  const generateBrief = useGenerateBrief(wsId);
  const actOnDecision = useActOnDecision(wsId);

  const wins = (snapshot?.wins_json as string[]) || [];
  const risks = (snapshot?.risks_json as string[]) || [];
  const priorities = (snapshot?.priorities_json as string[]) || [];

  const HealthGauge = ({ label, value }: { label: string; value: number }) => (
    <div className="text-center">
      <div className={`text-2xl font-bold ${value >= 70 ? "text-green-600" : value >= 50 ? "text-yellow-600" : "text-destructive"}`}>
        {value}
      </div>
      <div className="text-xs text-muted-foreground">{label}</div>
    </div>
  );

  return (
    <div className="container mx-auto p-6 space-y-6 max-w-7xl">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Board Center</h1>
          <p className="text-muted-foreground text-sm">Vista executiva consolidada do negócio</p>
        </div>
        <div className="flex items-center gap-3">
          <Tabs value={mode} onValueChange={(v) => setMode(v as any)}>
            <TabsList>
              <TabsTrigger value="board" className="gap-1.5"><Shield className="h-3.5 w-3.5" /> Board</TabsTrigger>
              <TabsTrigger value="investor" className="gap-1.5"><TrendingUp className="h-3.5 w-3.5" /> Investor</TabsTrigger>
            </TabsList>
          </Tabs>
          <Button onClick={() => generateBrief.mutate(mode)} disabled={generateBrief.isPending || !wsId} size="sm">
            {generateBrief.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <RefreshCw className="h-4 w-4 mr-1" />}
            Gerar Briefing
          </Button>
        </div>
      </div>

      {isLoading && <div className="text-center py-12 text-muted-foreground">A carregar...</div>}

      {!isLoading && !snapshot && (
        <Card>
          <CardContent className="py-12 text-center">
            <Eye className="h-12 w-12 mx-auto text-muted-foreground/40 mb-4" />
            <p className="text-muted-foreground">Nenhum briefing executivo gerado ainda.</p>
            <Button onClick={() => generateBrief.mutate(mode)} className="mt-4" disabled={!wsId || generateBrief.isPending}>
              Gerar Primeiro Briefing
            </Button>
          </CardContent>
        </Card>
      )}

      {snapshot && (
        <>
          {/* Executive Summary */}
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg">Resumo Executivo</CardTitle>
                <div className="flex items-center gap-2">
                  <Badge className={NARRATIVE_COLORS[snapshot.narrative_type] || "bg-muted"}>
                    {NARRATIVE_LABELS[snapshot.narrative_type] || snapshot.narrative_type}
                  </Badge>
                  <Badge className={RISK_COLORS[snapshot.risk_level] || "bg-muted"}>
                    Risco: {snapshot.risk_level}
                  </Badge>
                  <Badge variant="outline">
                    Confiança: {Math.round((snapshot.confidence || 0.5) * 100)}%
                  </Badge>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-sm leading-relaxed">{snapshot.summary}</p>
              {snapshot.focus_priority && (
                <div className="mt-3 flex items-center gap-2 text-sm">
                  <Target className="h-4 w-4 text-primary" />
                  <span className="font-medium">Foco:</span> {snapshot.focus_priority}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Health Gauges */}
          <div className="grid grid-cols-3 gap-4">
            <Card>
              <CardContent className="pt-6">
                <HealthGauge label="Execução" value={snapshot.execution_health || 50} />
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <HealthGauge label="Estratégia" value={snapshot.strategic_health || 50} />
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <HealthGauge label="Contexto" value={snapshot.context_health || 50} />
              </CardContent>
            </Card>
          </div>

          {/* Revenue Triad */}
          {(snapshot.revenue_actual || snapshot.revenue_target || snapshot.revenue_forecast) && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <BarChart3 className="h-4 w-4" /> Receita: Real vs Meta vs Forecast
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-3 gap-4 text-center">
                  <div>
                    <div className="text-xl font-bold">{Number(snapshot.revenue_actual || 0).toLocaleString("pt-PT")}€</div>
                    <div className="text-xs text-muted-foreground">Real</div>
                  </div>
                  <div>
                    <div className="text-xl font-bold">{Number(snapshot.revenue_target || 0).toLocaleString("pt-PT")}€</div>
                    <div className="text-xs text-muted-foreground">Meta</div>
                  </div>
                  <div>
                    <div className="text-xl font-bold">{Number(snapshot.revenue_forecast || 0).toLocaleString("pt-PT")}€</div>
                    <div className="text-xs text-muted-foreground">Forecast</div>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Investor Mode Cards */}
          {mode === "investor" && <InvestorViewCards snapshot={snapshot} />}

          {/* Wins / Risks / Priorities */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium flex items-center gap-2 text-green-600">
                  <CheckCircle className="h-4 w-4" /> Vitórias
                </CardTitle>
              </CardHeader>
              <CardContent>
                {wins.length > 0 ? (
                  <ul className="space-y-1.5 text-sm">
                    {wins.map((w, i) => <li key={i} className="flex items-start gap-2"><span className="text-green-500 mt-0.5">✓</span>{w}</li>)}
                  </ul>
                ) : <p className="text-xs text-muted-foreground">Sem dados</p>}
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium flex items-center gap-2 text-destructive">
                  <AlertTriangle className="h-4 w-4" /> Riscos
                </CardTitle>
              </CardHeader>
              <CardContent>
                {risks.length > 0 ? (
                  <ul className="space-y-1.5 text-sm">
                    {risks.map((r, i) => <li key={i} className="flex items-start gap-2"><span className="text-destructive mt-0.5">⚠</span>{r}</li>)}
                  </ul>
                ) : <p className="text-xs text-muted-foreground">Sem dados</p>}
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium flex items-center gap-2 text-primary">
                  <Lightbulb className="h-4 w-4" /> Prioridades
                </CardTitle>
              </CardHeader>
              <CardContent>
                {priorities.length > 0 ? (
                  <ul className="space-y-1.5 text-sm">
                    {priorities.map((p, i) => <li key={i} className="flex items-start gap-2"><span className="text-primary mt-0.5">→</span>{p}</li>)}
                  </ul>
                ) : <p className="text-xs text-muted-foreground">Sem dados</p>}
              </CardContent>
            </Card>
          </div>

          {/* Decision Packs */}
          {decisionPacks.length > 0 && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Decisões Pendentes</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {decisionPacks.map((dp: any) => (
                  <div key={dp.id} className="border rounded-lg p-3 space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="font-medium text-sm">{dp.title}</div>
                      <Badge variant="outline">{dp.decision_type}</Badge>
                    </div>
                    {dp.rationale && <p className="text-xs text-muted-foreground">{dp.rationale}</p>}
                    {dp.recommended_option && (
                      <p className="text-xs"><span className="font-medium">Recomendação:</span> {dp.recommended_option}</p>
                    )}
                    <div className="flex gap-2">
                      <Button size="sm" variant="default" onClick={() => actOnDecision.mutate({ id: dp.id, status: "accepted" })}>
                        <CheckCircle className="h-3 w-3 mr-1" /> Aceitar
                      </Button>
                      <Button size="sm" variant="outline" onClick={() => actOnDecision.mutate({ id: dp.id, status: "dismissed" })}>
                        <XCircle className="h-3 w-3 mr-1" /> Dispensar
                      </Button>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}

          {/* Outlook */}
          {(snapshot.outlook_30d || snapshot.outlook_90d) && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {snapshot.outlook_30d && (
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium flex items-center gap-2">
                      <Clock className="h-4 w-4" /> Outlook 30 dias
                    </CardTitle>
                  </CardHeader>
                  <CardContent><p className="text-sm">{snapshot.outlook_30d}</p></CardContent>
                </Card>
              )}
              {snapshot.outlook_90d && (
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium flex items-center gap-2">
                      <Clock className="h-4 w-4" /> Outlook 90 dias
                    </CardTitle>
                  </CardHeader>
                  <CardContent><p className="text-sm">{snapshot.outlook_90d}</p></CardContent>
                </Card>
              )}
            </div>
          )}

          {/* History */}
          {history.length > 1 && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Histórico de Briefings</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {history.slice(0, 10).map((h: any) => (
                    <div key={h.id} className="flex items-center justify-between text-sm border-b pb-2 last:border-0">
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className="text-xs">{h.snapshot_type}</Badge>
                        <span>{h.title || "Sem título"}</span>
                      </div>
                      <div className="flex items-center gap-2 text-muted-foreground text-xs">
                        <Badge className={NARRATIVE_COLORS[h.narrative_type] || "bg-muted"} variant="secondary">
                          {NARRATIVE_LABELS[h.narrative_type] || h.narrative_type}
                        </Badge>
                        {new Date(h.created_at).toLocaleDateString("pt-PT")}
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </>
      )}
    </div>
  );
}
