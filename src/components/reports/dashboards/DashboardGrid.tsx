import { ReportWidget } from "@/hooks/useReportWidgets";
import { WidgetCard } from "./WidgetCard";

interface DashboardGridProps {
  widgets: ReportWidget[];
  globalFilters?: { dateFrom?: string; dateTo?: string };
  onEditWidget: (w: ReportWidget) => void;
  onDuplicateWidget: (w: ReportWidget) => void;
  onDeleteWidget: (w: ReportWidget) => void;
}

export function DashboardGrid({ widgets, globalFilters, onEditWidget, onDuplicateWidget, onDeleteWidget }: DashboardGridProps) {
  if (widgets.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-muted-foreground">
        <p className="text-sm">Nenhum widget configurado</p>
        <p className="text-xs mt-1">Clique em "Novo Widget" para adicionar</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {widgets.map(w => (
        <WidgetCard
          key={w.id}
          widget={w}
          globalFilters={globalFilters}
          onEdit={onEditWidget}
          onDuplicate={onDuplicateWidget}
          onDelete={onDeleteWidget}
        />
      ))}
    </div>
  );
}
