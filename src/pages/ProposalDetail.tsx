import { useParams, useNavigate } from "react-router-dom";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { ProposalDetailContent } from "@/components/proposals/ProposalDetailContent";

export default function ProposalDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  if (!id) {
    return (
      <DashboardLayout>
        <div className="text-center py-12">
          <p className="text-muted-foreground">Proposta não encontrada.</p>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <ProposalDetailContent
        proposalId={id}
        renderMode="page"
        onClose={() => navigate("/dashboard/proposals")}
      />
    </DashboardLayout>
  );
}
