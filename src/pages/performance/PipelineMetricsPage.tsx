import { useState } from "react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Sparkles, Loader2, Check } from "lucide-react";
import { IXEntityTabs } from "@/components/entity/ix/IXEntityTabs";
import { usePipelineMetrics, MetricType, MetricFormula, MetricPeriod, AlertChannel } from "@/hooks/usePipelineMetrics";
import { usePipelines, usePipelineStagesEnhanced } from "@/hooks/useOpportunitiesEnhanced";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { useSeedDefaultMetrics } from "@/hooks/useSeedDefaultMetrics";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

import { MetricsTab } from "@/components/performance/metrics/MetricsTab";
import { TargetsTab } from "@/components/performance/metrics/TargetsTab";
import { AlertsTab } from "@/components/performance/metrics/AlertsTab";
import { GoalPresetsTab } from "@/components/performance/metrics/GoalPresetsTab";
import { METRIC_TYPES, TYPE_COLORS, ALERT_CONDITIONS, ALERT_CHANNELS } from "@/components/performance/metrics/constants";

interface AISuggestion {
  name: string; description: string; metric_type: MetricType; formula: MetricFormula;
  source_table: string; source_field: string | null; unit: string;
  target_value?: number; target_period?: MetricPeriod; reasoning: string;
}

interface AIAlertSuggestion {
  metric_id: string; metric_name: string; condition: string;
  threshold_pct: number; channel: AlertChannel; reasoning: string;
}

