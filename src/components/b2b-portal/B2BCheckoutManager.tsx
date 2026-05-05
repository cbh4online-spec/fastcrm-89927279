import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Loader2, Plus, Trash2, X, Save, Layers, Sparkles, Settings as SettingsIcon, Search } from "lucide-react";
import {
  useB2BCheckoutSettings,
  useB2BCheckoutKits,
  useB2BRelatedRules,
  type B2BCheckoutKit,
  type B2BRelatedRule,
} from "@/hooks/b2b-portal/useB2BCheckoutManagement";

const sb = supabase as any;

interface Props {
  workspaceId: string | undefined;
}

interface ProductOption {
  id: string;
  name: string;
  sku: string | null;
}

// Lookup de produtos do workspace para selectores ----------------------------
function useWorkspaceProducts(workspaceId: string | undefined) {
  return useQuery({
    queryKey: ["b2b-checkout-products-lookup", workspaceId],
    enabled: !!workspaceId,
    staleTime: 60_000,
    queryFn: async (): Promise<ProductOption[]> => {
      const { data, error } = await sb
        .from("products")
        .select("id, name, sku")
        .eq("workspace_id", workspaceId)
        .eq("status", "active")
        .order("name", { ascending: true })
        .limit(2000);
      if (error) throw error;
      return (data ?? []) as ProductOption[];
    },
  });
}

export function B2BCheckoutManager({ workspaceId }: Props) {
  if (!workspaceId) {
    return (
      <Card>
        <CardContent className="py-10 text-center text-sm text-muted-foreground">
          Selecione um workspace para gerir o checkout.
        </CardContent>
      </Card>
    );
  }

  return (
    <Tabs defaultValue="settings" className="space-y-4">
      <TabsList>
        <TabsTrigger value="settings" className="gap-2">
          <SettingsIcon className="h-4 w-4" /> Definições
        </TabsTrigger>
        <TabsTrigger value="kits" className="gap-2">
          <Layers className="h-4 w-4" /> Kits Poupança
        </TabsTrigger>
        <TabsTrigger value="related" className="gap-2">
          <Sparkles className="h-4 w-4" /> Produtos Relacionados
        </TabsTrigger>
      </TabsList>

      <TabsContent value="settings">
        <SettingsPanel workspaceId={workspaceId} />
      </TabsContent>
      <TabsContent value="kits">
        <KitsPanel workspaceId={workspaceId} />
      </TabsContent>
      <TabsContent value="related">
        <RelatedPanel workspaceId={workspaceId} />
      </TabsContent>
    </Tabs>
  );
}

