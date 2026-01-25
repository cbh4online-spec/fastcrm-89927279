import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { Calendar, MoreHorizontal, TrendingUp, TrendingDown } from "lucide-react";

interface SummaryItem {
  label: string;
  value: string | number;
  trend?: number;
  color?: string;
}

interface NexusSummaryCardProps {
  title: string;
  subtitle?: string;
  dateRange?: string;
  items: SummaryItem[];
  children?: React.ReactNode;
  isLoading?: boolean;
  className?: string;
  onDateClick?: () => void;
}

export function NexusSummaryCard({
  title,
  subtitle,
  dateRange,
  items,
  children,
  isLoading,
  className,
  onDateClick,
}: NexusSummaryCardProps) {
  if (isLoading) {
    return (
      <Card className={cn("border-border/50 bg-card/80 backdrop-blur-sm", className)}>
        <CardHeader className="pb-2 px-5 pt-5">
          <Skeleton className="h-5 w-40" />
        </CardHeader>
        <CardContent className="px-5 pb-5">
          <Skeleton className="h-64 w-full" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={cn(
      "border-border/50 bg-card/80 backdrop-blur-sm",
      "transition-all duration-300 hover:shadow-lg hover:shadow-black/5",
      className
    )}>
      <CardHeader className="pb-3 px-5 pt-5">
        <div className="flex items-center justify-between">
          <div className="space-y-0.5">
            <div className="flex items-center gap-3">
              <h3 className="text-base font-semibold">{title}</h3>
              {subtitle && (
                <span className="text-xs text-muted-foreground bg-muted/50 px-2 py-0.5 rounded-full">
                  {subtitle}
                </span>
              )}
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            {dateRange && (
              <Button 
                variant="ghost" 
                size="sm" 
                className="h-7 text-xs gap-1.5 text-muted-foreground hover:text-foreground"
                onClick={onDateClick}
              >
                <Calendar className="h-3.5 w-3.5" />
                {dateRange}
              </Button>
            )}
            <Button variant="ghost" size="icon" className="h-7 w-7">
              <MoreHorizontal className="h-4 w-4 text-muted-foreground" />
            </Button>
          </div>
        </div>

        {/* Summary items row */}
        {items.length > 0 && (
          <div className="flex items-center gap-6 mt-4">
            {items.map((item, index) => (
              <div key={index} className="flex items-center gap-2">
                {item.color && (
                  <div 
                    className="w-2.5 h-2.5 rounded-full" 
                    style={{ backgroundColor: item.color }}
                  />
                )}
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium">{item.value}</span>
                  <span className="text-xs text-muted-foreground">{item.label}</span>
                  {item.trend !== undefined && (
                    <span className={cn(
                      "flex items-center text-xs font-medium",
                      item.trend > 0 ? "text-emerald-600" : item.trend < 0 ? "text-rose-500" : "text-muted-foreground"
                    )}>
                      {item.trend > 0 ? <TrendingUp className="h-3 w-3 mr-0.5" /> : item.trend < 0 ? <TrendingDown className="h-3 w-3 mr-0.5" /> : null}
                      {item.trend !== 0 && `${Math.abs(item.trend)}%`}
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </CardHeader>
      
      <CardContent className="px-5 pb-5">
        {children}
      </CardContent>
    </Card>
  );
}
