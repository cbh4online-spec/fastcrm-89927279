import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { BarChart3, Users, CheckCircle2, XCircle, TrendingUp } from 'lucide-react';
import { type SequenceEnrollment, type SequenceStep } from '@/hooks/useEmailSequences';

interface SequenceAnalyticsProps {
  enrollments: SequenceEnrollment[];
  steps: SequenceStep[];
}

export function SequenceAnalytics({ enrollments, steps }: SequenceAnalyticsProps) {
  const total = enrollments.length;
  const active = enrollments.filter((e) => e.status === 'active').length;
  const completed = enrollments.filter((e) => e.status === 'completed').length;
  const exited = enrollments.filter((e) => e.status === 'exited').length;
  const paused = enrollments.filter((e) => e.status === 'paused').length;

  const completionRate = total > 0 ? Math.round((completed / total) * 100) : 0;
  const exitRate = total > 0 ? Math.round((exited / total) * 100) : 0;

  // Funnel: how many contacts reached each step
  const funnelData = steps.map((step) => {
    const reached = enrollments.filter((e) => e.currentStep >= step.stepOrder).length;
    const pct = total > 0 ? Math.round((reached / total) * 100) : 0;
    return { step: step.stepOrder, label: step.subject || `Etapa ${step.stepOrder}`, reached, pct };
  });

  if (total === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        <BarChart3 className="h-10 w-10 mx-auto mb-3 opacity-50" />
        <p className="text-sm">Sem dados de analytics.</p>
        <p className="text-xs">Inscreva contactos para ver métricas.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* KPI cards */}
      <div className="grid grid-cols-2 gap-3">
        <Card className="border">
          <CardContent className="p-3 flex items-center gap-3">
            <div className="h-9 w-9 rounded-lg bg-primary/10 flex items-center justify-center">
              <Users className="h-4 w-4 text-primary" />
            </div>
            <div>
              <p className="text-xl font-bold">{total}</p>
              <p className="text-[10px] text-muted-foreground">Total inscritos</p>
            </div>
          </CardContent>
        </Card>
        <Card className="border">
          <CardContent className="p-3 flex items-center gap-3">
            <div className="h-9 w-9 rounded-lg bg-emerald-500/10 flex items-center justify-center">
              <CheckCircle2 className="h-4 w-4 text-emerald-500" />
            </div>
            <div>
              <p className="text-xl font-bold">{completionRate}%</p>
              <p className="text-[10px] text-muted-foreground">Taxa de conclusão</p>
            </div>
          </CardContent>
        </Card>
        <Card className="border">
          <CardContent className="p-3 flex items-center gap-3">
            <div className="h-9 w-9 rounded-lg bg-destructive/10 flex items-center justify-center">
              <XCircle className="h-4 w-4 text-destructive" />
            </div>
            <div>
              <p className="text-xl font-bold">{exitRate}%</p>
              <p className="text-[10px] text-muted-foreground">Taxa de saída</p>
            </div>
          </CardContent>
        </Card>
        <Card className="border">
          <CardContent className="p-3 flex items-center gap-3">
            <div className="h-9 w-9 rounded-lg bg-amber-500/10 flex items-center justify-center">
              <TrendingUp className="h-4 w-4 text-amber-500" />
            </div>
            <div>
              <p className="text-xl font-bold">{active}</p>
              <p className="text-[10px] text-muted-foreground">Ativos agora</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Status breakdown */}
      <Card className="border">
        <CardHeader className="p-3 pb-2">
          <CardTitle className="text-sm">Distribuição por Status</CardTitle>
        </CardHeader>
        <CardContent className="p-3 pt-0 space-y-2">
          {[
            { label: 'Ativos', count: active, color: 'bg-emerald-500' },
            { label: 'Concluídos', count: completed, color: 'bg-blue-500' },
            { label: 'Pausados', count: paused, color: 'bg-amber-500' },
            { label: 'Saídas', count: exited, color: 'bg-muted-foreground' },
          ].map((item) => (
            <div key={item.label} className="flex items-center gap-2">
              <div className={`h-2 w-2 rounded-full ${item.color}`} />
              <span className="text-xs flex-1">{item.label}</span>
              <span className="text-xs font-medium">{item.count}</span>
              <span className="text-[10px] text-muted-foreground w-8 text-right">
                {total > 0 ? Math.round((item.count / total) * 100) : 0}%
              </span>
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Funnel */}
      {funnelData.length > 0 && (
        <Card className="border">
          <CardHeader className="p-3 pb-2">
            <CardTitle className="text-sm">Funil por Etapa</CardTitle>
          </CardHeader>
          <CardContent className="p-3 pt-0 space-y-2">
            {funnelData.map((item) => (
              <div key={item.step} className="space-y-1">
                <div className="flex items-center justify-between text-xs">
                  <span className="truncate max-w-48">{item.label}</span>
                  <span className="text-muted-foreground">
                    {item.reached}/{total} ({item.pct}%)
                  </span>
                </div>
                <Progress value={item.pct} className="h-1.5" />
              </div>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
