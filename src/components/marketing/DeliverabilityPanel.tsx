import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { ShieldCheck, AlertTriangle, TrendingUp, TrendingDown } from 'lucide-react';

interface Props {
  campaignId: string;
  sentCount: number;
  deliveredCount: number;
  openedCount: number;
  clickedCount: number;
  bouncedCount: number;
  complainedCount: number;
  unsubscribedCount: number;
}

export function DeliverabilityPanel({
  campaignId,
  sentCount,
  deliveredCount,
  openedCount,
  clickedCount,
  bouncedCount,
  complainedCount,
  unsubscribedCount,
}: Props) {
  // Compute metrics
  const deliveredRate = sentCount > 0 ? ((sentCount - bouncedCount) / sentCount) * 100 : 0;
  const openRate = sentCount > 0 ? (openedCount / sentCount) * 100 : 0;
  const bounceRate = sentCount > 0 ? (bouncedCount / sentCount) * 100 : 0;
  const spamRate = sentCount > 0 ? (complainedCount / sentCount) * 100 : 0;
  const unsubRate = sentCount > 0 ? (unsubscribedCount / sentCount) * 100 : 0;

  // Sender score (0-100)
  const bounceScore = Math.max(0, 100 - bounceRate * 10); // 40% weight
  const spamScore = Math.max(0, 100 - spamRate * 100); // 40% weight
  const unsubScore = Math.max(0, 100 - unsubRate * 20); // 20% weight
  const senderScore = Math.round(bounceScore * 0.4 + spamScore * 0.4 + unsubScore * 0.2);

  const scoreColor = senderScore >= 80 ? 'text-emerald-600' : senderScore >= 60 ? 'text-amber-600' : 'text-red-600';
  const scoreBarColor = senderScore >= 80 ? 'bg-emerald-500' : senderScore >= 60 ? 'bg-amber-500' : 'bg-red-500';

  const metrics = [
    {
      label: 'Taxa de entrega',
      value: `${deliveredRate.toFixed(1)}%`,
      benchmark: '95%+',
      isGood: deliveredRate >= 95,
    },
    {
      label: 'Taxa de abertura',
      value: `${openRate.toFixed(1)}%`,
      benchmark: '20-25%',
      isGood: openRate >= 20,
    },
    {
      label: 'Taxa de bounce',
      value: `${bounceRate.toFixed(1)}%`,
      benchmark: '<5%',
      isGood: bounceRate < 5,
    },
    {
      label: 'Taxa de spam',
      value: `${spamRate.toFixed(2)}%`,
      benchmark: '<0.1%',
      isGood: spamRate < 0.1,
      isWarning: spamRate >= 0.1,
    },
  ];

  return (
    <div className="space-y-4">
      {/* Metrics grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {metrics.map((m) => (
          <Card key={m.label}>
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-1">
                <p className="text-xs text-muted-foreground">{m.label}</p>
                {m.isWarning && <AlertTriangle className="h-3 w-3 text-red-500" />}
              </div>
              <p className="text-2xl font-bold">{m.value}</p>
              <div className="flex items-center gap-1 mt-1">
                {m.isGood ? (
                  <TrendingUp className="h-3 w-3 text-emerald-500" />
                ) : (
                  <TrendingDown className="h-3 w-3 text-amber-500" />
                )}
                <span className="text-[10px] text-muted-foreground">Benchmark: {m.benchmark}</span>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Sender Score */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            <ShieldCheck className="h-4 w-4 text-primary" />
            Sender Score
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-center gap-4">
            <span className={`text-4xl font-bold ${scoreColor}`}>{senderScore}</span>
            <div className="flex-1">
              <Progress value={senderScore} className="h-3" />
            </div>
            <Badge variant={senderScore >= 80 ? 'default' : senderScore >= 60 ? 'secondary' : 'destructive'}>
              {senderScore >= 80 ? 'Bom' : senderScore >= 60 ? 'Médio' : 'Baixo'}
            </Badge>
          </div>

          {senderScore < 70 && (
            <div className="p-3 bg-amber-50 dark:bg-amber-950/20 rounded-lg text-sm space-y-1">
              <p className="font-medium text-amber-700 dark:text-amber-400">Como melhorar:</p>
              {bounceRate >= 5 && (
                <p className="text-xs text-amber-600">• Validar a lista de emails antes do envio</p>
              )}
              {spamRate >= 0.1 && (
                <p className="text-xs text-amber-600">• Rever o conteúdo para evitar marcações de spam</p>
              )}
              {unsubRate >= 2 && (
                <p className="text-xs text-amber-600">• Segmentar melhor a audiência</p>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
