import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { MoreHorizontal, Copy, Pencil, Trash2 } from "lucide-react";
import { ReportWidget } from "@/hooks/useReportWidgets";
import { useWidgetData } from "@/hooks/useWidgetData";
import { WidgetRenderer } from "./WidgetRenderer";
import { cn } from "@/lib/utils";

interface WidgetCardProps {
  widget: ReportWidget;
  globalFilters?: { dateFrom?: string; dateTo?: string };
  onEdit: (widget: ReportWidget) => void;
  onDuplicate: (widget: ReportWidget) => void;
  onDelete: (widget: ReportWidget) => void;
}

const SIZE_MAP: Record<string, string> = {
  sm: "col-span-1",
  md: "col-span-1 md:col-span-1 lg:col-span-1",
  lg: "col-span-1 md:col-span-2 lg:col-span-2",
  full: "col-span-1 md:col-span-2 lg:col-span-3",
};

export function WidgetCard({ widget, globalFilters, onEdit, onDuplicate, onDelete }: WidgetCardProps) {
  const { data, isLoading } = useWidgetData(widget, globalFilters);

  return (
    <Card className={cn("flex flex-col", SIZE_MAP[widget.layout_size] || SIZE_MAP.md)}>
      <CardHeader className="pb-2 flex flex-row items-center justify-between space-y-0">
        <CardTitle className="text-sm font-medium">{widget.title}</CardTitle>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="h-7 w-7">
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => onEdit(widget)}>
              <Pencil className="h-3.5 w-3.5 mr-2" /> Editar
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => onDuplicate(widget)}>
              <Copy className="h-3.5 w-3.5 mr-2" /> Duplicar
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => onDelete(widget)} className="text-destructive">
              <Trash2 className="h-3.5 w-3.5 mr-2" /> Remover
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </CardHeader>
      <CardContent className="flex-1 min-h-[220px]">
        {isLoading ? (
          <Skeleton className="w-full h-full min-h-[200px] rounded" />
        ) : (
          <WidgetRenderer chartType={widget.chart_type} data={data || []} />
        )}
      </CardContent>
    </Card>
  );
}
