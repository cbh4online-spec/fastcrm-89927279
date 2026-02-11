import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { CreateManualOrderNote } from "@/components/order-notes/CreateManualOrderNote";

export default function CreateOrderNotePage() {
  return (
    <DashboardLayout>
      <CreateManualOrderNote />
    </DashboardLayout>
  );
}
