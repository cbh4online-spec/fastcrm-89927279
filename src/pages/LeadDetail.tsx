import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { LeadDetail as LeadDetailComponent } from "@/components/crm/LeadDetail";

export default function LeadDetailPage() {
  return (
    <DashboardLayout>
      <LeadDetailComponent />
    </DashboardLayout>
  );
}
