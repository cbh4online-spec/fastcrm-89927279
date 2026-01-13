import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { OpportunitiesBoard } from "@/components/crm/OpportunitiesBoard";

export default function Opportunities() {
  return (
    <DashboardLayout>
      <OpportunitiesBoard />
    </DashboardLayout>
  );
}
