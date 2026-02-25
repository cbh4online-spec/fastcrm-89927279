import { useIntelligencePanel } from "@/hooks/useIntelligencePanel";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { AlertTriangle, Loader2, ArrowRight } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { cn } from "@/lib/utils";
import { useTranslation } from "react-i18next";

const healthColor = (score: number) =>
  score >= 70 ? "text-emerald-600" : score >= 40 ? "text-yellow-600" : "text-destructive";

const severityDot = (severity: string) =>
  severity === "HIGH" ? "bg-destructive" : severity === "MEDIUM" ? "bg-yellow-500" : "bg-muted-foreground";

export function DealsAtRiskList() {
  const { t } = useTranslation('dashboard');
  const { data, isLoading } = useIntelligencePanel();
  const navigate = useNavigate();

  if (isLoading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-8">
          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  const risks = data?.top_risks?.slice(0, 5) || [];

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium flex items-center gap-2">
          <AlertTriangle className="h-4 w-4 text-destructive" />
          {t('dealsAtRisk')}
        </CardTitle>
      </CardHeader>
      <CardContent>
        {risks.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-4">
            {t('noDealsAtRisk')}
          </p>
        ) : (
          <div className="space-y-1">
            {risks.map((risk) => (
              <button
                key={risk.deal_id}
                className="w-full flex items-center justify-between py-2.5 px-2 rounded-md hover:bg-muted/50 transition-colors text-left group"
                onClick={() => navigate(`/dashboard/opportunities/${risk.deal_id}`)}
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className={cn("w-1.5 h-1.5 rounded-full shrink-0", severityDot(risk.severity))} />
                  <div className="min-w-0">
                    <p className="text-sm font-medium truncate">{risk.deal_title}</p>
                    <p className="text-xs text-muted-foreground truncate">{risk.reason}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0 ml-2">
                  <Badge variant="outline" className={cn("text-[10px] font-semibold", healthColor(risk.health_score))}>
                    {risk.health_score}
                  </Badge>
                  <ArrowRight className="h-3.5 w-3.5 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                </div>
              </button>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
