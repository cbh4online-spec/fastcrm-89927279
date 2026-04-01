import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Progress } from '@/components/ui/progress';
import { FlaskConical, Plus, Trophy, Trash2, Play, BarChart3 } from 'lucide-react';
import { useCampaignExperiments } from '@/hooks/useCampaignExperiments';
import { EXPERIMENT_TYPE_LABELS, EVALUATION_METRIC_LABELS } from '@/types/marketing';
import type { ExperimentType, EvaluationMetric } from '@/types/marketing';

interface Props {
  campaignId: string;
}

export function ExperimentPanel({ campaignId }: Props) {
  const {
    experiments, variants, isLoading,
    createExperiment, deleteExperiment, startExperiment, declareWinner,
    getVariantsForExperiment, canAutoWin, getBestVariant,
  } = useCampaignExperiments(campaignId);

  const [showCreate, setShowCreate] = useState(false);
  const [expType, setExpType] = useState<ExperimentType>('subject');
  const [metric, setMetric] = useState<EvaluationMetric>('open_rate');
  const [minSample, setMinSample] = useState(100);
  const [variantLabels, setVariantLabels] = useState(['A', 'B']);

  const handleCreate = () => {
    const split = Math.floor(100 / variantLabels.length);
    createExperiment.mutate({
      baseCampaignId: campaignId,
      experimentType: expType,
      evaluationMetric: metric,
      minSampleSize: minSample,
      variants: variantLabels.map((label, i) => ({
        label,
        trafficSplit: i === variantLabels.length - 1 ? 100 - split * (variantLabels.length - 1) : split,
      })),
    }, { onSuccess: () => setShowCreate(false) });
  };

  const statusColors: Record<string, string> = {
    draft: 'bg-muted text-muted-foreground',
    running: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
    completed: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
    cancelled: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200',
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2">
            <FlaskConical className="h-4 w-4 text-primary" />
            Testes A/B
          </CardTitle>
          <Dialog open={showCreate} onOpenChange={setShowCreate}>
            <DialogTrigger asChild>
              <Button size="sm" variant="outline">
                <Plus className="h-3 w-3 mr-1" /> Novo Teste
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Criar Experiência</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label>Tipo de Teste</Label>
                  <Select value={expType} onValueChange={(v) => setExpType(v as ExperimentType)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {Object.entries(EXPERIMENT_TYPE_LABELS).map(([k, v]) => (
                        <SelectItem key={k} value={k}>{v}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Métrica de Avaliação</Label>
                  <Select value={metric} onValueChange={(v) => setMetric(v as EvaluationMetric)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {Object.entries(EVALUATION_METRIC_LABELS).map(([k, v]) => (
                        <SelectItem key={k} value={k}>{v}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Amostra mínima por variante</Label>
                  <Input type="number" value={minSample} onChange={(e) => setMinSample(Number(e.target.value))} min={50} />
                </div>

                <div className="space-y-2">
                  <Label>Variantes ({variantLabels.length})</Label>
                  <div className="flex gap-2 flex-wrap">
                    {variantLabels.map((l, i) => (
                      <div key={i} className="flex items-center gap-1">
                        <Input
                          className="w-16 h-8 text-sm"
                          value={l}
                          onChange={(e) => {
                            const next = [...variantLabels];
                            next[i] = e.target.value;
                            setVariantLabels(next);
                          }}
                        />
                        {variantLabels.length > 2 && (
                          <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => setVariantLabels(variantLabels.filter((_, j) => j !== i))}>
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        )}
                      </div>
                    ))}
                    {variantLabels.length < 4 && (
                      <Button variant="outline" size="sm" className="h-8" onClick={() => setVariantLabels([...variantLabels, String.fromCharCode(65 + variantLabels.length)])}>
                        <Plus className="h-3 w-3" />
                      </Button>
                    )}
                  </div>
                </div>

                <Button onClick={handleCreate} disabled={createExperiment.isPending} className="w-full">
                  Criar Experiência
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </CardHeader>
      <CardContent>
        {experiments.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-4">
            Sem testes configurados. Cria uma experiência para comparar variantes.
          </p>
        ) : (
          <div className="space-y-4">
            {experiments.map((exp) => {
              const expVariants = getVariantsForExperiment(exp.id);
              const best = getBestVariant(exp);
              const autoReady = canAutoWin(exp);

              return (
                <div key={exp.id} className="border rounded-lg p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Badge className={statusColors[exp.status] || ''}>
                        {exp.status === 'draft' ? 'Rascunho' : exp.status === 'running' ? 'A Correr' : exp.status === 'completed' ? 'Concluído' : 'Cancelado'}
                      </Badge>
                      <span className="text-sm font-medium">{EXPERIMENT_TYPE_LABELS[exp.experimentType]}</span>
                      <span className="text-xs text-muted-foreground">· {EVALUATION_METRIC_LABELS[exp.evaluationMetric]}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      {exp.status === 'draft' && (
                        <Button size="sm" variant="outline" onClick={() => startExperiment.mutate(exp.id)}>
                          <Play className="h-3 w-3 mr-1" /> Iniciar
                        </Button>
                      )}
                      {exp.status === 'running' && autoReady && best && (
                        <Button size="sm" variant="default" onClick={() => declareWinner.mutate({ experimentId: exp.id, variantId: best.id })}>
                          <Trophy className="h-3 w-3 mr-1" /> Declarar Vencedora
                        </Button>
                      )}
                      <Button size="icon" variant="ghost" className="h-7 w-7 text-destructive" onClick={() => deleteExperiment.mutate(exp.id)}>
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>

                  {/* Variants */}
                  <div className="space-y-2">
                    {expVariants.map((v) => {
                      const isWinner = exp.winningVariantId === v.id;
                      const metricValue = exp.evaluationMetric === 'open_rate' ? v.openRate
                        : exp.evaluationMetric === 'click_rate' ? v.clickRate
                        : exp.evaluationMetric === 'conversion_rate' ? v.conversionRate
                        : v.revenueAttributed;
                      const maxMetric = Math.max(...expVariants.map(vv =>
                        exp.evaluationMetric === 'open_rate' ? vv.openRate
                        : exp.evaluationMetric === 'click_rate' ? vv.clickRate
                        : exp.evaluationMetric === 'conversion_rate' ? vv.conversionRate
                        : vv.revenueAttributed
                      ), 1);

                      return (
                        <div key={v.id} className={`flex items-center gap-3 p-2 rounded ${isWinner ? 'bg-green-50 dark:bg-green-950/20 border border-green-200 dark:border-green-800' : 'bg-muted/30'}`}>
                          <div className="w-8 text-center">
                            {isWinner ? <Trophy className="h-4 w-4 text-green-600 mx-auto" /> : (
                              <span className="text-sm font-bold text-muted-foreground">{v.variantLabel}</span>
                            )}
                          </div>
                          <div className="flex-1">
                            <div className="flex items-center justify-between text-xs mb-1">
                              <span>{v.trafficSplit}% tráfego · {v.sampleSize} amostras</span>
                              <span className="font-medium">
                                {exp.evaluationMetric === 'revenue_attributed' ? `€${metricValue.toFixed(0)}` : `${metricValue.toFixed(1)}%`}
                              </span>
                            </div>
                            <Progress value={(metricValue / maxMetric) * 100} className="h-2" />
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {exp.status === 'running' && !autoReady && (
                    <p className="text-[11px] text-muted-foreground flex items-center gap-1">
                      <BarChart3 className="h-3 w-3" />
                      A aguardar amostra mínima de {exp.minSampleSize} por variante
                    </p>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
