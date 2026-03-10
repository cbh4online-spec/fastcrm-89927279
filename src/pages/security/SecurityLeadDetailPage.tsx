import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { useTranslation } from "react-i18next";
import { useParams, useNavigate } from "react-router-dom";
import { useSecurityLead } from "@/hooks/security/useSecurityLeads";
import { useSecurityLeads } from "@/hooks/security/useSecurityLeads";
import { useSecurityConversions } from "@/hooks/security/useSecurityConversions";
import { useSecurityProposals } from "@/hooks/security/useSecurityProposals";
import { SecurityPipelineStepper } from "@/components/security/SecurityPipelineStepper";
import { SecurityInlineField } from "@/components/security/SecurityInlineField";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ArrowLeft, FileText, ArrowRight, Target, XCircle } from "lucide-react";
import { toast } from "sonner";

const statusLabels: Record<string, string> = {
  new: "Novo", qualifying: "Em Qualificação", qualified: "Qualificado",
  proposal_sent: "Proposta Enviada", won: "Ganho", lost: "Perdido", archived: "Arquivado",
};

export default function SecurityLeadDetailPage() {
  const { t } = useTranslation("security");
  const { id } = useParams();
  const navigate = useNavigate();
  const { data: lead, isLoading } = useSecurityLead(id);
  const { convertLeadToProposal } = useSecurityConversions();
  const { updateLead } = useSecurityLeads();
  const { proposals } = useSecurityProposals();

  const linkedProposals = proposals.filter((p: any) => p.lead_id === id);
  const firstProposal = linkedProposals[0];

  if (isLoading || !lead) {
    return (
      <DashboardLayout>
        <div className="text-center py-12 text-muted-foreground">A carregar...</div>
      </DashboardLayout>
    );
  }

  const save = (field: string) => (value: unknown) => {
    updateLead.mutate({ id: lead.id, [field]: value });
  };

  const canCreateProposal = ["new", "qualifying", "qualified"].includes(lead.status);
  const canMarkLost = !["won", "lost", "archived"].includes(lead.status);
  const isFailed = lead.status === "lost";

  const handleMarkLost = () => {
    updateLead.mutate({ id: lead.id, status: "lost" });
    toast.info("Lead marcado como perdido");
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate("/dashboard/security/leads")}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="flex-1">
            <h1 className="text-xl font-bold flex items-center gap-2">
              <Target className="h-5 w-5 text-primary" />
              {lead.client_name || "Lead"}
            </h1>
            <p className="text-sm text-muted-foreground">
              {lead.system_type && <span className="capitalize">{lead.system_type}</span>}
              {lead.request_type && <span> · {lead.request_type}</span>}
            </p>
          </div>
          <Badge>{statusLabels[lead.status] || lead.status}</Badge>
        </div>

        <SecurityPipelineStepper
          currentStage="lead"
          requestId={lead.partner_request_id}
          leadId={id}
          proposalId={firstProposal?.id}
          isFailed={isFailed}
        />

        <div className="flex gap-2 flex-wrap">
          {canCreateProposal && (
            <Button onClick={() => convertLeadToProposal.mutate(lead)} disabled={convertLeadToProposal.isPending} className="gap-2">
              <FileText className="h-4 w-4" /> Criar Proposta
            </Button>
          )}
          {canMarkLost && (
            <Button variant="outline" onClick={handleMarkLost} disabled={updateLead.isPending} className="gap-2 text-destructive hover:text-destructive">
              <XCircle className="h-4 w-4" /> Marcar como Perdido
            </Button>
          )}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card>
            <CardHeader><CardTitle className="text-base">Informação do Lead</CardTitle></CardHeader>
            <CardContent className="space-y-1 text-sm">
              <SecurityInlineField label="Cliente" value={lead.client_name} onSave={save("client_name")} />
              <SecurityInlineField label="Tipo de Cliente" value={lead.client_type} fieldType="select" options={["particular", "empresa", "condominio"]} onSave={save("client_type")} />
              <SecurityInlineField label="Morada" value={lead.installation_address} onSave={save("installation_address")} />
              <SecurityInlineField label="Origem" value={lead.origin} fieldType="select" options={["partner", "direct", "referral", "website", "other"]} onSave={save("origin")} />
              <SecurityInlineField label="Prioridade" value={lead.priority} fieldType="select" options={["low", "medium", "high", "urgent"]} onSave={save("priority")} />
              <SecurityInlineField label="Tipo de Sistema" value={lead.system_type} fieldType="select" options={["cctv", "intrusion", "fire", "access_control", "mixed"]} onSave={save("system_type")} />
              <SecurityInlineField label="Tipo de Pedido" value={lead.request_type} fieldType="select" options={["new_installation", "maintenance", "expansion", "regularization", "other"]} onSave={save("request_type")} />
              <SecurityInlineField label="Valor Estimado" value={lead.estimated_value} fieldType="currency" onSave={save("estimated_value")} />
              {(lead.security_partners as any)?.name && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Parceiro</span>
                  <span className="font-medium">{(lead.security_partners as any).name}</span>
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle className="text-base">Descrição da Necessidade</CardTitle></CardHeader>
            <CardContent className="space-y-2">
              <SecurityInlineField label="Descrição" value={lead.need_description} onSave={save("need_description")} placeholder="Sem descrição" />
              <SecurityInlineField label="Notas" value={lead.notes} onSave={save("notes")} placeholder="Sem notas" />
            </CardContent>
          </Card>
        </div>

        {linkedProposals.length > 0 && (
          <Card>
            <CardHeader><CardTitle className="text-base">Propostas Associadas</CardTitle></CardHeader>
            <CardContent className="space-y-2">
              {linkedProposals.map((p: any) => (
                <div
                  key={p.id}
                  className="flex items-center justify-between p-3 rounded-lg bg-muted/50 cursor-pointer hover:bg-muted transition-colors"
                  onClick={() => navigate(`/dashboard/security/proposals/${p.id}`)}
                >
                  <div>
                    <p className="font-medium text-sm">{p.title || "Proposta"}</p>
                    <p className="text-xs text-muted-foreground">
                      v{p.version} · {p.final_value ? `€${Number(p.final_value).toFixed(2)}` : "Sem valor"}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="secondary">{p.status}</Badge>
                    <ArrowRight className="h-4 w-4 text-muted-foreground" />
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        )}
      </div>
    </DashboardLayout>
  );
}
