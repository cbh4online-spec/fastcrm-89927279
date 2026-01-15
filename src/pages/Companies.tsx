import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { SmartCompaniesTable } from "@/components/companies/SmartCompaniesTable";

export default function Companies() {
  return (
    <DashboardLayout>
      <SmartCompaniesTable />
    </DashboardLayout>
  );
}
