import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { BarChart3, Trophy, AlertTriangle, TrendingUp, Clock } from 'lucide-react';
import { useCampaignBenchmarks } from '@/hooks/useCampaignBenchmarks';
import { useState } from 'react';

export function BenchmarkScorecard() {
  const [period, setPeriod] = useState(30);
  const { benchmarks, isLoading } = useCampaignBenchmarks(period);

  if (!benchmarks) {
    return (
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <BarChart3 className="h-4 w-4 text-primary" />
            Benchmarks
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-xs text-muted-foreground text-center py-4">
            Sem dados suficientes para gerar benchmarks.
          </p>
        </CardContent>
      </Card>
    );
  }

  const ws = benchmarks.workspace;

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <BarChart3 className="h-4 w-4 text-primary" />
            Scorecard de Performance
          </CardTitle>
          <Select value={String(period)} onValueChange={(v) => setPeriod(Number(v))}>
            <SelectTrigger className="w-24 h-7 text-xs"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="30">30 dias</SelectItem>
              <SelectItem value="90">90 dias</SelectItem>
              <SelectItem value="180">180 dias</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Workspace averages */}
        <div className="grid grid-cols-3 gap-3">
          <div className="text-center p-3 rounded-lg bg-muted/50">
            <div className="text-lg font-bold">{ws.avgOpenRate.toFixed(1)}%</div>
            <div className="text-[10px] text-muted-foreground">Abertura Média</div>
          </div>
          <div className="text-center p-3 rounded-lg bg-muted/50">
            <div className="text-lg font-bold">{ws.avgClickRate.toFixed(1)}%</div>
            <div className="text-[10px] text-muted-foreground">Cliques Médios</div>
          </div>
          <div className="text-center p-3 rounded-lg bg-muted/50">
            <div className="text-lg font-bold">{ws.totalCampaigns}</div>
            <div className="text-[10px] text-muted-foreground">Campanhas</div>
          </div>
        </div>

        {/* Top Campaigns */}
        {benchmarks.topCampaigns.length > 0 && (
          <div>
            <h4 className="text-xs font-medium text-muted-foreground mb-2 flex items-center gap-1">
              <Trophy className="h-3 w-3 text-amber-500" /> Melhores Campanhas
            </h4>
            <div className="space-y-1">
              {benchmarks.topCampaigns.slice(0, 3).map((c: any, i: number) => (
                <div key={c.id} className="flex items-center justify-between text-xs p-2 rounded bg-muted/30">
                  <span className="truncate flex-1">{c.name}</span>
                  <Badge variant="outline" className="text-[10px] ml-2">{c.openRate.toFixed(1)}% abertura</Badge>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Worst Campaigns */}
        {benchmarks.worstCampaigns.length > 0 && (
          <div>
            <h4 className="text-xs font-medium text-muted-foreground mb-2 flex items-center gap-1">
              <AlertTriangle className="h-3 w-3 text-red-500" /> A Melhorar
            </h4>
            <div className="space-y-1">
              {benchmarks.worstCampaigns.slice(0, 3).map((c: any, i: number) => (
                <div key={c.id} className="flex items-center justify-between text-xs p-2 rounded bg-muted/30">
                  <span className="truncate flex-1">{c.name}</span>
                  <Badge variant="outline" className="text-[10px] ml-2 text-red-600">{c.openRate.toFixed(1)}% abertura</Badge>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Best Hours */}
        {benchmarks.bestHours.length > 0 && (
          <div>
            <h4 className="text-xs font-medium text-muted-foreground mb-2 flex items-center gap-1">
              <Clock className="h-3 w-3 text-blue-500" /> Melhores Horários
            </h4>
            <div className="flex gap-2">
              {benchmarks.bestHours.map((h: any, i: number) => (
                <Badge key={i} variant="outline" className="text-xs">
                  {h.hour}h — {h.openRate.toFixed(1)}%
                </Badge>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
