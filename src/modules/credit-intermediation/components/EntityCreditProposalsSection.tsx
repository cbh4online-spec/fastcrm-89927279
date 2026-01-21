import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useCreditProposals } from "../hooks/useCreditProposals";
import { useWorkspaceModules } from "@/hooks/useWorkspaceModules";
import { CreateProposalDialog } from "./CreateProposalDialog";
import { 
  CREDIT_TYPE_LABELS, 
  PROPOSAL_STATUS_LABELS, 
  PROPOSAL_STATUS_COLORS,
  CreditType,
  ProposalStatus
} from "../types";
import { 
  Landmark, 
  Plus, 
  ArrowRight, 
  FileText, 
  TrendingUp,
  AlertCircle,
  ExternalLink,
  Lock
} from "lucide-react";
import { format } from "date-fns";
import { pt } from "date-fns/locale";

interface EntityCreditProposalsSectionProps {
  entityType: "lead" | "contact" | "company";
  entityId: string;
  entityName: string;
}

export function EntityCreditProposalsSection({
  entityType,
  entityId,
  entityName,
}: EntityCreditProposalsSectionProps) {
  const navigate = useNavigate();
  const { data: proposals = [], isLoading } = useCreditProposals();
  const { isModuleInstalled } = useWorkspaceModules();
  const [showCreateDialog, setShowCreateDialog] = useState(false);

  const hasModule = isModuleInstalled("credit-intermediation");

  // Filter proposals for this entity
  const entityProposals = (proposals || []).filter((p) => {
    // Match by entity_id (the proposal links via entity_type and entity_id)
    return p.entity_id === entityId;
  });

  // If module not installed, show locked state
  if (!hasModule) {
    return (
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Landmark className="h-5 w-5 text-muted-foreground" />
              <CardTitle className="text-lg">Propostas de Crédito</CardTitle>
            </div>
            <Badge variant="secondary" className="gap-1">
              <Lock className="h-3 w-3" />
              Módulo Bloqueado
            </Badge>
          </div>
          <CardDescription>
            Instale o módulo de Intermediação de Crédito para gerir propostas
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center py-6 text-center">
            <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center mb-3">
              <Lock className="h-6 w-6 text-muted-foreground" />
            </div>
            <p className="text-sm text-muted-foreground mb-4">
              Aceda ao Marketplace para instalar este módulo
            </p>
            <Button
              variant="outline"
              onClick={() => navigate("/dashboard/marketplace")}
              className="gap-2"
            >
              <ExternalLink className="h-4 w-4" />
              Ver Marketplace
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Landmark className="h-5 w-5 text-primary" />
            <CardTitle className="text-lg">Propostas de Crédito</CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {[1, 2].map((i) => (
              <Skeleton key={i} className="h-20 w-full" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Landmark className="h-5 w-5 text-primary" />
            <div>
              <CardTitle className="text-lg">Propostas de Crédito</CardTitle>
              <CardDescription>
                {entityProposals.length} proposta{entityProposals.length !== 1 ? "s" : ""} associada{entityProposals.length !== 1 ? "s" : ""}
              </CardDescription>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => navigate("/dashboard/credit")}
              className="gap-1"
            >
              <ExternalLink className="h-4 w-4" />
              Ver Módulo
            </Button>
            <Button 
              size="sm" 
              onClick={() => setShowCreateDialog(true)}
              className="gap-1"
            >
              <Plus className="h-4 w-4" />
              Nova Proposta
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {entityProposals.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mb-3">
              <FileText className="h-6 w-6 text-primary" />
            </div>
            <h4 className="font-medium mb-1">Sem propostas de crédito</h4>
            <p className="text-sm text-muted-foreground mb-4">
              Crie a primeira proposta de crédito para {entityName}
            </p>
            <Button 
              variant="outline" 
              onClick={() => setShowCreateDialog(true)}
              className="gap-2"
            >
              <Plus className="h-4 w-4" />
              Criar Proposta
            </Button>
          </div>
        ) : (
          <div className="space-y-3">
            {entityProposals.map((proposal) => (
              <div
                key={proposal.id}
                className="flex items-center justify-between p-4 rounded-lg border bg-card hover:bg-muted/50 transition-colors cursor-pointer"
                onClick={() => navigate("/dashboard/credit")}
              >
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                    <Landmark className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-medium">
                        {CREDIT_TYPE_LABELS[proposal.credit_type as CreditType]}
                      </span>
                      <Badge 
                        variant="outline" 
                        className={PROPOSAL_STATUS_COLORS[proposal.status as ProposalStatus]}
                      >
                        {PROPOSAL_STATUS_LABELS[proposal.status as ProposalStatus]}
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {new Intl.NumberFormat("pt-PT", {
                        style: "currency",
                        currency: "EUR",
                      }).format(proposal.amount_requested || 0)}
                      {proposal.term_months && ` · ${proposal.term_months} meses`}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-4">
                  {proposal.ai_viability_score !== null && (
                    <div className="text-right">
                      <div className="flex items-center gap-1 text-sm">
                        <TrendingUp className="h-4 w-4 text-emerald-500" />
                        <span className="font-medium">{proposal.ai_viability_score}%</span>
                      </div>
                      <p className="text-xs text-muted-foreground">Viabilidade IA</p>
                    </div>
                  )}
                  <div className="text-right text-sm text-muted-foreground">
                    {format(new Date(proposal.created_at), "d MMM yyyy", { locale: pt })}
                  </div>
                  <ArrowRight className="h-4 w-4 text-muted-foreground" />
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Summary Stats */}
        {entityProposals.length > 0 && (
          <div className="mt-4 pt-4 border-t grid grid-cols-3 gap-4 text-center">
            <div>
              <p className="text-2xl font-bold text-primary">
                {entityProposals.length}
              </p>
              <p className="text-xs text-muted-foreground">Total</p>
            </div>
            <div>
              <p className="text-2xl font-bold text-emerald-600">
                {entityProposals.filter((p) => p.status === "approved" || p.status === "funded").length}
              </p>
              <p className="text-xs text-muted-foreground">Aprovadas</p>
            </div>
            <div>
              <p className="text-2xl font-bold">
                {new Intl.NumberFormat("pt-PT", {
                  style: "currency",
                  currency: "EUR",
                  notation: "compact",
                }).format(
                  entityProposals.reduce((sum, p) => sum + (p.amount_requested || 0), 0)
                )}
              </p>
              <p className="text-xs text-muted-foreground">Volume</p>
            </div>
          </div>
        )}
      </CardContent>

      {/* Create Proposal Dialog */}
      <CreateProposalDialog>
        <span 
          ref={(el) => {
            // Programmatic trigger
            if (showCreateDialog && el) {
              el.click();
              setShowCreateDialog(false);
            }
          }}
          className="hidden"
        />
      </CreateProposalDialog>
    </Card>
  );
}
