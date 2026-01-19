import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { CompanyDetailWithSidebar } from "@/components/companies/CompanyDetailWithSidebar";

export default function CompanyDetailPage() {
  return (
    <DashboardLayout>
      <CompanyDetailWithSidebar />
    </DashboardLayout>
  );
}
