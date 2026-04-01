import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Sparkles, Check, X, RefreshCw, AlertTriangle, Users, Clock } from 'lucide-react';
import { useAIRecommendations } from '@/hooks/useAIRecommendations';
import type { AICampaignRecommendation } from '@/types/marketing';

interface Props {
  campaignId?: string;
}

const TYPE_LABELS: Record<string, { label: string; icon: React.ReactNode }> = {
  subject: { label: 'Assunto', icon: <Sparkles className="h-3 w-3" /> },
  preview_text: { label: 'Preview', icon: <Sparkles className="h-3 w-3" /> },
  cta: { label: 'CTA', icon: <Sparkles className="h-3 w-3" /> },
  body: { label: 'Conteúdo', icon: <Sparkles className="h-3 w-3" /> },
  segment: { label: 'Segmento', icon: <Users className="h-3 w-3" /> },
  send_time: { label: 'Horário', icon: <Clock className="h-3 w-3" /> },
  spam_risk: { label: 'Risco Spam', icon: <AlertTriangle className="h-3 w-3" /> },
};

export function AIOptimizationPanel({ campaignId }: Props) {
  const { recommendations, isLoading, acceptRecommendation, dismissRecommendation, generateRecommendation } = useAIRecommendations(campaignId);

  const pending = recommendations.filter(r => r.status === 'pending');
  const history = recommendations.filter(r => r.status !== 'pending').slice(0, 5);

  const handleGenerate = (action: string) => {
    generateRecommendation.mutate({ action, campaignId });
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-primary" />
            Otimização com IA
          </CardTitle>
          <div className="flex gap-1">
            <Button size="sm" variant="outline" onClick={() => handleGenerate('optimize_campaign')} disabled={generateRecommendation.isPending}>
              <RefreshCw className={`h-3 w-3 mr-1 ${generateRecommendation.isPending ? 'animate-spin' : ''}`} />
              Analisar
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Quick Actions */}
        <div className="flex gap-2 flex-wrap">
          <Button size="sm" variant="outline" className="text-xs h-7" onClick={() => handleGenerate('analyze_risk')} disabled={generateRecommendation.isPending}>
            <AlertTriangle className="h-3 w-3 mr-1" /> Risco de Spam
          </Button>
          <Button size="sm" variant="outline" className="text-xs h-7" onClick={() => handleGenerate('recommend_segment')} disabled={generateRecommendation.isPending}>
            <Users className="h-3 w-3 mr-1" /> Melhor Segmento
          </Button>
          <Button size="sm" variant="outline" className="text-xs h-7" onClick={() => handleGenerate('optimize_send_time')} disabled={generateRecommendation.isPending}>
            <Clock className="h-3 w-3 mr-1" /> Melhor Horário
          </Button>
        </div>

        {/* Pending Recommendations */}
        {pending.length > 0 && (
          <div className="space-y-2">
            <h4 className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Sugestões Pendentes</h4>
            {pending.map((rec) => (
              <RecommendationCard
                key={rec.id}
                rec={rec}
                onAccept={() => acceptRecommendation.mutate(rec.id)}
                onDismiss={() => dismissRecommendation.mutate(rec.id)}
              />
            ))}
          </div>
        )}

        {pending.length === 0 && !isLoading && (
          <p className="text-sm text-muted-foreground text-center py-3">
            Clica em "Analisar" para obter sugestões da IA baseadas no histórico real.
          </p>
        )}

        {/* History */}
        {history.length > 0 && (
          <div className="space-y-2">
            <h4 className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Histórico</h4>
            {history.map((rec) => (
              <div key={rec.id} className="flex items-center gap-2 text-xs text-muted-foreground p-2 rounded bg-muted/30">
                {TYPE_LABELS[rec.recommendationType]?.icon}
                <span className="flex-1">{TYPE_LABELS[rec.recommendationType]?.label}: {rec.reasoning?.substring(0, 60) || 'Sem detalhe'}...</span>
                <Badge variant="outline" className={rec.status === 'accepted' ? 'text-green-600' : 'text-muted-foreground'}>
                  {rec.status === 'accepted' ? 'Aceite' : 'Ignorada'}
                </Badge>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function RecommendationCard({ rec, onAccept, onDismiss }: { rec: AICampaignRecommendation; onAccept: () => void; onDismiss: () => void }) {
  const typeInfo = TYPE_LABELS[rec.recommendationType] || { label: rec.recommendationType, icon: <Sparkles className="h-3 w-3" /> };
  const data = rec.recommendationData;

  return (
    <div className="border rounded-lg p-3 space-y-2">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          {typeInfo.icon}
          <Badge variant="outline" className="text-xs">{typeInfo.label}</Badge>
        </div>
        <div className="flex gap-1">
          <Button size="icon" variant="ghost" className="h-6 w-6 text-green-600" onClick={onAccept}>
            <Check className="h-3 w-3" />
          </Button>
          <Button size="icon" variant="ghost" className="h-6 w-6 text-muted-foreground" onClick={onDismiss}>
            <X className="h-3 w-3" />
          </Button>
        </div>
      </div>

      {/* Display recommendation data */}
      {data?.suggestion && (
        <p className="text-sm font-medium">{String(data.suggestion)}</p>
      )}
      {data?.variants && Array.isArray(data.variants) && (
        <ul className="text-xs space-y-1">
          {(data.variants as any[]).slice(0, 3).map((v: any, i: number) => (
            <li key={i} className="flex items-center gap-2">
              <span className="font-medium">{v.subject || v.value || v.label}</span>
              {v.score && <Badge variant="outline" className="text-[10px]">{v.score}/100</Badge>}
            </li>
          ))}
        </ul>
      )}

      {rec.reasoning && (
        <p className="text-xs text-muted-foreground italic">{rec.reasoning}</p>
      )}
    </div>
  );
}
