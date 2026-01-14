import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { ContactDetail as ContactDetailComponent } from "@/components/contacts/ContactDetail";

export default function ContactDetailPage() {
  return (
    <DashboardLayout>
      <ContactDetailComponent />
    </DashboardLayout>
  );
}
