import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { useTranslation } from "react-i18next";
import { useParams, useNavigate } from "react-router-dom";
import { useSecurityProposal } from "@/hooks/security/useSecurityProposals";
import { useSecurityConversions } from "@/hooks/security/useSecurityConversions";
import { useSecurityProposals } from "@/hooks/security/useSecurityProposals";
import { useSecurityContracts } from "@/hooks/security/useSecurityContracts";
import { SecurityPipelineStepper } from "@/components/security/SecurityPipelineStepper";
import { SecurityInlineField } from "@/components/security/SecurityInlineField";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ArrowLeft, FileText, CheckCircle, Send, XCircle, Target, ArrowRight } from "lucide-react";

const statusLabels: Record<string, string> = {
  draft: "Rascunho", sent: "Enviada", under_review: "Em Análise",
  accepted: "Aceite", rejected: "Rejeitada", expired: "Expirada",
};

export default function SecurityProposalDetailPage() {
  const { t } = useTranslation("security");
  const { id } = useParams();
  const navigate = useNavigate();
  const { data: proposal, isLoading } = useSecurityProposal(id);
  const { convertProposalToContract } = useSecurityConversions();
  const { updateProposal } = useSecurityProposals();
  const { contracts } = useSecurityContracts();

  if (isLoading || !proposal) {
    return (
      <DashboardLayout>
        <div className="text-center py-12 text-muted-foreground">A carregar...</div>
      </DashboardLayout>
    );
  }

  const save = (field: string) => (value: unknown) => {
    updateProposal.mutate({ id: proposal.id, [field]: value });
  };

  const linkedContract = contracts.find((c: any) => c.proposal_id === proposal.id);
  const canSend = proposal.status === "draft";
  const canAccept = ["sent", "under_review"].includes(proposal.status);
  const canReject = ["sent", "under_review"].includes(proposal.status);
  const isFailed = proposal.status === "rejected";
  const lead = proposal.security_leads as any;

  const handleSend = () => {
    updateProposal.mutate({ id: proposal.id, status: "sent", sent_at: new Date().toISOString() });
  };
  const handleAccept = () => { convertProposalToContract.mutate(proposal); };
  const handleReject = () => { updateProposal.mutate({ id: proposal.id, status: "rejected" }); };

  const equipmentItems = Array.isArray(proposal.equipment_json) ? proposal.equipment_json : [];

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate("/dashboard/security/proposals")}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="flex-1">
            <h1 className="text-xl font-bold flex items-center gap-2">
              <FileText className="h-5 w-5 text-primary" />
              {proposal.title || "Proposta"}
            </h1>
            <p className="text-sm text-muted-foreground">
              Versão {proposal.version}
              {(proposal.security_clients as any)?.name && ` · ${(proposal.security_clients as any).name}`}
            </p>
          </div>
          <Badge>{statusLabels[proposal.status] || proposal.status}</Badge>
        </div>

        <SecurityPipelineStepper
          currentStage="proposal"
          requestId={lead?.partner_request_id}
          leadId={proposal.lead_id}
          proposalId={id}
          contractId={linkedContract?.id}
          systemId={linkedContract?.system_id}
          isFailed={isFailed}
        />

        <div className="flex gap-2 flex-wrap">
          {canSend && (
            <Button onClick={handleSend} disabled={updateProposal.isPending} className="gap-2">
              <Send className="h-4 w-4" /> Enviar Proposta
            </Button>
          )}
          {canAccept && (
            <Button onClick={handleAccept} disabled={convertProposalToContract.isPending} className="gap-2">
              <CheckCircle className="h-4 w-4" /> Adjudicar
            </Button>
          )}
          {canReject && (
            <Button variant="outline" onClick={handleReject} disabled={updateProposal.isPending} className="gap-2 text-destructive hover:text-destructive">
              <XCircle className="h-4 w-4" /> Rejeitar
            </Button>
          )}
        </div>

        {lead && (
          <Card className="cursor-pointer hover:border-primary/50 transition-colors" onClick={() => navigate(`/dashboard/security/leads/${proposal.lead_id}`)}>
            <CardContent className="p-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Target className="h-5 w-5 text-primary" />
                <div>
                  <p className="font-medium text-sm">Lead de Origem</p>
                  <p className="text-xs text-muted-foreground">{lead.client_name} · {lead.system_type} · {lead.status}</p>
                </div>
              </div>
              <ArrowRight className="h-4 w-4 text-muted-foreground" />
            </CardContent>
          </Card>
        )}

        {linkedContract && (
          <Card className="cursor-pointer hover:border-primary/50 transition-colors" onClick={() => navigate(`/dashboard/security/contracts/${linkedContract.id}`)}>
            <CardContent className="p-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <CheckCircle className="h-5 w-5 text-emerald-600" />
                <div>
                  <p className="font-medium text-sm">Contrato Adjudicado</p>
                  <p className="text-xs text-muted-foreground">{linkedContract.contract_type} · {linkedContract.contract_status}</p>
                </div>
              </div>
              <ArrowRight className="h-4 w-4 text-muted-foreground" />
            </CardContent>
          </Card>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card>
            <CardHeader><CardTitle className="text-base">Dados da Proposta</CardTitle></CardHeader>
            <CardContent className="space-y-1 text-sm">
              <SecurityInlineField label="Título" value={proposal.title} onSave={save("title")} />
              <div className="flex justify-between min-h-[36px] items-center">
                <span className="text-muted-foreground text-sm">Nº Proposta</span>
                <span className="font-medium text-sm">{proposal.proposal_number || "—"}</span>
              </div>
              <SecurityInlineField label="Valor Equipamento" value={proposal.equipment_value} fieldType="currency" onSave={save("equipment_value")} />
              <SecurityInlineField label="Valor Mão de Obra" value={proposal.labor_value} fieldType="currency" onSave={save("labor_value")} />
              <SecurityInlineField label="Total" value={proposal.total_value} fieldType="currency" onSave={save("total_value")} />
              <SecurityInlineField label="Desconto (%)" value={proposal.discount_percent} fieldType="number" onSave={save("discount_percent")} />
              <SecurityInlineField label="Valor Final" value={proposal.final_value} fieldType="currency" onSave={save("final_value")} />
              <SecurityInlineField label="Validade (dias)" value={proposal.validity_days} fieldType="number" onSave={save("validity_days")} />
              {proposal.valid_until && (
                <SecurityInlineField label="Válida até" value={proposal.valid_until} fieldType="date" onSave={save("valid_until")} />
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle className="text-base">Solução Proposta</CardTitle></CardHeader>
            <CardContent className="space-y-2">
              <SecurityInlineField label="Descrição" value={proposal.solution_description} onSave={save("solution_description")} placeholder="Sem descrição" />
              <SecurityInlineField label="Notas Comerciais" value={proposal.commercial_notes} onSave={save("commercial_notes")} placeholder="—" />
              <SecurityInlineField label="Condições" value={proposal.conditions} onSave={save("conditions")} placeholder="—" />
            </CardContent>
          </Card>
        </div>

        {equipmentItems.length > 0 && (
          <Card>
            <CardHeader><CardTitle className="text-base">Equipamentos Previstos</CardTitle></CardHeader>
            <CardContent>
              <div className="rounded-lg border overflow-hidden">
                <table className="w-full text-sm">
                  <thead className="bg-muted/50">
                    <tr>
                      <th className="text-left p-3 font-medium">Equipamento</th>
                      <th className="text-left p-3 font-medium">Marca</th>
                      <th className="text-left p-3 font-medium">Modelo</th>
                      <th className="text-right p-3 font-medium">Qtd</th>
                      <th className="text-right p-3 font-medium">Preço Unit.</th>
                      <th className="text-right p-3 font-medium">Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {equipmentItems.map((item: any, i: number) => (
                      <tr key={i} className="border-t">
                        <td className="p-3">{item.name || "—"}</td>
                        <td className="p-3">{item.brand || "—"}</td>
                        <td className="p-3">{item.model || "—"}</td>
                        <td className="p-3 text-right">{item.qty || 0}</td>
                        <td className="p-3 text-right">{item.unit_price ? `€${Number(item.unit_price).toFixed(2)}` : "—"}</td>
                        <td className="p-3 text-right">{item.total ? `€${Number(item.total).toFixed(2)}` : "—"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </DashboardLayout>
  );
}
