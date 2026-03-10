import { useParams, useNavigate } from "react-router-dom";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { useTranslation } from "react-i18next";
import { useSecurityOccurrence, useSecurityOccurrences } from "@/hooks/security/useSecurityOccurrences";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger
} from "@/components/ui/alert-dialog";
import { ArrowLeft, AlertTriangle, MapPin, Clock, CheckCircle } from "lucide-react";
import { format } from "date-fns";
import { useState } from "react";

export default function SecurityOccurrenceDetailPage() {
  const { t } = useTranslation("security");
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { data: occ, isLoading } = useSecurityOccurrence(id);
  const { updateOccurrence, closeOccurrence } = useSecurityOccurrences();
  const [resolution, setResolution] = useState("");
  const [newStatus, setNewStatus] = useState("");

  if (isLoading) return <DashboardLayout><div className="text-center py-12 text-muted-foreground">A carregar...</div></DashboardLayout>;
  if (!occ) return <DashboardLayout><div className="text-center py-12 text-muted-foreground">Ocorrência não encontrada.</div></DashboardLayout>;

  const sys = occ.security_systems as any;
  const site = sys?.security_installation_sites as any;
  const zone = occ.security_system_zones as any;
  const device = occ.security_installed_devices as any;
  const isClosed = occ.status === "closed" || occ.status === "cancelled";

  const handleStatusChange = (status: string) => {
    setNewStatus(status);
    if (status === "closed") return; // handled by dialog
    updateOccurrence.mutate({ id: occ.id, status });
  };

  const handleClose = () => {
    closeOccurrence.mutate({ id: occ.id, resolution_summary: resolution });
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" onClick={() => navigate("/dashboard/security/occurrences")}>
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <AlertTriangle className="h-6 w-6 text-primary" />
            <div>
              <h1 className="text-xl font-bold">{occ.title || occ.occurrence_type}</h1>
              <p className="text-sm text-muted-foreground">{site?.site_name || "—"}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {occ.severity && (
              <Badge variant={occ.severity === "critical" ? "destructive" : "outline"}>
                {t(`severity${occ.severity.charAt(0).toUpperCase()}${occ.severity.slice(1)}` as any)}
              </Badge>
            )}
            <Badge variant={occ.status === "open" ? "destructive" : "default"}>
              {t(`occurrenceStatus${occ.status.charAt(0).toUpperCase()}${occ.status.slice(1).replace(/_([a-z])/g, (_: any, c: string) => c.toUpperCase())}` as any) || occ.status}
            </Badge>
          </div>
        </div>

        <div className="grid lg:grid-cols-3 gap-6">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            <Card>
              <CardHeader><CardTitle className="text-base">{t("details")}</CardTitle></CardHeader>
              <CardContent className="space-y-3 text-sm">
                {occ.description && <p>{occ.description}</p>}
                {occ.impact_on_client && (
                  <div className="p-3 rounded bg-destructive/10 border border-destructive/20">
                    <p className="font-semibold text-xs text-destructive mb-1">Impacto no Cliente</p>
                    <p>{occ.impact_on_client}</p>
                  </div>
                )}
                <div className="grid grid-cols-2 gap-4 pt-2">
                  <div>
                    <span className="text-muted-foreground text-xs">Tipo</span>
                    <p>{t(`occurrenceType${occ.occurrence_type?.charAt(0).toUpperCase()}${occ.occurrence_type?.slice(1)}` as any) || occ.occurrence_type}</p>
                  </div>
                  <div>
                    <span className="text-muted-foreground text-xs">Origem</span>
                    <p>{t(`occurrenceOrigin${occ.occurrence_origin?.charAt(0).toUpperCase()}${occ.occurrence_origin?.slice(1)}` as any) || occ.occurrence_origin}</p>
                  </div>
                  <div>
                    <span className="text-muted-foreground text-xs">Data</span>
                    <p>{occ.occurred_at ? format(new Date(occ.occurred_at), "dd/MM/yyyy HH:mm") : "—"}</p>
                  </div>
                  <div>
                    <span className="text-muted-foreground text-xs">Sistema</span>
                    <p>{sys?.system_type || "—"}</p>
                  </div>
                  {zone && (
                    <div>
                      <span className="text-muted-foreground text-xs">Zona</span>
                      <p>{zone.zone_name}</p>
                    </div>
                  )}
                  {device && (
                    <div>
                      <span className="text-muted-foreground text-xs">Dispositivo</span>
                      <p>{[device.brand, device.model].filter(Boolean).join(" ") || device.device_type}</p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Resolution */}
            {occ.resolution_summary && (
              <Card>
                <CardHeader><CardTitle className="text-base flex items-center gap-2"><CheckCircle className="h-4 w-4 text-green-500" /> Resolução</CardTitle></CardHeader>
                <CardContent className="text-sm">
                  <p>{occ.resolution_summary}</p>
                  {occ.resolved_at && <p className="text-xs text-muted-foreground mt-2">Resolvida em {format(new Date(occ.resolved_at), "dd/MM/yyyy HH:mm")}</p>}
                </CardContent>
              </Card>
            )}
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Actions */}
            {!isClosed && (
              <Card>
                <CardHeader><CardTitle className="text-base">{t("actions")}</CardTitle></CardHeader>
                <CardContent className="space-y-3">
                  <Select value={newStatus || occ.status} onValueChange={handleStatusChange}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="open">{t("occurrenceStatusOpen")}</SelectItem>
                      <SelectItem value="in_progress">{t("occurrenceStatusInProgress")}</SelectItem>
                      <SelectItem value="waiting_parts">{t("occurrenceStatusWaitingParts")}</SelectItem>
                      <SelectItem value="resolved">{t("occurrenceStatusResolved")}</SelectItem>
                    </SelectContent>
                  </Select>

                  <div className="pt-2 border-t">
                    <Textarea
                      placeholder="Resumo da resolução (obrigatório para fechar)"
                      value={resolution}
                      onChange={(e) => setResolution(e.target.value)}
                      rows={3}
                    />
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button className="w-full mt-2" variant="outline" disabled={!resolution.trim()}>
                          Fechar Ocorrência
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Fechar Ocorrência</AlertDialogTitle>
                          <AlertDialogDescription>
                            Confirma o fecho desta ocorrência? A resolução indicada ficará registada permanentemente.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>{t("cancel")}</AlertDialogCancel>
                          <AlertDialogAction onClick={handleClose} disabled={closeOccurrence.isPending}>
                            {t("confirm")}
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Location Info */}
            {site && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-base flex items-center gap-2">
                    <MapPin className="h-4 w-4" /> Local
                  </CardTitle>
                </CardHeader>
                <CardContent className="text-sm space-y-1">
                  <p className="font-medium">{site.site_name}</p>
                  <p>{site.address_line_1}</p>
                  <p>{[site.postal_code, site.locality].filter(Boolean).join(" ")}</p>
                </CardContent>
              </Card>
            )}

            {/* Timeline */}
            <Card>
              <CardHeader><CardTitle className="text-base flex items-center gap-2"><Clock className="h-4 w-4" /> Timeline</CardTitle></CardHeader>
              <CardContent className="text-xs space-y-2">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Criada</span>
                  <span>{format(new Date(occ.created_at), "dd/MM/yyyy HH:mm")}</span>
                </div>
                {occ.occurred_at && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Ocorrida</span>
                    <span>{format(new Date(occ.occurred_at), "dd/MM/yyyy HH:mm")}</span>
                  </div>
                )}
                {occ.resolved_at && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Resolvida</span>
                    <span>{format(new Date(occ.resolved_at), "dd/MM/yyyy HH:mm")}</span>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
