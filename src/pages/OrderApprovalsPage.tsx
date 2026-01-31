import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { OrderApprovalCenter } from "@/components/order-notes/OrderApprovalCenter";

export default function OrderApprovalsPage() {
  return (
    <DashboardLayout>
      <OrderApprovalCenter />
    </DashboardLayout>
  );
}
