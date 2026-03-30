import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  useObjectiveDetail,
  useGeneratePlan,
  useExecutePlan,
  useRecalculateProgress,
  useUpdateObjective,
  OBJECTIVE_TYPES,
} from "@/hooks/useBusinessObjectives";
import {
  Target,
  Play,
  RefreshCw,
  Pause,
  CheckCircle2,
  Zap,
  FileText,
  Link2,
  Loader2,
  AlertTriangle,
  TrendingUp,
} from "lucide-react";

interface Props {
  objectiveId: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const STATUS_CONFIG: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
  draft: { label: "Rascunho", variant: "secondary" },
  active: { label: "Ativo", variant: "default" },
  on_track: { label: "No Caminho", variant: "default" },
  at_risk: { label: "Em Risco", variant: "destructive" },
  completed: { label: "Concluído", variant: "outline" },
  paused: { label: "Pausado", variant: "secondary" },
  cancelled: { label: "Cancelado", variant: "secondary" },
};

export function ObjectiveDetail({ objectiveId, open, onOpenChange }: Props) {
  const { objective, metrics, plans, actionLinks, isLoading } = useObjectiveDetail(objectiveId);
  const generatePlan = useGeneratePlan();
  const executePlan = useExecutePlan();
  const recalculate = useRecalculateProgress();
  const updateObj = useUpdateObjective();

  if (!objectiveId) return null;

  const progress = objective?.target_value
    ? Math.min(100, Math.round(((Number(objective.current_value) || 0) / Number(objective.target_value)) * 100))
    : 0;

  const typeLabel = OBJECTIVE_TYPES.find(t => t.value === objective?.objective_type)?.label || objective?.objective_type;
  const statusCfg = STATUS_CONFIG[objective?.status || "draft"] || STATUS_CONFIG.draft;
  const activePlan = plans.find(p => p.status === "active");
  const isProcessing = generatePlan.isPending || executePlan.isPending || recalculate.isPending;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="sm:max-w-lg w-full">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            <Target className="h-5 w-5 text-primary" />
            {isLoading ? "A carregar..." : objective?.title}
          </SheetTitle>
        </SheetHeader>

        {objective && (
          <ScrollArea className="h-[calc(100vh-8rem)] pr-2 mt-4">
            <div className="space-y-6">
              {/* Status & Type */}
              <div className="flex items-center gap-2 flex-wrap">
                <Badge variant={statusCfg.variant}>{statusCfg.label}</Badge>
                <Badge variant="outline">{typeLabel}</Badge>
                <Badge variant="outline">{objective.priority}</Badge>
              </div>

              {objective.description && (
                <p className="text-sm text-muted-foreground">{objective.description}</p>
              )}

              {/* Progress */}
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="font-medium">Progresso</span>
                  <span>{Number(objective.current_value || 0).toLocaleString()} / {Number(objective.target_value || 0).toLocaleString()} {objective.unit}</span>
                </div>
                <Progress value={progress} className="h-3" />
                <p className="text-xs text-muted-foreground text-right">{progress}%</p>
              </div>

              {/* Period */}
              {(objective.period_start || objective.period_end) && (
                <div className="flex gap-4 text-sm text-muted-foreground">
                  {objective.period_start && <span>Início: {new Date(objective.period_start).toLocaleDateString("pt-PT")}</span>}
                  {objective.period_end && <span>Fim: {new Date(objective.period_end).toLocaleDateString("pt-PT")}</span>}
                </div>
              )}

              {/* Actions */}
              <div className="flex flex-wrap gap-2">
                <Button
                  size="sm"
                  onClick={() => generatePlan.mutate(objectiveId!)}
                  disabled={isProcessing}
                >
                  {generatePlan.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <Zap className="h-4 w-4 mr-1" />}
                  Gerar Plano
                </Button>
                {activePlan && (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => executePlan.mutate(objectiveId!)}
                    disabled={isProcessing}
                  >
                    {executePlan.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <Play className="h-4 w-4 mr-1" />}
                    Executar Plano
                  </Button>
                )}
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => recalculate.mutate(objectiveId!)}
                  disabled={isProcessing}
                >
                  {recalculate.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <RefreshCw className="h-4 w-4 mr-1" />}
                  Recalcular
                </Button>
                {["active", "on_track", "at_risk"].includes(objective.status) && (
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => updateObj.mutate({ id: objectiveId!, status: "paused" })}
                  >
                    <Pause className="h-4 w-4 mr-1" />
                    Pausar
                  </Button>
                )}
                {objective.status !== "completed" && (
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => updateObj.mutate({ id: objectiveId!, status: "completed", completed_at: new Date().toISOString() })}
                  >
                    <CheckCircle2 className="h-4 w-4 mr-1" />
                    Concluir
                  </Button>
                )}
              </div>

              <Separator />

              {/* Metrics */}
              {metrics.length > 0 && (
                <div className="space-y-3">
                  <h4 className="text-sm font-semibold flex items-center gap-1">
                    <TrendingUp className="h-4 w-4" /> Métricas
                  </h4>
                  {metrics.map(m => (
                    <div key={m.id} className="space-y-1">
                      <div className="flex justify-between text-sm">
                        <span>{m.metric_label || m.metric_key}</span>
                        <span>{Number(m.current_value || 0).toLocaleString()} / {Number(m.target_value || 0).toLocaleString()} {m.unit}</span>
                      </div>
                      <Progress value={m.progress_percent || 0} className="h-2" />
                    </div>
                  ))}
                </div>
              )}

              {/* Active Plan */}
              {activePlan && (
                <div className="space-y-3">
                  <h4 className="text-sm font-semibold flex items-center gap-1">
                    <FileText className="h-4 w-4" /> Plano Ativo
                  </h4>
                  {(activePlan.plan_json?.initiatives || []).map((init: any, i: number) => (
                    <div key={i} className="bg-muted/50 rounded-lg p-3 space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium">{init.title}</span>
                        <Badge variant="outline" className="text-xs">{init.priority}</Badge>
                      </div>
                      {init.description && (
                        <p className="text-xs text-muted-foreground">{init.description}</p>
                      )}
                      <div className="text-xs text-muted-foreground">
                        {(init.action_groups || []).length} ações planeadas
                      </div>
                    </div>
                  ))}
                  {activePlan.plan_json?.summary && (
                    <p className="text-xs text-muted-foreground italic">{activePlan.plan_json.summary}</p>
                  )}
                </div>
              )}

              {/* Action Links */}
              <div className="space-y-3">
                <h4 className="text-sm font-semibold flex items-center gap-1">
                  <Link2 className="h-4 w-4" /> Ações Ligadas ({actionLinks.length})
                </h4>
                {actionLinks.length === 0 ? (
                  <p className="text-xs text-muted-foreground">Nenhuma ação ligada a este objetivo.</p>
                ) : (
                  <div className="space-y-1">
                    {actionLinks.slice(0, 20).map(link => (
                      <div key={link.id} className="flex justify-between items-center text-xs bg-muted/30 rounded p-2">
                        <span className="truncate">
                          {link.action_execution_id ? `Execução` : link.task_id ? `Tarefa` : "Link"}
                        </span>
                        <span className="text-muted-foreground">
                          +{Number(link.attributed_value || 0).toLocaleString()} {objective.unit}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </ScrollArea>
        )}
      </SheetContent>
    </Sheet>
  );
}
