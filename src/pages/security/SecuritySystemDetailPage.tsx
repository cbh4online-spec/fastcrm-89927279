import { useParams, useNavigate } from "react-router-dom";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { useTranslation } from "react-i18next";
import { useSecuritySystem, useSecurityZones, useSecurityInstalledDevices } from "@/hooks/security/useSecuritySystems";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ArrowLeft, Camera, MapPin, Cpu, Layers } from "lucide-react";

export default function SecuritySystemDetailPage() {
  const { t } = useTranslation("security");
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { data: system, isLoading } = useSecuritySystem(id);
  const { data: zones = [] } = useSecurityZones(id);
  const { data: devices = [] } = useSecurityInstalledDevices(id);

  if (isLoading) {
    return <DashboardLayout><div className="text-center py-12 text-muted-foreground">A carregar...</div></DashboardLayout>;
  }

  if (!system) {
    return <DashboardLayout><div className="text-center py-12 text-muted-foreground">Sistema não encontrado.</div></DashboardLayout>;
  }

  const site = system.security_installation_sites as any;

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate("/dashboard/security/systems")}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <Camera className="h-6 w-6 text-primary" />
          <div>
            <h1 className="text-xl font-bold">{site?.site_name || "Sistema"}</h1>
            <p className="text-sm text-muted-foreground">{[system.main_brand, system.main_model].filter(Boolean).join(" ")}</p>
          </div>
          <Badge variant="outline" className="ml-2">{system.system_type}</Badge>
          <Badge>{system.status}</Badge>
        </div>

        <div className="grid md:grid-cols-2 gap-6">
          {/* System Info */}
          <Card>
            <CardHeader><CardTitle className="text-base">{t("details")}</CardTitle></CardHeader>
            <CardContent className="space-y-2 text-sm">
              <div className="flex justify-between"><span className="text-muted-foreground">{t("systemType")}</span><span>{system.system_type}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">{t("installationDate")}</span><span>{system.installation_date || "—"}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">{t("brand")}</span><span>{system.main_brand || "—"}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">{t("model")}</span><span>{system.main_model || "—"}</span></div>
              {system.protected_zones_summary && (
                <div className="pt-2 border-t">
                  <span className="text-muted-foreground">{t("zones")}</span>
                  <p className="mt-1">{system.protected_zones_summary}</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Site */}
          {site && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <MapPin className="h-4 w-4" /> {t("siteName")}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-1 text-sm">
                <p className="font-medium">{site.site_name}</p>
                <p>{site.address_line_1}</p>
                <p>{[site.postal_code, site.locality].filter(Boolean).join(" ")}</p>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Zones */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Layers className="h-4 w-4" /> {t("zones")} ({zones.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            {zones.length === 0 ? (
              <p className="text-sm text-muted-foreground">Nenhuma zona definida</p>
            ) : (
              <div className="space-y-2">
                {zones.map((z: any) => (
                  <div key={z.id} className="flex items-center gap-3 p-2 rounded border">
                    <Badge variant="outline">{z.zone_type || "zona"}</Badge>
                    <span className="text-sm font-medium">{z.zone_name}</span>
                    {z.notes && <span className="text-xs text-muted-foreground">{z.notes}</span>}
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Installed Devices */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Cpu className="h-4 w-4" /> {t("devices")} ({devices.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            {devices.length === 0 ? (
              <p className="text-sm text-muted-foreground">Nenhum dispositivo instalado</p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{t("zones")}</TableHead>
                    <TableHead>{t("type")}</TableHead>
                    <TableHead>{t("brand")}</TableHead>
                    <TableHead>{t("model")}</TableHead>
                    <TableHead>{t("serialNumber")}</TableHead>
                    <TableHead className="text-right">{t("quantity")}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {devices.map((d: any) => (
                    <TableRow key={d.id}>
                      <TableCell>{(d.security_system_zones as any)?.zone_name || "—"}</TableCell>
                      <TableCell>{d.device_type || "—"}</TableCell>
                      <TableCell>{d.brand || (d.security_equipment_catalog as any)?.brand || "—"}</TableCell>
                      <TableCell>{d.model || (d.security_equipment_catalog as any)?.model || "—"}</TableCell>
                      <TableCell className="font-mono text-xs">{d.serial_number || "—"}</TableCell>
                      <TableCell className="text-right">{d.quantity ?? 1}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        {/* Technical Notes */}
        {system.technical_notes && (
          <Card>
            <CardHeader><CardTitle className="text-base">{t("notes")}</CardTitle></CardHeader>
            <CardContent className="text-sm whitespace-pre-wrap">{system.technical_notes}</CardContent>
          </Card>
        )}
      </div>
    </DashboardLayout>
  );
}
