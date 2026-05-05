import { useMemo, useState } from "react";
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
import {
  Loader2,
  Plus,
  Trash2,
  X,
  Save,
  Layers,
  Sparkles,
  Settings as SettingsIcon,
  Search,
  ExternalLink,
  Wand2,
  PackagePlus,
} from "lucide-react";
import { Link } from "react-router-dom";
import { toast } from "sonner";
import {
  useB2BCheckoutSettings,
  useB2BKits,
  useB2BCrossSells,
  type B2BKit,
  type B2BKitItem,
} from "@/hooks/b2b-portal/useB2BCheckoutManagement";
import { useCreditWallet } from "@/hooks/useCreditWallet";

const sb = supabase as any;
const AI_ACTION_KEY = "b2b_checkout_ai_suggestion";

interface Props {
  workspaceId: string | undefined;
}

interface ProductOption {
  id: string;
  name: string;
  sku: string | null;
  category: string | null;
}

// Lookup B2B-published only — alinhado com o que o cliente vê no portal
function useB2BProducts(workspaceId: string | undefined) {
  return useQuery({
    queryKey: ["b2b-checkout-products-lookup", workspaceId],
    enabled: !!workspaceId,
    staleTime: 60_000,
    queryFn: async (): Promise<ProductOption[]> => {
      const { data, error } = await sb
        .from("products")
        .select("id, name, sku, category")
        .eq("workspace_id", workspaceId)
        .eq("status", "active")
        .eq("b2b_published", true)
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
          recomendação. Os Kits e Relacionados são geridos no módulo Produtos
          (e visíveis aqui em baixo nas tabs).
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
            description="Cross-sells geridos abaixo (manuais ou por categoria)."
            checked={value.show_related}
            onChange={(v) => update({ show_related: v })}
          />
          <ToggleRow
            label="Kit poupança"
            description="Kits do catálogo marcados como visíveis no Portal B2B."
            checked={value.show_kit}
            onChange={(v) => update({ show_kit: v })}
          />
        </section>

        <Separator />

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
// KITS PANEL — usa product_kits (visibility_b2b)
// =========================================================================
function KitsPanel({ workspaceId }: { workspaceId: string }) {
  const { data: kits = [], isLoading, upsert, setVisibility, setStatus, remove } = useB2BKits(workspaceId);
  const { data: products = [] } = useB2BProducts(workspaceId);
  const [editing, setEditing] = useState<(Partial<B2BKit> & { items: B2BKitItem[] }) | null>(null);
  const wallet = useCreditWallet();

  const aiCost = wallet.getCost(AI_ACTION_KEY);
  const canAffordAI = wallet.canAfford(AI_ACTION_KEY);

  const newKit = (): Partial<B2BKit> & { items: B2BKitItem[] } => ({
    name: "",
    description: "",
    discount_pct: 5,
    status: "active",
    visibility_b2b: true,
    items: [],
  });

  const handleAISuggest = async (currentKit: Partial<B2BKit> & { items: B2BKitItem[] }) => {
    if (!canAffordAI) {
      toast.error(`Saldo insuficiente. São necessários ${aiCost} créditos.`);
      return;
    }
    try {
      await wallet.consumeCredits.mutateAsync({
        actionKey: AI_ACTION_KEY,
        metadata: { mode: "kit", workspace_id: workspaceId },
      });
    } catch (e: any) {
      toast.error(e?.message ?? "Falha a consumir créditos");
      return;
    }

    try {
      const { data, error } = await supabase.functions.invoke("ai-suggest-b2b-checkout", {
        body: {
          workspace_id: workspaceId,
          mode: "kit",
          prompt: currentKit.description ?? currentKit.name ?? "",
          category_hint: currentKit.category ?? undefined,
        },
      });
      if (error) throw error;
      if (!data?.success) {
        toast.error(data?.error ?? "A IA não devolveu sugestão.");
        return;
      }
      const s = data.suggestion;
      setEditing({
        ...currentKit,
        name: currentKit.name?.trim() ? currentKit.name : s.name,
        description: currentKit.description?.trim() ? currentKit.description : s.description,
        discount_pct: s.discount_pct,
        items: s.product_ids.map((pid: string) => ({ product_id: pid, quantity: 1 })),
      });
      toast.success("Sugestão aplicada — revê e guarda.");
    } catch (e: any) {
      toast.error(e?.message ?? "Erro a chamar a IA");
    }
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-start justify-between gap-4">
        <div>
          <CardTitle className="text-base flex items-center gap-2">
            Kits Poupança
            <Badge variant="outline" className="text-[10px]">Catálogo · Produtos</Badge>
          </CardTitle>
          <CardDescription>
            Gere os kits do módulo <Link to="/dashboard/products/kits" className="underline underline-offset-2 hover:text-foreground">Produtos</Link> que estão visíveis no Portal B2B. Cria ou edita aqui — fica disponível em ambos os sítios.
          </CardDescription>
        </div>
        <div className="flex items-center gap-2">
          <Dialog open={editing !== null} onOpenChange={(open) => !open && setEditing(null)}>
            <DialogTrigger asChild>
              <Button onClick={() => setEditing(newKit())}>
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
                onAISuggest={() => handleAISuggest(editing)}
                aiCost={aiCost}
                canAffordAI={canAffordAI}
                aiBusy={wallet.consumeCredits.isPending}
              />
            )}
          </Dialog>
        </div>
      </CardHeader>

      <CardContent>
        {isLoading ? (
          <div className="py-10 text-center"><Loader2 className="h-5 w-5 animate-spin mx-auto text-muted-foreground" /></div>
        ) : kits.length === 0 ? (
          <div className="py-10 text-center text-sm text-muted-foreground border rounded-lg border-dashed">
            Ainda não existem kits no catálogo. Crie o primeiro acima.
          </div>
        ) : (
          <div className="space-y-2">
            {kits.map((k) => (
              <KitRow
                key={k.id}
                kit={k}
                products={products}
                onEdit={() => setEditing(k)}
                onRemove={() => {
                  if (confirm(`Arquivar o kit "${k.name}"? Deixa de aparecer no portal e no catálogo.`)) {
                    remove.mutate(k.id);
                  }
                }}
                onToggleB2B={(v) => setVisibility.mutate({ id: k.id, visibility_b2b: v })}
                onToggleStatus={(active) =>
                  setStatus.mutate({ id: k.id, status: active ? "active" : "paused" })
                }
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
  onToggleB2B,
  onToggleStatus,
}: {
  kit: B2BKit;
  products: ProductOption[];
  onEdit: () => void;
  onRemove: () => void;
  onToggleB2B: (v: boolean) => void;
  onToggleStatus: (active: boolean) => void;
}) {
  const productNames = useMemo(
    () =>
      kit.items
        .map((it) => products.find((p) => p.id === it.product_id)?.name)
        .filter(Boolean)
        .slice(0, 3) as string[],
    [kit.items, products],
  );
  const isActive = kit.status === "active";

  return (
    <div className="flex items-center justify-between gap-3 rounded-lg border p-3">
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2 mb-0.5 flex-wrap">
          <p className="font-medium text-sm truncate">{kit.name}</p>
          <Badge variant={isActive ? "default" : "secondary"} className="text-[10px]">
            {isActive ? "Activo" : kit.status === "paused" ? "Pausado" : kit.status}
          </Badge>
          <Badge variant="outline" className="text-[10px] bg-emerald-500/10 text-emerald-700 border-emerald-500/30">
            -{kit.discount_pct}%
          </Badge>
          {kit.visibility_b2b ? (
            <Badge variant="outline" className="text-[10px] bg-blue-500/10 text-blue-700 border-blue-500/30">
              Visível B2B
            </Badge>
          ) : (
            <Badge variant="outline" className="text-[10px]">Oculto B2B</Badge>
          )}
        </div>
        <p className="text-xs text-muted-foreground truncate">
          {kit.items.length} produtos
          {productNames.length > 0 && ` · ${productNames.join(", ")}`}
          {kit.items.length > productNames.length && "…"}
        </p>
      </div>
      <div className="flex items-center gap-1.5">
        <div className="flex items-center gap-1.5 mr-1">
          <Switch checked={kit.visibility_b2b} onCheckedChange={onToggleB2B} aria-label="Visível no Portal B2B" />
          <span className="text-[10px] text-muted-foreground hidden sm:inline">B2B</span>
        </div>
        <div className="flex items-center gap-1.5 mr-1">
          <Switch checked={isActive} onCheckedChange={onToggleStatus} aria-label="Activo" />
          <span className="text-[10px] text-muted-foreground hidden sm:inline">Activo</span>
        </div>
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
  onAISuggest,
  aiCost,
  canAffordAI,
  aiBusy,
}: {
  kit: Partial<B2BKit> & { items: B2BKitItem[] };
  products: ProductOption[];
  onChange: (k: Partial<B2BKit> & { items: B2BKitItem[] }) => void;
  onSave: () => void;
  saving: boolean;
  onAISuggest: () => void;
  aiCost: number;
  canAffordAI: boolean;
  aiBusy: boolean;
}) {
  const canSave = !!kit.name?.trim() && (kit.items?.length ?? 0) >= 2;

  const setItems = (productIds: string[]) => {
    const existing = new Map(kit.items.map((i) => [i.product_id, i]));
    const items = productIds.map((id) => existing.get(id) ?? { product_id: id, quantity: 1 });
    onChange({ ...kit, items });
  };

  const updateQty = (product_id: string, quantity: number) => {
    onChange({
      ...kit,
      items: kit.items.map((i) => (i.product_id === product_id ? { ...i, quantity: Math.max(1, quantity) } : i)),
    });
  };

  return (
    <DialogContent className="max-w-2xl">
      <DialogHeader>
        <DialogTitle>{kit.id ? "Editar Kit" : "Novo Kit Poupança"}</DialogTitle>
        <DialogDescription>
          Define os produtos do kit, o desconto sugerido e a visibilidade no Portal B2B. Podes pedir uma sugestão à IA com base no catálogo activo.
        </DialogDescription>
      </DialogHeader>

      <div className="space-y-4">
        {/* Bloco IA */}
        <div className="rounded-lg border bg-muted/30 p-3 space-y-2">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 text-sm font-medium">
              <Wand2 className="h-4 w-4 text-primary" /> Construir com IA
            </div>
            <Badge variant="outline" className="text-[10px]">{aiCost} créditos</Badge>
          </div>
          <p className="text-xs text-muted-foreground">
            A IA propõe nome, descrição, desconto e produtos do catálogo activo. Podes editar tudo antes de guardar.
          </p>
          <Textarea
            value={kit.description ?? ""}
            onChange={(e) => onChange({ ...kit, description: e.target.value })}
            rows={2}
            placeholder="Descreve o objectivo do kit (ex: rotina anti-queda capilar profissional)"
            className="text-sm"
          />
          <div className="flex justify-end">
            <Button
              type="button"
              size="sm"
              variant="secondary"
              onClick={onAISuggest}
              disabled={aiBusy || !canAffordAI}
            >
              {aiBusy ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Sparkles className="h-4 w-4 mr-2" />}
              {canAffordAI ? "Sugerir kit com IA" : "Saldo IA insuficiente"}
            </Button>
          </div>
        </div>

        <div className="grid gap-2">
          <Label className="text-xs">Nome</Label>
          <Input
            value={kit.name ?? ""}
            onChange={(e) => onChange({ ...kit, name: e.target.value })}
            placeholder="Ex: Kit Tratamento Capilar Premium"
          />
        </div>

        <div className="grid gap-2 grid-cols-2">
          <div>
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
          <div className="flex items-end justify-between gap-3 rounded-lg border px-3">
            <div>
              <p className="text-xs">Visível no Portal B2B</p>
              <p className="text-[10px] text-muted-foreground">Aparece no checkout</p>
            </div>
            <Switch
              checked={kit.visibility_b2b ?? true}
              onCheckedChange={(v) => onChange({ ...kit, visibility_b2b: v })}
            />
          </div>
        </div>

        <div className="grid gap-2">
          <Label className="text-xs">Produtos do kit (mínimo 2)</Label>
          <ProductMultiSelect
            products={products}
            selected={kit.items.map((i) => i.product_id)}
            onChange={setItems}
          />
          {kit.items.length > 0 && (
            <div className="rounded-lg border divide-y">
              {kit.items.map((it) => {
                const p = products.find((x) => x.id === it.product_id);
                return (
                  <div key={it.product_id} className="flex items-center gap-2 px-3 py-2">
                    <div className="min-w-0 flex-1">
                      <p className="text-sm truncate">{p?.name ?? "(produto removido)"}</p>
                      {p?.sku && <p className="text-[10px] text-muted-foreground">SKU {p.sku}</p>}
                    </div>
                    <Input
                      type="number"
                      min={1}
                      value={it.quantity}
                      onChange={(e) => updateQty(it.product_id, Number(e.target.value) || 1)}
                      className="h-8 w-16 text-sm"
                    />
                  </div>
                );
              })}
            </div>
          )}
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
// RELATED PANEL — usa product_cross_sells
// =========================================================================
function RelatedPanel({ workspaceId }: { workspaceId: string }) {
  const { data: products = [] } = useB2BProducts(workspaceId);
  const { data: rows = [], isLoading, upsertMany, toggle, remove } = useB2BCrossSells(workspaceId);
  const wallet = useCreditWallet();
  const [editingSourceId, setEditingSourceId] = useState<string | null>(null);
  const [open, setOpen] = useState(false);

  const aiCost = wallet.getCost(AI_ACTION_KEY);
  const canAffordAI = wallet.canAfford(AI_ACTION_KEY);

  // agrupar por produto-âncora
  const grouped = useMemo(() => {
    const map = new Map<string, typeof rows>();
    for (const r of rows) {
      const arr = map.get(r.source_product_id) ?? [];
      arr.push(r);
      map.set(r.source_product_id, arr);
    }
    return [...map.entries()].map(([source_product_id, items]) => ({
      source_product_id,
      items: items.sort((a, b) => b.weight - a.weight),
    }));
  }, [rows]);

  return (
    <Card>
      <CardHeader className="flex flex-row items-start justify-between gap-4">
        <div>
          <CardTitle className="text-base">Produtos Relacionados (cross-sells)</CardTitle>
          <CardDescription>
            Para cada produto-âncora, define produtos complementares que aparecem no carrinho B2B. Usa a fonte única do módulo Produtos.
          </CardDescription>
        </div>
        <Button onClick={() => { setEditingSourceId(null); setOpen(true); }}>
          <Plus className="h-4 w-4 mr-2" /> Nova regra
        </Button>
      </CardHeader>

      <CardContent>
        {isLoading ? (
          <div className="py-10 text-center"><Loader2 className="h-5 w-5 animate-spin mx-auto text-muted-foreground" /></div>
        ) : grouped.length === 0 ? (
          <div className="py-10 text-center text-sm text-muted-foreground border rounded-lg border-dashed">
            Ainda não existem cross-sells. Crie a primeira regra.
          </div>
        ) : (
          <div className="space-y-2">
            {grouped.map((g) => {
              const src = products.find((p) => p.id === g.source_product_id);
              return (
                <div key={g.source_product_id} className="rounded-lg border p-3 space-y-2">
                  <div className="flex items-center justify-between gap-2">
                    <div className="min-w-0">
                      <p className="text-sm font-medium truncate">
                        {src?.name ?? "(produto removido)"}
                      </p>
                      <p className="text-[11px] text-muted-foreground">
                        {g.items.length} relacionados
                      </p>
                    </div>
                    <Button size="sm" variant="ghost" onClick={() => { setEditingSourceId(g.source_product_id); setOpen(true); }}>
                      Editar / adicionar
                    </Button>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {g.items.map((it) => {
                      const tgt = products.find((p) => p.id === it.target_product_id);
                      return (
                        <div key={it.id} className={`inline-flex items-center gap-1.5 rounded-full border px-2 py-1 text-xs ${it.is_active ? "" : "opacity-50"}`}>
                          <span className="truncate max-w-[200px]">{tgt?.name ?? "(produto removido)"}</span>
                          {it.reason && <span className="text-[10px] text-muted-foreground">· {it.reason}</span>}
                          <button
                            onClick={() => toggle.mutate({ id: it.id, is_active: !it.is_active })}
                            className="text-muted-foreground hover:text-foreground"
                            title={it.is_active ? "Desactivar" : "Activar"}
                          >
                            <Switch checked={it.is_active} className="scale-75" />
                          </button>
                          <button
                            onClick={() => remove.mutate(it.id)}
                            className="text-muted-foreground hover:text-destructive"
                            title="Remover"
                          >
                            <X className="h-3 w-3" />
                          </button>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>

      <RelatedDialog
        open={open}
        onOpenChange={setOpen}
        workspaceId={workspaceId}
        products={products}
        initialSourceId={editingSourceId}
        existingTargets={editingSourceId ? rows.filter((r) => r.source_product_id === editingSourceId).map((r) => r.target_product_id) : []}
        onSave={async (sourceId, items) => {
          await upsertMany.mutateAsync(
            items.map((i) => ({
              source_product_id: sourceId,
              target_product_id: i.target_product_id,
              weight: i.weight,
              reason: i.reason ?? null,
            })),
          );
          setOpen(false);
        }}
        saving={upsertMany.isPending}
        aiCost={aiCost}
        canAffordAI={canAffordAI}
        wallet={wallet}
      />
    </Card>
  );
}

function RelatedDialog({
  open,
  onOpenChange,
  workspaceId,
  products,
  initialSourceId,
  existingTargets,
  onSave,
  saving,
  aiCost,
  canAffordAI,
  wallet,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  workspaceId: string;
  products: ProductOption[];
  initialSourceId: string | null;
  existingTargets: string[];
  onSave: (sourceId: string, items: { target_product_id: string; weight: number; reason?: string }[]) => Promise<void>;
  saving: boolean;
  aiCost: number;
  canAffordAI: boolean;
  wallet: ReturnType<typeof useCreditWallet>;
}) {
  const [sourceId, setSourceId] = useState<string | null>(initialSourceId);
  const [targets, setTargets] = useState<{ target_product_id: string; weight: number; reason?: string }[]>([]);

  // sync quando o dialog abre
  useMemo(() => {
    if (open) {
      setSourceId(initialSourceId);
      setTargets(existingTargets.map((id) => ({ target_product_id: id, weight: 5 })));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, initialSourceId]);

  const handleAI = async () => {
    if (!sourceId) {
      toast.error("Escolhe primeiro o produto-âncora.");
      return;
    }
    if (!canAffordAI) {
      toast.error(`Saldo insuficiente. São necessários ${aiCost} créditos.`);
      return;
    }
    try {
      await wallet.consumeCredits.mutateAsync({
        actionKey: AI_ACTION_KEY,
        metadata: { mode: "related", workspace_id: workspaceId, source_product_id: sourceId },
      });
    } catch (e: any) {
      toast.error(e?.message ?? "Falha a consumir créditos");
      return;
    }
    try {
      const { data, error } = await supabase.functions.invoke("ai-suggest-b2b-checkout", {
        body: { workspace_id: workspaceId, mode: "related", source_product_id: sourceId },
      });
      if (error) throw error;
      if (!data?.success) {
        toast.error(data?.error ?? "A IA não devolveu sugestões.");
        return;
      }
      const items = (data.suggestion?.items ?? []) as { product_id: string; reason: string; weight: number }[];
      // merge sem duplicar, IA primeiro
      const seen = new Set(targets.map((t) => t.target_product_id));
      const merged = [...targets];
      for (const it of items) {
        if (it.product_id === sourceId || seen.has(it.product_id)) continue;
        merged.push({ target_product_id: it.product_id, weight: it.weight, reason: it.reason });
        seen.add(it.product_id);
      }
      setTargets(merged);
      toast.success(`${items.length} sugestões adicionadas.`);
    } catch (e: any) {
      toast.error(e?.message ?? "Erro a chamar a IA");
    }
  };

  const sourceProduct = products.find((p) => p.id === sourceId);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Produtos relacionados</DialogTitle>
          <DialogDescription>
            Escolhe o produto-âncora e os produtos sugeridos quando o cliente o tiver no carrinho.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="grid gap-2">
            <Label className="text-xs">Produto-âncora</Label>
            <ProductSingleSelect
              products={products}
              selected={sourceId}
              onChange={setSourceId}
              disabled={!!initialSourceId}
            />
          </div>

          <div className="rounded-lg border bg-muted/30 p-3 space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-sm font-medium">
                <Wand2 className="h-4 w-4 text-primary" /> Sugerir com IA
              </div>
              <Badge variant="outline" className="text-[10px]">{aiCost} créditos</Badge>
            </div>
            <p className="text-xs text-muted-foreground">
              A IA escolhe 3-6 produtos complementares do catálogo activo. Adicionados à lista — podes editar.
            </p>
            <div className="flex justify-end">
              <Button
                type="button"
                size="sm"
                variant="secondary"
                onClick={handleAI}
                disabled={wallet.consumeCredits.isPending || !canAffordAI || !sourceId}
              >
                {wallet.consumeCredits.isPending ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Sparkles className="h-4 w-4 mr-2" />}
                Sugerir relacionados
              </Button>
            </div>
          </div>

          <div className="grid gap-2">
            <Label className="text-xs">Produtos relacionados</Label>
            <ProductMultiSelect
              products={products.filter((p) => p.id !== sourceId)}
              selected={targets.map((t) => t.target_product_id)}
              onChange={(ids) => {
                const existing = new Map(targets.map((t) => [t.target_product_id, t]));
                setTargets(ids.map((id) => existing.get(id) ?? { target_product_id: id, weight: 5 }));
              }}
            />
            {targets.length > 0 && (
              <div className="rounded-lg border divide-y max-h-64 overflow-auto">
                {targets.map((t) => {
                  const p = products.find((x) => x.id === t.target_product_id);
                  return (
                    <div key={t.target_product_id} className="flex items-center gap-2 px-3 py-2">
                      <div className="min-w-0 flex-1">
                        <p className="text-sm truncate">{p?.name ?? "(produto removido)"}</p>
                        {t.reason && <p className="text-[10px] text-muted-foreground truncate">{t.reason}</p>}
                      </div>
                      <Input
                        type="number"
                        min={1}
                        max={10}
                        value={t.weight}
                        onChange={(e) => {
                          const w = Math.max(1, Math.min(10, Number(e.target.value) || 5));
                          setTargets(targets.map((x) => x.target_product_id === t.target_product_id ? { ...x, weight: w } : x));
                        }}
                        className="h-8 w-14 text-sm"
                        title="Peso 1-10"
                      />
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        <DialogFooter>
          <Button
            onClick={() => sourceId && onSave(sourceId, targets)}
            disabled={!sourceId || targets.length === 0 || saving}
          >
            {saving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
            Guardar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// =========================================================================
// SHARED: ProductMultiSelect / ProductSingleSelect
// =========================================================================
function ProductMultiSelect({
  products,
  selected,
  onChange,
}: {
  products: ProductOption[];
  selected: string[];
  onChange: (ids: string[]) => void;
}) {
  const [open, setOpen] = useState(false);
  const selectedSet = new Set(selected);
  const selectedProducts = products.filter((p) => selectedSet.has(p.id));

  return (
    <div className="space-y-2">
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button variant="outline" type="button" className="w-full justify-between font-normal">
            <span className="text-muted-foreground">
              {selected.length === 0 ? "Adicionar produtos…" : `${selected.length} seleccionado(s)`}
            </span>
            <Search className="h-4 w-4 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-[480px] p-0" align="start">
          <Command>
            <CommandInput placeholder="Pesquisar produto…" />
            <CommandList className="max-h-72">
              <CommandEmpty>Sem resultados.</CommandEmpty>
              <CommandGroup>
                {products.map((p) => {
                  const isSel = selectedSet.has(p.id);
                  return (
                    <CommandItem
                      key={p.id}
                      value={`${p.name} ${p.sku ?? ""}`}
                      onSelect={() => {
                        if (isSel) onChange(selected.filter((id) => id !== p.id));
                        else onChange([...selected, p.id]);
                      }}
                    >
                      <div className={`mr-2 h-4 w-4 rounded border flex items-center justify-center ${isSel ? "bg-primary border-primary" : ""}`}>
                        {isSel && <span className="text-[10px] text-primary-foreground">✓</span>}
                      </div>
                      <span className="truncate">{p.name}</span>
                      {p.sku && <span className="ml-auto text-[10px] text-muted-foreground">{p.sku}</span>}
                    </CommandItem>
                  );
                })}
              </CommandGroup>
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>
      {selectedProducts.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {selectedProducts.map((p) => (
            <span key={p.id} className="inline-flex items-center gap-1 rounded-full bg-muted px-2 py-1 text-xs">
              {p.name}
              <button onClick={() => onChange(selected.filter((id) => id !== p.id))}>
                <X className="h-3 w-3" />
              </button>
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

function ProductSingleSelect({
  products,
  selected,
  onChange,
  disabled,
}: {
  products: ProductOption[];
  selected: string | null;
  onChange: (id: string | null) => void;
  disabled?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const sel = products.find((p) => p.id === selected);
  return (
    <Popover open={open} onOpenChange={(v) => !disabled && setOpen(v)}>
      <PopoverTrigger asChild>
        <Button variant="outline" type="button" disabled={disabled} className="w-full justify-between font-normal">
          <span className={sel ? "" : "text-muted-foreground"}>
            {sel ? sel.name : "Escolher produto…"}
          </span>
          <Search className="h-4 w-4 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[480px] p-0" align="start">
        <Command>
          <CommandInput placeholder="Pesquisar produto…" />
          <CommandList className="max-h-72">
            <CommandEmpty>Sem resultados.</CommandEmpty>
            <CommandGroup>
              {products.map((p) => (
                <CommandItem
                  key={p.id}
                  value={`${p.name} ${p.sku ?? ""}`}
                  onSelect={() => {
                    onChange(p.id);
                    setOpen(false);
                  }}
                >
                  <span className="truncate">{p.name}</span>
                  {p.sku && <span className="ml-auto text-[10px] text-muted-foreground">{p.sku}</span>}
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
