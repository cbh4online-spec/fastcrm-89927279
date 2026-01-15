import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { SmartContactsTable } from "@/components/contacts/SmartContactsTable";

export default function Contacts() {
  return (
    <DashboardLayout>
      <SmartContactsTable />
    </DashboardLayout>
  );
}
