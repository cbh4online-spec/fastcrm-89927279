import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useWorkspace } from '@/contexts/WorkspaceContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Clock, Zap } from 'lucide-react';
import { toast } from 'sonner';

const DAYS = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
const HOURS = Array.from({ length: 24 }, (_, i) => i);

export function SendTimeOptimizer() {
  const { currentWorkspace } = useWorkspace();

  const { data: heatmapData } = useQuery({
    queryKey: ['send-time-heatmap', currentWorkspace?.id],
    queryFn: async () => {
      if (!currentWorkspace?.id) return null;

      const { data: events } = await supabase
        .from('marketing_events')
        .select('occurred_at, event_type')
        .eq('workspace_id', currentWorkspace.id)
        .in('event_type', ['open', 'clicked'])
        .order('occurred_at', { ascending: false })
        .limit(5000);

      if (!events || events.length === 0) return null;

      // Build 7x24 grid
      const grid: number[][] = Array.from({ length: 7 }, () => Array(24).fill(0));
      events.forEach(e => {
        const d = new Date(e.occurred_at);
        grid[d.getDay()][d.getHours()]++;
      });

      // Find best window
      let bestDay = 0, bestHour = 0, bestVal = 0;
      for (let d = 0; d < 7; d++) {
        for (let h = 0; h < 24; h++) {
          if (grid[d][h] > bestVal) {
            bestVal = grid[d][h];
            bestDay = d;
            bestHour = h;
          }
        }
      }

      const maxVal = Math.max(...grid.flat(), 1);
      return { grid, maxVal, bestDay, bestHour, bestVal, totalEvents: events.length };
    },
    enabled: !!currentWorkspace?.id,
  });

  if (!heatmapData) {
    return (
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <Clock className="h-4 w-4 text-primary" />
            Otimização de Horário
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-xs text-muted-foreground">Sem dados suficientes. Envie campanhas para gerar análise.</p>
        </CardContent>
      </Card>
    );
  }

  const getColor = (val: number) => {
    const intensity = val / heatmapData.maxVal;
    if (intensity === 0) return 'bg-muted/30';
    if (intensity < 0.25) return 'bg-primary/10';
    if (intensity < 0.5) return 'bg-primary/25';
    if (intensity < 0.75) return 'bg-primary/50';
    return 'bg-primary/80';
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <Clock className="h-4 w-4 text-primary" />
            Heatmap de Engagement
          </CardTitle>
          <Badge variant="outline" className="text-xs gap-1">
            <Zap className="h-3 w-3" />
            {heatmapData.totalEvents} eventos
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {/* Best window */}
        <div className="p-3 rounded-lg bg-primary/5 border border-primary/20">
          <p className="text-xs font-medium">
            🏆 Melhor janela: <strong>{DAYS[heatmapData.bestDay]} às {heatmapData.bestHour}h</strong>
          </p>
          <p className="text-[11px] text-muted-foreground mt-1">
            {heatmapData.bestVal} interações nesta janela — baseado em {heatmapData.totalEvents} eventos reais
          </p>
        </div>

        {/* Heatmap */}
        <div className="overflow-x-auto">
          <div className="min-w-[500px]">
            {/* Hour labels */}
            <div className="flex gap-px ml-10 mb-1">
              {HOURS.filter(h => h % 3 === 0).map(h => (
                <div key={h} className="text-[9px] text-muted-foreground" style={{ width: `${100 / 8}%` }}>
                  {h}h
                </div>
              ))}
            </div>

            {/* Grid */}
            {DAYS.map((day, d) => (
              <div key={d} className="flex items-center gap-px mb-px">
                <span className="text-[10px] text-muted-foreground w-10 text-right pr-2">{day}</span>
                {HOURS.map(h => (
                  <div
                    key={h}
                    className={`flex-1 h-4 rounded-sm ${getColor(heatmapData.grid[d][h])} ${d === heatmapData.bestDay && h === heatmapData.bestHour ? 'ring-1 ring-primary' : ''}`}
                    title={`${day} ${h}h: ${heatmapData.grid[d][h]} interações`}
                  />
                ))}
              </div>
            ))}
          </div>
        </div>

        {/* Legend */}
        <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
          <span>Menos</span>
          <div className="flex gap-px">
            {['bg-muted/30', 'bg-primary/10', 'bg-primary/25', 'bg-primary/50', 'bg-primary/80'].map((c, i) => (
              <div key={i} className={`w-3 h-3 rounded-sm ${c}`} />
            ))}
          </div>
          <span>Mais</span>
        </div>
      </CardContent>
    </Card>
  );
}
