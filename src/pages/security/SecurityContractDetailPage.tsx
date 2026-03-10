import { useParams, useNavigate } from "react-router-dom";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { useTranslation } from "react-i18next";
import { useSecurityContract } from "@/hooks/security/useSecurityContracts";
import { useSecurityContracts } from "@/hooks/security/useSecurityContracts";
import { useSecurityConversions } from "@/hooks/security/useSecurityConversions";
import { useSecurityProposal } from "@/hooks/security/useSecurityProposals";
import { SecurityPipelineStepper } from "@/components/security/SecurityPipelineStepper";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ArrowLeft, FileText, Wrench, ArrowRight, Target, CheckCircle, PlayCircle } from "lucide-react";
import { format } from "date-fns";

const statusLabels: Record<string, string> = {
  draft: "Rascunho", active: "Ativo", expired: "Expirado",
  suspended: "Suspenso", terminated: "Terminado",
};

const typeLabels: Record<string, string> = {
  installation: "Instalação", maintenance: "Manutenção",
  mixed: "Misto", renewal: "Renovação",
};

export default function SecurityContractDetailPage() {
  const { t } = useTranslation("security");
  const { id } = useParams();
  const navigate = useNavigate();
  const { data: contract, isLoading } = useSecurityContract(id);
  const { updateContract } = useSecurityContracts();
  const { convertContractToInstallation } = useSecurityConversions();

  // Load linked proposal details
  const { data: linkedProposal } = useSecurityProposal(contract?.proposal_id);

  if (isLoading || !contract) {
    return (
      <DashboardLayout>
        <div className="text-center py-12 text-muted-foreground">A carregar...</div>
      </DashboardLayout>
    );
  }

  const sys = contract.security_systems as any;
  const site = sys?.security_installation_sites as any;
  const terms = (contract.commercial_terms_json || {}) as any;
  const canCreateInstallation = !contract.system_id && ["draft", "active"].includes(contract.contract_status);
  const canActivate = contract.contract_status === "draft";
  const hasSystem = !!contract.system_id;

  // Resolve lead info from proposal
  const leadFromProposal = linkedProposal?.security_leads as any;
  const leadId = contract.lead_id || linkedProposal?.lead_id;
  const requestId = leadFromProposal?.partner_request_id;

  const handleActivate = () => {
    updateContract.mutate({
      id: contract.id,
      contract_status: "active",
      start_date: new Date().toISOString().split("T")[0],
    });
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate("/dashboard/security/contracts")}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="flex-1">
            <h1 className="text-xl font-bold flex items-center gap-2">
              <FileText className="h-5 w-5 text-primary" />
              {typeLabels[contract.contract_type] || contract.contract_type} — {site?.site_name || "Contrato"}
            </h1>
            <p className="text-sm text-muted-foreground">
              {contract.adjudication_date && `Adjudicado em ${format(new Date(contract.adjudication_date), "dd/MM/yyyy")}`}
            </p>
          </div>
          <Badge>{statusLabels[contract.contract_status] || contract.contract_status}</Badge>
        </div>

        {/* Pipeline Stepper */}
        <SecurityPipelineStepper
          currentStage="contract"
          requestId={requestId}
          leadId={leadId}
          proposalId={contract.proposal_id}
          contractId={id}
          systemId={contract.system_id}
        />

        {/* Actions */}
        <div className="flex gap-2 flex-wrap">
          {canActivate && (
            <Button onClick={handleActivate} disabled={updateContract.isPending} className="gap-2">
              <PlayCircle className="h-4 w-4" />
              Ativar Contrato
            </Button>
          )}
          {canCreateInstallation && (
            <Button
              variant={canActivate ? "outline" : "default"}
              onClick={() => convertContractToInstallation.mutate(contract)}
              disabled={convertContractToInstallation.isPending}
              className="gap-2"
            >
              <Wrench className="h-4 w-4" />
              Criar Instalação
            </Button>
          )}
          {hasSystem && (
            <Button
              variant="outline"
              onClick={() => navigate(`/dashboard/security/systems/${contract.system_id}`)}
              className="gap-2"
            >
              Ver Instalação
              <ArrowRight className="h-4 w-4" />
            </Button>
          )}
        </div>

        {/* Cross-links */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {leadId && (
            <Card
              className="cursor-pointer hover:border-primary/50 transition-colors"
              onClick={() => navigate(`/dashboard/security/leads/${leadId}`)}
            >
              <CardContent className="p-4 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Target className="h-5 w-5 text-primary" />
                  <div>
                    <p className="font-medium text-sm">Lead de Origem</p>
                    <p className="text-xs text-muted-foreground">
                      {leadFromProposal?.client_name || "Ver lead"}
                    </p>
                  </div>
                </div>
                <ArrowRight className="h-4 w-4 text-muted-foreground" />
              </CardContent>
            </Card>
          )}
          {contract.proposal_id && (
            <Card
              className="cursor-pointer hover:border-primary/50 transition-colors"
              onClick={() => navigate(`/dashboard/security/proposals/${contract.proposal_id}`)}
            >
              <CardContent className="p-4 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <CheckCircle className="h-5 w-5 text-green-600" />
                  <div>
                    <p className="font-medium text-sm">Proposta Adjudicada</p>
                    <p className="text-xs text-muted-foreground">
                      {linkedProposal?.title || linkedProposal?.proposal_number || "Ver proposta"}
                    </p>
                  </div>
                </div>
                <ArrowRight className="h-4 w-4 text-muted-foreground" />
              </CardContent>
            </Card>
          )}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card>
            <CardHeader><CardTitle className="text-base">Dados do Contrato</CardTitle></CardHeader>
            <CardContent className="space-y-3 text-sm">
              <InfoRow label="Tipo" value={typeLabels[contract.contract_type] || contract.contract_type} />
              <InfoRow label="Estado" value={statusLabels[contract.contract_status] || contract.contract_status} />
              <InfoRow label="Data de Adjudicação" value={contract.adjudication_date ? format(new Date(contract.adjudication_date), "dd/MM/yyyy") : null} />
              <InfoRow label="Início" value={contract.start_date ? format(new Date(contract.start_date), "dd/MM/yyyy") : null} />
              <InfoRow label="Fim" value={contract.end_date ? format(new Date(contract.end_date), "dd/MM/yyyy") : null} />
              <InfoRow label="Aviso de Renovação" value={contract.renewal_notice_days ? `${contract.renewal_notice_days} dias` : null} />
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle className="text-base">Condições Comerciais</CardTitle></CardHeader>
            <CardContent className="space-y-3 text-sm">
              {terms.total_value && <InfoRow label="Valor Total" value={`€${Number(terms.total_value).toFixed(2)}`} />}
              {terms.equipment_value && <InfoRow label="Equipamento" value={`€${Number(terms.equipment_value).toFixed(2)}`} />}
              {terms.labor_value && <InfoRow label="Mão de Obra" value={`€${Number(terms.labor_value).toFixed(2)}`} />}
              {contract.notes && (
                <div className="pt-3 border-t">
                  <p className="text-xs font-medium mb-1">Notas</p>
                  <p className="text-muted-foreground">{contract.notes}</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* SLA Info */}
        {contract.sla_json && Object.keys(contract.sla_json as object).length > 0 && (
          <Card>
            <CardHeader><CardTitle className="text-base">SLA</CardTitle></CardHeader>
            <CardContent>
              <pre className="text-xs bg-muted/50 p-4 rounded-lg overflow-auto">
                {JSON.stringify(contract.sla_json, null, 2)}
              </pre>
            </CardContent>
          </Card>
        )}
      </div>
    </DashboardLayout>
  );
}

function InfoRow({ label, value }: { label: string; value?: string | null }) {
  if (!value) return null;
  return (
    <div className="flex justify-between">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-medium">{value}</span>
    </div>
  );
}
