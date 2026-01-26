import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar as CalendarComponent } from "@/components/ui/calendar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import { Calendar, MoreHorizontal, TrendingUp, TrendingDown, Download, RefreshCw, Maximize2 } from "lucide-react";
import { useState } from "react";
import { format } from "date-fns";
import { pt } from "date-fns/locale";
import { DateRange } from "react-day-picker";
import { toast } from "sonner";

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
  onDateChange?: (start: Date, end: Date) => void;
  onExport?: () => void;
  onRefresh?: () => void;
  periodStart?: Date;
  periodEnd?: Date;
}

export function NexusSummaryCard({
  title,
  subtitle,
  dateRange,
  items,
  children,
  isLoading,
  className,
  onDateChange,
  onExport,
  onRefresh,
  periodStart,
  periodEnd,
}: NexusSummaryCardProps) {
  const [calendarOpen, setCalendarOpen] = useState(false);
  const [selectedRange, setSelectedRange] = useState<DateRange | undefined>(
    periodStart && periodEnd ? { from: periodStart, to: periodEnd } : undefined
  );

  const handleRangeSelect = (range: DateRange | undefined) => {
    setSelectedRange(range);
    if (range?.from && range?.to && onDateChange) {
      onDateChange(range.from, range.to);
      setCalendarOpen(false);
    }
  };

  const handleExport = () => {
    if (onExport) {
      onExport();
    } else {
      toast.success("Dados exportados com sucesso!");
    }
  };

  const handleRefresh = () => {
    if (onRefresh) {
      onRefresh();
    } else {
      toast.success("Dados atualizados!");
    }
  };

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
              <Popover open={calendarOpen} onOpenChange={setCalendarOpen}>
                <PopoverTrigger asChild>
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    className="h-7 text-xs gap-1.5 text-muted-foreground hover:text-foreground"
                  >
                    <Calendar className="h-3.5 w-3.5" />
                    {dateRange}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0 bg-popover" align="end" sideOffset={8}>
                  <CalendarComponent
                    mode="range"
                    selected={selectedRange}
                    onSelect={handleRangeSelect}
                    numberOfMonths={2}
                    locale={pt}
                    className="p-3 pointer-events-auto"
                    disabled={(date) => date > new Date()}
                  />
                  <div className="border-t p-3 flex justify-end gap-2">
                    <Button 
                      variant="ghost" 
                      size="sm"
                      onClick={() => setCalendarOpen(false)}
                    >
                      Cancelar
                    </Button>
                    <Button 
                      size="sm"
                      onClick={() => {
                        if (selectedRange?.from && selectedRange?.to && onDateChange) {
                          onDateChange(selectedRange.from, selectedRange.to);
                        }
                        setCalendarOpen(false);
                      }}
                      disabled={!selectedRange?.from || !selectedRange?.to}
                    >
                      Aplicar
                    </Button>
                  </div>
                </PopoverContent>
              </Popover>
            )}
            
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="h-7 w-7">
                  <MoreHorizontal className="h-4 w-4 text-muted-foreground" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="bg-popover">
                <DropdownMenuItem onClick={handleRefresh} className="gap-2 cursor-pointer">
                  <RefreshCw className="h-4 w-4" />
                  Atualizar dados
                </DropdownMenuItem>
                <DropdownMenuItem onClick={handleExport} className="gap-2 cursor-pointer">
                  <Download className="h-4 w-4" />
                  Exportar gráfico
                </DropdownMenuItem>
                <DropdownMenuItem className="gap-2 cursor-pointer">
                  <Maximize2 className="h-4 w-4" />
                  Expandir
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
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
