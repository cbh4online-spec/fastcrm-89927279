import { useMeetingIntelligence, MeetingAIAnalysis } from '@/hooks/useMeetingIntelligence';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2, AlertTriangle, TrendingUp, Users, Target, MessageSquare, Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';

interface Props {
  recordingId: string | undefined;
}

const severityColors = {
  low: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-300',
  medium: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300',
  high: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300',
};

const strengthColors = {
  weak: 'bg-muted text-muted-foreground',
  moderate: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300',
  strong: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300',
};

const impactConfig: Record<string, { label: string; color: string; icon: typeof TrendingUp }> = {
  positive: { label: 'Positivo', color: 'text-green-600', icon: TrendingUp },
  neutral: { label: 'Neutro', color: 'text-muted-foreground', icon: Target },
  negative: { label: 'Negativo', color: 'text-red-600', icon: AlertTriangle },
};

export function MeetingIntelligencePanel({ recordingId }: Props) {
  const { analysis, isLoading } = useMeetingIntelligence(recordingId);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-32">
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!analysis) return null;

  const impact = analysis.deal_impact ? impactConfig[analysis.deal_impact] : null;

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Sparkles className="h-4 w-4 text-cyan-500" />
        <h3 className="text-sm font-semibold text-foreground">Sales Intelligence</h3>
      </div>

      {/* Top metrics row */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
        {/* Engagement Score */}
        {analysis.engagement_score != null && (
          <Card className="border-border/50">
            <CardContent className="p-3 text-center">
              <p className="text-xs text-muted-foreground">Engagement</p>
              <p className={cn(
                "text-2xl font-bold mt-1",
                analysis.engagement_score >= 70 ? "text-green-600" :
                analysis.engagement_score >= 40 ? "text-amber-600" : "text-red-600"
              )}>
                {Math.round(analysis.engagement_score)}%
              </p>
            </CardContent>
          </Card>
        )}

        {/* Deal Impact */}
        {impact && (
          <Card className="border-border/50">
            <CardContent className="p-3 text-center">
              <p className="text-xs text-muted-foreground">Impacto no Deal</p>
              <div className={cn("flex items-center justify-center gap-1 mt-1", impact.color)}>
                <impact.icon className="h-4 w-4" />
                <span className="text-sm font-semibold">{impact.label}</span>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Objections count */}
        <Card className="border-border/50">
          <CardContent className="p-3 text-center">
            <p className="text-xs text-muted-foreground">Objeções</p>
            <p className="text-2xl font-bold text-foreground mt-1">
              {analysis.objections_detected?.length || 0}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Talk Ratio */}
      {analysis.talk_ratio && Object.keys(analysis.talk_ratio).length > 0 && (
        <Card className="border-border/50">
          <CardHeader className="pb-2 px-3 pt-3">
            <CardTitle className="text-xs font-medium flex items-center gap-2">
              <Users className="h-3.5 w-3.5" />
              Talk Ratio
            </CardTitle>
          </CardHeader>
          <CardContent className="px-3 pb-3 space-y-2">
            {Object.entries(analysis.talk_ratio).map(([speaker, pct]) => (
              <div key={speaker} className="flex items-center gap-2">
                <span className="text-xs text-muted-foreground w-24 truncate">{speaker}</span>
                <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
                  <div
                    className="h-full bg-primary rounded-full transition-all"
                    style={{ width: `${Math.min(100, pct)}%` }}
                  />
                </div>
                <span className="text-xs font-medium text-foreground w-10 text-right">
                  {Math.round(pct)}%
                </span>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Objections */}
      {analysis.objections_detected && analysis.objections_detected.length > 0 && (
        <Card className="border-border/50">
          <CardHeader className="pb-2 px-3 pt-3">
            <CardTitle className="text-xs font-medium flex items-center gap-2">
              <AlertTriangle className="h-3.5 w-3.5" />
              Objeções Detetadas
            </CardTitle>
          </CardHeader>
          <CardContent className="px-3 pb-3 space-y-2">
            {analysis.objections_detected.map((obj, i) => (
              <div key={i} className="flex items-start gap-2 text-xs">
                <Badge className={cn("text-[10px] shrink-0", severityColors[obj.severity])} variant="outline">
                  {obj.severity}
                </Badge>
                <p className="text-muted-foreground">{obj.text}</p>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Buying Signals */}
      {analysis.buying_signals && analysis.buying_signals.length > 0 && (
        <Card className="border-border/50">
          <CardHeader className="pb-2 px-3 pt-3">
            <CardTitle className="text-xs font-medium flex items-center gap-2">
              <TrendingUp className="h-3.5 w-3.5" />
              Sinais de Compra
            </CardTitle>
          </CardHeader>
          <CardContent className="px-3 pb-3 space-y-2">
            {analysis.buying_signals.map((signal, i) => (
              <div key={i} className="flex items-start gap-2 text-xs">
                <Badge className={cn("text-[10px] shrink-0", strengthColors[signal.strength])} variant="outline">
                  {signal.strength}
                </Badge>
                <p className="text-muted-foreground">{signal.signal}</p>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Competitor Mentions */}
      {analysis.competitor_mentions && analysis.competitor_mentions.length > 0 && (
        <Card className="border-border/50">
          <CardHeader className="pb-2 px-3 pt-3">
            <CardTitle className="text-xs font-medium flex items-center gap-2">
              <MessageSquare className="h-3.5 w-3.5" />
              Menções a Concorrentes
            </CardTitle>
          </CardHeader>
          <CardContent className="px-3 pb-3 space-y-2">
            {analysis.competitor_mentions.map((comp, i) => (
              <div key={i} className="text-xs">
                <span className="font-medium text-foreground">{comp.name}</span>
                <span className="text-muted-foreground ml-1">— {comp.context}</span>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Follow-up Suggestions */}
      {analysis.follow_up_suggestions && analysis.follow_up_suggestions.length > 0 && (
        <Card className="border-border/50">
          <CardHeader className="pb-2 px-3 pt-3">
            <CardTitle className="text-xs font-medium">📋 Sugestões de Follow-up</CardTitle>
          </CardHeader>
          <CardContent className="px-3 pb-3 space-y-2">
            {analysis.follow_up_suggestions.map((sug, i) => (
              <div key={i} className="flex items-start gap-2 text-xs">
                <Badge className={cn("text-[10px] shrink-0", severityColors[sug.priority])} variant="outline">
                  {sug.priority}
                </Badge>
                <p className="text-muted-foreground">
                  {sug.action}
                  {sug.deadline_days && <span className="text-foreground ml-1">({sug.deadline_days}d)</span>}
                </p>
              </div>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
