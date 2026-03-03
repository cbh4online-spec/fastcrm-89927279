import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, Sparkles, Save, Plus, Trash2, DollarSign, Package, Gift, Brain, RefreshCw, Star, Upload } from "lucide-react";
import { toast } from "sonner";
import {
  usePlatformPricingConfigs,
  useUpdatePricingConfig,
  useCreatePricingConfig,
  useDeletePricingConfig,
  type PlatformPricingConfig,
} from "@/hooks/usePlatformPricing";
import { useMarketplaceModulesAdmin, type MarketplaceModuleAdmin, type ModulePricing } from "@/hooks/useMarketplaceModulesAdmin";
import { EXTENSION_PACKS } from "@/config/extensionPacks";
import { supabase } from "@/integrations/supabase/client";
import { Json } from "@/integrations/supabase/types";

function useAIAssistant() {
  const [loading, setLoading] = useState(false);

  const callAI = async (action: string, context: unknown) => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("pricing-ai-assistant", {
        body: { action, context },
      });
      if (error) throw error;
      return data?.result;
    } catch (e: any) {
      toast.error("Erro IA: " + (e.message || "Erro desconhecido"));
      return null;
    } finally {
      setLoading(false);
    }
  };

  return { callAI, loading };
}

// ─── Plan Card Editor ───
function PlanEditor({ config, onSave }: { config: PlatformPricingConfig; onSave: (updates: Partial<PlatformPricingConfig>) => void }) {
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(config.name);
  const [priceMonthly, setPriceMonthly] = useState(config.price_monthly);
  const [priceYearly, setPriceYearly] = useState(config.price_yearly);
  const [features, setFeatures] = useState<string[]>(config.features || []);
  const [newFeature, setNewFeature] = useState("");
  const [isHighlighted, setIsHighlighted] = useState(config.is_highlighted);
  const [description, setDescription] = useState(config.description || "");
  const { callAI, loading: aiLoading } = useAIAssistant();

  const handleSave = () => {
    onSave({
      name,
      price_monthly: priceMonthly,
      price_yearly: priceYearly,
      features: features as any,
      is_highlighted: isHighlighted,
      description,
    });
    setEditing(false);
  };

  const addFeature = () => {
    if (newFeature.trim()) {
      setFeatures([...features, newFeature.trim()]);
      setNewFeature("");
    }
  };

  const removeFeature = (idx: number) => {
    setFeatures(features.filter((_, i) => i !== idx));
  };

  const handleAIFeatures = async () => {
    const result = await callAI("generate_features", { name, description, config_type: "plan", current_features: features });
    if (result?.features) {
      setFeatures(result.features);
      toast.success("Features geradas pela IA!");
    }
  };

  const metadata = config.metadata as Record<string, any>;
  const color = metadata?.color || "hsl(221, 83%, 53%)";

  return (
    <Card className={`relative ${config.is_highlighted ? "ring-2 ring-primary" : ""}`}>
      {config.is_highlighted && (
        <Badge className="absolute -top-2 left-4 bg-primary text-primary-foreground text-xs">Popular</Badge>
      )}
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full" style={{ backgroundColor: color }} />
            {editing ? (
              <Input value={name} onChange={(e) => setName(e.target.value)} className="h-8 w-40" />
            ) : (
              <CardTitle className="text-lg">{config.name}</CardTitle>
            )}
          </div>
          <Button variant="ghost" size="sm" onClick={() => editing ? handleSave() : setEditing(true)}>
            {editing ? <><Save className="h-4 w-4 mr-1" /> Guardar</> : "Editar"}
          </Button>
        </div>
        <CardDescription>{config.config_key}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label className="text-xs text-muted-foreground">Preço Mensal (€)</Label>
            {editing ? (
              <Input type="number" value={priceMonthly} onChange={(e) => setPriceMonthly(Number(e.target.value))} className="h-8" />
            ) : (
              <p className="text-2xl font-bold">€{config.price_monthly}</p>
            )}
          </div>
          <div>
            <Label className="text-xs text-muted-foreground">Preço Anual (€)</Label>
            {editing ? (
              <Input type="number" value={priceYearly} onChange={(e) => setPriceYearly(Number(e.target.value))} className="h-8" />
            ) : (
              <p className="text-2xl font-bold">€{config.price_yearly}</p>
            )}
          </div>
        </div>

        {editing && (
          <>
            <div>
              <Label className="text-xs text-muted-foreground">Descrição</Label>
              <Textarea value={description} onChange={(e) => setDescription(e.target.value)} className="h-16" />
            </div>
            <div className="flex items-center gap-2">
              <Switch checked={isHighlighted} onCheckedChange={setIsHighlighted} />
              <Label className="text-xs">Destacado (Popular)</Label>
            </div>
          </>
        )}

        <div>
          <div className="flex items-center justify-between mb-2">
            <Label className="text-xs text-muted-foreground">Features ({features.length})</Label>
            {editing && (
              <Button variant="outline" size="sm" onClick={handleAIFeatures} disabled={aiLoading} className="h-7 text-xs">
                {aiLoading ? <Loader2 className="h-3 w-3 animate-spin mr-1" /> : <Brain className="h-3 w-3 mr-1" />}
                IA: Gerar
              </Button>
            )}
          </div>
          <ul className="space-y-1">
            {(editing ? features : config.features || []).map((f, i) => (
              <li key={i} className="flex items-center gap-2 text-sm">
                <span className="w-1.5 h-1.5 rounded-full bg-primary shrink-0" />
                <span className="flex-1">{f}</span>
                {editing && (
                  <Button variant="ghost" size="sm" className="h-5 w-5 p-0" onClick={() => removeFeature(i)}>
                    <Trash2 className="h-3 w-3 text-destructive" />
                  </Button>
                )}
              </li>
            ))}
          </ul>
          {editing && (
            <div className="flex gap-2 mt-2">
              <Input value={newFeature} onChange={(e) => setNewFeature(e.target.value)} placeholder="Nova feature..." className="h-8 text-sm"
                onKeyDown={(e) => e.key === "Enter" && addFeature()} />
              <Button variant="outline" size="sm" onClick={addFeature} className="h-8"><Plus className="h-3 w-3" /></Button>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

// ─── Marketplace Module Card ───
function MarketplaceModuleCard({ mod, onUpdate, parsePricing }: {
  mod: MarketplaceModuleAdmin;
  onUpdate: (updates: Record<string, unknown>) => void;
  parsePricing: (p: Json) => ModulePricing;
}) {
  const pricing = parsePricing(mod.pricing);
  const [basePrice, setBasePrice] = useState(pricing.base_price ?? 0);
  const [trialDays, setTrialDays] = useState(pricing.trial_days ?? 0);
  const [status, setStatus] = useState(mod.status);
  const [isFeatured, setIsFeatured] = useState(mod.is_featured ?? false);
  const [tagline, setTagline] = useState(mod.tagline);

  const handleSave = () => {
    const newPricing = { ...pricing, base_price: basePrice, trial_days: trialDays };
    onUpdate({
      pricing: newPricing as unknown as Json,
      status,
      is_featured: isFeatured,
      tagline,
    });
  };

  return (
    <Card className={isFeatured ? "ring-2 ring-primary/50" : ""}>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-xl">{mod.icon}</span>
            <div>
              <CardTitle className="text-sm">{mod.name}</CardTitle>
              <CardDescription className="text-xs">{mod.category} · v{mod.version}</CardDescription>
            </div>
          </div>
          <div className="flex items-center gap-1">
            <Badge variant={status === "published" ? "default" : "secondary"} className="text-xs">
              {status === "published" ? "Publicado" : status}
            </Badge>
            {isFeatured && <Star className="h-3 w-3 text-yellow-500 fill-yellow-500" />}
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        <div>
          <Label className="text-xs text-muted-foreground">Tagline</Label>
          <Input value={tagline} onChange={(e) => setTagline(e.target.value)} className="h-7 text-sm" />
        </div>
        <div className="grid grid-cols-2 gap-2">
          <div>
            <Label className="text-xs">Preço Base (€)</Label>
            <Input type="number" value={basePrice} onChange={(e) => setBasePrice(Number(e.target.value))} className="h-7 text-sm" />
          </div>
          <div>
            <Label className="text-xs">Trial (dias)</Label>
            <Input type="number" value={trialDays} onChange={(e) => setTrialDays(Number(e.target.value))} className="h-7 text-sm" />
          </div>
        </div>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Select value={status} onValueChange={setStatus}>
              <SelectTrigger className="h-7 w-28 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="published">Publicado</SelectItem>
                <SelectItem value="draft">Rascunho</SelectItem>
                <SelectItem value="archived">Arquivado</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="flex items-center gap-2">
            <Switch checked={isFeatured} onCheckedChange={setIsFeatured} />
            <Label className="text-xs">Destaque</Label>
          </div>
        </div>
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <span>{mod.installs_count ?? 0} instalações</span>
          <Button size="sm" className="h-7 text-xs" onClick={handleSave}>
            <Save className="h-3 w-3 mr-1" /> Guardar
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

// ─── Main Section ───
export function PricingManagementSection() {
  const { data: allConfigs, isLoading } = usePlatformPricingConfigs();
  const updateConfig = useUpdatePricingConfig();
  const createConfig = useCreatePricingConfig();
  const deleteConfig = useDeletePricingConfig();
  const { callAI, loading: aiLoading } = useAIAssistant();
  const { modules: marketplaceModules, isLoading: modulesLoading, updateModule, syncToLandingPage, parsePricing } = useMarketplaceModulesAdmin();

  const plans = allConfigs?.filter((c) => c.config_type === "plan") ?? [];
  const bundles = allConfigs?.filter((c) => c.config_type === "bundle") ?? [];

  const handleUpdatePlan = (id: string) => (updates: Partial<PlatformPricingConfig>) => {
    updateConfig.mutate({ id, ...updates });
  };

  const handleSuggestPrices = async () => {
    const result = await callAI("suggest_prices", { plans, modules: marketplaceModules });
    if (result?.suggestions) {
      toast.success("Sugestões de preços recebidas! Revise e aplique.");
      // Show suggestions in a simple way
      result.suggestions.forEach((s: any) => {
        toast.info(`${s.config_key}: €${s.price_monthly}/mês, €${s.price_yearly}/ano — ${s.reasoning}`, { duration: 10000 });
      });
    }
  };

  const handleCreateBundle = () => {
    createConfig.mutate({
      config_type: "bundle",
      config_key: `bundle-${Date.now()}`,
      name: "Novo Bundle",
      description: "Descrição do bundle",
      price_monthly: 0,
      price_yearly: 0,
      currency: "EUR",
      features: [] as any,
      highlights: [] as any,
      metadata: {} as any,
      display_order: bundles.length + 1,
      is_active: true,
      is_highlighted: false,
    });
  };

  const handleImportExtensionPacks = () => {
    for (const pack of EXTENSION_PACKS) {
      createConfig.mutate({
        config_type: "bundle",
        config_key: pack.id,
        name: pack.name,
        description: pack.description,
        price_monthly: pack.priceMonthly ?? 0,
        price_yearly: (pack.priceMonthly ?? 0) * 10,
        currency: "EUR",
        features: pack.modules as unknown as Json,
        highlights: [] as unknown as Json,
        metadata: { icon: pack.icon, color: pack.color, requiredPlan: pack.requiredPlan } as unknown as Json,
        display_order: 0,
        is_active: true,
        is_highlighted: false,
      });
    }
    toast.success(`${EXTENSION_PACKS.length} packs importados!`);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-12">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Pricing & Módulos</h1>
          <p className="text-muted-foreground">Gerir preços, planos e módulos da plataforma com assistência IA</p>
        </div>
        <Button onClick={handleSuggestPrices} disabled={aiLoading} variant="outline">
          {aiLoading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Sparkles className="h-4 w-4 mr-2" />}
          IA: Sugerir Preços
        </Button>
      </div>

      <Tabs defaultValue="plans">
        <TabsList>
          <TabsTrigger value="plans" className="gap-2"><DollarSign className="h-4 w-4" /> Planos FastCRM</TabsTrigger>
          <TabsTrigger value="modules" className="gap-2"><Package className="h-4 w-4" /> Módulos</TabsTrigger>
          <TabsTrigger value="bundles" className="gap-2"><Gift className="h-4 w-4" /> Bundles & Promoções</TabsTrigger>
        </TabsList>

        <TabsContent value="plans" className="mt-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {plans.map((plan) => (
              <PlanEditor key={plan.id} config={plan} onSave={handleUpdatePlan(plan.id)} />
            ))}
          </div>
          {plans.length === 0 && (
            <Card className="p-8 text-center text-muted-foreground">
              Nenhum plano configurado. Os dados seed devem estar na base de dados.
            </Card>
          )}
        </TabsContent>

        <TabsContent value="modules" className="mt-6">
          <div className="flex items-center justify-between mb-4">
            <p className="text-sm text-muted-foreground">
              {marketplaceModules.length} módulos do Marketplace · Edite preços e sincronize para a Landing Page
            </p>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => syncToLandingPage.mutate(marketplaceModules)}
                disabled={syncToLandingPage.isPending}
              >
                {syncToLandingPage.isPending ? <Loader2 className="h-3 w-3 animate-spin mr-1" /> : <Upload className="h-3 w-3 mr-1" />}
                Sincronizar para Landing Page
              </Button>
            </div>
          </div>
          {modulesLoading ? (
            <div className="flex items-center justify-center p-8">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {marketplaceModules.map((mod) => (
                <MarketplaceModuleCard
                  key={mod.id}
                  mod={mod}
                  parsePricing={parsePricing}
                  onUpdate={(updates) => updateModule.mutate({ id: mod.id, ...updates })}
                />
              ))}
            </div>
          )}
          {!modulesLoading && marketplaceModules.length === 0 && (
            <Card className="p-8 text-center text-muted-foreground">
              Nenhum módulo encontrado no Marketplace.
            </Card>
          )}
        </TabsContent>

        <TabsContent value="bundles" className="mt-6">
          <div className="flex justify-end mb-4 gap-2">
            <Button onClick={async () => {
              const result = await callAI("create_promotion", { plans, modules: marketplaceModules, bundles });
              if (result) {
                toast.success(`Promoção sugerida: ${result.name || "Ver detalhes"}`, { duration: 10000 });
                toast.info(result.description || JSON.stringify(result), { duration: 15000 });
              }
            }} variant="outline" size="sm" disabled={aiLoading}>
              {aiLoading ? <Loader2 className="h-3 w-3 animate-spin mr-1" /> : <Brain className="h-3 w-3 mr-1" />}
              IA: Criar Promoção
            </Button>
            <Button onClick={handleImportExtensionPacks} variant="outline" size="sm">
              <Package className="h-3 w-3 mr-1" /> Importar Extension Packs
            </Button>
            <Button onClick={handleCreateBundle} size="sm"><Plus className="h-4 w-4 mr-1" /> Novo Bundle</Button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {bundles.map((bundle) => (
              <Card key={bundle.id}>
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-sm">{bundle.name}</CardTitle>
                    <Button variant="ghost" size="sm" className="h-6 w-6 p-0" onClick={() => deleteConfig.mutate(bundle.id)}>
                      <Trash2 className="h-3 w-3 text-destructive" />
                    </Button>
                  </div>
                </CardHeader>
                <CardContent className="space-y-2">
                  <p className="text-xs text-muted-foreground">{bundle.description}</p>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <Label className="text-xs">Mensal (€)</Label>
                      <Input type="number" defaultValue={bundle.price_monthly} className="h-7 text-sm"
                        onBlur={(e) => updateConfig.mutate({ id: bundle.id, price_monthly: Number(e.target.value) })} />
                    </div>
                    <div>
                      <Label className="text-xs">Anual (€)</Label>
                      <Input type="number" defaultValue={bundle.price_yearly} className="h-7 text-sm"
                        onBlur={(e) => updateConfig.mutate({ id: bundle.id, price_yearly: Number(e.target.value) })} />
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Switch checked={bundle.is_active} onCheckedChange={(v) => updateConfig.mutate({ id: bundle.id, is_active: v })} />
                    <Label className="text-xs">Ativo</Label>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
          {bundles.length === 0 && (
            <Card className="p-8 text-center text-muted-foreground">
              Nenhum bundle configurado. Clique "Novo Bundle" para adicionar.
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
