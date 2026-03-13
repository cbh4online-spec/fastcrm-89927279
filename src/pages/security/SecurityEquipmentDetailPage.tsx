import { useParams, useNavigate } from "react-router-dom";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { useSecurityEquipmentCatalog } from "@/hooks/security/useSecurityEquipment";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  ArrowLeft, Cpu, Package, Camera, HardDrive, Radio, Shield, Cable, Box,
  Plus, Trash2, Edit2, Save, X, Settings2, FileText, Info
} from "lucide-react";
import { useState, useMemo } from "react";
import { format } from "date-fns";
import { useQuery } from "@tanstack/react-query";
import { supabase as _supabase } from "@/integrations/supabase/client";
const supabase = _supabase as any;

const categoryIcons: Record<string, any> = {
  camera: Camera, recorder: HardDrive, sensor: Radio, detector: Radio,
  central: Shield, accessory: Box, cable: Cable, other: Package,
};

const categoryLabels: Record<string, string> = {
  camera: "Câmara", recorder: "Gravador", sensor: "Sensor", detector: "Detetor",
  central: "Central", accessory: "Acessório", cable: "Cablagem", other: "Outro",
};

export default function SecurityEquipmentDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { items, updateItem } = useSecurityEquipmentCatalog();
  const item = items.find((i: any) => i.id === id);

  const [editing, setEditing] = useState(false);
  const [editForm, setEditForm] = useState<Record<string, any>>({});
  const [newSpecKey, setNewSpecKey] = useState("");
  const [newSpecValue, setNewSpecValue] = useState("");

  // Count installations using this catalog item
  const { data: installations = [] } = useQuery({
    queryKey: ["catalog-installations", id],
    queryFn: async () => {
      if (!id) return [];
      const { data, error } = await supabase
        .from("security_installed_devices")
        .select("id, device_type, serial_number, quantity, security_system_zones(zone_name), security_systems:system_id(system_type, security_installation_sites(site_name))")
        .eq("catalog_item_id", id);
      if (error) return [];
      return data ?? [];
    },
    enabled: !!id,
  });

  if (!item) {
    return (
      <DashboardLayout>
        <div className="text-center py-12 text-muted-foreground">Equipamento não encontrado.</div>
      </DashboardLayout>
    );
  }

  const specs = (item.technical_specs_json as Record<string, any>) || {};
  const CatIcon = categoryIcons[item.category] || Package;

  const startEdit = () => {
    setEditing(true);
    setEditForm({
      brand: item.brand,
      model: item.model,
      reference: item.reference || "",
      subtype: item.subtype || "",
      compatibility_notes: item.compatibility_notes || "",
      active: item.active !== false,
      technical_specs_json: { ...specs },
    });
  };

  const handleSave = () => {
    updateItem.mutate({ id: item.id, ...editForm }, {
      onSuccess: () => setEditing(false),
    });
  };

  const addSpec = () => {
    if (!newSpecKey.trim()) return;
    setEditForm((f: any) => ({
      ...f,
      technical_specs_json: { ...f.technical_specs_json, [newSpecKey.trim()]: newSpecValue.trim() },
    }));
    setNewSpecKey("");
    setNewSpecValue("");
  };

  const removeSpec = (key: string) => {
    setEditForm((f: any) => {
      const s = { ...f.technical_specs_json };
      delete s[key];
      return { ...f, technical_specs_json: s };
    });
  };

  const editSpecs = editing ? (editForm.technical_specs_json || {}) : specs;

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" onClick={() => navigate("/dashboard/security/equipment")}>
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <CatIcon className="h-6 w-6 text-primary" />
            <div>
              <h1 className="text-xl font-bold">{item.brand} {item.model}</h1>
              <p className="text-sm text-muted-foreground">
                {categoryLabels[item.category] || item.category}
                {item.subtype && ` · ${item.subtype}`}
                {item.reference && ` · Ref: ${item.reference}`}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant={item.active !== false ? "default" : "secondary"}>
              {item.active !== false ? "Ativo" : "Inativo"}
            </Badge>
            {!editing ? (
              <Button variant="outline" size="sm" className="gap-1.5" onClick={startEdit}>
                <Edit2 className="h-3.5 w-3.5" /> Editar
              </Button>
            ) : (
              <div className="flex gap-1">
                <Button size="sm" className="gap-1.5" onClick={handleSave} disabled={updateItem.isPending}>
                  <Save className="h-3.5 w-3.5" /> Guardar
                </Button>
                <Button variant="ghost" size="sm" onClick={() => setEditing(false)}>
                  <X className="h-3.5 w-3.5" />
                </Button>
              </div>
            )}
          </div>
        </div>

        <div className="grid lg:grid-cols-3 gap-6">
          {/* Main */}
          <div className="lg:col-span-2 space-y-6">
            {/* General Info */}
            {editing ? (
              <Card>
                <CardHeader><CardTitle className="text-base">Informações Gerais</CardTitle></CardHeader>
                <CardContent className="space-y-3">
                  <div className="grid grid-cols-2 gap-3">
                    <div><Label>Marca *</Label><Input value={editForm.brand} onChange={(e) => setEditForm((f: any) => ({ ...f, brand: e.target.value }))} /></div>
                    <div><Label>Modelo *</Label><Input value={editForm.model} onChange={(e) => setEditForm((f: any) => ({ ...f, model: e.target.value }))} /></div>
                    <div><Label>Referência</Label><Input value={editForm.reference} onChange={(e) => setEditForm((f: any) => ({ ...f, reference: e.target.value }))} /></div>
                    <div><Label>Subtipo</Label><Input value={editForm.subtype} onChange={(e) => setEditForm((f: any) => ({ ...f, subtype: e.target.value }))} /></div>
                  </div>
                  <div>
                    <Label>Notas de Compatibilidade</Label>
                    <Textarea value={editForm.compatibility_notes} onChange={(e) => setEditForm((f: any) => ({ ...f, compatibility_notes: e.target.value }))} rows={2} />
                  </div>
                  <div className="flex items-center gap-2">
                    <Switch checked={editForm.active} onCheckedChange={(v) => setEditForm((f: any) => ({ ...f, active: v }))} />
                    <Label>Ativo no catálogo</Label>
                  </div>
                </CardContent>
              </Card>
            ) : (
              <Card>
                <CardHeader><CardTitle className="text-base flex items-center gap-2"><Info className="h-4 w-4" /> Informações Gerais</CardTitle></CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="text-muted-foreground text-xs">Marca</span>
                      <p className="font-medium">{item.brand}</p>
                    </div>
                    <div>
                      <span className="text-muted-foreground text-xs">Modelo</span>
                      <p className="font-medium">{item.model}</p>
                    </div>
                    <div>
                      <span className="text-muted-foreground text-xs">Referência</span>
                      <p className="font-mono">{item.reference || "—"}</p>
                    </div>
                    <div>
                      <span className="text-muted-foreground text-xs">Subtipo</span>
                      <p>{item.subtype || "—"}</p>
                    </div>
                    <div>
                      <span className="text-muted-foreground text-xs">Categoria</span>
                      <p className="capitalize">{categoryLabels[item.category] || item.category || "—"}</p>
                    </div>
                    <div>
                      <span className="text-muted-foreground text-xs">Criado</span>
                      <p>{format(new Date(item.created_at), "dd/MM/yyyy")}</p>
                    </div>
                  </div>
                  {item.compatibility_notes && (
                    <div className="mt-4 pt-4 border-t">
                      <span className="text-muted-foreground text-xs">Compatibilidade</span>
                      <p className="text-sm mt-1">{item.compatibility_notes}</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}

            {/* Technical Specs */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <Settings2 className="h-4 w-4" /> Especificações Técnicas
                  <Badge variant="secondary" className="text-[10px] ml-auto">
                    {Object.keys(editSpecs).length} specs
                  </Badge>
                </CardTitle>
              </CardHeader>
              <CardContent>
                {Object.keys(editSpecs).length === 0 && !editing ? (
                  <div className="text-center py-6">
                    <Settings2 className="h-8 w-8 mx-auto mb-2 text-muted-foreground/40" />
                    <p className="text-sm text-muted-foreground">Sem especificações registadas</p>
                    <Button variant="outline" size="sm" className="mt-3 gap-1.5" onClick={startEdit}>
                      <Plus className="h-3.5 w-3.5" /> Adicionar Specs
                    </Button>
                  </div>
                ) : (
                  <>
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Parâmetro</TableHead>
                          <TableHead>Valor</TableHead>
                          {editing && <TableHead className="w-10"></TableHead>}
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {Object.entries(editSpecs).map(([key, val]) => (
                          <TableRow key={key}>
                            <TableCell className="font-medium text-sm">{key}</TableCell>
                            <TableCell className="text-sm">{String(val)}</TableCell>
                            {editing && (
                              <TableCell>
                                <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => removeSpec(key)}>
                                  <Trash2 className="h-3.5 w-3.5" />
                                </Button>
                              </TableCell>
                            )}
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>

                    {editing && (
                      <div className="flex gap-2 mt-3 pt-3 border-t">
                        <Input placeholder="Parâmetro (ex: Resolução)" value={newSpecKey} onChange={(e) => setNewSpecKey(e.target.value)} className="flex-1" />
                        <Input placeholder="Valor (ex: 4MP)" value={newSpecValue} onChange={(e) => setNewSpecValue(e.target.value)} className="flex-1" />
                        <Button size="sm" variant="outline" onClick={addSpec} disabled={!newSpecKey.trim()} className="gap-1">
                          <Plus className="h-3.5 w-3.5" /> Adicionar
                        </Button>
                      </div>
                    )}
                  </>
                )}
              </CardContent>
            </Card>

            {/* Installations using this item */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <Cpu className="h-4 w-4" /> Instalações ({installations.length})
                </CardTitle>
              </CardHeader>
              <CardContent>
                {installations.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-4">Este equipamento ainda não está instalado em nenhum sistema.</p>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Local</TableHead>
                        <TableHead>Sistema</TableHead>
                        <TableHead>Zona</TableHead>
                        <TableHead>Nº Série</TableHead>
                        <TableHead>Qtd</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {installations.map((inst: any) => {
                        const sys = inst.security_systems as any;
                        const site = sys?.security_installation_sites as any;
                        const zone = inst.security_system_zones as any;
                        return (
                          <TableRow key={inst.id}>
                            <TableCell className="font-medium text-sm">{site?.site_name || "—"}</TableCell>
                            <TableCell className="text-sm capitalize">{sys?.system_type || "—"}</TableCell>
                            <TableCell className="text-sm">{zone?.zone_name || "—"}</TableCell>
                            <TableCell className="font-mono text-xs">{inst.serial_number || "—"}</TableCell>
                            <TableCell>{inst.quantity ?? 1}</TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Quick Specs Summary */}
            {Object.keys(specs).length > 0 && !editing && (
              <Card>
                <CardHeader><CardTitle className="text-base">Resumo Rápido</CardTitle></CardHeader>
                <CardContent className="space-y-2">
                  {Object.entries(specs).slice(0, 8).map(([key, val]) => (
                    <div key={key} className="flex justify-between text-xs">
                      <span className="text-muted-foreground">{key}</span>
                      <span className="font-medium text-right max-w-[120px] truncate">{String(val)}</span>
                    </div>
                  ))}
                  {Object.keys(specs).length > 8 && (
                    <p className="text-[10px] text-muted-foreground text-center pt-1">+{Object.keys(specs).length - 8} mais</p>
                  )}
                </CardContent>
              </Card>
            )}

            {/* Meta */}
            <Card>
              <CardHeader><CardTitle className="text-base">Detalhes</CardTitle></CardHeader>
              <CardContent className="text-xs space-y-2">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Criado</span>
                  <span>{format(new Date(item.created_at), "dd/MM/yyyy")}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Atualizado</span>
                  <span>{format(new Date(item.updated_at), "dd/MM/yyyy")}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Instalações</span>
                  <span>{installations.length}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Estado</span>
                  <Badge variant={item.active !== false ? "default" : "secondary"} className="text-[10px]">
                    {item.active !== false ? "Ativo" : "Inativo"}
                  </Badge>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
