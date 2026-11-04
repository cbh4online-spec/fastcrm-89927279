import { useMemo, useState } from "react";
import { Archive, Loader2, Pencil, Plus, Target } from "lucide-react";
import { toast } from "sonner";
import { IXCard } from "@/components/entity/ix/IXCard";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { IndicatorDefinition } from "@/lib/bgi/indicatorCatalog";
import { formatIndicatorValue, isSupportedFormula } from "@/lib/bgi/formatIndicator";
import { evaluateObjective, STATUS_LABEL, type ObjectiveStatus } from "@/lib/bgi/objectiveProgress";
import { lisbonTodayYmd } from "@/lib/dates/lisbonDays";
import { objectiveSchema, useBgiObjectives, type BgiObjective } from "@/hooks/useBgiObjectives";
import type { BgiIndicatorResult, BgiPeriod } from "@/hooks/useBgiIndicators";

const STATUS_VARIANT: Record<ObjectiveStatus, "default" | "secondary" | "destructive" | "outline"> = {
  achieved: "default", on_track: "secondary", at_risk: "outline", behind: "destructive", no_data: "outline",
};
const CUMULATIVE = new Set(["sum", "count"]);

export interface ObjectiveView { objective: BgiObjective; indicator: IndicatorDefinition; current: number | null; pct: number | null; projected: number | null; status: ObjectiveStatus }

export function useObjectiveViews(period: BgiPeriod, data: BgiIndicatorResult | undefined, indicators: IndicatorDefinition[]) {
  const q = useBgiObjectives(period, data?.start);
  const views = useMemo<ObjectiveView[]>(() => {
    if (!data || !q.data) return [];
    const byId = new Map(indicators.map((i) => [i.id, i]));
    const today = lisbonTodayYmd();
    return q.data.flatMap((o) => {
      const indicator = byId.get(o.indicator_id); if (!indicator) return [];
      const current = data.current?.[indicator.formula] ?? null;
      const r = evaluateObjective({ current, target: o.target_value, direction: o.direction, start: data.start, end: data.end, todayYmd: today, cumulative: CUMULATIVE.has(indicator.aggregation) });
      return [{ objective: o, indicator, current, ...r }];
    });
  }, [data, q.data, indicators]);
  return { ...q, views };
}

