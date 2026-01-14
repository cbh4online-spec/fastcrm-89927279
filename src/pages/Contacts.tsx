import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { ContactsList } from "@/components/contacts/ContactsList";

export default function Contacts() {
  return (
    <DashboardLayout>
      <ContactsList />
    </DashboardLayout>
  );
}
