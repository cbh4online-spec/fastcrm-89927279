import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { ArrowUpRight, ArrowDownRight } from "lucide-react";
import { cn } from "@/lib/utils";

interface KPICardProps {
  title: string;
  value: string;
  change?: number;
  icon: React.ComponentType<{ className?: string }>;
  loading?: boolean;
}

export function KPICard({ title, value, change, icon: Icon, loading }: KPICardProps) {
  if (loading) {
    return (
      <Card>
        <CardContent className="p-4">
          <Skeleton className="h-3 w-16 mb-2" />
          <Skeleton className="h-7 w-24" />
        </CardContent>
      </Card>
    );
  }
  const isPositive = (change ?? 0) >= 0;
  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardContent className="p-4">
        <div className="flex items-center justify-between mb-1">
          <p className="text-xs font-medium text-muted-foreground">{title}</p>
          <div className="h-7 w-7 rounded-lg bg-primary/10 flex items-center justify-center">
            <Icon className="h-3.5 w-3.5 text-primary" />
          </div>
        </div>
        <p className="text-xl font-bold tracking-tight">{value}</p>
        {change !== undefined && (
          <div className={cn("flex items-center gap-0.5 mt-1 text-[11px] font-medium", isPositive ? "text-success" : "text-destructive")}>
            {isPositive ? <ArrowUpRight className="h-3 w-3" /> : <ArrowDownRight className="h-3 w-3" />}
            {Math.abs(change).toFixed(1)}%
          </div>
        )}
      </CardContent>
    </Card>
  );
}
