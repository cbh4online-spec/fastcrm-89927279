import { useParams, useNavigate } from "react-router-dom";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { useTranslation } from "react-i18next";
import { useSecuritySite } from "@/hooks/security/useSecuritySites";
import { useSecuritySites } from "@/hooks/security/useSecuritySites";
import { SecurityInlineField } from "@/components/security/SecurityInlineField";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Building2, MapPin, User, Camera } from "lucide-react";
import { SecurityQRCode } from "@/components/security/SecurityQRCode";
import { useQuery } from "@tanstack/react-query";
import { supabase as _supabase } from "@/integrations/supabase/client";
const supabase = _supabase as any;

export default function SecuritySiteDetailPage() {
  const { t } = useTranslation("security");
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { data: site, isLoading } = useSecuritySite(id);
  const { updateSite } = useSecuritySites();

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

  const save = (field: string) => (value: unknown) => {
    updateSite.mutate({ id: site.id, [field]: value });
  };

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
                  <SecurityInlineField label="Nome" value={site.site_name} onSave={save("site_name")} />
                  <SecurityInlineField label="Morada 1" value={site.address_line_1} onSave={save("address_line_1")} />
                  <SecurityInlineField label="Morada 2" value={site.address_line_2} onSave={save("address_line_2")} />
                  <SecurityInlineField label="Código Postal" value={site.postal_code} onSave={save("postal_code")} />
                  <SecurityInlineField label="Localidade" value={site.locality} onSave={save("locality")} />
                  <SecurityInlineField label="Concelho" value={site.county} onSave={save("county")} />
                  <SecurityInlineField label="Distrito" value={site.district} onSave={save("district")} />
                  <SecurityInlineField label="País" value={site.country} onSave={save("country")} />
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-base flex items-center gap-2">
                    <User className="h-4 w-4" /> {t("responsiblePerson")}
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-1 text-sm">
                  <SecurityInlineField label="Nome" value={site.onsite_responsible_name} onSave={save("onsite_responsible_name")} />
                  <SecurityInlineField label="Telefone" value={site.onsite_responsible_phone} onSave={save("onsite_responsible_phone")} />
                  <SecurityInlineField label="Email" value={site.onsite_responsible_email} fieldType="email" onSave={save("onsite_responsible_email")} />
                </CardContent>
              </Card>
            </div>

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

            <Card>
              <CardHeader><CardTitle className="text-base">{t("accessNotes")}</CardTitle></CardHeader>
              <CardContent>
                <SecurityInlineField label="" value={site.access_notes} onSave={save("access_notes")} placeholder="Sem notas de acesso" />
              </CardContent>
            </Card>

            <Card>
              <CardHeader><CardTitle className="text-base">{t("notes")}</CardTitle></CardHeader>
              <CardContent>
                <SecurityInlineField label="" value={site.notes} onSave={save("notes")} placeholder="Sem notas" />
              </CardContent>
            </Card>
          </div>

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
