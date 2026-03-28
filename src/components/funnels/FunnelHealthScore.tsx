import { Activity } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { useAllVerticalKPIs } from "@/hooks/useVerticalLandingAnalytics";

function getScoreColor(score: number) {
  if (score >= 70) return "text-emerald-500";
  if (score >= 40) return "text-amber-500";
  return "text-destructive";
}

function getScoreLabel(score: number) {
  if (score >= 70) return "Saudável";
  if (score >= 40) return "Pode melhorar";
  return "Crítico";
}

function getScoreBg(score: number) {
  if (score >= 70) return "bg-emerald-500";
  if (score >= 40) return "bg-amber-500";
  return "bg-destructive";
}

export function FunnelHealthScore() {
  const { data: kpis } = useAllVerticalKPIs();

  if (!kpis) return null;

  const allKpis = Object.values(kpis).filter(k => k.views > 0);
  if (allKpis.length === 0) return null;

  // Composite score calculation
  const avgConversion = allKpis.reduce((s, k) => s + k.conversionRate, 0) / allKpis.length;
  const totalViews = allKpis.reduce((s, k) => s + k.views, 0);

  // Score components (0-100):
  // - Conversion quality (0-40): based on 5% benchmark
  const convScore = Math.min(avgConversion / 5 * 40, 40);
  // - Traffic volume (0-30): log scale, 100+ views = full score
  const trafficScore = Math.min(Math.log10(Math.max(totalViews, 1)) / 2 * 30, 30);
  // - Active funnels diversity (0-30): more active funnels = better
  const diversityScore = Math.min(allKpis.length / 3 * 30, 30);

  const totalScore = Math.round(convScore + trafficScore + diversityScore);

  return (
    <Card className="border-border/50">
      <CardContent className="p-4">
        <div className="flex items-center gap-4">
          <div className="relative w-16 h-16">
            <svg className="w-16 h-16 -rotate-90" viewBox="0 0 64 64">
              <circle cx="32" cy="32" r="28" fill="none" stroke="currentColor" strokeWidth="4" className="text-muted/30" />
              <circle
                cx="32" cy="32" r="28" fill="none"
                strokeWidth="4"
                strokeLinecap="round"
                strokeDasharray={`${totalScore * 1.76} 176`}
                className={getScoreColor(totalScore)}
                stroke="currentColor"
              />
            </svg>
            <span className={`absolute inset-0 flex items-center justify-center text-lg font-bold ${getScoreColor(totalScore)}`}>
              {totalScore}
            </span>
          </div>
          <div>
            <div className="flex items-center gap-2">
              <Activity className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm font-semibold">Health Score</span>
            </div>
            <div className="flex items-center gap-2 mt-1">
              <div className={`w-2 h-2 rounded-full ${getScoreBg(totalScore)}`} />
              <span className={`text-xs font-medium ${getScoreColor(totalScore)}`}>
                {getScoreLabel(totalScore)}
              </span>
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {allKpis.length} funil(is) · {avgConversion.toFixed(1)}% conv. média
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
