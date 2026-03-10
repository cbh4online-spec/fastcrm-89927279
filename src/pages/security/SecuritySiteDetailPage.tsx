import { useParams, useNavigate } from "react-router-dom";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { useTranslation } from "react-i18next";
import { useSecuritySite } from "@/hooks/security/useSecuritySites";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Building2, MapPin, User, Phone, Mail } from "lucide-react";

export default function SecuritySiteDetailPage() {
  const { t } = useTranslation("security");
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { data: site, isLoading } = useSecuritySite(id);

  if (isLoading) {
    return (
      <DashboardLayout>
        <div className="text-center py-12 text-muted-foreground">A carregar...</div>
      </DashboardLayout>
    );
  }

  if (!site) {
    return (
      <DashboardLayout>
        <div className="text-center py-12 text-muted-foreground">Local não encontrado.</div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate("/dashboard/security/sites")}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <Building2 className="h-6 w-6 text-primary" />
          <h1 className="text-xl font-bold">{site.site_name}</h1>
          {site.establishment_type && <Badge variant="outline">{site.establishment_type}</Badge>}
        </div>

        <div className="grid md:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <MapPin className="h-4 w-4" /> {t("installationAddress")}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-1 text-sm">
              <p>{site.address_line_1}</p>
              {site.address_line_2 && <p>{site.address_line_2}</p>}
              <p>{[site.postal_code, site.locality].filter(Boolean).join(" ")}</p>
              <p>{[site.county, site.district].filter(Boolean).join(", ")}</p>
              <p>{site.country}</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <User className="h-4 w-4" /> {t("responsiblePerson")}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              <p className="font-medium">{site.onsite_responsible_name || "—"}</p>
              {site.onsite_responsible_phone && (
                <p className="flex items-center gap-2"><Phone className="h-3 w-3" /> {site.onsite_responsible_phone}</p>
              )}
              {site.onsite_responsible_email && (
                <p className="flex items-center gap-2"><Mail className="h-3 w-3" /> {site.onsite_responsible_email}</p>
              )}
            </CardContent>
          </Card>

          {site.access_notes && (
            <Card className="md:col-span-2">
              <CardHeader>
                <CardTitle className="text-base">{t("accessNotes")}</CardTitle>
              </CardHeader>
              <CardContent className="text-sm">{site.access_notes}</CardContent>
            </Card>
          )}

          {site.notes && (
            <Card className="md:col-span-2">
              <CardHeader>
                <CardTitle className="text-base">{t("notes")}</CardTitle>
              </CardHeader>
              <CardContent className="text-sm">{site.notes}</CardContent>
            </Card>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}
