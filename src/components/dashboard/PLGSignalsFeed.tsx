import { useProductSignals, useSignalFunnel } from "@/hooks/useProductSignals";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Zap, Users, Target, TrendingUp, ArrowRight, Radio } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { pt, enUS, es, fr, type Locale as DateLocale } from "date-fns/locale";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";

const EVENT_CONFIG: Record<string, { label: string; color: string; icon: typeof Zap }> = {
  signup: { label: "Signup", color: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400", icon: Users },
  activation: { label: "Activated", color: "bg-blue-500/15 text-blue-700 dark:text-blue-400", icon: Zap },
  upgrade: { label: "Upgrade", color: "bg-amber-500/15 text-amber-700 dark:text-amber-400", icon: TrendingUp },
  trial_started: { label: "Trial", color: "bg-purple-500/15 text-purple-700 dark:text-purple-400", icon: Target },
  trial_expired: { label: "Expired", color: "bg-red-500/15 text-red-700 dark:text-red-400", icon: Target },
  feature_used: { label: "Feature", color: "bg-muted text-muted-foreground", icon: Zap },
};

const ROUTING_LABELS: Record<string, string> = {
  assign_owner: "→ Sales",
  create_task: "→ Task",
  add_to_campaign: "→ Nurture",
};

const dateLocales: Record<string, DateLocale> = { pt, en: enUS, es, fr };

export function PLGSignalsFeed() {
  const { t, i18n } = useTranslation('dashboard');
  const { data: signals, isLoading } = useProductSignals(10);
  const { data: funnel } = useSignalFunnel();
  const navigate = useNavigate();
  const locale = dateLocales[i18n.language] || pt;

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Zap className="h-4 w-4 text-primary" /> {t('productSignals')}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-12 bg-muted/50 rounded animate-pulse" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  const hasSignals = signals && signals.length > 0;

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-base">
            <Zap className="h-4 w-4 text-primary" />
            {t('productSignals')}
          </CardTitle>
          <Badge variant="outline" className="gap-1 text-xs font-normal">
            <Radio className="h-3 w-3 text-emerald-500 animate-pulse" />
            {t('live')}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {funnel && (funnel.signups > 0 || funnel.activated > 0) && (
          <div className="flex items-center gap-2 text-xs text-muted-foreground bg-muted/40 rounded-lg p-3">
            <span className="font-medium text-foreground">{funnel.signups}</span> {t('signups')}
            <ArrowRight className="h-3 w-3" />
            <span className="font-medium text-foreground">{funnel.activated}</span> {t('activated')}
            <ArrowRight className="h-3 w-3" />
            <span className="font-medium text-foreground">{funnel.qualified}</span> {t('qualified')}
            <ArrowRight className="h-3 w-3" />
            <span className="font-medium text-foreground">{funnel.pipeline}</span> {t('pipelineFunnel')}
          </div>
        )}

        {!hasSignals ? (
          <div className="text-center py-8 text-muted-foreground">
            <Zap className="h-8 w-8 mx-auto mb-2 opacity-30" />
            <p className="text-sm font-medium">{t('noProductSignals')}</p>
            <p className="text-xs mt-1">{t('configureWebhook')}</p>
          </div>
        ) : (
          <div className="space-y-2">
            {signals.map((signal) => {
              const config = EVENT_CONFIG[signal.event_type] || EVENT_CONFIG.feature_used;
              const Icon = config.icon;
              return (
                <div
                  key={signal.id}
                  className="flex items-center gap-3 p-2 rounded-lg hover:bg-muted/50 transition-colors"
                >
                  <div className={`p-1.5 rounded ${config.color}`}>
                    <Icon className="h-3.5 w-3.5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium truncate">{signal.email}</span>
                      <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
                        {config.label}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      {signal.score_impact !== 0 && (
                        <span className={signal.score_impact > 0 ? "text-emerald-600" : "text-red-500"}>
                          {signal.score_impact > 0 ? "+" : ""}
                          {signal.score_impact} pts
                        </span>
                      )}
                      {signal.routing_action && (
                        <span className="text-primary font-medium">
                          {ROUTING_LABELS[signal.routing_action] || signal.routing_action}
                        </span>
                      )}
                      <span>
                        {formatDistanceToNow(new Date(signal.created_at), { addSuffix: true, locale })}
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {hasSignals && (
          <Button
            variant="ghost"
            size="sm"
            className="w-full text-xs text-muted-foreground"
            onClick={() => navigate("/dashboard/plg-signals")}
          >
            {t('viewAllSignals')}
          </Button>
        )}
      </CardContent>
    </Card>
  );
}
