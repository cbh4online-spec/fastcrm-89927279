import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { GoalsVsResultsReport } from "@/components/reports/GoalsVsResultsReport";

export default function ReportsGoals() {
  return (
    <DashboardLayout>
      <div className="p-6">
        <GoalsVsResultsReport />
      </div>
    </DashboardLayout>
  );
}
