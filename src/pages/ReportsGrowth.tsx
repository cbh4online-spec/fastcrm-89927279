import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { GrowthInsightsModule } from "@/components/growth-insights/GrowthInsightsModule";

export default function ReportsGrowth() {
  return (
    <DashboardLayout>
      <div className="p-6">
        <GrowthInsightsModule />
      </div>
    </DashboardLayout>
  );
}
