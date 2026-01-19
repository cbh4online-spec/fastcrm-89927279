import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { ENIContactDetailWithSidebar } from "@/components/contacts/eni/ENIContactDetailWithSidebar";

export default function ContactDetailPage() {
  return (
    <DashboardLayout>
      <ENIContactDetailWithSidebar />
    </DashboardLayout>
  );
}
