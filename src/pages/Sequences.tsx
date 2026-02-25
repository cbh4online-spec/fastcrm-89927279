import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { SequencesListPage } from "@/components/sequences/SequencesListPage";

export default function Sequences() {
  return (
    <DashboardLayout>
      <SequencesListPage />
    </DashboardLayout>
  );
}
