import { useParams, useNavigate } from "react-router-dom";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { useTranslation } from "react-i18next";
import { useSecurityClient, useSecurityClientSites, useSecurityClientContracts } from "@/hooks/security/useSecurityClients";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Users, MapPin, Phone, Mail, FileText, Building2, User, Home } from "lucide-react";
import { format } from "date-fns";

const clientTypeIcon: Record<string, any> = {
  particular: User,
  empresa: Building2,
  condominio: Home,
};

export default function SecurityClientDetailPage() {
  const { t } = useTranslation("security");
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { data: client, isLoading } = useSecurityClient(id);
  const { data: sites = [] } = useSecurityClientSites(id);
  const { data: contracts = [] } = useSecurityClientContracts(id);

  if (isLoading) {
    return <DashboardLayout><div className="text-center py-12 text-muted-foreground">A carregar...</div></DashboardLayout>;
  }

  if (!client) {
    return <DashboardLayout><div className="text-center py-12 text-muted-foreground">Cliente não encontrado.</div></DashboardLayout>;
  }

  const TypeIcon = clientTypeIcon[client.client_type] || User;

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate("/dashboard/security/clients")}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div className="h-10 w-10 rounded-full bg-muted flex items-center justify-center">
            <TypeIcon className="h-5 w-5 text-muted-foreground" />
          </div>
          <div>
            <h1 className="text-xl font-bold">{client.name}</h1>
            <p className="text-sm text-muted-foreground">
              {t(`clientType${client.client_type.charAt(0).toUpperCase()}${client.client_type.slice(1)}` as any)}
              {client.nif && ` · NIF: ${client.nif}`}
            </p>
          </div>
          <Badge variant={client.status === "active" ? "default" : "secondary"} className="ml-auto">
            {t(`clientStatus${client.status.charAt(0).toUpperCase()}${client.status.slice(1)}` as any) || client.status}
          </Badge>
        </div>

        <div className="grid md:grid-cols-2 gap-6">
          {/* Contact Info */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">{t("contactInfo")}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              {client.primary_phone && (
                <div className="flex items-center gap-2"><Phone className="h-3.5 w-3.5 text-muted-foreground" />{client.primary_phone}</div>
              )}
              {client.secondary_phone && (
                <div className="flex items-center gap-2"><Phone className="h-3.5 w-3.5 text-muted-foreground" />{client.secondary_phone}</div>
              )}
              {client.primary_email && (
                <div className="flex items-center gap-2"><Mail className="h-3.5 w-3.5 text-muted-foreground" />{client.primary_email}</div>
              )}
              {client.contact_person_name && (
                <div className="pt-2 border-t">
                  <p className="text-xs text-muted-foreground mb-1">{t("contactPersonName")}</p>
                  <p className="font-medium">{client.contact_person_name}</p>
                  {client.contact_person_phone && <p className="text-muted-foreground">{client.contact_person_phone}</p>}
                  {client.contact_person_email && <p className="text-muted-foreground">{client.contact_person_email}</p>}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Fiscal Info */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <MapPin className="h-4 w-4" /> {t("fiscalAddress")}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-1 text-sm">
              {client.trade_name && <p className="font-medium">{client.trade_name}</p>}
              {client.nif && <p>NIF: {client.nif}</p>}
              {client.fiscal_address && <p>{client.fiscal_address}</p>}
              <p>{[client.fiscal_postal_code, client.fiscal_locality].filter(Boolean).join(" ")}</p>
              {client.fiscal_country && <p>{client.fiscal_country}</p>}
            </CardContent>
          </Card>
        </div>

        {/* Installation Sites */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Building2 className="h-4 w-4" /> {t("sites")} ({sites.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            {sites.length === 0 ? (
              <p className="text-sm text-muted-foreground">{t("noSitesForClient")}</p>
            ) : (
              <div className="space-y-2">
                {sites.map((site: any) => (
                  <div
                    key={site.id}
                    className="flex items-center justify-between p-3 rounded-lg border cursor-pointer hover:bg-muted/50"
                    onClick={() => navigate(`/dashboard/security/sites/${site.id}`)}
                  >
                    <div>
                      <p className="font-medium text-sm">{site.site_name}</p>
                      <p className="text-xs text-muted-foreground">
                        {[site.address_line_1, site.locality].filter(Boolean).join(" · ")}
                      </p>
                    </div>
                    {site.establishment_type && <Badge variant="outline">{site.establishment_type}</Badge>}
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Contracts */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <FileText className="h-4 w-4" /> {t("contracts")} ({contracts.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            {contracts.length === 0 ? (
              <p className="text-sm text-muted-foreground">{t("noContractsForClient")}</p>
            ) : (
              <div className="space-y-2">
                {contracts.map((c: any) => {
                  const sys = c.security_systems as any;
                  const site = sys?.security_installation_sites as any;
                  return (
                    <div
                      key={c.id}
                      className="flex items-center justify-between p-3 rounded-lg border cursor-pointer hover:bg-muted/50"
                      onClick={() => navigate(`/dashboard/security/contracts/${c.id}`)}
                    >
                      <div>
                        <p className="font-medium text-sm">{site?.site_name || c.contract_type}</p>
                        <p className="text-xs text-muted-foreground">
                          {c.contract_type}
                          {c.start_date && ` · ${format(new Date(c.start_date), "dd/MM/yyyy")}`}
                          {c.end_date && ` → ${format(new Date(c.end_date), "dd/MM/yyyy")}`}
                        </p>
                      </div>
                      <Badge variant={c.contract_status === "active" ? "default" : "secondary"}>
                        {c.contract_status}
                      </Badge>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Notes */}
        {client.notes && (
          <Card>
            <CardHeader><CardTitle className="text-base">{t("notes")}</CardTitle></CardHeader>
            <CardContent className="text-sm whitespace-pre-wrap">{client.notes}</CardContent>
          </Card>
        )}
      </div>
    </DashboardLayout>
  );
}
