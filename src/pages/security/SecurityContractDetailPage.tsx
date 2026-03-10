import { useParams, useNavigate } from "react-router-dom";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { useTranslation } from "react-i18next";
import { useSecurityContract } from "@/hooks/security/useSecurityContracts";
import { useSecurityConversions } from "@/hooks/security/useSecurityConversions";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ArrowLeft, FileText, Wrench, ArrowRight } from "lucide-react";
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
  const { convertContractToInstallation } = useSecurityConversions();

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
  const hasSystem = !!contract.system_id;

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
          {canCreateInstallation && (
            <Button
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
