import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { ProposalTemplateBuilder } from "@/components/proposals/ProposalTemplateBuilder";

export default function ProposalTemplateBuilderPage() {
  return (
    <DashboardLayout>
      <ProposalTemplateBuilder />
    </DashboardLayout>
  );
}
