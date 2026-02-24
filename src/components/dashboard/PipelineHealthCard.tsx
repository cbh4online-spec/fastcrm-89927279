import { useRevenueForecast } from "@/hooks/useRevenueForecast";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Activity, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

export function PipelineHealthCard() {
  const { latestForecast, isLoading } = useRevenueForecast();

  if (isLoading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-8">
          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  if (!latestForecast) {
    return (
      <Card>
        <CardContent className="py-6 text-center text-sm text-muted-foreground">
          No data available
        </CardContent>
      </Card>
    );
  }

  const healthScore = Math.round(latestForecast.confidence_avg * 100);
  const healthLabel = healthScore >= 70 ? "Healthy" : healthScore >= 40 ? "At Risk" : "Critical";
  const healthColor = healthScore >= 70 ? "text-emerald-600" : healthScore >= 40 ? "text-warning" : "text-destructive";

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium flex items-center gap-2">
          <Activity className="h-4 w-4" />
          Pipeline Health
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex items-baseline gap-2 mb-3">
          <span className={cn("text-3xl font-bold", healthColor)}>{healthScore}%</span>
          <Badge variant={healthScore >= 70 ? "default" : healthScore >= 40 ? "secondary" : "destructive"} className="text-[10px]">
            {healthLabel}
          </Badge>
        </div>

        {/* Mini breakdown */}
        <div className="grid grid-cols-4 gap-2 text-center">
          {[
            { label: "Hot", value: latestForecast.hot_count, color: "bg-emerald-500" },
            { label: "Likely", value: latestForecast.likely_count, color: "bg-primary" },
            { label: "Unsure", value: latestForecast.uncertain_count, color: "bg-yellow-500" },
            { label: "Low", value: latestForecast.low_count, color: "bg-destructive" },
          ].map((item) => (
            <div key={item.label}>
              <div className={cn("w-2 h-2 rounded-full mx-auto mb-1", item.color)} />
              <p className="text-sm font-semibold">{item.value}</p>
              <p className="text-[10px] text-muted-foreground">{item.label}</p>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
