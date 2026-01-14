import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { CompaniesList } from "@/components/companies/CompaniesList";

export default function Companies() {
  return (
    <DashboardLayout>
      <CompaniesList />
    </DashboardLayout>
  );
}