export default function PipelineMetricsPage() {
  const {
    metrics, metricsLoading, targets, alerts,
    createMetric, updateMetric, deleteMetric,
    createTarget, updateTarget, deleteTarget,
    createAlert, updateAlert, deleteAlert,
  } = usePipelineMetrics();
  useSeedDefaultMetrics();
  const { data: pipelines } = usePipelines();
  const { data: stages } = usePipelineStagesEnhanced();
  const { currentWorkspace } = useWorkspace();

  const [tab, setTab] = useState("metrics");

  // AI suggestions (metrics)
  const [aiLoading, setAiLoading] = useState(false);
  const [aiSuggestions, setAiSuggestions] = useState<AISuggestion[]>([]);
  const [aiOpen, setAiOpen] = useState(false);

  // AI suggestions (alerts)
  const [aiAlertLoading, setAiAlertLoading] = useState(false);
  const [aiAlertSuggestions, setAiAlertSuggestions] = useState<AIAlertSuggestion[]>([]);
  const [aiAlertOpen, setAiAlertOpen] = useState(false);

  const handleAISuggest = async () => {
    if (!currentWorkspace?.id) return;
    setAiLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("context-ai-assist", {
        body: { action: "suggest_metrics_and_targets", workspaceId: currentWorkspace.id },
      });
      if (error) throw error;
      if (data?.error) { toast.error(data.error); return; }
      setAiSuggestions(data.suggestions || []);
      setAiOpen(true);
    } catch (e: any) {
      toast.error("Erro IA: " + (e.message || "Erro desconhecido"));
    } finally { setAiLoading(false); }
  };

  const acceptSuggestion = (s: AISuggestion) => {
    createMetric.mutate({
      name: s.name, description: s.description, metric_type: s.metric_type,
      formula: s.formula, source_table: s.source_table, source_field: s.source_field,
      unit: s.unit, filter_json: {},
    }, {
      onSuccess: (created: any) => {
        if (s.target_value && created?.id) {
          createTarget.mutate({ metric_id: created.id, period: s.target_period || "monthly", target_value: s.target_value });
        }
        setAiSuggestions(prev => prev.filter(x => x.name !== s.name));
        toast.success(`Métrica "${s.name}" adicionada`);
      },
    });
  };

  const handleAIAlertSuggest = async () => {
    if (!currentWorkspace?.id) return;
    setAiAlertLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("context-ai-assist", {
        body: { action: "suggest_alerts", workspaceId: currentWorkspace.id },
      });
      if (error) throw error;
      if (data?.error) { toast.error(data.error); return; }
      setAiAlertSuggestions(data.suggestions || []);
      setAiAlertOpen(true);
    } catch (e: any) {
      toast.error("Erro IA: " + (e.message || "Erro desconhecido"));
    } finally { setAiAlertLoading(false); }
  };

  const acceptAlertSuggestion = (s: AIAlertSuggestion) => {
    createAlert.mutate({
      metric_id: s.metric_id, channel: s.channel, condition: s.condition, threshold_pct: s.threshold_pct,
    }, {
      onSuccess: () => { setAiAlertSuggestions(prev => prev.filter(x => x !== s)); toast.success(`Alerta "${s.metric_name}" adicionado`); },
    });
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Centro de Métricas & Metas</h1>
            <p className="text-sm text-muted-foreground mt-1">Métricas, metas, alertas e objetivos de performance num só lugar</p>
          </div>
        </div>

        <IXEntityTabs
          activeId={tab}
          onChange={setTab}
          className="px-0 sm:px-0"
          tabs={[
            { id: "metrics", label: "Métricas", count: metrics.length },
            { id: "targets", label: "Metas", count: targets.length },
            { id: "alerts", label: "Alertas", count: alerts.length },
            { id: "goals", label: "Objetivos" },
          ]}
        />

        {tab === "metrics" && (
          <MetricsTab
            metrics={metrics} targets={targets} metricsLoading={metricsLoading}
            pipelines={pipelines} stages={stages}
            createMetric={createMetric} updateMetric={updateMetric} deleteMetric={deleteMetric}
            createTarget={createTarget} aiLoading={aiLoading} onAISuggest={handleAISuggest}
          />
        )}

        {tab === "targets" && (
          <TargetsTab
            metrics={metrics} targets={targets} pipelines={pipelines} stages={stages}
            createTarget={createTarget} updateTarget={updateTarget} deleteTarget={deleteTarget}
            aiLoading={aiLoading} onAISuggest={handleAISuggest}
          />
        )}

        {tab === "alerts" && (
          <AlertsTab
            metrics={metrics} alerts={alerts}
            createAlert={createAlert} updateAlert={updateAlert} deleteAlert={deleteAlert}
            aiAlertLoading={aiAlertLoading} onAIAlertSuggest={handleAIAlertSuggest}
          />
        )}

        {tab === "goals" && <GoalPresetsTab />}


        {/* AI Metric Suggestions Dialog */}
        <Dialog open={aiOpen} onOpenChange={setAiOpen}>
          <DialogContent className="sm:max-w-2xl max-h-[85vh]">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Sparkles className="h-5 w-5 text-primary" />
                Sugestões IA — Context OS
              </DialogTitle>
            </DialogHeader>
            <ScrollArea className="max-h-[65vh]">
              {aiSuggestions.length === 0 ? (
                <p className="text-sm text-muted-foreground py-8 text-center">Sem sugestões disponíveis.</p>
              ) : (
                <div className="space-y-3">
                  {aiSuggestions.map((s, i) => (
                    <Card key={i} className="p-4">
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1 flex-wrap">
                            <h4 className="font-medium text-sm">{s.name}</h4>
                            <Badge className={TYPE_COLORS[s.metric_type] || ""}>{METRIC_TYPES.find(t => t.value === s.metric_type)?.label || s.metric_type}</Badge>
                            {s.target_value && <Badge variant="outline" className="text-xs">Meta: {s.target_value}{s.unit}</Badge>}
                          </div>
                          <p className="text-xs text-muted-foreground mb-1">{s.description}</p>
                          <p className="text-xs text-muted-foreground/70 italic">{s.reasoning}</p>
                        </div>
                        <Button size="sm" className="gap-1 shrink-0" onClick={() => acceptSuggestion(s)} disabled={createMetric.isPending}>
                          <Check className="h-3.5 w-3.5" />Adicionar
                        </Button>
                      </div>
                    </Card>
                  ))}
                </div>
              )}
            </ScrollArea>
          </DialogContent>
        </Dialog>

        {/* AI Alert Suggestions Dialog */}
        <Dialog open={aiAlertOpen} onOpenChange={setAiAlertOpen}>
          <DialogContent className="sm:max-w-2xl max-h-[85vh]">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Sparkles className="h-5 w-5 text-primary" />
                Sugestões de Alertas — IA
              </DialogTitle>
            </DialogHeader>
            <ScrollArea className="max-h-[65vh]">
              {aiAlertSuggestions.length === 0 ? (
                <p className="text-sm text-muted-foreground py-8 text-center">Sem sugestões disponíveis.</p>
              ) : (
                <div className="space-y-3">
                  {aiAlertSuggestions.map((s, i) => (
                    <Card key={i} className="p-4">
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1 flex-wrap">
                            <h4 className="font-medium text-sm">{s.metric_name}</h4>
                            <Badge variant="secondary" className="text-xs">{ALERT_CONDITIONS.find(c => c.value === s.condition)?.label || s.condition}</Badge>
                            <Badge variant="outline" className="text-xs">{s.threshold_pct}%</Badge>
                            <Badge variant="outline" className="text-xs">{ALERT_CHANNELS.find(c => c.value === s.channel)?.label || s.channel}</Badge>
                          </div>
                          <p className="text-xs text-muted-foreground/70 italic">{s.reasoning}</p>
                        </div>
                        <Button size="sm" className="gap-1 shrink-0" onClick={() => acceptAlertSuggestion(s)} disabled={createAlert.isPending}>
                          <Check className="h-3.5 w-3.5" />Adicionar
                        </Button>
                      </div>
                    </Card>
                  ))}
                </div>
              )}
            </ScrollArea>
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
}
