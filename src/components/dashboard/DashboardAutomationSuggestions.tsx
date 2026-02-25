import { useAutomationSuggestions, useAcceptAutomationSuggestion, useDismissAutomationSuggestion } from "@/hooks/useAutomationSuggestions";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Zap, Check, X, ArrowRight } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { cn } from "@/lib/utils";
import { useTranslation } from "react-i18next";

export function DashboardAutomationSuggestions() {
  const { t } = useTranslation('dashboard');
  const { data: suggestions, isLoading } = useAutomationSuggestions(2);
  const acceptMutation = useAcceptAutomationSuggestion();
  const dismissMutation = useDismissAutomationSuggestion();
  const navigate = useNavigate();

  if (isLoading || !suggestions || suggestions.length === 0) return null;

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <Zap className="h-4 w-4 text-primary" />
            {t('automationSuggestionsTitle')}
          </CardTitle>
          <Badge variant="secondary" className="text-xs">
            {t('newCount', { count: suggestions.length })}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-1">
        {suggestions.map((s) => (
          <div key={s.id} className="flex items-start justify-between gap-3 py-2.5 px-2 rounded-md hover:bg-muted/50 transition-colors">
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <p className="text-sm font-medium truncate">{s.title}</p>
                <Badge variant="outline" className={cn("text-[10px] shrink-0", s.confidence >= 0.85 ? "border-green-500/30 text-green-600" : "border-yellow-500/30 text-yellow-600")}>
                  {Math.round(s.confidence * 100)}%
                </Badge>
              </div>
              <p className="text-xs text-muted-foreground truncate mt-0.5">{s.description}</p>
            </div>
            <div className="flex items-center gap-1 shrink-0">
              <Button size="icon" variant="ghost" className="h-7 w-7 text-green-600 hover:text-green-700 hover:bg-green-50" onClick={() => acceptMutation.mutate(s.id)} disabled={acceptMutation.isPending}>
                <Check className="h-3.5 w-3.5" />
              </Button>
              <Button size="icon" variant="ghost" className="h-7 w-7 text-muted-foreground hover:text-destructive" onClick={() => dismissMutation.mutate(s.id)} disabled={dismissMutation.isPending}>
                <X className="h-3.5 w-3.5" />
              </Button>
            </div>
          </div>
        ))}
        <button className="w-full flex items-center justify-center gap-1.5 pt-2 text-xs text-muted-foreground hover:text-primary transition-colors" onClick={() => navigate("/dashboard/automations")}>
          {t('viewAllSuggestions')}
          <ArrowRight className="h-3 w-3" />
        </button>
      </CardContent>
    </Card>
  );
}
