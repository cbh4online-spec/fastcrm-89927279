import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { KPIsModule } from "@/components/kpis/KPIsModule";

export default function ReportsKPIs() {
  return (
    <DashboardLayout>
      <div className="p-6">
        <KPIsModule />
      </div>
    </DashboardLayout>
  );
}
