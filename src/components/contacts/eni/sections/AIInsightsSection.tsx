import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { 
  Sparkles, 
  Brain, 
  Lightbulb, 
  Target, 
  MessageSquare, 
  CheckSquare,
  TrendingUp,
  Clock,
  RefreshCw
} from "lucide-react";
import { ENIContact } from "../ENIContactTypes";
import { cn } from "@/lib/utils";
import { useTranslation } from "react-i18next";

interface AIInsightsSectionProps {
  contact: ENIContact;
  onGenerateInsights?: () => void;
  isGenerating?: boolean;
}

const ACTION_TYPE_ICONS: Record<string, React.ElementType> = {
  follow_up: MessageSquare,
  create_opportunity: TrendingUp,
  add_task: CheckSquare,
  send_message: MessageSquare,
  default: Target,
};

function getTimeAgo(date: string): string {
  const now = new Date();
  const d = new Date(date);
  const diffInSeconds = Math.floor((now.getTime() - d.getTime()) / 1000);
  
  if (diffInSeconds < 60) return 'agora mesmo';
  if (diffInSeconds < 3600) return `há ${Math.floor(diffInSeconds / 60)} min`;
  if (diffInSeconds < 86400) return `há ${Math.floor(diffInSeconds / 3600)} horas`;
  if (diffInSeconds < 604800) return `há ${Math.floor(diffInSeconds / 86400)} dias`;
  
  return d.toLocaleDateString('pt-PT');
}

export function AIInsightsSection({ 
  contact, 
  onGenerateInsights,
  isGenerating = false
}: AIInsightsSectionProps) {
  const { t } = useTranslation('crm');

  const TEMPERATURE_CONFIG: Record<string, { label: string; color: string; bgColor: string }> = {
    hot: { label: t('temperatureHot'), color: 'text-red-600', bgColor: 'bg-red-100 dark:bg-red-900/30' },
    warm: { label: t('temperatureWarm'), color: 'text-amber-600', bgColor: 'bg-amber-100 dark:bg-amber-900/30' },
    cold: { label: t('temperatureCold'), color: 'text-blue-600', bgColor: 'bg-blue-100 dark:bg-blue-900/30' },
  };

  const temperature = contact.ai_temperature;
  const tempConfig = temperature ? TEMPERATURE_CONFIG[temperature] : null;
  const ActionIcon = contact.ai_next_action_type 
    ? (ACTION_TYPE_ICONS[contact.ai_next_action_type] || ACTION_TYPE_ICONS.default)
    : ACTION_TYPE_ICONS.default;

  const hasInsights = contact.ai_insight || contact.ai_next_action;

  return (
    <Card className="border-purple-200/50 bg-gradient-to-br from-purple-50/50 to-indigo-50/30 dark:from-purple-950/20 dark:to-indigo-950/10 dark:border-purple-800/30">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-base flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-purple-600" />
              {t('aiInsights')}
            </CardTitle>
            <CardDescription>
              {t('aiInsightsDesc')}
            </CardDescription>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={onGenerateInsights}
            disabled={isGenerating}
            className="gap-2"
          >
            {isGenerating ? (
              <RefreshCw className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Sparkles className="h-3.5 w-3.5" />
            )}
            {isGenerating ? t('generatingInsights') : t('generateInsights')}
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Temperature & Score */}
        <div className="flex items-center gap-3">
          {tempConfig && (
            <Badge className={cn('gap-1', tempConfig.bgColor, tempConfig.color)}>
              <Brain className="h-3 w-3" />
              {tempConfig.label}
            </Badge>
          )}
          
          {contact.contact_score && (
            <Badge variant="outline" className="gap-1">
              <Target className="h-3 w-3" />
              Score: {contact.contact_score}
            </Badge>
          )}

          {contact.conversion_probability && (
            <Badge variant="outline" className="gap-1">
              <TrendingUp className="h-3 w-3" />
              {Math.round(contact.conversion_probability * 100)}% {t('conversion')}
            </Badge>
          )}
        </div>

        {/* AI Insight */}
        {contact.ai_insight && (
          <div className="p-3 rounded-lg bg-white/50 dark:bg-gray-800/50 border border-purple-100 dark:border-purple-800/30">
            <div className="flex items-start gap-2">
              <Lightbulb className="h-4 w-4 text-amber-500 mt-0.5 shrink-0" />
              <div>
                <p className="text-sm font-medium text-foreground mb-1">{t('aiSummary')}</p>
                <p className="text-sm text-muted-foreground">{contact.ai_insight}</p>
              </div>
            </div>
          </div>
        )}

        {/* Next Action */}
        {contact.ai_next_action && (
          <div className="p-3 rounded-lg bg-white/50 dark:bg-gray-800/50 border border-purple-100 dark:border-purple-800/30">
            <div className="flex items-start gap-2">
              <ActionIcon className="h-4 w-4 text-purple-600 mt-0.5 shrink-0" />
              <div>
                <p className="text-sm font-medium text-foreground mb-1">{t('nextSuggestedAction')}</p>
                <p className="text-sm text-muted-foreground">{contact.ai_next_action}</p>
              </div>
            </div>
          </div>
        )}

        {/* Contact Type */}
        {contact.ai_contact_type && (
          <div className="flex items-center gap-2 text-sm">
            <span className="text-muted-foreground">{t('identifiedType')}</span>
            <Badge variant="secondary">{contact.ai_contact_type}</Badge>
          </div>
        )}

        {/* Last Analysis */}
        {contact.ai_analyzed_at && (
          <div className="flex items-center gap-2 text-xs text-muted-foreground pt-2 border-t">
            <Clock className="h-3 w-3" />
            {t('lastAnalysis')} {getTimeAgo(contact.ai_analyzed_at)}
          </div>
        )}

        {/* Empty State */}
        {!hasInsights && !isGenerating && (
          <div className="text-center py-4">
            <Brain className="h-8 w-8 mx-auto text-muted-foreground/50 mb-2" />
            <p className="text-sm text-muted-foreground">
              {t('clickGenerateInsights')}
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
