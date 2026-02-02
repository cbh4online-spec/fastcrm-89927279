import { useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { ProposalDetailDialog } from "@/components/proposals/ProposalDetailDialog";

export default function ProposalDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  // This page wraps the ProposalDetailDialog for direct URL access
  // The dialog handles all the proposal editing functionality

  const handleClose = () => {
    navigate("/dashboard/proposals");
  };

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
      <ProposalDetailDialog
        open={true}
        onOpenChange={(open) => {
          if (!open) handleClose();
        }}
        proposalId={id}
      />
    </DashboardLayout>
  );
}
