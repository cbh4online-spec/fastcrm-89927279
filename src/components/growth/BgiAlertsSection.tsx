import { useEffect, useMemo, useState } from "react";
import { AlertTriangle, BellOff, Settings2 } from "lucide-react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { IXCard } from "@/components/entity/ix/IXCard";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { supabase } from "@/integrations/supabase/client";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { useBgiSettings } from "@/hooks/useBgiSettings";
import { evaluateAlerts, DEFAULT_THRESHOLDS } from "@/lib/bgi/alertRules";
import type { IndicatorDefinition } from "@/lib/bgi/indicatorCatalog";
import type { BgiIndicatorResult, BgiPeriod } from "@/hooks/useBgiIndicators";
import type { ObjectiveView } from "@/components/growth/BgiObjectivesSection";

export function BgiAlertsSection({ period, data, indicators, objectives, canManage }: {
  period: BgiPeriod; data: BgiIndicatorResult; indicators: IndicatorDefinition[]; objectives: ObjectiveView[]; canManage: boolean;
}) {
  const { currentWorkspace } = useWorkspace();
  const wsId = currentWorkspace?.id;
  const qc = useQueryClient();
  const { data: settings, saveThresholds } = useBgiSettings();
  const thresholds = settings?.thresholds ?? DEFAULT_THRESHOLDS;
  const periodKey = `${period}:${data.start}`;

  const dismissed = useQuery({
    queryKey: ["bgi-alert-dismissals", wsId, periodKey],
    enabled: !!wsId,
    queryFn: async () => {
      const { data: rows, error } = await supabase.from("bgi_alert_dismissals").select("alert_key").eq("workspace_id", wsId!).eq("period_key", periodKey);
      if (error) throw error;
      return new Set((rows ?? []).map((r) => r.alert_key));
    },
  });
  const dismiss = useMutation({
    mutationFn: async (alert_key: string) => {
      const { error } = await supabase.from("bgi_alert_dismissals").insert({ workspace_id: wsId!, alert_key, period_key: periodKey });
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["bgi-alert-dismissals", wsId, periodKey] }),
    onError: (e: Error) => toast.error(e.message),
  });

  const alerts = useMemo(() => evaluateAlerts({
    current: data.current, previous: data.previous,
    indicators: indicators.map((i) => ({ id: i.id, name: i.name, formula: i.formula })),
    objectives: objectives.map((v) => ({ indicatorId: v.indicator.id, name: v.indicator.name, formula: v.indicator.formula, target: v.objective.target_value,
      projected: v.projected, status: v.status, elapsed: v.elapsed, total: v.total })),
    thresholds,
  }).filter((a) => !dismissed.data?.has(a.key)), [data, indicators, objectives, thresholds, dismissed.data]);

  // Publica cada alerta no sino (um por alerta/período por organização; o índice único evita duplicados)
  useEffect(() => {
    if (!wsId || !dismissed.data || alerts.length === 0) return;
    const rows = alerts.map((a) => ({
      workspace_id: wsId, type: "bgi_alert", title: `Crescimento: ${a.title}`.slice(0, 200), message: a.detail.slice(0, 500), is_read: false,
      metadata: { bgi_alert_key: `${periodKey}:${a.key}`, link: "/dashboard/growth", severity: a.severity },
    }));
    Promise.all(rows.map((r) => supabase.from("admin_notifications").insert(r))).then((res) => {
      if (res.some((r) => !r.error)) qc.invalidateQueries({ queryKey: ["admin-notifications", wsId] });
    });
  }, [wsId, periodKey, alerts, dismissed.data, qc]);

  const [drop, setDrop] = useState(String(thresholds.drop_pct));
  const [risk, setRisk] = useState(String(thresholds.risk_pct));

  const config = canManage && settings?.exists ? (
    <Popover onOpenChange={(o) => { if (o) { setDrop(String(thresholds.drop_pct)); setRisk(String(thresholds.risk_pct)); } }}>
      <PopoverTrigger asChild><Button size="sm" variant="outline"><Settings2 className="h-4 w-4 mr-1" />Limites</Button></PopoverTrigger>
      <PopoverContent className="w-72 space-y-3">
        <div className="space-y-1"><Label htmlFor="bgi-drop">Queda que gera alerta (%)</Label>
          <Input id="bgi-drop" type="number" min={1} max={100} value={drop} onChange={(e) => setDrop(e.target.value)} /></div>
        <div className="space-y-1"><Label htmlFor="bgi-risk">Objetivo em risco abaixo de (% do alvo)</Label>
          <Input id="bgi-risk" type="number" min={1} max={100} value={risk} onChange={(e) => setRisk(e.target.value)} /></div>
        <Button size="sm" className="w-full" disabled={saveThresholds.isPending}
          onClick={() => saveThresholds.mutate({ drop_pct: Number(drop), risk_pct: Number(risk) }, {
            onSuccess: () => toast.success("Limites guardados"), onError: (e) => toast.error((e as Error).message) })}>Guardar</Button>
      </PopoverContent>
    </Popover>
  ) : null;

  const goTo = (id: string) => document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "center" });

  return (
    <IXCard title="Alertas" actions={config}>
      {alerts.length === 0 ? (
        <p className="text-sm text-muted-foreground">Sem alertas neste período.</p>
      ) : (
        <ul className="space-y-2">
          {alerts.map((a) => (
            <li key={a.key} className="flex flex-wrap items-start gap-2 rounded-md border border-border p-3">
              <AlertTriangle className={`h-4 w-4 mt-0.5 ${a.severity === "critical" ? "text-destructive" : "text-muted-foreground"}`} aria-hidden />
              <button type="button" className="flex-1 min-w-0 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded" onClick={() => goTo(a.targetId)}>
                <span className="text-sm font-medium">{a.title}</span>
                {a.severity === "critical" && <Badge variant="destructive" className="ml-2">Crítico</Badge>}
                <span className="block text-xs text-muted-foreground">{a.detail}</span>
              </button>
              <Button size="sm" variant="ghost" aria-label={`Dispensar alerta ${a.title}`} onClick={() => dismiss.mutate(a.key)}>
                <BellOff className="h-4 w-4" />
              </Button>
            </li>
          ))}
        </ul>
      )}
    </IXCard>
  );
}
