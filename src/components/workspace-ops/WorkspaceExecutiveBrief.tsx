import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { CheckCircle, AlertTriangle, ShieldAlert, TrendingUp, Zap, Lock } from 'lucide-react';

interface Props {
  state: any;
  missions: any[];
  alerts: any[];
}

const SUB_SCORE_LABELS: Record<string, string> = {
  revenue_health: 'Receita',
  pipeline_health: 'Pipeline',
  execution_health: 'Execução',
  response_health: 'Resposta',
  context_health: 'Contexto',
  automation_health: 'Automação',
};

export function WorkspaceExecutiveBrief({ state, missions, alerts }: Props) {
  if (!state) return null;

  const subScores = Object.entries(SUB_SCORE_LABELS).map(([key, label]) => ({
    key, label, value: state[key] ?? 50,
  }));

  const healthy = subScores.filter(s => s.value >= 70);
  const atRisk = subScores.filter(s => s.value < 50);
  const criticalAlerts = alerts.filter(a => a.severity === 'high' || a.severity === 'critical');
  const topMission = missions.sort((a: any, b: any) => (b.impact_estimate || 0) - (a.impact_estimate || 0))[0];
  const staleItems = [...missions.filter((m: any) => {
    if (m.status === 'completed' || m.status === 'cancelled') return false;
    const age = Date.now() - new Date(m.created_at).getTime();
    return age > 48 * 60 * 60 * 1000;
  }), ...alerts.filter((a: any) => {
    if (a.status === 'resolved') return false;
    const age = Date.now() - new Date(a.created_at).getTime();
    return age > 48 * 60 * 60 * 1000;
  })];

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Briefing Executivo</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {healthy.length > 0 && (
          <div>
            <div className="flex items-center gap-2 text-sm font-medium text-green-600 mb-1">
              <CheckCircle className="h-4 w-4" /> A correr bem
            </div>
            <div className="flex flex-wrap gap-1.5">
              {healthy.map(s => (
                <Badge key={s.key} variant="outline" className="text-green-700 border-green-300 bg-green-50">
                  {s.label}: {s.value}
                </Badge>
              ))}
            </div>
          </div>
        )}

        {atRisk.length > 0 && (
          <div>
            <div className="flex items-center gap-2 text-sm font-medium text-destructive mb-1">
              <AlertTriangle className="h-4 w-4" /> Em risco
            </div>
            <div className="flex flex-wrap gap-1.5">
              {atRisk.map(s => (
                <Badge key={s.key} variant="outline" className="text-destructive border-destructive/30 bg-destructive/5">
                  {s.label}: {s.value}
                </Badge>
              ))}
            </div>
          </div>
        )}

        {criticalAlerts.length > 0 && (
          <div>
            <div className="flex items-center gap-2 text-sm font-medium text-orange-600 mb-1">
              <ShieldAlert className="h-4 w-4" /> Requer ação humana ({criticalAlerts.length})
            </div>
            <ul className="text-sm text-muted-foreground space-y-0.5 pl-6 list-disc">
              {criticalAlerts.slice(0, 3).map((a: any) => <li key={a.id}>{a.title}</li>)}
            </ul>
          </div>
        )}

        {topMission && (
          <div>
            <div className="flex items-center gap-2 text-sm font-medium text-primary mb-1">
              <TrendingUp className="h-4 w-4" /> Maior alavanca
            </div>
            <p className="text-sm text-muted-foreground">
              {topMission.title}
              {topMission.impact_estimate && <span className="ml-1 font-medium">({Number(topMission.impact_estimate).toLocaleString('pt-PT')}€)</span>}
            </p>
          </div>
        )}

        {staleItems.length > 0 && (
          <div>
            <div className="flex items-center gap-2 text-sm font-medium text-yellow-600 mb-1">
              <Lock className="h-4 w-4" /> Bloqueado há +48h ({staleItems.length})
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
