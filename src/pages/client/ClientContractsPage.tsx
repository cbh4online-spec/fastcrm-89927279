import { ClientLayout } from "@/components/client-portal/ClientLayout";
import { useClientPermissions } from "@/hooks/client-portal/useClientPermissions";
import { useClientContracts } from "@/hooks/client-portal/useClientContracts";
import { Navigate } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { FileCheck, Loader2, Calendar, AlertTriangle, ExternalLink, FileText } from "lucide-react";
import { format, differenceInDays } from "date-fns";
import { pt } from "date-fns/locale";

const STATUS_MAP: Record<string, { label: string; className: string }> = {
  draft: { label: "Rascunho", className: "bg-muted text-muted-foreground" },
  active: { label: "Activo", className: "bg-green-100 text-green-800" },
  expiring: { label: "A Expirar", className: "bg-amber-100 text-amber-800" },
  expired: { label: "Expirado", className: "bg-red-100 text-red-800" },
  cancelled: { label: "Cancelado", className: "bg-muted text-muted-foreground" },
  renewed: { label: "Renovado", className: "bg-blue-100 text-blue-800" },
};

const TYPE_MAP: Record<string, string> = {
  contract: "Contrato",
  sla: "SLA",
  agreement: "Acordo",
};

const fmt = (v: number, currency = "EUR") =>
  new Intl.NumberFormat("pt-PT", { style: "currency", currency }).format(v);

export default function ClientContractsPage() {
  const { canViewContracts, isLoading: permLoading } = useClientPermissions();
  const { contracts, expiringContracts, isLoading } = useClientContracts();

  if (permLoading) {
    return (
      <ClientLayout>
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </ClientLayout>
    );
  }

  if (!canViewContracts) {
    return <Navigate to="/client/dashboard" replace />;
  }

  return (
    <ClientLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <FileCheck className="h-6 w-6" />
            Contratos
          </h1>
          <p className="text-muted-foreground">Contratos e SLAs da sua empresa</p>
        </div>

        {/* Expiring Alert */}
        {expiringContracts.length > 0 && (
          <Card className="border-amber-300 bg-amber-50/50">
            <CardContent className="py-4 flex items-center gap-3">
              <AlertTriangle className="h-5 w-5 text-amber-600 shrink-0" />
              <div>
                <p className="font-medium text-amber-800">
                  {expiringContracts.length} contrato{expiringContracts.length > 1 ? "s" : ""} a expirar nos próximos 30 dias
                </p>
                <p className="text-sm text-amber-700">
                  {expiringContracts.map((c) => c.title).join(", ")}
                </p>
              </div>
            </CardContent>
          </Card>
        )}

        {isLoading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : contracts.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center text-muted-foreground">
              <FileText className="h-12 w-12 mx-auto mb-3 opacity-40" />
              Sem contratos registados
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4">
            {contracts.map((contract) => {
              const statusCfg = STATUS_MAP[contract.status] ?? STATUS_MAP.active;
              const daysLeft = contract.end_date
                ? differenceInDays(new Date(contract.end_date), new Date())
                : null;
              const isExpiringSoon = daysLeft !== null && daysLeft > 0 && daysLeft <= 30;

              return (
                <Card key={contract.id} className={`hover:shadow-md transition-shadow ${isExpiringSoon ? "border-amber-300" : ""}`}>
                  <CardContent className="py-5">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex items-start gap-4 flex-1">
                        <div className={`h-10 w-10 rounded-full flex items-center justify-center shrink-0 ${isExpiringSoon ? "bg-amber-100" : "bg-muted"}`}>
                          <FileCheck className={`h-5 w-5 ${isExpiringSoon ? "text-amber-600" : "text-muted-foreground"}`} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <p className="font-semibold">{contract.title}</p>
                            <Badge variant="outline" className="text-xs">
                              {TYPE_MAP[contract.contract_type] ?? contract.contract_type}
                            </Badge>
                            <Badge variant="secondary" className={statusCfg.className}>
                              {statusCfg.label}
                            </Badge>
                            {isExpiringSoon && (
                              <Badge variant="secondary" className="bg-amber-100 text-amber-800">
                                <AlertTriangle className="h-3 w-3 mr-1" />
                                {daysLeft} dias restantes
                              </Badge>
                            )}
                          </div>

                          {contract.description && (
                            <p className="text-sm text-muted-foreground mt-1">{contract.description}</p>
                          )}

                          <div className="flex items-center gap-4 mt-2 text-sm text-muted-foreground flex-wrap">
                            <span className="flex items-center gap-1">
                              <Calendar className="h-3.5 w-3.5" />
                              Início: {format(new Date(contract.start_date), "d MMM yyyy", { locale: pt })}
                            </span>
                            {contract.end_date && (
                              <span>
                                Fim: {format(new Date(contract.end_date), "d MMM yyyy", { locale: pt })}
                              </span>
                            )}
                            {contract.renewal_date && (
                              <span>
                                Renovação: {format(new Date(contract.renewal_date), "d MMM yyyy", { locale: pt })}
                              </span>
                            )}
                            {contract.auto_renew && (
                              <Badge variant="outline" className="text-xs">Auto-renovação</Badge>
                            )}
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-3 shrink-0">
                        {contract.value !== null && (
                          <span className="font-semibold text-lg">
                            {fmt(contract.value, contract.currency)}
                          </span>
                        )}
                        {contract.document_url && (
                          <Button variant="outline" size="sm" asChild>
                            <a href={contract.document_url} target="_blank" rel="noopener noreferrer">
                              <ExternalLink className="h-4 w-4 mr-1" />
                              Ver
                            </a>
                          </Button>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </ClientLayout>
  );
}
