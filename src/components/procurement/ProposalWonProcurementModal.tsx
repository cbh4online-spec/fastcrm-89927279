import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useCreateProjectFromProposal } from "@/hooks/useProcurementProjects";
import { Loader2, Package, ArrowRight } from "lucide-react";
import { useNavigate } from "react-router-dom";

interface ProposalWonProcurementModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  proposalId: string;
  proposalTitle: string;
  workspaceId: string;
}

export function ProposalWonProcurementModal({
  open,
  onOpenChange,
  proposalId,
  proposalTitle,
  workspaceId,
}: ProposalWonProcurementModalProps) {
  const navigate = useNavigate();
  const createProject = useCreateProjectFromProposal();
  const [created, setCreated] = useState(false);
  const [projectId, setProjectId] = useState<string | null>(null);

  const handleCreate = async () => {
    const result = await createProject.mutateAsync({ proposal_id: proposalId, workspace_id: workspaceId });
    setProjectId(result.project_id);
    setCreated(true);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Package className="h-5 w-5 text-primary" />
            Proposta Aceite — Compras
          </DialogTitle>
          <DialogDescription>
            A proposta <strong>"{proposalTitle}"</strong> foi aceite. Deseja criar um projeto de compras e calcular as necessidades de stock?
          </DialogDescription>
        </DialogHeader>

        {created ? (
          <div className="space-y-4 py-4">
            <div className="text-center text-sm text-muted-foreground">
              ✅ Projeto criado com sucesso!
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => onOpenChange(false)}>Fechar</Button>
              <Button onClick={() => { onOpenChange(false); navigate(`/dashboard/procurement/projects/${projectId}`); }}>
                Ver Projeto <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </DialogFooter>
          </div>
        ) : (
          <DialogFooter>
            <Button variant="outline" onClick={() => onOpenChange(false)}>Agora Não</Button>
            <Button onClick={handleCreate} disabled={createProject.isPending}>
              {createProject.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Criar Projeto
            </Button>
          </DialogFooter>
        )}
      </DialogContent>
    </Dialog>
  );
}
