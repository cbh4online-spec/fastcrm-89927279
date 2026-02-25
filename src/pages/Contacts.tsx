import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { AttioContactsTable } from "@/components/contacts/AttioContactsTable";

export default function Contacts() {
  return (
    <DashboardLayout>
      <AttioContactsTable />
    </DashboardLayout>
  );
}
