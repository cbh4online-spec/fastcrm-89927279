import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { FunnelsList } from "@/components/funnels/FunnelsList";

export default function Funnels() {
  return (
    <DashboardLayout>
      <FunnelsList />
    </DashboardLayout>
  );
}
