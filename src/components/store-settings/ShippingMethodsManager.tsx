import { useState } from "react";
import { useShippingMethods, useSaveShippingMethod, useDeleteShippingMethod, useSaveShippingZone, useDeleteShippingZone } from "@/hooks/useShippingMethods";
import type { ShippingMethod, ShippingZone } from "@/hooks/useShippingMethods";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Loader2, Plus, Trash2, Truck, MapPin, Package, Edit2 } from "lucide-react";

const COUNTRY_OPTIONS = [
  { code: "PT", label: "Portugal" },
  { code: "ES", label: "Espanha" },
  { code: "FR", label: "França" },
  { code: "DE", label: "Alemanha" },
  { code: "IT", label: "Itália" },
  { code: "GB", label: "Reino Unido" },
  { code: "NL", label: "Países Baixos" },
  { code: "BE", label: "Bélgica" },
  { code: "BR", label: "Brasil" },
  { code: "US", label: "EUA" },
];

export function ShippingMethodsManager() {
  const { data: methods = [], isLoading } = useShippingMethods();
  const saveMethod = useSaveShippingMethod();
  const deleteMethod = useDeleteShippingMethod();
  const saveZone = useSaveShippingZone();
  const deleteZone = useDeleteShippingZone();

  const [editingMethod, setEditingMethod] = useState<Partial<ShippingMethod> | null>(null);
  const [editingZone, setEditingZone] = useState<{ methodId: string; zone: Partial<ShippingZone> } | null>(null);

  const handleSaveMethod = () => {
    if (!editingMethod?.name?.trim()) return;
    saveMethod.mutate(editingMethod as Partial<ShippingMethod> & { id?: string }, {
      onSuccess: () => setEditingMethod(null),
    });
  };

  const handleSaveZone = () => {
    if (!editingZone?.zone?.name?.trim()) return;
    saveZone.mutate(
      { ...editingZone.zone, shipping_method_id: editingZone.methodId } as Partial<ShippingZone> & { shipping_method_id: string; id?: string },
      { onSuccess: () => setEditingZone(null) }
    );
  };

  const toggleCountry = (code: string) => {
    if (!editingZone) return;
    const current = editingZone.zone.countries || [];
    const updated = current.includes(code)
      ? current.filter((c) => c !== code)
      : [...current, code];
    setEditingZone({ ...editingZone, zone: { ...editingZone.zone, countries: updated } });
  };

  const addWeightRule = () => {
    if (!editingZone) return;
    const rules = editingZone.zone.weight_rules || [];
    const lastMax = rules.length > 0 ? rules[rules.length - 1].max_weight : 0;
    setEditingZone({
      ...editingZone,
      zone: {
        ...editingZone.zone,
        weight_rules: [...rules, { min_weight: lastMax, max_weight: lastMax + 5, price: 0 }],
      },
    });
  };

  const updateWeightRule = (index: number, field: string, value: number) => {
    if (!editingZone) return;
    const rules = [...(editingZone.zone.weight_rules || [])];
    rules[index] = { ...rules[index], [field]: value };
    setEditingZone({ ...editingZone, zone: { ...editingZone.zone, weight_rules: rules } });
  };

  const removeWeightRule = (index: number) => {
    if (!editingZone) return;
    const rules = (editingZone.zone.weight_rules || []).filter((_, i) => i !== index);
    setEditingZone({ ...editingZone, zone: { ...editingZone.zone, weight_rules: rules } });
  };

  if (isLoading) {
    return <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold flex items-center gap-2"><Truck className="h-5 w-5" /> Métodos de Envio</h3>
          <p className="text-sm text-muted-foreground">Configure métodos de envio com preços por zona geográfica e peso.</p>
        </div>
        <Button onClick={() => setEditingMethod({ name: "", base_price: 0, is_active: true })} className="gap-2">
          <Plus className="h-4 w-4" /> Adicionar
        </Button>
      </div>

      {methods.length === 0 ? (
        <Card>
          <CardContent className="py-8 text-center text-muted-foreground">
            <Package className="h-12 w-12 mx-auto mb-3 opacity-30" />
            <p>Sem métodos de envio configurados</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {methods.map((method) => (
            <Card key={method.id}>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <CardTitle className="text-base">{method.name}</CardTitle>
                    <Badge variant={method.is_active ? "default" : "secondary"}>
                      {method.is_active ? "Ativo" : "Inativo"}
                    </Badge>
                    <Badge variant="outline">€{method.base_price.toFixed(2)}</Badge>
                    {method.free_shipping_threshold && (
                      <Badge variant="outline" className="text-green-600">Grátis &gt; €{method.free_shipping_threshold}</Badge>
                    )}
                  </div>
                  <div className="flex gap-2">
                    <Button variant="ghost" size="icon" onClick={() => setEditingMethod(method)}>
                      <Edit2 className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="icon" onClick={() => deleteMethod.mutate(method.id)}>
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                </div>
                {method.description && <p className="text-sm text-muted-foreground">{method.description}</p>}
                {method.estimated_delivery && <p className="text-xs text-muted-foreground">⏱ {method.estimated_delivery}</p>}
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="text-sm font-medium flex items-center gap-1.5"><MapPin className="h-3.5 w-3.5" /> Zonas</h4>
                  <Button variant="outline" size="sm" onClick={() => setEditingZone({ methodId: method.id, zone: { name: "", countries: [], weight_rules: [], is_active: true } })}>
                    <Plus className="h-3 w-3 mr-1" /> Zona
                  </Button>
                </div>
                {(method.shipping_zones || []).length === 0 ? (
                  <p className="text-xs text-muted-foreground">Sem zonas — será usado o preço base</p>
                ) : (
                  <div className="space-y-2">
                    {(method.shipping_zones || []).map((zone) => (
                      <div key={zone.id} className="flex items-center justify-between border rounded-lg px-3 py-2 text-sm">
                        <div className="space-y-0.5">
                          <p className="font-medium">{zone.name}</p>
                          <div className="flex gap-1 flex-wrap">
                            {zone.countries.map((c) => (
                              <Badge key={c} variant="secondary" className="text-xs">{c}</Badge>
                            ))}
                          </div>
                          {zone.flat_price !== null ? (
                            <p className="text-xs text-muted-foreground">Preço fixo: €{zone.flat_price.toFixed(2)}</p>
                          ) : (
                            <p className="text-xs text-muted-foreground">{(zone.weight_rules || []).length} regra(s) de peso</p>
                          )}
                        </div>
                        <div className="flex gap-1">
                          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setEditingZone({ methodId: method.id, zone })}>
                            <Edit2 className="h-3 w-3" />
                          </Button>
                          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => deleteZone.mutate(zone.id)}>
                            <Trash2 className="h-3 w-3 text-destructive" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Method Dialog */}
      <Dialog open={!!editingMethod} onOpenChange={() => setEditingMethod(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingMethod?.id ? "Editar" : "Novo"} Método de Envio</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Nome *</Label>
              <Input value={editingMethod?.name || ""} onChange={(e) => setEditingMethod((p) => p && { ...p, name: e.target.value })} placeholder="Ex: Envio Standard" />
            </div>
            <div className="space-y-2">
              <Label>Descrição</Label>
              <Input value={editingMethod?.description || ""} onChange={(e) => setEditingMethod((p) => p && { ...p, description: e.target.value })} placeholder="Opcional" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Preço base (€)</Label>
                <Input type="number" step="0.01" min="0" value={editingMethod?.base_price ?? 0} onChange={(e) => setEditingMethod((p) => p && { ...p, base_price: parseFloat(e.target.value) || 0 })} />
              </div>
              <div className="space-y-2">
                <Label>Grátis a partir de (€)</Label>
                <Input type="number" step="0.01" min="0" value={editingMethod?.free_shipping_threshold ?? ""} onChange={(e) => setEditingMethod((p) => p && { ...p, free_shipping_threshold: e.target.value ? parseFloat(e.target.value) : null })} placeholder="Sem limite" />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Estimativa de entrega</Label>
              <Input value={editingMethod?.estimated_delivery || ""} onChange={(e) => setEditingMethod((p) => p && { ...p, estimated_delivery: e.target.value })} placeholder="Ex: 2-3 dias úteis" />
            </div>
            <div className="flex items-center gap-2">
              <Switch checked={editingMethod?.is_active ?? true} onCheckedChange={(v) => setEditingMethod((p) => p && { ...p, is_active: v })} />
              <Label>Ativo</Label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditingMethod(null)}>Cancelar</Button>
            <Button onClick={handleSaveMethod} disabled={saveMethod.isPending}>
              {saveMethod.isPending && <Loader2 className="h-4 w-4 mr-1 animate-spin" />}
              Guardar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Zone Dialog */}
      <Dialog open={!!editingZone} onOpenChange={() => setEditingZone(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{editingZone?.zone?.id ? "Editar" : "Nova"} Zona de Envio</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 max-h-[60vh] overflow-y-auto">
            <div className="space-y-2">
              <Label>Nome *</Label>
              <Input value={editingZone?.zone?.name || ""} onChange={(e) => setEditingZone((p) => p && { ...p, zone: { ...p.zone, name: e.target.value } })} placeholder="Ex: Portugal Continental" />
            </div>
            <div className="space-y-2">
              <Label>Países</Label>
              <div className="flex flex-wrap gap-2">
                {COUNTRY_OPTIONS.map((c) => (
                  <Badge
                    key={c.code}
                    variant={editingZone?.zone?.countries?.includes(c.code) ? "default" : "outline"}
                    className="cursor-pointer"
                    onClick={() => toggleCountry(c.code)}
                  >
                    {c.code} — {c.label}
                  </Badge>
                ))}
              </div>
            </div>
            <Separator />
            <div className="space-y-2">
              <Label>Preço fixo (€) — alternativa a regras de peso</Label>
              <Input
                type="number"
                step="0.01"
                min="0"
                value={editingZone?.zone?.flat_price ?? ""}
                onChange={(e) =>
                  setEditingZone((p) =>
                    p && { ...p, zone: { ...p.zone, flat_price: e.target.value ? parseFloat(e.target.value) : null } }
                  )
                }
                placeholder="Deixe vazio para usar regras de peso"
              />
            </div>
            <Separator />
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label>Regras por peso (kg)</Label>
                <Button variant="outline" size="sm" onClick={addWeightRule}><Plus className="h-3 w-3 mr-1" /> Regra</Button>
              </div>
              {(editingZone?.zone?.weight_rules || []).map((rule, i) => (
                <div key={i} className="flex items-center gap-2 text-sm">
                  <Input type="number" step="0.1" min="0" value={rule.min_weight} onChange={(e) => updateWeightRule(i, "min_weight", parseFloat(e.target.value) || 0)} className="w-20" placeholder="Min" />
                  <span className="text-muted-foreground">—</span>
                  <Input type="number" step="0.1" min="0" value={rule.max_weight} onChange={(e) => updateWeightRule(i, "max_weight", parseFloat(e.target.value) || 0)} className="w-20" placeholder="Max" />
                  <span className="text-muted-foreground">kg →</span>
                  <Input type="number" step="0.01" min="0" value={rule.price} onChange={(e) => updateWeightRule(i, "price", parseFloat(e.target.value) || 0)} className="w-24" placeholder="€" />
                  <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => removeWeightRule(i)}>
                    <Trash2 className="h-3 w-3 text-destructive" />
                  </Button>
                </div>
              ))}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditingZone(null)}>Cancelar</Button>
            <Button onClick={handleSaveZone} disabled={saveZone.isPending}>
              {saveZone.isPending && <Loader2 className="h-4 w-4 mr-1 animate-spin" />}
              Guardar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
