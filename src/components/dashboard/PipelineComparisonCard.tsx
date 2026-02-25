import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { TrendingUp, ArrowRight, Loader2 } from "lucide-react";
import { useMultiPipelineIntelligence } from "@/hooks/useMultiPipelineIntelligence";
import { useTranslation } from "react-i18next";

function healthColor(score: number): string {
  if (score >= 70) return "bg-emerald-500";
  if (score >= 50) return "bg-amber-500";
  return "bg-destructive";
}

export function PipelineComparisonCard() {
  const { t } = useTranslation('dashboard');
  const { data, isLoading } = useMultiPipelineIntelligence();
  const navigate = useNavigate();

  if (isLoading) {
    return (
      <Card>
        <CardContent className="py-8 flex items-center justify-center">
          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  if (!data || data.pipelines.length === 0) return null;

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
            {t('pipelineHealth')}
          </CardTitle>
          <Badge variant="outline" className="text-[10px]">
            {data.pipelines.length} {t('active')}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {data.pipelines.slice(0, 4).map((p) => (
          <div key={p.pipeline_id} className="flex items-center gap-3">
            <div className="flex-1 min-w-0">
              <p className="text-xs font-medium truncate">{p.name}</p>
              <div className="flex items-center gap-2 mt-1">
                <div className="flex-1 h-1.5 rounded-full bg-muted overflow-hidden">
                  <div
                    className={`h-full rounded-full ${healthColor(p.health_index)}`}
                    style={{ width: `${p.health_index}%` }}
                  />
                </div>
                <span className="text-[10px] text-muted-foreground w-7 text-right">
                  {p.health_index}
                </span>
              </div>
            </div>
          </div>
        ))}

        <Button
          variant="ghost"
          size="sm"
          className="w-full text-xs text-muted-foreground hover:text-foreground mt-1"
          onClick={() => navigate("/dashboard/revenue")}
        >
          {t('viewFullComparison')}
          <ArrowRight className="h-3 w-3 ml-1" />
        </Button>
      </CardContent>
    </Card>
  );
}
