import { useParams, useNavigate } from "react-router-dom";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { useTranslation } from "react-i18next";
import { useSecuritySite } from "@/hooks/security/useSecuritySites";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Building2, MapPin, User, Phone, Mail, Camera } from "lucide-react";
import { SecurityQRCode } from "@/components/security/SecurityQRCode";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export default function SecuritySiteDetailPage() {
  const { t } = useTranslation("security");
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { data: site, isLoading } = useSecuritySite(id);

  // Fetch systems at this site
  const { data: systems = [] } = useQuery({
    queryKey: ["site-systems", id],
    queryFn: async () => {
      if (!id) return [];
      const { data, error } = await supabase
        .from("security_systems")
        .select("id, system_type, status, main_brand, main_model")
        .eq("site_id", id);
      if (error) return [];
      return data ?? [];
    },
    enabled: !!id,
  });

  if (isLoading) return <DashboardLayout><div className="text-center py-12 text-muted-foreground">A carregar...</div></DashboardLayout>;
  if (!site) return <DashboardLayout><div className="text-center py-12 text-muted-foreground">Local não encontrado.</div></DashboardLayout>;

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

        <div className="grid lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
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
            </div>

            {/* Systems at this site */}
            {systems.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-base flex items-center gap-2">
                    <Camera className="h-4 w-4" /> Sistemas ({systems.length})
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  {systems.map((sys: any) => (
                    <div
                      key={sys.id}
                      className="flex items-center justify-between p-2 rounded border cursor-pointer hover:bg-muted/50"
                      onClick={() => navigate(`/dashboard/security/systems/${sys.id}`)}
                    >
                      <div>
                        <p className="text-sm font-medium capitalize">{sys.system_type}</p>
                        <p className="text-xs text-muted-foreground">{[sys.main_brand, sys.main_model].filter(Boolean).join(" ") || "—"}</p>
                      </div>
                      <Badge variant={sys.status === "active" ? "default" : "secondary"}>{sys.status}</Badge>
                    </div>
                  ))}
                </CardContent>
              </Card>
            )}

            {site.access_notes && (
              <Card>
                <CardHeader><CardTitle className="text-base">{t("accessNotes")}</CardTitle></CardHeader>
                <CardContent className="text-sm">{site.access_notes}</CardContent>
              </Card>
            )}

            {site.notes && (
              <Card>
                <CardHeader><CardTitle className="text-base">{t("notes")}</CardTitle></CardHeader>
                <CardContent className="text-sm">{site.notes}</CardContent>
              </Card>
            )}
          </div>

          {/* Sidebar with QR */}
          <div className="space-y-6">
            <SecurityQRCode
              entityType="site"
              entityId={site.id}
              label={site.site_name}
              sublabel={[site.locality, site.district].filter(Boolean).join(", ")}
              inline
            />
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
