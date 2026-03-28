import DashboardLayout from "@/components/dashboard/DashboardLayout";
import { ProposalTemplateBuilder } from "@/components/proposals/ProposalTemplateBuilder";

export default function ProposalTemplateBuilderPage() {
  return (
    <DashboardLayout>
      <ProposalTemplateBuilder />
    </DashboardLayout>
  );
}