export function BgiObjectivesSection({ period, data, indicators, canManage }: {
  period: BgiPeriod; data: BgiIndicatorResult; indicators: IndicatorDefinition[]; canManage: boolean;
}) {
  const { views, isLoading, error, archive } = useObjectiveViews(period, data, indicators);
  const [editing, setEditing] = useState<BgiObjective | "new" | null>(null);
  const eligible = indicators.filter((i) => isSupportedFormula(i.formula));

  return (
    <IXCard title="Objetivos">
      <div className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="text-sm text-muted-foreground">Metas do período, com valores calculados automaticamente.</p>
          {canManage && <Button size="sm" onClick={() => setEditing("new")}><Plus className="h-4 w-4 mr-1" /> Novo objetivo</Button>}
        </div>
        {isLoading && <Loader2 className="h-5 w-5 animate-spin text-muted-foreground mx-auto" />}
        {error && <p className="text-sm text-destructive">Não foi possível carregar os objetivos.</p>}
        {!isLoading && !error && views.length === 0 && (
          <div className="flex flex-col items-center gap-2 py-6 text-center">
            <Target className="h-6 w-6 text-muted-foreground" aria-hidden />
            <p className="text-sm text-muted-foreground">{canManage ? "Ainda não há objetivos neste período. Crie o primeiro." : "Ainda não há objetivos neste período."}</p>
          </div>
        )}
        <ul className="grid gap-3 md:grid-cols-2">
          {views.map((v) => (
            <li key={v.objective.id} className="rounded-xl border border-border p-4 space-y-2">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="font-medium text-foreground truncate">{v.indicator.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {v.objective.direction === "lte" ? "Até" : "Pelo menos"} {formatIndicatorValue(v.objective.target_value, v.indicator.unit)}
                  </p>
                </div>
                <Badge variant={STATUS_VARIANT[v.status]}>{STATUS_LABEL[v.status]}</Badge>
              </div>
              <Progress value={Math.min(100, v.pct ?? 0)} aria-label={`Progresso de ${v.indicator.name}`} />
              <div className="flex flex-wrap justify-between gap-2 text-xs text-muted-foreground">
                <span>Atual: <strong className="text-foreground">{formatIndicatorValue(v.current, v.indicator.unit)}</strong> {v.pct !== null && `(${v.pct.toLocaleString("pt-PT")}%)`}</span>
                <span>Projeção: {formatIndicatorValue(v.projected, v.indicator.unit)}</span>
              </div>
              {v.objective.notes && <p className="text-xs text-muted-foreground">{v.objective.notes}</p>}
              {canManage && (
                <div className="flex gap-1 justify-end">
                  <Button size="sm" variant="ghost" onClick={() => setEditing(v.objective)}><Pencil className="h-3.5 w-3.5 mr-1" /> Editar</Button>
                  <Button size="sm" variant="ghost" disabled={archive.isPending}
                    onClick={() => window.confirm("Arquivar este objetivo?") && archive.mutate(v.objective.id, {
                      onSuccess: () => toast.success("Objetivo arquivado"),
                      onError: (e) => toast.error(e instanceof Error ? e.message : "Erro ao arquivar"),
                    })}><Archive className="h-3.5 w-3.5 mr-1" /> Arquivar</Button>
                </div>
              )}
            </li>
          ))}
        </ul>
      </div>
      {editing && (
        <ObjectiveDialog period={period} periodStart={data.start} indicators={eligible}
          objective={editing === "new" ? null : editing} usedIds={views.map((v) => v.objective.indicator_id)}
          onClose={() => setEditing(null)} />
      )}
    </IXCard>
  );
}

function ObjectiveDialog({ period, periodStart, indicators, objective, usedIds, onClose }: {
  period: BgiPeriod; periodStart: string; indicators: IndicatorDefinition[]; objective: BgiObjective | null; usedIds: string[]; onClose: () => void;
}) {
  const { upsert } = useBgiObjectives(period, periodStart);
  const options = indicators.filter((i) => objective?.indicator_id === i.id || !usedIds.includes(i.id));
  const [indicatorId, setIndicatorId] = useState(objective?.indicator_id ?? options[0]?.id ?? "");
  const [target, setTarget] = useState(objective ? String(objective.target_value) : "");
  const [direction, setDirection] = useState<"gte" | "lte">(objective?.direction ?? "gte");
  const [notes, setNotes] = useState(objective?.notes ?? "");
  const [err, setErr] = useState<string | null>(null);

  const submit = () => {
    const parsed = objectiveSchema.safeParse({ indicator_id: indicatorId, target_value: Number(target.replace(",", ".")), direction, notes });
    if (!parsed.success || !target.trim()) { setErr(parsed.success ? "Indique o alvo" : parsed.error.issues[0].message); return; }
    setErr(null);
    upsert.mutate({ ...parsed.data, id: objective?.id }, {
      onSuccess: () => { toast.success("Objetivo guardado"); onClose(); },
      onError: (e) => setErr(e instanceof Error ? e.message : "Erro ao guardar"),
    });
  };

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{objective ? "Editar objetivo" : "Novo objetivo"}</DialogTitle>
          <DialogDescription>Período a partir de {periodStart}. O valor real é calculado automaticamente.</DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="obj-ind">Indicador</Label>
            <Select value={indicatorId} onValueChange={setIndicatorId} disabled={!!objective}>
              <SelectTrigger id="obj-ind"><SelectValue placeholder="Escolha um indicador" /></SelectTrigger>
              <SelectContent>{options.map((i) => <SelectItem key={i.id} value={i.id}>{i.name}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="obj-dir">Tipo</Label>
              <Select value={direction} onValueChange={(v) => setDirection(v as "gte" | "lte")}>
                <SelectTrigger id="obj-dir"><SelectValue /></SelectTrigger>
                <SelectContent><SelectItem value="gte">Pelo menos</SelectItem><SelectItem value="lte">No máximo</SelectItem></SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="obj-target">Alvo</Label>
              <Input id="obj-target" inputMode="decimal" value={target} onChange={(e) => setTarget(e.target.value)} />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="obj-notes">Nota (opcional)</Label>
            <Textarea id="obj-notes" maxLength={500} value={notes} onChange={(e) => setNotes(e.target.value)} />
          </div>
          {err && <p role="alert" className="text-sm text-destructive">{err}</p>}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancelar</Button>
          <Button onClick={submit} disabled={upsert.isPending || !indicatorId}>
            {upsert.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Guardar"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
