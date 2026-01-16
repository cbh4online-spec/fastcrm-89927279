import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { ENIContactDetail } from "@/components/contacts/eni/ENIContactDetail";

export default function ContactDetailPage() {
  return (
    <DashboardLayout>
      <ENIContactDetail />
    </DashboardLayout>
  );
}
