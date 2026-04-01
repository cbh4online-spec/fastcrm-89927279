import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useProposals } from "@/hooks/useProposals";
import { CreateProposalDialog } from "@/components/proposals/CreateProposalDialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Plus, FileText, ExternalLink } from "lucide-react";
import { format } from "date-fns";
import { pt } from "date-fns/locale";

interface Props {
  opportunityId: string;
}

const statusConfig: Record<string, { label: string; variant: "default" | "secondary" | "outline" | "destructive" }> = {
  draft: { label: "Rascunho", variant: "secondary" },
  published: { label: "Publicada", variant: "default" },
  viewed: { label: "Visualizada", variant: "outline" },
  accepted: { label: "Aceite", variant: "default" },
  rejected: { label: "Rejeitada", variant: "destructive" },
  expired: { label: "Expirada", variant: "secondary" },
};

function fmt(value: number | null | undefined): string {
  if (!value) return "—";
  if (value >= 1_000) return `€${(value / 1_000).toFixed(1)}K`;
  return `€${value.toFixed(0)}`;
}

export function OpportunityProposalsTab({ opportunityId }: Props) {
  const navigate = useNavigate();
  const { data: proposals, isLoading } = useProposals(opportunityId);
  const [showCreate, setShowCreate] = useState(false);

  if (isLoading) {
    return (
      <div className="space-y-3">
        <Skeleton className="h-20 w-full" />
        <Skeleton className="h-20 w-full" />
      </div>
    );
  }

  if (!proposals || proposals.length === 0) {
    return (
      <div className="text-center py-12 space-y-3">
        <FileText className="w-10 h-10 mx-auto text-muted-foreground/30" />
        <p className="text-sm text-muted-foreground">Sem propostas para este negócio</p>
        <Button variant="outline" size="sm" className="gap-1.5" onClick={() => setShowCreate(true)}>
          <Plus className="w-3.5 h-3.5" />
          Criar Proposta
        </Button>
        <CreateProposalDialog
          open={showCreate}
          onOpenChange={setShowCreate}
          opportunityId={opportunityId}
        />
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">{proposals.length} proposta(s)</p>
        <Button variant="outline" size="sm" className="gap-1.5" onClick={() => setShowCreate(true)}>
          <Plus className="w-3.5 h-3.5" />
          Nova Proposta
        </Button>
      </div>

      {proposals.map((p: any) => {
        const status = statusConfig[p.status] || { label: p.status, variant: "secondary" as const };
        return (
          <Card
            key={p.id}
            className="cursor-pointer hover:border-primary/30 transition-colors"
            onClick={() => navigate(`/dashboard/proposals/${p.id}`)}
          >
            <CardContent className="p-4 flex items-center justify-between gap-3">
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <FileText className="h-4 w-4 text-muted-foreground shrink-0" />
                  <p className="text-sm font-medium truncate">{p.title}</p>
                </div>
                <div className="flex items-center gap-3 text-xs text-muted-foreground">
                  <span>{format(new Date(p.created_at), "dd MMM yyyy", { locale: pt })}</span>
                  {p.price != null && <span className="font-medium text-foreground">{fmt(p.price)}</span>}
                </div>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <Badge variant={status.variant} className="text-xs">{status.label}</Badge>
                <ExternalLink className="h-3.5 w-3.5 text-muted-foreground" />
              </div>
            </CardContent>
          </Card>
        );
      })}

      <CreateProposalDialog
        open={showCreate}
        onOpenChange={setShowCreate}
        opportunityId={opportunityId}
      />
    </div>
  );
}
