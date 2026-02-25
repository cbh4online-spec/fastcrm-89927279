import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { DashboardsListPage } from "@/components/reports/dashboards/DashboardsListPage";
import { CreateDashboardDialog } from "@/components/reports/dashboards/CreateDashboardDialog";
import { useReportDashboards, useCreateDashboard, useDeleteDashboard } from "@/hooks/useReportDashboards";
import { useState } from "react";

export default function ReportsDashboards() {
  const { data: dashboards, isLoading } = useReportDashboards();
  const createDashboard = useCreateDashboard();
  const deleteDashboard = useDeleteDashboard();
  const [createOpen, setCreateOpen] = useState(false);

  return (
    <DashboardLayout>
      <div className="p-6">
        <DashboardsListPage
          dashboards={dashboards || []}
          isLoading={isLoading}
          onCreateClick={() => setCreateOpen(true)}
          onDelete={(id) => deleteDashboard.mutate(id)}
        />
        <CreateDashboardDialog
          open={createOpen}
          onOpenChange={setCreateOpen}
          onSubmit={(data) => {
            createDashboard.mutate(data, { onSuccess: () => setCreateOpen(false) });
          }}
          isLoading={createDashboard.isPending}
        />
      </div>
    </DashboardLayout>
  );
}
