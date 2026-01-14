import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { CompanyDetail as CompanyDetailComponent } from "@/components/companies/CompanyDetail";

export default function CompanyDetailPage() {
  return (
    <DashboardLayout>
      <CompanyDetailComponent />
    </DashboardLayout>
  );
}
