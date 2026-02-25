import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BarChart3 } from "lucide-react";
import { cn } from "@/lib/utils";

interface ScoreBreakdownChartProps {
  breakdown: {
    engagement_score: number;
    recency_score: number;
    trust_score: number;
    objection_penalty: number;
    intent_score: number;
    historical_similarity: number;
  } | null;
}

const COMPONENTS: Array<{ key: string; label: string; color: string; isNegative?: boolean }> = [
  { key: "engagement_score", label: "Engagement", color: "bg-blue-500" },
  { key: "recency_score", label: "Recency", color: "bg-emerald-500" },
  { key: "trust_score", label: "Trust", color: "bg-violet-500" },
  { key: "intent_score", label: "Intent", color: "bg-amber-500" },
  { key: "historical_similarity", label: "Historical", color: "bg-cyan-500" },
  { key: "objection_penalty", label: "Objections", color: "bg-red-500", isNegative: true },
];

export function ScoreBreakdownChart({ breakdown }: ScoreBreakdownChartProps) {
  if (!breakdown) return null;

  const maxVal = 30; // max possible per component

  return (
    <div className="space-y-1.5">
      <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider flex items-center gap-1">
        <BarChart3 className="w-3 h-3" />
        Score Breakdown
      </p>
      <div className="space-y-1">
        {COMPONENTS.map(({ key, label, color, isNegative }) => {
          const value = Math.abs(breakdown[key as keyof typeof breakdown] ?? 0);
          const pct = Math.min(100, (value / maxVal) * 100);
          return (
            <div key={key} className="flex items-center gap-2">
              <span className="text-[10px] text-muted-foreground w-16 text-right truncate">{label}</span>
              <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
                <div
                  className={cn("h-full rounded-full transition-all", color)}
                  style={{ width: `${pct}%` }}
                />
              </div>
              <span className={cn("text-[10px] font-medium w-6 text-right", isNegative ? "text-red-500" : "text-foreground")}>
                {isNegative ? `-${value}` : value}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
