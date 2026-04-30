import { useNavigate, useParams, Link } from "react-router-dom";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { ArrowLeft, CheckCircle2, Loader2, Plus, Trash2, Search, Pencil } from "lucide-react";
import {
  useCompositeProduct, useUpdateCompositeProduct, useApproveCompositeProduct,
  useCompositeGroups, useUpsertGroup, useDeleteGroup,
  useCompositeSubstitutes, useAddSubstitute, useRemoveSubstitute,
  useCompositeComponents,
  type PricingMode,
} from "@/hooks/useCompositeProducts";
import { CompositeComponentsManager } from "@/components/composite-products/CompositeComponentsManager";
import { PricingMarginPanel } from "@/components/composite-products/PricingMarginPanel";
import { CompositeSimulator } from "@/components/composite-products/CompositeSimulator";
import { formatMoneyEur } from "@/lib/money";

export default function CompositeProductDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { data: kit, isLoading } = useCompositeProduct(id);
  const update = useUpdateCompositeProduct();
  const approve = useApproveCompositeProduct();

  if (isLoading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center min-h-[60vh]">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      </DashboardLayout>
    );
  }

  if (!kit) {
    return (
      <DashboardLayout>
        <div className="p-6 text-center space-y-3">
          <p>Produto composto não encontrado.</p>
          <Button asChild variant="outline"><Link to="/dashboard/composite-products"><ArrowLeft className="h-4 w-4 mr-2" /> Voltar</Link></Button>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="p-4 md:p-6 space-y-6">
        {/* Header */}
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="sm" onClick={() => navigate("/dashboard/composite-products")}>
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <div>
              <h1 className="text-xl md:text-2xl font-semibold">{kit.name}</h1>
              <div className="flex items-center gap-2 mt-1 flex-wrap">
                {kit.sku && <span className="text-xs text-muted-foreground">SKU: {kit.sku}</span>}
                <Badge variant="outline">{kit.composition_type.replace(/_/g, " ")}</Badge>
                <Badge variant="outline">{kit.status}</Badge>
              </div>
            </div>
          </div>
          <div className="flex gap-2">
            {kit.status !== "active" && (
              <Button onClick={() => approve.mutate(kit.id)} disabled={approve.isPending}>
                <CheckCircle2 className="h-4 w-4 mr-2" />
                Aprovar e ativar
              </Button>
            )}
            <Select value={kit.status} onValueChange={(v) => update.mutate({ id: kit.id, status: v as any })}>
              <SelectTrigger className="w-44"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="draft">Rascunho</SelectItem>
                <SelectItem value="pending_approval">Aguarda aprovação</SelectItem>
                <SelectItem value="active">Ativo</SelectItem>
                <SelectItem value="paused">Pausado</SelectItem>
                <SelectItem value="archived">Arquivado</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <Tabs defaultValue="overview">
          <TabsList className="flex-wrap h-auto">
            <TabsTrigger value="overview">Visão geral</TabsTrigger>
            <TabsTrigger value="components">Componentes</TabsTrigger>
            <TabsTrigger value="groups">Grupos de escolha</TabsTrigger>
            <TabsTrigger value="substitutes">Substitutos</TabsTrigger>
            <TabsTrigger value="simulator">Simulador</TabsTrigger>
            <TabsTrigger value="settings">Configuração</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-4 mt-4">
            <PricingMarginPanel kit={kit} />
            <SalesAssistPanel kit={kit} />
          </TabsContent>

          <TabsContent value="components" className="mt-4">
            <CompositeComponentsManager kitId={kit.id} />
          </TabsContent>

          <TabsContent value="groups" className="mt-4">
            <GroupsPanel kitId={kit.id} />
          </TabsContent>

          <TabsContent value="substitutes" className="mt-4">
            <SubstitutesPanel kitId={kit.id} />
          </TabsContent>

          <TabsContent value="simulator" className="mt-4">
            <CompositeSimulator kit={kit} />
          </TabsContent>

          <TabsContent value="settings" className="mt-4">
            <SettingsPanel kit={kit} />
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
}

function SalesAssistPanel({ kit }: { kit: any }) {
  const { data: components = [] } = useCompositeComponents(kit.id);
  const total = components.reduce((s, c) => s + Number(c.unit_price_snapshot ?? c.product?.base_price ?? 0) * c.quantity, 0);
  const final = kit.fixed_price ?? (kit.pricing_mode === "discount_on_sum" ? total * (1 - Number(kit.discount_pct ?? 0) / 100) : total);
  const savings = total - final;
  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base">Venda assistida</CardTitle>
      </CardHeader>
      <CardContent className="grid md:grid-cols-3 gap-4">
        <div>
          <p className="text-xs text-muted-foreground uppercase">Preço normal</p>
          <p className="text-lg font-semibold">{formatMoneyEur(total)}</p>
        </div>
        <div>
          <p className="text-xs text-muted-foreground uppercase">Preço do pack</p>
          <p className="text-lg font-semibold text-primary">{formatMoneyEur(final)}</p>
        </div>
        <div>
          <p className="text-xs text-muted-foreground uppercase">Poupança</p>
          <p className="text-lg font-semibold text-emerald-600">{formatMoneyEur(Math.max(0, savings))}</p>
        </div>
        <div className="md:col-span-3 pt-3 border-t">
          <p className="text-xs text-muted-foreground uppercase mb-2">Argumento de venda</p>
          <p className="text-sm">
            {components.length > 0
              ? `Pack composto por ${components.length} produtos cuidadosamente selecionados${savings > 0 ? `, com poupança de ${formatMoneyEur(savings)} face à compra individual.` : "."}`
              : "Adicione componentes para gerar argumento de venda."}
          </p>
        </div>
      </CardContent>
    </Card>
  );
}

