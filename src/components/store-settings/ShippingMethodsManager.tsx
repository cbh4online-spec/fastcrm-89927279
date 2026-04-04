import { useState } from "react";
import { useShippingMethods, useSaveShippingMethod, useDeleteShippingMethod, useSaveShippingZone, useDeleteShippingZone } from "@/hooks/useShippingMethods";
import type { ShippingMethod, ShippingZone } from "@/hooks/useShippingMethods";
import { useAIShipping, AISuggestedMethod, AIPriceSuggestion, AIZoneOptimization } from "@/hooks/useAIShipping";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Loader2, Plus, Trash2, Truck, MapPin, Package, Edit2, Sparkles, Lightbulb, TrendingUp, Globe } from "lucide-react";
import { toast } from "sonner";

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
  const ai = useAIShipping();

  const [editingMethod, setEditingMethod] = useState<Partial<ShippingMethod> | null>(null);
  const [editingZone, setEditingZone] = useState<{ methodId: string; zone: Partial<ShippingZone> } | null>(null);

  // AI state
  const [showAIWizard, setShowAIWizard] = useState(false);
  const [aiContext, setAIContext] = useState({ product_types: "", avg_weight: "0.5-2kg", target_markets: "Portugal, Espanha, Europa", country: "Portugal" });
  const [aiSuggestions, setAISuggestions] = useState<AISuggestedMethod[] | null>(null);
  const [aiPriceSuggestion, setAIPriceSuggestion] = useState<AIPriceSuggestion | null>(null);
  const [aiZoneOptimization, setAIZoneOptimization] = useState<AIZoneOptimization | null>(null);
  const [showPriceDialog, setShowPriceDialog] = useState(false);
  const [showZoneDialog, setShowZoneDialog] = useState(false);
  const [selectedMethodForAI, setSelectedMethodForAI] = useState<ShippingMethod | null>(null);

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

  // AI Handlers
  const handleAISuggestMethods = async () => {
    const result = await ai.suggestMethods({
      ...aiContext,
      existing_methods: methods.length,
    });
    if (result) {
      setAISuggestions(result);
    }
  };

  const handleApplySuggestion = async (suggestion: AISuggestedMethod) => {
    saveMethod.mutate(
      {
        name: suggestion.name,
        description: suggestion.description,
        base_price: suggestion.base_price,
        free_shipping_threshold: suggestion.free_shipping_threshold,
        estimated_delivery: suggestion.estimated_delivery,
        is_active: true,
      },
      {
        onSuccess: (methodId) => {
          // Save zones for this method
          suggestion.zones.forEach((zone) => {
            saveZone.mutate({
              shipping_method_id: methodId as string,
              name: zone.name,
              countries: zone.countries,
              flat_price: zone.flat_price,
              weight_rules: zone.weight_rules,
              is_active: true,
              sort_order: 0,
            });
          });
          toast.success(`Método "${suggestion.name}" criado com ${suggestion.zones.length} zona(s)`);
        },
      }
    );
  };

  const handleAISuggestPrices = async (method: ShippingMethod) => {
    setSelectedMethodForAI(method);
    setShowPriceDialog(true);
    const result = await ai.suggestPrices({
      method_name: method.name,
      country: aiContext.country,
      product_types: aiContext.product_types,
      avg_weight: aiContext.avg_weight,
      target_markets: aiContext.target_markets,
      current_price: method.base_price,
    });
    if (result) {
      setAIPriceSuggestion(result);
    }
  };

  const handleApplyPriceSuggestion = () => {
    if (!selectedMethodForAI || !aiPriceSuggestion) return;
    saveMethod.mutate(
      {
        id: selectedMethodForAI.id,
        name: selectedMethodForAI.name,
        base_price: aiPriceSuggestion.base_price,
        free_shipping_threshold: aiPriceSuggestion.free_shipping_threshold,
      },
      {
        onSuccess: () => {
          toast.success("Preços atualizados com sugestão da IA");
          setShowPriceDialog(false);
          setAIPriceSuggestion(null);
          setSelectedMethodForAI(null);
        },
      }
    );
  };

  const handleAIOptimizeZones = async (method: ShippingMethod) => {
    setSelectedMethodForAI(method);
    setShowZoneDialog(true);
    const result = await ai.optimizeZones({
      method_name: method.name,
      country: aiContext.country,
      product_types: aiContext.product_types,
      current_zones: method.shipping_zones || [],
    });
    if (result) {
      setAIZoneOptimization(result);
    }
  };

  const handleApplyZoneSuggestion = (suggestion: AIZoneOptimization["suggestions"][0]) => {
    if (!selectedMethodForAI) return;
    if (suggestion.type === "add_zone") {
      saveZone.mutate(
        {
          shipping_method_id: selectedMethodForAI.id,
          name: suggestion.zone_name,
          countries: suggestion.countries,
          flat_price: suggestion.suggested_price,
          weight_rules: suggestion.weight_rules || [],
          is_active: true,
          sort_order: 0,
        },
        {
          onSuccess: () => toast.success(`Zona "${suggestion.zone_name}" criada`),
        }
      );
    }
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
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setShowAIWizard(true)} className="gap-2">
            <Sparkles className="h-4 w-4 text-amber-500" /> Criar com IA
          </Button>
          <Button onClick={() => setEditingMethod({ name: "", base_price: 0, is_active: true })} className="gap-2">
            <Plus className="h-4 w-4" /> Adicionar
          </Button>
        </div>
      </div>

      {methods.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <Package className="h-12 w-12 mx-auto mb-3 opacity-30" />
            <p className="text-muted-foreground mb-4">Sem métodos de envio configurados</p>
            <Button variant="outline" onClick={() => setShowAIWizard(true)} className="gap-2">
              <Sparkles className="h-4 w-4 text-amber-500" /> Gerar métodos com IA
            </Button>
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
                  <div className="flex gap-1">
                    <Button variant="ghost" size="icon" title="Sugerir preços com IA" onClick={() => handleAISuggestPrices(method)}>
                      <TrendingUp className="h-4 w-4 text-amber-500" />
                    </Button>
                    <Button variant="ghost" size="icon" title="Otimizar zonas com IA" onClick={() => handleAIOptimizeZones(method)}>
                      <Globe className="h-4 w-4 text-amber-500" />
                    </Button>
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

      {/* AI Wizard Dialog */}
      <Dialog open={showAIWizard} onOpenChange={(v) => { setShowAIWizard(v); if (!v) setAISuggestions(null); }}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-amber-500" /> Criação Assistida por IA
            </DialogTitle>
            <DialogDescription>
              Descreve o teu negócio e a IA sugere métodos de envio otimizados com zonas e preços.
            </DialogDescription>
          </DialogHeader>

          {!aiSuggestions ? (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Tipo de produtos</Label>
                <Input
                  value={aiContext.product_types}
                  onChange={(e) => setAIContext((p) => ({ ...p, product_types: e.target.value }))}
                  placeholder="Ex: Roupa, acessórios, calçado..."
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Peso médio dos produtos</Label>
                  <Input
                    value={aiContext.avg_weight}
                    onChange={(e) => setAIContext((p) => ({ ...p, avg_weight: e.target.value }))}
                    placeholder="Ex: 0.5-2kg"
                  />
                </div>
                <div className="space-y-2">
                  <Label>País base</Label>
                  <Input
                    value={aiContext.country}
                    onChange={(e) => setAIContext((p) => ({ ...p, country: e.target.value }))}
                    placeholder="Portugal"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Mercados alvo</Label>
                <Input
                  value={aiContext.target_markets}
                  onChange={(e) => setAIContext((p) => ({ ...p, target_markets: e.target.value }))}
                  placeholder="Ex: Portugal, Espanha, Europa"
                />
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setShowAIWizard(false)}>Cancelar</Button>
                <Button onClick={handleAISuggestMethods} disabled={ai.isLoading} className="gap-2">
                  {ai.isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
                  Gerar sugestões
                </Button>
              </DialogFooter>
            </div>
          ) : (
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground flex items-center gap-1.5">
                <Lightbulb className="h-4 w-4 text-amber-500" />
                {aiSuggestions.length} método(s) sugeridos. Clica para aplicar.
              </p>
              {aiSuggestions.map((s, i) => (
                <Card key={i} className="border-dashed border-amber-300/50 bg-amber-50/30 dark:bg-amber-950/10">
                  <CardContent className="pt-4 space-y-3">
                    <div className="flex items-center justify-between">
                      <div>
                        <h4 className="font-semibold">{s.name}</h4>
                        <p className="text-sm text-muted-foreground">{s.description}</p>
                      </div>
                      <Button size="sm" onClick={() => handleApplySuggestion(s)} disabled={saveMethod.isPending} className="gap-1">
                        <Plus className="h-3 w-3" /> Aplicar
                      </Button>
                    </div>
                    <div className="flex gap-2 flex-wrap text-xs">
                      <Badge variant="outline">€{s.base_price.toFixed(2)}</Badge>
                      {s.free_shipping_threshold && (
                        <Badge variant="outline" className="text-green-600">Grátis &gt; €{s.free_shipping_threshold}</Badge>
                      )}
                      <Badge variant="outline">⏱ {s.estimated_delivery}</Badge>
                    </div>
                    {s.zones.length > 0 && (
                      <div className="space-y-1">
                        <p className="text-xs font-medium text-muted-foreground">{s.zones.length} zona(s):</p>
                        {s.zones.map((z, zi) => (
                          <div key={zi} className="text-xs flex items-center gap-2 pl-2">
                            <MapPin className="h-3 w-3 text-muted-foreground" />
                            <span className="font-medium">{z.name}</span>
                            <span className="text-muted-foreground">({z.countries.join(", ")})</span>
                            {z.flat_price !== null && <Badge variant="secondary" className="text-[10px]">€{z.flat_price.toFixed(2)}</Badge>}
                            {z.weight_rules?.length > 0 && <Badge variant="secondary" className="text-[10px]">{z.weight_rules.length} regra(s)</Badge>}
                          </div>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}
              <DialogFooter>
                <Button variant="outline" onClick={() => setAISuggestions(null)}>
                  <Sparkles className="h-4 w-4 mr-1" /> Regenerar
                </Button>
                <Button variant="outline" onClick={() => { setShowAIWizard(false); setAISuggestions(null); }}>
                  Fechar
                </Button>
              </DialogFooter>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* AI Price Suggestion Dialog */}
      <Dialog open={showPriceDialog} onOpenChange={(v) => { setShowPriceDialog(v); if (!v) { setAIPriceSuggestion(null); setSelectedMethodForAI(null); } }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-amber-500" /> Sugestão de Preços IA
            </DialogTitle>
            <DialogDescription>
              {selectedMethodForAI?.name ? `Preços sugeridos para "${selectedMethodForAI.name}"` : "A analisar..."}
            </DialogDescription>
          </DialogHeader>
          {ai.isLoading && ai.loadingAction === "suggest_prices" ? (
            <div className="flex flex-col items-center justify-center py-8 gap-3">
              <Loader2 className="h-8 w-8 animate-spin text-amber-500" />
              <p className="text-sm text-muted-foreground">A analisar mercado e tarifas...</p>
            </div>
          ) : aiPriceSuggestion ? (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <Card className="border-amber-200/50">
                  <CardContent className="p-3 text-center">
                    <p className="text-xs text-muted-foreground">Preço base</p>
                    <p className="text-lg font-bold">€{aiPriceSuggestion.base_price.toFixed(2)}</p>
                    {selectedMethodForAI && (
                      <p className="text-[10px] text-muted-foreground">Atual: €{selectedMethodForAI.base_price.toFixed(2)}</p>
                    )}
                  </CardContent>
                </Card>
                <Card className="border-amber-200/50">
                  <CardContent className="p-3 text-center">
                    <p className="text-xs text-muted-foreground">Grátis a partir de</p>
                    <p className="text-lg font-bold">
                      {aiPriceSuggestion.free_shipping_threshold ? `€${aiPriceSuggestion.free_shipping_threshold.toFixed(2)}` : "—"}
                    </p>
                  </CardContent>
                </Card>
              </div>
              {aiPriceSuggestion.reasoning && (
                <div className="rounded-lg bg-muted/50 p-3">
                  <p className="text-xs font-medium mb-1 flex items-center gap-1"><Lightbulb className="h-3 w-3" /> Análise</p>
                  <p className="text-xs text-muted-foreground">{aiPriceSuggestion.reasoning}</p>
                </div>
              )}
              <DialogFooter>
                <Button variant="outline" onClick={() => { setShowPriceDialog(false); setAIPriceSuggestion(null); }}>Cancelar</Button>
                <Button onClick={handleApplyPriceSuggestion} disabled={saveMethod.isPending} className="gap-1">
                  {saveMethod.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
                  Aplicar preços
                </Button>
              </DialogFooter>
            </div>
          ) : null}
        </DialogContent>
      </Dialog>

      {/* AI Zone Optimization Dialog */}
      <Dialog open={showZoneDialog} onOpenChange={(v) => { setShowZoneDialog(v); if (!v) { setAIZoneOptimization(null); setSelectedMethodForAI(null); } }}>
        <DialogContent className="max-w-lg max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Globe className="h-5 w-5 text-amber-500" /> Otimização de Zonas IA
            </DialogTitle>
            <DialogDescription>
              {selectedMethodForAI?.name ? `Sugestões para "${selectedMethodForAI.name}"` : "A analisar..."}
            </DialogDescription>
          </DialogHeader>
          {ai.isLoading && ai.loadingAction === "optimize_zones" ? (
            <div className="flex flex-col items-center justify-center py-8 gap-3">
              <Loader2 className="h-8 w-8 animate-spin text-amber-500" />
              <p className="text-sm text-muted-foreground">A analisar zonas e mercados...</p>
            </div>
          ) : aiZoneOptimization ? (
            <div className="space-y-4">
              {aiZoneOptimization.overall_analysis && (
                <div className="rounded-lg bg-muted/50 p-3">
                  <p className="text-xs font-medium mb-1 flex items-center gap-1"><Lightbulb className="h-3 w-3" /> Análise geral</p>
                  <p className="text-xs text-muted-foreground">{aiZoneOptimization.overall_analysis}</p>
                </div>
              )}
              {aiZoneOptimization.suggestions.map((s, i) => (
                <Card key={i} className="border-dashed border-amber-300/50">
                  <CardContent className="pt-3 space-y-2">
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="flex items-center gap-2">
                          <Badge variant={s.type === "add_zone" ? "default" : "secondary"} className="text-[10px]">
                            {s.type === "add_zone" && "Nova zona"}
                            {s.type === "modify_zone" && "Modificar"}
                            {s.type === "merge_zones" && "Fundir"}
                            {s.type === "split_zone" && "Dividir"}
                          </Badge>
                          <span className="font-medium text-sm">{s.zone_name}</span>
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">{s.description}</p>
                      </div>
                      {s.type === "add_zone" && (
                        <Button size="sm" variant="outline" onClick={() => handleApplyZoneSuggestion(s)} className="gap-1">
                          <Plus className="h-3 w-3" /> Criar
                        </Button>
                      )}
                    </div>
                    <div className="flex gap-1 flex-wrap">
                      {s.countries.map((c) => (
                        <Badge key={c} variant="secondary" className="text-[10px]">{c}</Badge>
                      ))}
                    </div>
                    {s.suggested_price !== null && (
                      <p className="text-xs text-muted-foreground">Preço sugerido: €{s.suggested_price.toFixed(2)}</p>
                    )}
                    <p className="text-[11px] text-muted-foreground italic">{s.reason}</p>
                  </CardContent>
                </Card>
              ))}
              <DialogFooter>
                <Button variant="outline" onClick={() => { setShowZoneDialog(false); setAIZoneOptimization(null); }}>Fechar</Button>
              </DialogFooter>
            </div>
          ) : null}
        </DialogContent>
      </Dialog>

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
