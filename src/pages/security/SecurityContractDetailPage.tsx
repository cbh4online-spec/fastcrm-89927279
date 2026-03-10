import { useParams, useNavigate } from "react-router-dom";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { useTranslation } from "react-i18next";
import { useSecurityContract } from "@/hooks/security/useSecurityContracts";
import { useSecurityContracts } from "@/hooks/security/useSecurityContracts";
import { useSecurityConversions } from "@/hooks/security/useSecurityConversions";
import { useSecurityProposal } from "@/hooks/security/useSecurityProposals";
import { SecurityPipelineStepper } from "@/components/security/SecurityPipelineStepper";
import { SecurityInlineField } from "@/components/security/SecurityInlineField";
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
  const { data: linkedProposal } = useSecurityProposal(contract?.proposal_id);

  if (isLoading || !contract) {
    return (
      <DashboardLayout>
        <div className="text-center py-12 text-muted-foreground">A carregar...</div>
      </DashboardLayout>
    );
  }

  const save = (field: string) => (value: unknown) => {
    updateContract.mutate({ id: contract.id, [field]: value });
  };

  const saveTerms = (field: string) => (value: unknown) => {
    const terms = (contract.commercial_terms_json || {}) as any;
    updateContract.mutate({ id: contract.id, commercial_terms_json: { ...terms, [field]: value } });
  };

  const sys = contract.security_systems as any;
  const site = sys?.security_installation_sites as any;
  const terms = (contract.commercial_terms_json || {}) as any;
  const canCreateInstallation = !contract.system_id && ["draft", "active"].includes(contract.contract_status);
  const canActivate = contract.contract_status === "draft";
  const hasSystem = !!contract.system_id;

  const leadFromProposal = linkedProposal?.security_leads as any;
  const leadId = contract.lead_id || linkedProposal?.lead_id;
  const requestId = leadFromProposal?.partner_request_id;

  const handleActivate = () => {
    updateContract.mutate({ id: contract.id, contract_status: "active", start_date: new Date().toISOString().split("T")[0] });
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
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

        <SecurityPipelineStepper currentStage="contract" requestId={requestId} leadId={leadId} proposalId={contract.proposal_id} contractId={id} systemId={contract.system_id} />

        <div className="flex gap-2 flex-wrap">
          {canActivate && (
            <Button onClick={handleActivate} disabled={updateContract.isPending} className="gap-2">
              <PlayCircle className="h-4 w-4" /> Ativar Contrato
            </Button>
          )}
          {canCreateInstallation && (
            <Button variant={canActivate ? "outline" : "default"} onClick={() => convertContractToInstallation.mutate(contract)} disabled={convertContractToInstallation.isPending} className="gap-2">
              <Wrench className="h-4 w-4" /> Criar Instalação
            </Button>
          )}
          {hasSystem && (
            <Button variant="outline" onClick={() => navigate(`/dashboard/security/systems/${contract.system_id}`)} className="gap-2">
              Ver Instalação <ArrowRight className="h-4 w-4" />
            </Button>
          )}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {leadId && (
            <Card className="cursor-pointer hover:border-primary/50 transition-colors" onClick={() => navigate(`/dashboard/security/leads/${leadId}`)}>
              <CardContent className="p-4 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Target className="h-5 w-5 text-primary" />
                  <div>
                    <p className="font-medium text-sm">Lead de Origem</p>
                    <p className="text-xs text-muted-foreground">{leadFromProposal?.client_name || "Ver lead"}</p>
                  </div>
                </div>
                <ArrowRight className="h-4 w-4 text-muted-foreground" />
              </CardContent>
            </Card>
          )}
          {contract.proposal_id && (
            <Card className="cursor-pointer hover:border-primary/50 transition-colors" onClick={() => navigate(`/dashboard/security/proposals/${contract.proposal_id}`)}>
              <CardContent className="p-4 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <CheckCircle className="h-5 w-5 text-emerald-600" />
                  <div>
                    <p className="font-medium text-sm">Proposta Adjudicada</p>
                    <p className="text-xs text-muted-foreground">{linkedProposal?.title || linkedProposal?.proposal_number || "Ver proposta"}</p>
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
            <CardContent className="space-y-1 text-sm">
              <SecurityInlineField label="Tipo" value={contract.contract_type} fieldType="select" options={["installation", "maintenance", "mixed", "renewal"]} onSave={save("contract_type")} />
              <SecurityInlineField label="Estado" value={contract.contract_status} fieldType="select" options={["draft", "active", "expired", "suspended", "terminated"]} onSave={save("contract_status")} />
              <SecurityInlineField label="Data de Adjudicação" value={contract.adjudication_date} fieldType="date" onSave={save("adjudication_date")} />
              <SecurityInlineField label="Início" value={contract.start_date} fieldType="date" onSave={save("start_date")} />
              <SecurityInlineField label="Fim" value={contract.end_date} fieldType="date" onSave={save("end_date")} />
              <SecurityInlineField label="Aviso Renovação (dias)" value={contract.renewal_notice_days} fieldType="number" onSave={save("renewal_notice_days")} />
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle className="text-base">Condições Comerciais</CardTitle></CardHeader>
            <CardContent className="space-y-1 text-sm">
              <SecurityInlineField label="Valor Total" value={terms.total_value} fieldType="currency" onSave={saveTerms("total_value")} />
              <SecurityInlineField label="Equipamento" value={terms.equipment_value} fieldType="currency" onSave={saveTerms("equipment_value")} />
              <SecurityInlineField label="Mão de Obra" value={terms.labor_value} fieldType="currency" onSave={saveTerms("labor_value")} />
              <SecurityInlineField label="Notas" value={contract.notes} onSave={save("notes")} placeholder="Sem notas" />
            </CardContent>
          </Card>
        </div>

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
