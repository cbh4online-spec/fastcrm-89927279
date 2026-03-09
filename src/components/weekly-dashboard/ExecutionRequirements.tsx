import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { CheckCircle2, Users, Calendar, FileText, Handshake } from "lucide-react";
import { cn } from "@/lib/utils";
import { WeeklyMetric } from "@/hooks/useWeeklyPerformance";
import { Skeleton } from "@/components/ui/skeleton";

interface Props {
  metrics: WeeklyMetric[];
  isLoading: boolean;
}

const metricConfig: Record<string, { label: string; icon: React.ReactNode }> = {
  leads: { label: "Leads", icon: <Users className="h-3.5 w-3.5" /> },
  meetings: { label: "Reuniões", icon: <Calendar className="h-3.5 w-3.5" /> },
  proposals: { label: "Propostas", icon: <FileText className="h-3.5 w-3.5" /> },
  deals: { label: "Deals", icon: <Handshake className="h-3.5 w-3.5" /> },
};

const order = ["leads", "meetings", "proposals", "deals"];

export function ExecutionRequirements({ metrics, isLoading }: Props) {
  if (isLoading) {
    return (
      <Card>
        <CardContent className="py-4">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="space-y-2">
                <Skeleton className="h-3 w-16" />
                <Skeleton className="h-5 w-12" />
                <Skeleton className="h-1.5 w-full" />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  const items = order
    .map((key) => {
      const m = metrics.find((x) => x.key === key);
      if (!m) return null;
      const remaining = Math.max(m.target - m.actual, 0);
      const done = m.target > 0 && remaining === 0;
      return { ...m, remaining, done, config: metricConfig[key] };
    })
    .filter(Boolean) as Array<WeeklyMetric & { remaining: number; done: boolean; config: { label: string; icon: React.ReactNode } }>;

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium">O que falta esta semana</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {items.map((item) => (
            <div key={item.key} className="space-y-1.5">
              <div className="flex items-center gap-1.5 text-muted-foreground">
                {item.config.icon}
                <span className="text-xs font-medium">{item.config.label}</span>
              </div>
              <div className="flex items-baseline gap-1.5">
                {item.done ? (
                  <CheckCircle2 className="h-4 w-4 text-success shrink-0" />
                ) : (
                  <span className={cn(
                    "text-lg font-bold",
                    item.status === "red" ? "text-destructive" : item.status === "yellow" ? "text-warning" : "text-success"
                  )}>
                    {item.remaining}
                  </span>
                )}
                <span className="text-xs text-muted-foreground">
                  {item.done ? "Concluído" : `faltam (${item.actual}/${item.target})`}
                </span>
              </div>
              {item.target > 0 && (
                <Progress
                  value={Math.min(item.pct, 100)}
                  className={cn(
                    "h-1.5",
                    item.status === "green" && "[&>div]:bg-success",
                    item.status === "yellow" && "[&>div]:bg-warning",
                    item.status === "red" && "[&>div]:bg-destructive"
                  )}
                />
              )}
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
