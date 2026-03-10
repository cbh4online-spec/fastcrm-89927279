import { useParams, useNavigate } from "react-router-dom";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { useTranslation } from "react-i18next";
import { useSecuritySystem, useSecurityZones, useSecurityInstalledDevices, useSecuritySystems } from "@/hooks/security/useSecuritySystems";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowLeft, Camera, MapPin, Cpu, Layers, Plus, CheckCircle, FileText } from "lucide-react";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { SecurityDocumentCreateDialog } from "@/components/security/SecurityDocumentCreateDialog";

const statusLabels: Record<string, string> = {
  draft: "Rascunho", por_validar: "Por Validar", active: "Ativo",
  inactive: "Inativo", under_maintenance: "Em Manutenção",
  suspended: "Suspenso", archived: "Arquivado",
};

const lifecycleLabels: Record<string, string> = {
  new_installation: "Nova Instalação", existing_installation: "Instalação Existente",
  preventive_maintenance: "Manutenção Preventiva", certification: "Certificação",
  expansion: "Ampliação", regularization: "Regularização",
};

export default function SecuritySystemDetailPage() {
  const { t } = useTranslation("security");
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const { data: system, isLoading } = useSecuritySystem(id);
  const { data: zones = [] } = useSecurityZones(id);
  const { data: devices = [] } = useSecurityInstalledDevices(id);
  const { updateSystem } = useSecuritySystems();

  const [addZoneOpen, setAddZoneOpen] = useState(false);
  const [addDeviceOpen, setAddDeviceOpen] = useState(false);
  const [zoneForm, setZoneForm] = useState({ zone_name: "", zone_type: "camera", notes: "" });
  const [deviceForm, setDeviceForm] = useState({ device_type: "camera", brand: "", model: "", serial_number: "", quantity: "1", zone_id: "", location_description: "" });

  if (isLoading) {
    return <DashboardLayout><div className="text-center py-12 text-muted-foreground">A carregar...</div></DashboardLayout>;
  }

  if (!system) {
    return <DashboardLayout><div className="text-center py-12 text-muted-foreground">Sistema não encontrado.</div></DashboardLayout>;
  }

  const site = system.security_installation_sites as any;
  const canMarkInstalled = system.status === "draft" || system.status === "por_validar";

  const handleAddZone = async () => {
    const { error } = await supabase
      .from("security_system_zones")
      .insert({ system_id: id, ...zoneForm } as any);
    if (error) { toast.error(error.message); return; }
    toast.success("Zona adicionada");
    setZoneForm({ zone_name: "", zone_type: "camera", notes: "" });
    setAddZoneOpen(false);
    qc.invalidateQueries({ queryKey: ["security-zones", id] });
  };

  const handleAddDevice = async () => {
    const payload: any = {
      system_id: id,
      device_type: deviceForm.device_type,
      brand: deviceForm.brand,
      model: deviceForm.model,
      serial_number: deviceForm.serial_number || null,
      quantity: Number(deviceForm.quantity) || 1,
      location_description: deviceForm.location_description || null,
    };
    if (deviceForm.zone_id) payload.zone_id = deviceForm.zone_id;
    const { error } = await supabase.from("security_installed_devices").insert(payload);
    if (error) { toast.error(error.message); return; }
    toast.success("Dispositivo adicionado");
    setDeviceForm({ device_type: "camera", brand: "", model: "", serial_number: "", quantity: "1", zone_id: "", location_description: "" });
    setAddDeviceOpen(false);
    qc.invalidateQueries({ queryKey: ["security-installed-devices", id] });
  };

  const handleMarkActive = () => {
    updateSystem.mutate({ id: id!, status: "active", commissioning_date: new Date().toISOString().split("T")[0] });
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate("/dashboard/security/systems")}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <Camera className="h-6 w-6 text-primary" />
          <div className="flex-1">
            <h1 className="text-xl font-bold">{site?.site_name || "Sistema"}</h1>
            <p className="text-sm text-muted-foreground">
              {[system.main_brand, system.main_model].filter(Boolean).join(" ")}
              {system.lifecycle_type && ` · ${lifecycleLabels[system.lifecycle_type] || system.lifecycle_type}`}
            </p>
          </div>
          <Badge variant="outline" className="capitalize">{system.system_type}</Badge>
          <Badge>{statusLabels[system.status] || system.status}</Badge>
          {canMarkInstalled && (
            <Button onClick={handleMarkActive} disabled={updateSystem.isPending} className="gap-2">
              <CheckCircle className="h-4 w-4" />
              Marcar como Instalado
            </Button>
          )}
        </div>

        <div className="grid md:grid-cols-2 gap-6">
          <Card>
            <CardHeader><CardTitle className="text-base">{t("details")}</CardTitle></CardHeader>
            <CardContent className="space-y-2 text-sm">
              <InfoRow label={t("systemType")} value={system.system_type} />
              <InfoRow label="Ciclo de Vida" value={lifecycleLabels[system.lifecycle_type] || system.lifecycle_type} />
              <InfoRow label={t("installationDate")} value={system.installation_date} />
              <InfoRow label="Data de Comissionamento" value={system.commissioning_date} />
              <InfoRow label={t("brand")} value={system.main_brand} />
              <InfoRow label={t("model")} value={system.main_model} />
              <InfoRow label={t("installerCompany")} value={system.installer_company_name} />
              <InfoRow label={t("maintenanceCompany")} value={system.maintenance_company_name} />
              {system.integration_notes && (
                <div className="pt-2 border-t">
                  <span className="text-muted-foreground">Integração</span>
                  <p className="mt-1">{system.integration_notes}</p>
                </div>
              )}
              {system.protected_zones_summary && (
                <div className="pt-2 border-t">
                  <span className="text-muted-foreground">{t("zones")}</span>
                  <p className="mt-1">{system.protected_zones_summary}</p>
                </div>
              )}
            </CardContent>
          </Card>

          {site && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <MapPin className="h-4 w-4" /> Local de Instalação
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-1 text-sm">
                <p className="font-medium">{site.site_name}</p>
                <p>{site.address_line_1}</p>
                <p>{[site.postal_code, site.locality].filter(Boolean).join(" ")}</p>
                {site.county && <p>{site.county}{site.district ? ` · ${site.district}` : ""}</p>}
                {site.onsite_responsible_name && (
                  <div className="pt-2 border-t mt-2">
                    <p className="text-xs text-muted-foreground">Responsável</p>
                    <p>{site.onsite_responsible_name}</p>
                    {site.onsite_responsible_phone && <p className="text-muted-foreground">{site.onsite_responsible_phone}</p>}
                  </div>
                )}
              </CardContent>
            </Card>
          )}
        </div>

        {/* Zones */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-base flex items-center gap-2">
              <Layers className="h-4 w-4" /> Zonas ({zones.length})
            </CardTitle>
            <Button size="sm" variant="outline" onClick={() => setAddZoneOpen(true)} className="gap-1">
              <Plus className="h-3.5 w-3.5" /> Zona
            </Button>
          </CardHeader>
          <CardContent>
            {zones.length === 0 ? (
              <p className="text-sm text-muted-foreground">Nenhuma zona definida — adicione zonas para mapear a instalação</p>
            ) : (
              <div className="space-y-2">
                {zones.map((z: any) => (
                  <div key={z.id} className="flex items-center gap-3 p-2 rounded border">
                    <Badge variant="outline">{z.zone_type || "zona"}</Badge>
                    <span className="text-sm font-medium">{z.zone_name}</span>
                    {z.notes && <span className="text-xs text-muted-foreground ml-auto">{z.notes}</span>}
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Installed Devices */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-base flex items-center gap-2">
              <Cpu className="h-4 w-4" /> Dispositivos ({devices.length})
            </CardTitle>
            <Button size="sm" variant="outline" onClick={() => setAddDeviceOpen(true)} className="gap-1">
              <Plus className="h-3.5 w-3.5" /> Dispositivo
            </Button>
          </CardHeader>
          <CardContent>
            {devices.length === 0 ? (
              <p className="text-sm text-muted-foreground">Nenhum dispositivo instalado — associe equipamentos ao sistema</p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Zona</TableHead>
                    <TableHead>Tipo</TableHead>
                    <TableHead>{t("brand")}</TableHead>
                    <TableHead>{t("model")}</TableHead>
                    <TableHead>{t("serialNumber")}</TableHead>
                    <TableHead>Localização</TableHead>
                    <TableHead className="text-right">{t("quantity")}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {devices.map((d: any) => (
                    <TableRow key={d.id}>
                      <TableCell>{(d.security_system_zones as any)?.zone_name || "—"}</TableCell>
                      <TableCell className="capitalize">{d.device_type || "—"}</TableCell>
                      <TableCell>{d.brand || (d.security_equipment_catalog as any)?.brand || "—"}</TableCell>
                      <TableCell>{d.model || (d.security_equipment_catalog as any)?.model || "—"}</TableCell>
                      <TableCell className="font-mono text-xs">{d.serial_number || "—"}</TableCell>
                      <TableCell>{d.location_description || "—"}</TableCell>
                      <TableCell className="text-right">{d.quantity ?? 1}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        {system.technical_notes && (
          <Card>
            <CardHeader><CardTitle className="text-base">{t("notes")}</CardTitle></CardHeader>
            <CardContent className="text-sm whitespace-pre-wrap">{system.technical_notes}</CardContent>
          </Card>
        )}
      </div>

      {/* Add Zone Dialog */}
      <Dialog open={addZoneOpen} onOpenChange={setAddZoneOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>Adicionar Zona</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div>
              <Label>Nome da Zona</Label>
              <Input value={zoneForm.zone_name} onChange={(e) => setZoneForm(p => ({ ...p, zone_name: e.target.value }))} placeholder="Ex: Entrada principal" />
            </div>
            <div>
              <Label>Tipo</Label>
              <Select value={zoneForm.zone_type} onValueChange={(v) => setZoneForm(p => ({ ...p, zone_type: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="camera">Câmara</SelectItem>
                  <SelectItem value="sensor">Sensor</SelectItem>
                  <SelectItem value="detector">Detetor</SelectItem>
                  <SelectItem value="access_point">Ponto de Acesso</SelectItem>
                  <SelectItem value="zone">Zona Genérica</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Notas</Label>
              <Input value={zoneForm.notes} onChange={(e) => setZoneForm(p => ({ ...p, notes: e.target.value }))} />
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setAddZoneOpen(false)}>Cancelar</Button>
              <Button onClick={handleAddZone} disabled={!zoneForm.zone_name}>Adicionar</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Add Device Dialog */}
      <Dialog open={addDeviceOpen} onOpenChange={setAddDeviceOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>Adicionar Dispositivo</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Tipo</Label>
                <Select value={deviceForm.device_type} onValueChange={(v) => setDeviceForm(p => ({ ...p, device_type: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="camera">Câmara</SelectItem>
                    <SelectItem value="dvr">DVR / XVR</SelectItem>
                    <SelectItem value="nvr">NVR</SelectItem>
                    <SelectItem value="sensor">Sensor</SelectItem>
                    <SelectItem value="detector">Detetor</SelectItem>
                    <SelectItem value="central">Central</SelectItem>
                    <SelectItem value="siren">Sirene</SelectItem>
                    <SelectItem value="keypad">Teclado</SelectItem>
                    <SelectItem value="reader">Leitor</SelectItem>
                    <SelectItem value="other">Outro</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>{t("quantity")}</Label>
                <Input type="number" value={deviceForm.quantity} onChange={(e) => setDeviceForm(p => ({ ...p, quantity: e.target.value }))} min="1" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>{t("brand")}</Label>
                <Input value={deviceForm.brand} onChange={(e) => setDeviceForm(p => ({ ...p, brand: e.target.value }))} placeholder="Ex: Dahua" />
              </div>
              <div>
                <Label>{t("model")}</Label>
                <Input value={deviceForm.model} onChange={(e) => setDeviceForm(p => ({ ...p, model: e.target.value }))} placeholder="Ex: DH-HAC-HDBW2501R-Z" />
              </div>
            </div>
            <div>
              <Label>{t("serialNumber")}</Label>
              <Input value={deviceForm.serial_number} onChange={(e) => setDeviceForm(p => ({ ...p, serial_number: e.target.value }))} />
            </div>
            {zones.length > 0 && (
              <div>
                <Label>Zona</Label>
                <Select value={deviceForm.zone_id} onValueChange={(v) => setDeviceForm(p => ({ ...p, zone_id: v }))}>
                  <SelectTrigger><SelectValue placeholder="Selecionar zona..." /></SelectTrigger>
                  <SelectContent>
                    {zones.map((z: any) => (
                      <SelectItem key={z.id} value={z.id}>{z.zone_name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
            <div>
              <Label>Localização / Descrição</Label>
              <Input value={deviceForm.location_description} onChange={(e) => setDeviceForm(p => ({ ...p, location_description: e.target.value }))} placeholder="Ex: Hall de entrada, teto" />
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setAddDeviceOpen(false)}>Cancelar</Button>
              <Button onClick={handleAddDevice} disabled={!deviceForm.brand}>Adicionar</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
}

function InfoRow({ label, value }: { label: string; value?: string | null }) {
  if (!value) return null;
  return (
    <div className="flex justify-between">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-medium capitalize">{value}</span>
    </div>
  );
}
