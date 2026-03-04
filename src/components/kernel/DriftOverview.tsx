import { useDriftScores } from '@/hooks/useDriftScores';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Activity, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { useWorkspace } from '@/contexts/WorkspaceContext';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { useState } from 'react';

function severityFromScore(score: number) {
  if (score < 15) return { label: 'Ok', color: 'text-chart-2' };
  if (score < 40) return { label: 'Atenção', color: 'text-chart-2' };
  if (score < 70) return { label: 'Risco', color: 'text-chart-4' };
  return { label: 'Crítico', color: 'text-destructive' };
}

export function DriftOverview() {
  const { workspaceScore, scores, isLoading } = useDriftScores();
  const { currentWorkspace } = useWorkspace();
  const queryClient = useQueryClient();
  const [computing, setComputing] = useState(false);

  const severity = severityFromScore(workspaceScore);
  const assetScores = scores?.filter(s => s.scope_type === 'asset').slice(0, 5) ?? [];

  const handleRecompute = async () => {
    if (!currentWorkspace?.id) return;
    setComputing(true);
    try {
      await supabase.functions.invoke('kernel-compute-drift', {
        body: { workspace_id: currentWorkspace.id },
      });
      queryClient.invalidateQueries({ queryKey: ['drift-scores'] });
      toast.success('Drift recalculado');
    } catch {
      toast.error('Erro ao recalcular drift');
    } finally {
      setComputing(false);
    }
  };

  if (isLoading) {
    return <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />;
  }

  return (
    <Card className="border-border/30">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <Activity className="h-4 w-4 text-primary" />
            Drift do Workspace
          </CardTitle>
          <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={handleRecompute} disabled={computing}>
            {computing ? <Loader2 className="h-3 w-3 animate-spin" /> : 'Recalcular'}
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex items-center gap-3">
          <span className={`text-2xl font-bold ${severity.color}`}>{workspaceScore}</span>
          <div className="flex-1">
            <Progress value={workspaceScore} className="h-2" />
          </div>
          <Badge variant="outline" className={`text-[10px] ${severity.color}`}>{severity.label}</Badge>
        </div>

        {assetScores.length > 0 && (
          <div className="space-y-1.5 pt-2 border-t border-border/20">
            <p className="text-[10px] text-muted-foreground font-medium uppercase tracking-wide">Top Assets em Risco</p>
            {assetScores.map(s => (
              <div key={s.id} className="flex items-center justify-between text-xs">
                <span className="truncate text-muted-foreground">{s.scope_kind}/{s.scope_id.slice(0, 8)}</span>
                <span className={`font-medium ${severityFromScore(s.score).color}`}>{s.score}</span>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
