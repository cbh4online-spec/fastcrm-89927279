import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { OpportunitiesModule } from "@/components/opportunities/OpportunitiesModule";

export default function OpportunitiesPage() {
  return (
    <DashboardLayout>
      <OpportunitiesModule />
    </DashboardLayout>
  );
}
