import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { SmartLeadsTable } from "@/components/leads/SmartLeadsTable";

export default function Leads() {
  return (
    <DashboardLayout>
      <SmartLeadsTable />
    </DashboardLayout>
  );
}
