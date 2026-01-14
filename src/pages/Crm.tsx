import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { UnifiedCrmView } from "@/components/crm/UnifiedCrmView";

export default function Crm() {
  return (
    <DashboardLayout>
      <div className="h-full flex flex-col">
        <UnifiedCrmView />
      </div>
    </DashboardLayout>
  );
}
