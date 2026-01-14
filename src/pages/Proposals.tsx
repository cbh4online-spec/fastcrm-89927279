import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { ProposalsList } from "@/components/proposals/ProposalsList";

export default function Proposals() {
  return (
    <DashboardLayout>
      <ProposalsList />
    </DashboardLayout>
  );
}
