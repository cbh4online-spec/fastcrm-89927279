import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { LeadsList } from "@/components/crm/LeadsList";

export default function Leads() {
  return (
    <DashboardLayout>
      <LeadsList />
    </DashboardLayout>
  );
}
