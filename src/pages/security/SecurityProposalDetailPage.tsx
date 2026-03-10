import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { useTranslation } from "react-i18next";
import { useParams, useNavigate } from "react-router-dom";
import { useSecurityProposal } from "@/hooks/security/useSecurityProposals";
import { useSecurityConversions } from "@/hooks/security/useSecurityConversions";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ArrowLeft, FileText, CheckCircle, Send } from "lucide-react";
import { useSecurityProposals } from "@/hooks/security/useSecurityProposals";

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

  if (isLoading || !proposal) {
    return (
      <DashboardLayout>
        <div className="text-center py-12 text-muted-foreground">A carregar...</div>
      </DashboardLayout>
    );
  }

  const canSend = proposal.status === "draft";
  const canAccept = ["sent", "under_review"].includes(proposal.status);

  const handleSend = () => {
    updateProposal.mutate({
      id: proposal.id,
      status: "sent",
      sent_at: new Date().toISOString(),
    });
  };

  const handleAccept = () => {
    convertProposalToContract.mutate(proposal);
  };

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
          {canSend && (
            <Button onClick={handleSend} disabled={updateProposal.isPending} className="gap-2">
              <Send className="h-4 w-4" />
              Enviar Proposta
            </Button>
          )}
          {canAccept && (
            <Button onClick={handleAccept} disabled={convertProposalToContract.isPending} className="gap-2" variant="default">
              <CheckCircle className="h-4 w-4" />
              Adjudicar
            </Button>
          )}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card>
            <CardHeader><CardTitle className="text-base">Dados da Proposta</CardTitle></CardHeader>
            <CardContent className="space-y-3 text-sm">
              <InfoRow label="Título" value={proposal.title} />
              <InfoRow label="Nº Proposta" value={proposal.proposal_number} />
              <InfoRow label="Valor Equipamento" value={proposal.equipment_value ? `€${Number(proposal.equipment_value).toFixed(2)}` : null} />
              <InfoRow label="Valor Mão de Obra" value={proposal.labor_value ? `€${Number(proposal.labor_value).toFixed(2)}` : null} />
              <InfoRow label="Total" value={proposal.total_value ? `€${Number(proposal.total_value).toFixed(2)}` : null} />
              <InfoRow label="Desconto" value={proposal.discount_percent ? `${proposal.discount_percent}%` : null} />
              <InfoRow label="Valor Final" value={proposal.final_value ? `€${Number(proposal.final_value).toFixed(2)}` : null} />
              <InfoRow label="Validade" value={proposal.validity_days ? `${proposal.validity_days} dias` : null} />
              {proposal.valid_until && <InfoRow label="Válida até" value={proposal.valid_until} />}
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle className="text-base">Solução Proposta</CardTitle></CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                {proposal.solution_description || "Sem descrição da solução"}
              </p>
              {proposal.commercial_notes && (
                <div className="mt-4 pt-4 border-t">
                  <p className="text-xs font-medium mb-1">Notas Comerciais</p>
                  <p className="text-sm text-muted-foreground">{proposal.commercial_notes}</p>
                </div>
              )}
              {proposal.conditions && (
                <div className="mt-4 pt-4 border-t">
                  <p className="text-xs font-medium mb-1">Condições</p>
                  <p className="text-sm text-muted-foreground">{proposal.conditions}</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Equipment List */}
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

function InfoRow({ label, value }: { label: string; value?: string | null }) {
  if (!value) return null;
  return (
    <div className="flex justify-between">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-medium">{value}</span>
    </div>
  );
}