function GroupsPanel({ kitId }: { kitId: string }) {
  const { data: groups = [] } = useCompositeGroups(kitId);
  const upsert = useUpsertGroup();
  const remove = useDeleteGroup();
  const [editing, setEditing] = useState<any>(null);

  const newGroup = () => setEditing({ kit_id: kitId, name: "", description: "", is_required: true, min_choices: 1, max_choices: 1, sort_order: groups.length });

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
        <CardTitle className="text-base">Grupos de escolha ({groups.length})</CardTitle>
        <Button size="sm" onClick={newGroup}><Plus className="h-4 w-4 mr-1" /> Novo grupo</Button>
      </CardHeader>
      <CardContent>
        {editing && (
          <div className="border rounded-md p-3 mb-4 space-y-3 bg-muted/30">
            <div className="grid md:grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-xs">Nome *</Label>
                <Input value={editing.name} onChange={(e) => setEditing({ ...editing, name: e.target.value })} />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Descrição</Label>
                <Input value={editing.description ?? ""} onChange={(e) => setEditing({ ...editing, description: e.target.value })} />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Mínimo de escolhas</Label>
                <Input type="number" min={0} value={editing.min_choices} onChange={(e) => setEditing({ ...editing, min_choices: Number(e.target.value) })} />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Máximo de escolhas</Label>
                <Input type="number" min={1} value={editing.max_choices} onChange={(e) => setEditing({ ...editing, max_choices: Number(e.target.value) })} />
              </div>
              <div className="flex items-center gap-2">
                <Switch checked={editing.is_required} onCheckedChange={(v) => setEditing({ ...editing, is_required: v })} />
                <Label className="text-xs">Obrigatório</Label>
              </div>
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" size="sm" onClick={() => setEditing(null)}>Cancelar</Button>
              <Button size="sm" disabled={!editing.name.trim()} onClick={async () => { await upsert.mutateAsync(editing); setEditing(null); }}>Guardar</Button>
            </div>
          </div>
        )}
        {groups.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-6">Sem grupos. Crie grupos para permitir escolhas dentro do kit (ex: "Escolha uma base").</p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nome</TableHead>
                <TableHead>Min</TableHead>
                <TableHead>Max</TableHead>
                <TableHead>Obrig.</TableHead>
                <TableHead className="w-20"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {groups.map((g) => (
                <TableRow key={g.id}>
                  <TableCell>
                    <p className="font-medium text-sm">{g.name}</p>
                    {g.description && <p className="text-xs text-muted-foreground">{g.description}</p>}
                  </TableCell>
                  <TableCell>{g.min_choices}</TableCell>
                  <TableCell>{g.max_choices}</TableCell>
                  <TableCell>{g.is_required ? "Sim" : "Não"}</TableCell>
                  <TableCell>
                    <div className="flex">
                      <Button variant="ghost" size="sm" onClick={() => setEditing(g)}><Pencil className="h-3.5 w-3.5" /></Button>
                      <Button variant="ghost" size="sm" onClick={() => remove.mutate({ id: g.id, kit_id: kitId })}><Trash2 className="h-3.5 w-3.5 text-destructive" /></Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}

function SubstitutesPanel({ kitId }: { kitId: string }) {
  const { currentWorkspace } = useWorkspace();
  const { data: components = [] } = useCompositeComponents(kitId);
  const { data: subs = [] } = useCompositeSubstitutes(kitId);
  const add = useAddSubstitute();
  const remove = useRemoveSubstitute();
  const [orig, setOrig] = useState("");
  const [search, setSearch] = useState("");
  const [pickerOpen, setPickerOpen] = useState(false);
  const [reason, setReason] = useState("");

  const { data: products = [] } = useQuery({
    queryKey: ["sub-products", currentWorkspace?.id, search],
    queryFn: async () => {
      let q = supabase.from("products").select("id, name, sku").eq("workspace_id", currentWorkspace!.id).limit(20);
      if (search.trim()) q = q.ilike("name", `%${search.trim()}%`);
      const { data, error } = await q;
      if (error) throw error;
      return data || [];
    },
    enabled: pickerOpen && !!currentWorkspace?.id,
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Produtos substitutos</CardTitle>
        <p className="text-xs text-muted-foreground">Define alternativas a usar quando faltar stock de um componente.</p>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex flex-col md:flex-row gap-2 p-3 border rounded-md bg-muted/30">
          <Select value={orig} onValueChange={setOrig}>
            <SelectTrigger className="md:w-60"><SelectValue placeholder="Componente original..." /></SelectTrigger>
            <SelectContent>
              {components.filter((c) => c.product_id).map((c) => (
                <SelectItem key={c.product_id!} value={c.product_id!}>{c.product?.name ?? "—"}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Input placeholder="Motivo (opcional)" value={reason} onChange={(e) => setReason(e.target.value)} className="flex-1" />
          <Popover open={pickerOpen} onOpenChange={setPickerOpen}>
            <PopoverTrigger asChild>
              <Button disabled={!orig}><Plus className="h-4 w-4 mr-1" /> Substituto</Button>
            </PopoverTrigger>
            <PopoverContent className="w-80 p-0" align="end">
              <div className="p-2 border-b">
                <div className="relative">
                  <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input autoFocus placeholder="Procurar..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-8 h-9" />
                </div>
              </div>
              <div className="max-h-64 overflow-auto">
                {products.filter((p) => p.id !== orig).map((p) => (
                  <button
                    key={p.id} type="button"
                    className="w-full text-left p-2 hover:bg-muted/50 border-b last:border-0"
                    onClick={async () => {
                      await add.mutateAsync({ kit_id: kitId, original_product_id: orig, substitute_product_id: p.id, reason: reason || undefined });
                      setReason(""); setSearch(""); setPickerOpen(false);
                    }}
                  >
                    <p className="text-sm font-medium">{p.name}</p>
                    {p.sku && <p className="text-xs text-muted-foreground">{p.sku}</p>}
                  </button>
                ))}
              </div>
            </PopoverContent>
          </Popover>
        </div>

        {subs.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-6">Sem substitutos definidos.</p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Original</TableHead>
                <TableHead>Substituto</TableHead>
                <TableHead>Motivo</TableHead>
                <TableHead>Prio.</TableHead>
                <TableHead className="w-10"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {subs.map((s) => (
                <TableRow key={s.id}>
                  <TableCell className="text-sm">{s.original_product?.name ?? "—"}</TableCell>
                  <TableCell className="text-sm font-medium">{s.substitute_product?.name ?? "—"}</TableCell>
                  <TableCell className="text-xs text-muted-foreground">{s.reason || "—"}</TableCell>
                  <TableCell><Badge variant="outline">{s.priority}</Badge></TableCell>
                  <TableCell>
                    <Button variant="ghost" size="sm" onClick={() => remove.mutate({ id: s.id, kit_id: kitId })}>
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}

function SettingsPanel({ kit }: { kit: any }) {
  const update = useUpdateCompositeProduct();
  const [form, setForm] = useState({
    name: kit.name,
    sku: kit.sku ?? "",
    description: kit.description ?? "",
    category: kit.category ?? "",
    image_url: kit.image_url ?? "",
    pricing_mode: kit.pricing_mode as PricingMode,
    fixed_price: kit.fixed_price ?? "",
    discount_pct: kit.discount_pct ?? 0,
    min_margin_pct: kit.min_margin_pct ?? 0,
    visibility_b2b: !!kit.visibility_b2b,
    requires_approval: !!kit.requires_approval,
  });
  const set = (k: keyof typeof form, v: any) => setForm((p) => ({ ...p, [k]: v }));
  const save = () => update.mutate({
    id: kit.id,
    ...form,
    fixed_price: form.fixed_price === "" ? null : Number(form.fixed_price),
    discount_pct: Number(form.discount_pct) || 0,
    min_margin_pct: Number(form.min_margin_pct) || 0,
  });

  return (
    <Card>
      <CardHeader><CardTitle className="text-base">Configuração</CardTitle></CardHeader>
      <CardContent className="space-y-4">
        <div className="grid md:grid-cols-2 gap-3">
          <div className="space-y-1"><Label>Nome</Label><Input value={form.name} onChange={(e) => set("name", e.target.value)} /></div>
          <div className="space-y-1"><Label>SKU</Label><Input value={form.sku} onChange={(e) => set("sku", e.target.value)} /></div>
          <div className="space-y-1"><Label>Categoria</Label><Input value={form.category} onChange={(e) => set("category", e.target.value)} /></div>
          <div className="space-y-1"><Label>Imagem (URL)</Label><Input value={form.image_url} onChange={(e) => set("image_url", e.target.value)} /></div>
          <div className="md:col-span-2 space-y-1"><Label>Descrição</Label><Textarea rows={3} value={form.description} onChange={(e) => set("description", e.target.value)} /></div>
        </div>
        <div className="grid md:grid-cols-3 gap-3 pt-3 border-t">
          <div className="space-y-1">
            <Label>Modo de preço</Label>
            <Select value={form.pricing_mode} onValueChange={(v) => set("pricing_mode", v)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="sum_components">Soma componentes</SelectItem>
                <SelectItem value="fixed_price">Preço fixo</SelectItem>
                <SelectItem value="discount_on_sum">Desconto sobre soma</SelectItem>
                <SelectItem value="min_margin">Margem mínima</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1"><Label>Preço fixo (€)</Label><Input type="number" step="0.01" value={form.fixed_price} onChange={(e) => set("fixed_price", e.target.value)} disabled={form.pricing_mode !== "fixed_price"} /></div>
          <div className="space-y-1"><Label>Desconto (%)</Label><Input type="number" step="0.1" value={form.discount_pct} onChange={(e) => set("discount_pct", e.target.value)} disabled={form.pricing_mode !== "discount_on_sum"} /></div>
          <div className="space-y-1"><Label>Margem mínima (%)</Label><Input type="number" step="0.1" value={form.min_margin_pct} onChange={(e) => set("min_margin_pct", e.target.value)} /></div>
        </div>
        <div className="grid md:grid-cols-2 gap-3 pt-3 border-t">
          <div className="flex items-center justify-between p-3 border rounded-md">
            <Label>Visível B2B</Label>
            <Switch checked={form.visibility_b2b} onCheckedChange={(v) => set("visibility_b2b", v)} />
          </div>
          <div className="flex items-center justify-between p-3 border rounded-md">
            <Label>Requer aprovação</Label>
            <Switch checked={form.requires_approval} onCheckedChange={(v) => set("requires_approval", v)} />
          </div>
        </div>
        <div className="flex justify-end">
          <Button onClick={save} disabled={update.isPending}>{update.isPending ? "A guardar..." : "Guardar alterações"}</Button>
        </div>
      </CardContent>
    </Card>
  );
}
