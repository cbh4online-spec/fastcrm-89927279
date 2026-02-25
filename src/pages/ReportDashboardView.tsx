import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { DashboardGrid } from "@/components/reports/dashboards/DashboardGrid";
import { DashboardFiltersBar } from "@/components/reports/dashboards/DashboardFiltersBar";
import { CreateWidgetModal } from "@/components/reports/dashboards/CreateWidgetModal";
import { useReportWidgets, useCreateWidget, useUpdateWidget, useDuplicateWidget, useDeleteWidget, ReportWidget } from "@/hooks/useReportWidgets";
import { useReportDashboards } from "@/hooks/useReportDashboards";
import { useParams, Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { ArrowLeft, Plus } from "lucide-react";
import { useState, useMemo } from "react";

export default function ReportDashboardView() {
  const { id } = useParams<{ id: string }>();
  const { data: dashboards } = useReportDashboards();
  const { data: widgets, isLoading } = useReportWidgets(id);
  const createWidget = useCreateWidget();
  const updateWidget = useUpdateWidget();
  const duplicateWidget = useDuplicateWidget();
  const deleteWidget = useDeleteWidget();

  const [widgetModalOpen, setWidgetModalOpen] = useState(false);
  const [editingWidget, setEditingWidget] = useState<ReportWidget | null>(null);
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");

  const dashboard = useMemo(() => dashboards?.find(d => d.id === id), [dashboards, id]);

  const globalFilters = useMemo(() => ({
    dateFrom: dateFrom || undefined,
    dateTo: dateTo || undefined,
  }), [dateFrom, dateTo]);

  const handleEdit = (w: ReportWidget) => {
    setEditingWidget(w);
    setWidgetModalOpen(true);
  };

  const handleWidgetSubmit = (data: any) => {
    if (editingWidget) {
      updateWidget.mutate({ ...data, id: editingWidget.id, dashboard_id: id! }, {
        onSuccess: () => { setWidgetModalOpen(false); setEditingWidget(null); },
      });
    } else {
      createWidget.mutate(data, {
        onSuccess: () => setWidgetModalOpen(false),
      });
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-6 p-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link to="/dashboard/reports/dashboards">
              <Button variant="ghost" size="icon" className="h-8 w-8">
                <ArrowLeft className="h-4 w-4" />
              </Button>
            </Link>
            <div>
              {dashboard ? (
                <>
                  <h1 className="text-2xl font-bold">{dashboard.name}</h1>
                  {dashboard.description && (
                    <p className="text-muted-foreground text-sm">{dashboard.description}</p>
                  )}
                </>
              ) : (
                <Skeleton className="h-8 w-48" />
              )}
            </div>
          </div>
          <div className="flex items-center gap-2">
            <DashboardFiltersBar
              dateFrom={dateFrom}
              dateTo={dateTo}
              onDateFromChange={setDateFrom}
              onDateToChange={setDateTo}
            />
            <Button onClick={() => { setEditingWidget(null); setWidgetModalOpen(true); }}>
              <Plus className="h-4 w-4 mr-2" /> Novo Widget
            </Button>
          </div>
        </div>

        {/* Grid */}
        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-[260px] rounded-lg" />)}
          </div>
        ) : (
          <DashboardGrid
            widgets={widgets || []}
            globalFilters={globalFilters}
            onEditWidget={handleEdit}
            onDuplicateWidget={(w) => duplicateWidget.mutate(w)}
            onDeleteWidget={(w) => deleteWidget.mutate({ id: w.id, dashboardId: id! })}
          />
        )}

        {/* Widget Modal */}
        {id && (
          <CreateWidgetModal
            open={widgetModalOpen}
            onOpenChange={(open) => { setWidgetModalOpen(open); if (!open) setEditingWidget(null); }}
            onSubmit={handleWidgetSubmit}
            dashboardId={id}
            editingWidget={editingWidget}
            isLoading={createWidget.isPending || updateWidget.isPending}
          />
        )}
      </div>
    </DashboardLayout>
  );
}