// =========================================================================
// SETTINGS PANEL
// =========================================================================
function SettingsPanel({ workspaceId }: { workspaceId: string }) {
  const { data: settings, isLoading, save } = useB2BCheckoutSettings(workspaceId);
  const [local, setLocal] = useState<any>(null);
  const value = local ?? settings;

  if (isLoading || !value) {
    return (
      <Card>
        <CardContent className="py-10 text-center">
          <Loader2 className="h-5 w-5 animate-spin mx-auto text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  const update = (patch: any) => setLocal({ ...value, ...patch });

  const onSave = async () => {
    await save.mutateAsync(local ?? {});
    setLocal(null);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Definições do Checkout B2B</CardTitle>
        <CardDescription>
          Controla o que aparece no carrinho dos clientes B2B e os modos de
          recomendação.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Visibilidade */}
        <section className="space-y-3">
          <h3 className="text-sm font-semibold">Secções visíveis no carrinho</h3>
          <ToggleRow
            label="Promoções activas"
            description="Produtos com desconto ou etiqueta promocional."
            checked={value.show_promotions}
            onChange={(v) => update({ show_promotions: v })}
          />
          <ToggleRow
            label="Mais vendidos"
            description="Top de produtos do workspace nos últimos 90 dias."
            checked={value.show_best_sellers}
            onChange={(v) => update({ show_best_sellers: v })}
          />
          <ToggleRow
            label="Produtos relacionados"
            description="Sugestões baseadas no carrinho actual."
            checked={value.show_related}
            onChange={(v) => update({ show_related: v })}
          />
          <ToggleRow
            label="Kit poupança"
            description="Pacotes sugeridos com desconto agregado."
            checked={value.show_kit}
            onChange={(v) => update({ show_kit: v })}
          />
        </section>

        <Separator />

        {/* Portes grátis */}
        <section className="space-y-2">
          <h3 className="text-sm font-semibold">Portes grátis</h3>
          <div className="grid gap-2 max-w-sm">
            <Label className="text-xs">Valor mínimo (s/ IVA)</Label>
            <div className="relative">
              <Input
                type="number"
                min={0}
                step={1}
                value={value.free_shipping_threshold}
                onChange={(e) =>
                  update({ free_shipping_threshold: Number(e.target.value) || 0 })
                }
              />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">
                €
              </span>
            </div>
          </div>
        </section>

        <Separator />

        {/* Modos */}
        <section className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <Label className="text-xs">Modo dos Produtos Relacionados</Label>
            <Select
              value={value.related_mode}
              onValueChange={(v) => update({ related_mode: v })}
            >
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="manual_first">Manuais primeiro, fallback por categoria</SelectItem>
                <SelectItem value="manual">Apenas regras manuais</SelectItem>
                <SelectItem value="category">Apenas por categoria (automático)</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label className="text-xs">Modo dos Kits Poupança</Label>
            <Select
              value={value.kit_mode}
              onValueChange={(v) => update({ kit_mode: v })}
            >
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="manual">Apenas kits manuais (curadoria)</SelectItem>
                <SelectItem value="auto">Apenas automáticos</SelectItem>
                <SelectItem value="both">Manuais + fallback automático</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </section>

        {value.kit_mode !== "manual" && (
          <div className="grid gap-2 max-w-sm">
            <Label className="text-xs">% desconto do kit automático</Label>
            <Input
              type="number"
              min={0}
              max={100}
              step={0.5}
              value={value.auto_kit_discount_pct}
              onChange={(e) =>
                update({ auto_kit_discount_pct: Number(e.target.value) || 0 })
              }
            />
          </div>
        )}

        <div className="flex justify-end pt-2">
          <Button onClick={onSave} disabled={!local || save.isPending}>
            {save.isPending ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Save className="h-4 w-4 mr-2" />
            )}
            Guardar definições
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

function ToggleRow({
  label,
  description,
  checked,
  onChange,
}: {
  label: string;
  description: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <div className="flex items-center justify-between gap-4 rounded-lg border p-3">
      <div className="space-y-0.5">
        <Label className="text-sm">{label}</Label>
        <p className="text-xs text-muted-foreground">{description}</p>
      </div>
      <Switch checked={checked} onCheckedChange={onChange} />
    </div>
  );
}

// =========================================================================
// KITS PANEL
// =========================================================================
function KitsPanel({ workspaceId }: { workspaceId: string }) {
  const { data: kits = [], isLoading, upsert, remove } = useB2BCheckoutKits(workspaceId);
  const { data: products = [] } = useWorkspaceProducts(workspaceId);
  const [editing, setEditing] = useState<Partial<B2BCheckoutKit> | null>(null);

  return (
    <Card>
      <CardHeader className="flex flex-row items-start justify-between gap-4">
        <div>
          <CardTitle className="text-base">Kits Poupança</CardTitle>
          <CardDescription>
            Conjuntos de produtos com desconto sugerido. Aparecem no carrinho
            quando o cliente tem (opcionalmente) um produto-gatilho.
          </CardDescription>
        </div>
        <Dialog open={editing !== null} onOpenChange={(open) => !open && setEditing(null)}>
          <DialogTrigger asChild>
            <Button onClick={() => setEditing({ name: "", product_ids: [], trigger_product_ids: [], discount_pct: 5, is_active: true, display_order: kits.length })}>
              <Plus className="h-4 w-4 mr-2" /> Novo kit
            </Button>
          </DialogTrigger>
          {editing && (
            <KitDialog
              kit={editing}
              products={products}
              onChange={setEditing}
              onSave={async () => {
                await upsert.mutateAsync(editing);
                setEditing(null);
              }}
              saving={upsert.isPending}
            />
          )}
        </Dialog>
      </CardHeader>

      <CardContent>
        {isLoading ? (
          <div className="py-10 text-center"><Loader2 className="h-5 w-5 animate-spin mx-auto text-muted-foreground" /></div>
        ) : kits.length === 0 ? (
          <div className="py-10 text-center text-sm text-muted-foreground border rounded-lg border-dashed">
            Ainda não existem kits. Crie o primeiro para sugerir conjuntos com desconto.
          </div>
        ) : (
          <div className="space-y-2">
            {kits.map((k) => (
              <KitRow
                key={k.id}
                kit={k}
                products={products}
                onEdit={() => setEditing(k)}
                onRemove={() => remove.mutate(k.id)}
                onToggle={(active) => upsert.mutate({ ...k, is_active: active })}
              />
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function KitRow({
  kit,
  products,
  onEdit,
  onRemove,
  onToggle,
}: {
  kit: B2BCheckoutKit;
  products: ProductOption[];
  onEdit: () => void;
  onRemove: () => void;
  onToggle: (v: boolean) => void;
}) {
  const productNames = kit.product_ids
    .map((id) => products.find((p) => p.id === id)?.name)
    .filter(Boolean)
    .slice(0, 3);

  return (
    <div className="flex items-center justify-between gap-3 rounded-lg border p-3">
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2 mb-0.5">
          <p className="font-medium text-sm truncate">{kit.name}</p>
          <Badge variant={kit.is_active ? "default" : "secondary"} className="text-[10px]">
            {kit.is_active ? "Activo" : "Inactivo"}
          </Badge>
          <Badge variant="outline" className="text-[10px] bg-emerald-500/10 text-emerald-700 border-emerald-500/30">
            -{kit.discount_pct}%
          </Badge>
        </div>
        <p className="text-xs text-muted-foreground truncate">
          {kit.product_ids.length} produtos
          {productNames.length > 0 && ` · ${productNames.join(", ")}`}
          {kit.product_ids.length > productNames.length && "…"}
        </p>
        {kit.trigger_product_ids.length > 0 && (
          <p className="text-[11px] text-muted-foreground mt-0.5">
            Aparece se carrinho tiver {kit.trigger_product_ids.length} produto(s)-gatilho
          </p>
        )}
      </div>
      <div className="flex items-center gap-1.5">
        <Switch checked={kit.is_active} onCheckedChange={onToggle} />
        <Button size="sm" variant="ghost" onClick={onEdit}>Editar</Button>
        <Button size="sm" variant="ghost" className="text-destructive" onClick={onRemove}>
          <Trash2 className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}

function KitDialog({
  kit,
  products,
  onChange,
  onSave,
  saving,
}: {
  kit: Partial<B2BCheckoutKit>;
  products: ProductOption[];
  onChange: (k: Partial<B2BCheckoutKit>) => void;
  onSave: () => void;
  saving: boolean;
}) {
  const canSave = !!kit.name && (kit.product_ids?.length ?? 0) >= 2;

  return (
    <DialogContent className="max-w-2xl">
      <DialogHeader>
        <DialogTitle>{kit.id ? "Editar Kit" : "Novo Kit Poupança"}</DialogTitle>
        <DialogDescription>
          Defina os produtos do pacote, o desconto sugerido e (opcional) os
          produtos-gatilho que activam a sugestão no carrinho.
        </DialogDescription>
      </DialogHeader>

      <div className="space-y-4">
        <div className="grid gap-2">
          <Label className="text-xs">Nome</Label>
          <Input
            value={kit.name ?? ""}
            onChange={(e) => onChange({ ...kit, name: e.target.value })}
            placeholder="Ex: Kit Tratamento Capilar Premium"
          />
        </div>

        <div className="grid gap-2">
          <Label className="text-xs">Descrição (opcional)</Label>
          <Textarea
            value={kit.description ?? ""}
            onChange={(e) => onChange({ ...kit, description: e.target.value })}
            rows={2}
          />
        </div>

        <div className="grid gap-2 max-w-[200px]">
          <Label className="text-xs">% desconto sugerido</Label>
          <Input
            type="number"
            min={0}
            max={100}
            step={0.5}
            value={kit.discount_pct ?? 5}
            onChange={(e) => onChange({ ...kit, discount_pct: Number(e.target.value) || 0 })}
          />
        </div>

        <div className="grid gap-2">
          <Label className="text-xs">Produtos do kit (mínimo 2)</Label>
          <ProductMultiSelect
            products={products}
            selected={kit.product_ids ?? []}
            onChange={(ids) => onChange({ ...kit, product_ids: ids })}
          />
        </div>

        <div className="grid gap-2">
          <Label className="text-xs">
            Produtos-gatilho <span className="text-muted-foreground">(opcional — vazio = aparece sempre)</span>
          </Label>
          <ProductMultiSelect
            products={products}
            selected={kit.trigger_product_ids ?? []}
            onChange={(ids) => onChange({ ...kit, trigger_product_ids: ids })}
          />
        </div>
      </div>

      <DialogFooter>
        <Button onClick={onSave} disabled={!canSave || saving}>
          {saving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
          Guardar Kit
        </Button>
      </DialogFooter>
    </DialogContent>
  );
}

// =========================================================================
// RELATED RULES PANEL
// =========================================================================
function RelatedPanel({ workspaceId }: { workspaceId: string }) {
  const { data: rules = [], isLoading, upsert, remove } = useB2BRelatedRules(workspaceId);
  const { data: products = [] } = useWorkspaceProducts(workspaceId);
  const [editing, setEditing] = useState<Partial<B2BRelatedRule> | null>(null);

  return (
    <Card>
      <CardHeader className="flex flex-row items-start justify-between gap-4">
        <div>
          <CardTitle className="text-base">Regras de Produtos Relacionados</CardTitle>
          <CardDescription>
            Para cada produto-fonte, defina os produtos a sugerir quando estiver
            no carrinho. Substituem (ou complementam) a sugestão automática por
            categoria, conforme o modo configurado.
          </CardDescription>
        </div>
        <Dialog open={editing !== null} onOpenChange={(open) => !open && setEditing(null)}>
          <DialogTrigger asChild>
            <Button onClick={() => setEditing({ source_product_id: "", related_product_ids: [], is_active: true, display_order: rules.length })}>
              <Plus className="h-4 w-4 mr-2" /> Nova regra
            </Button>
          </DialogTrigger>
          {editing && (
            <RuleDialog
              rule={editing}
              products={products}
              onChange={setEditing}
              onSave={async () => {
                await upsert.mutateAsync(editing);
                setEditing(null);
              }}
              saving={upsert.isPending}
            />
          )}
        </Dialog>
      </CardHeader>

      <CardContent>
        {isLoading ? (
          <div className="py-10 text-center"><Loader2 className="h-5 w-5 animate-spin mx-auto text-muted-foreground" /></div>
        ) : rules.length === 0 ? (
          <div className="py-10 text-center text-sm text-muted-foreground border rounded-lg border-dashed">
            Sem regras configuradas. As sugestões usam categoria automática (se permitido).
          </div>
        ) : (
          <div className="space-y-2">
            {rules.map((r) => {
              const source = products.find((p) => p.id === r.source_product_id);
              const related = r.related_product_ids
                .map((id) => products.find((p) => p.id === id)?.name)
                .filter(Boolean);
              return (
                <div key={r.id} className="flex items-center justify-between gap-3 rounded-lg border p-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 mb-0.5">
                      <p className="font-medium text-sm truncate">
                        {source?.name ?? "Produto removido"}
                      </p>
                      <Badge variant={r.is_active ? "default" : "secondary"} className="text-[10px]">
                        {r.is_active ? "Activa" : "Inactiva"}
                      </Badge>
                    </div>
                    <p className="text-xs text-muted-foreground truncate">
                      Sugere {r.related_product_ids.length}: {related.slice(0, 3).join(", ")}
                      {related.length > 3 && "…"}
                    </p>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Switch
                      checked={r.is_active}
                      onCheckedChange={(v) => upsert.mutate({ ...r, is_active: v })}
                    />
                    <Button size="sm" variant="ghost" onClick={() => setEditing(r)}>Editar</Button>
                    <Button size="sm" variant="ghost" className="text-destructive" onClick={() => remove.mutate(r.id)}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function RuleDialog({
  rule,
  products,
  onChange,
  onSave,
  saving,
}: {
  rule: Partial<B2BRelatedRule>;
  products: ProductOption[];
  onChange: (r: Partial<B2BRelatedRule>) => void;
  onSave: () => void;
  saving: boolean;
}) {
  const canSave = !!rule.source_product_id && (rule.related_product_ids?.length ?? 0) >= 1;
  const sourceLabel = products.find((p) => p.id === rule.source_product_id)?.name;

  return (
    <DialogContent className="max-w-2xl">
      <DialogHeader>
        <DialogTitle>{rule.id ? "Editar regra" : "Nova regra de relacionados"}</DialogTitle>
        <DialogDescription>
          Quando o cliente tiver o produto-fonte no carrinho, mostramos os
          produtos relacionados que escolher.
        </DialogDescription>
      </DialogHeader>

      <div className="space-y-4">
        <div className="grid gap-2">
          <Label className="text-xs">Produto-fonte</Label>
          <ProductMultiSelect
            products={products}
            selected={rule.source_product_id ? [rule.source_product_id] : []}
            onChange={(ids) => onChange({ ...rule, source_product_id: ids[0] ?? "" })}
            singleSelect
            placeholder={sourceLabel ?? "Escolher produto"}
          />
        </div>

        <div className="grid gap-2">
          <Label className="text-xs">Produtos a sugerir (mínimo 1)</Label>
          <ProductMultiSelect
            products={products}
            selected={rule.related_product_ids ?? []}
            onChange={(ids) => onChange({ ...rule, related_product_ids: ids })}
            excludeIds={rule.source_product_id ? [rule.source_product_id] : []}
          />
        </div>
      </div>

      <DialogFooter>
        <Button onClick={onSave} disabled={!canSave || saving}>
          {saving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
          Guardar regra
        </Button>
      </DialogFooter>
    </DialogContent>
  );
}

// =========================================================================
// PRODUCT MULTISELECT
// =========================================================================
function ProductMultiSelect({
  products,
  selected,
  onChange,
  singleSelect = false,
  excludeIds = [],
  placeholder = "Procurar produto...",
}: {
  products: ProductOption[];
  selected: string[];
  onChange: (ids: string[]) => void;
  singleSelect?: boolean;
  excludeIds?: string[];
  placeholder?: string;
}) {
  const [open, setOpen] = useState(false);
  const filteredProducts = useMemo(
    () => products.filter((p) => !excludeIds.includes(p.id)),
    [products, excludeIds.join(",")],
  );
  const selectedProducts = useMemo(
    () => selected.map((id) => products.find((p) => p.id === id)).filter(Boolean) as ProductOption[],
    [selected, products],
  );

  const toggle = (id: string) => {
    if (singleSelect) {
      onChange([id]);
      setOpen(false);
      return;
    }
    if (selected.includes(id)) {
      onChange(selected.filter((s) => s !== id));
    } else {
      onChange([...selected, id]);
    }
  };

  return (
    <div className="space-y-2">
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button variant="outline" size="sm" className="w-full justify-start">
            <Search className="h-4 w-4 mr-2 text-muted-foreground" /> {placeholder}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-[420px] p-0" align="start">
          <Command>
            <CommandInput placeholder="Pesquisar produto..." />
            <CommandList>
              <CommandEmpty>Nenhum produto encontrado.</CommandEmpty>
              <CommandGroup>
                {filteredProducts.slice(0, 200).map((p) => (
                  <CommandItem
                    key={p.id}
                    value={`${p.name} ${p.sku ?? ""}`}
                    onSelect={() => toggle(p.id)}
                  >
                    <div className="flex-1 min-w-0">
                      <p className="text-sm truncate">{p.name}</p>
                      {p.sku && <p className="text-[11px] text-muted-foreground">SKU: {p.sku}</p>}
                    </div>
                    {selected.includes(p.id) && (
                      <Badge variant="secondary" className="ml-2">Selecionado</Badge>
                    )}
                  </CommandItem>
                ))}
              </CommandGroup>
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>

      {selectedProducts.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {selectedProducts.map((p) => (
            <Badge key={p.id} variant="secondary" className="gap-1 pr-1">
              <span className="truncate max-w-[180px]">{p.name}</span>
              <button
                onClick={() => toggle(p.id)}
                className="hover:text-destructive"
                aria-label="Remover"
              >
                <X className="h-3 w-3" />
              </button>
            </Badge>
          ))}
        </div>
      )}
    </div>
  );
}
