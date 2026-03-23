import { BarChart3 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

interface ModuleUsageChartProps {
  stats: Record<string, unknown> | null;
  isLoading?: boolean;
  className?: string;
}

/** @deprecated Usage chart for credits is deprecated. Kept for backward compatibility. */
export function ModuleUsageChart({ stats, isLoading, className }: ModuleUsageChartProps) {
  if (isLoading) {
    return (
      <Card className={className}>
        <CardHeader><Skeleton className="h-5 w-40" /></CardHeader>
        <CardContent><Skeleton className="h-32 w-full" /></CardContent>
      </Card>
    );
  }

  return (
    <Card className={className}>
      <CardContent className="py-8 text-center text-muted-foreground">
        <BarChart3 className="h-10 w-10 mx-auto mb-3 opacity-50" />
        <p className="text-sm">Estatísticas de utilização</p>
        <p className="text-xs mt-1">O consumo de IA é agora gerido pelo sistema de planos</p>
      </CardContent>
    </Card>
  );
}
