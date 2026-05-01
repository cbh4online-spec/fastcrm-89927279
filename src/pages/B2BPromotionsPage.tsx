import { useState } from "react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, Plus, Trash2, Pencil, Tag, Package, Ticket, Truck, MailWarning } from "lucide-react";
import {
  useQuantityBreaks,
  useBundles,
  useCoupons,
  useShippingRules,
  useRecoveryConfig,
} from "@/hooks/b2b/useB2BPromotions";

export default function B2BPromotionsPage() {
  return (
    <DashboardLayout>
      <div className="space-y-6 p-6">
        <header>
          <h1 className="text-2xl font-bold tracking-tight">Promoções B2B</h1>
          <p className="text-muted-foreground">
            Aumente o ticket médio do portal de revenda com escalões, bundles, cupões e portes.
          </p>
        </header>

        <Tabs defaultValue="quantity_breaks" className="w-full">
          <TabsList className="grid grid-cols-2 md:grid-cols-5">
            <TabsTrigger value="quantity_breaks"><Tag className="h-4 w-4 mr-2"/>Escalões</TabsTrigger>
            <TabsTrigger value="bundles"><Package className="h-4 w-4 mr-2"/>Bundles</TabsTrigger>
            <TabsTrigger value="coupons"><Ticket className="h-4 w-4 mr-2"/>Cupões</TabsTrigger>
            <TabsTrigger value="shipping"><Truck className="h-4 w-4 mr-2"/>Envios</TabsTrigger>
            <TabsTrigger value="recovery"><MailWarning className="h-4 w-4 mr-2"/>Recuperação</TabsTrigger>
          </TabsList>

          <TabsContent value="quantity_breaks"><QuantityBreaksTab /></TabsContent>
          <TabsContent value="bundles"><BundlesTab /></TabsContent>
          <TabsContent value="coupons"><CouponsTab /></TabsContent>
          <TabsContent value="shipping"><ShippingTab /></TabsContent>
          <TabsContent value="recovery"><RecoveryTab /></TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
}

// ===== Quantity Breaks =====
function QuantityBreaksTab() {
  const { list, upsert, remove } = useQuantityBreaks();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<any>(null);

  const onSave = (form: any) => {
    upsert.mutate(form, { onSuccess: () => { setOpen(false); setEditing(null); } });
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-start justify-between">
        <div>
          <CardTitle>Escalões por quantidade</CardTitle>
          <CardDescription>
            Aplica desconto automático a partir de uma quantidade mínima por produto, categoria ou tier.
          </CardDescription>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button onClick={() => setEditing(null)}><Plus className="h-4 w-4 mr-2"/>Novo escalão</Button>
          </DialogTrigger>
          <QuantityBreakDialog initial={editing} onSave={onSave} loading={upsert.isPending}/>
        </Dialog>
      </CardHeader>
      <CardContent>
        {list.isLoading ? (
          <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin"/></div>
        ) : !list.data?.length ? (
          <p className="text-sm text-muted-foreground py-8 text-center">Sem escalões definidos.</p>
        ) : (
          <div className="divide-y">
            {list.data.map((qb: any) => (
              <div key={qb.id} className="flex items-center justify-between py-3">
                <div>
                  <p className="font-medium">
                    {qb.products?.name || qb.partner_tiers?.name || "Categoria"} · ≥ {qb.min_qty} un.
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {qb.discount_pct}% desconto · {qb.is_active ? "Ativo" : "Inativo"}
                  </p>
                </div>
                <div className="flex gap-2">
                  <Button variant="ghost" size="icon" onClick={() => { setEditing(qb); setOpen(true); }}>
                    <Pencil className="h-4 w-4"/>
                  </Button>
                  <Button variant="ghost" size="icon" onClick={() => remove.mutate(qb.id)}>
                    <Trash2 className="h-4 w-4"/>
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function QuantityBreakDialog({ initial, onSave, loading }: any) {
  const [form, setForm] = useState({
    id: initial?.id,
    product_id: initial?.product_id || "",
    min_qty: initial?.min_qty || 10,
    discount_pct: initial?.discount_pct || 5,
    is_active: initial?.is_active ?? true,
  });
  return (
    <DialogContent>
      <DialogHeader><DialogTitle>{initial ? "Editar" : "Novo"} escalão</DialogTitle></DialogHeader>
      <div className="space-y-4">
        <div>
          <Label>Product ID (opcional)</Label>
          <Input value={form.product_id} onChange={(e) => setForm({ ...form, product_id: e.target.value })} placeholder="UUID do produto"/>
          <p className="text-xs text-muted-foreground mt-1">Deixe vazio para aplicar a todo o catálogo.</p>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label>Qtd. mínima</Label>
            <Input type="number" min={1} value={form.min_qty} onChange={(e) => setForm({ ...form, min_qty: +e.target.value })}/>
          </div>
          <div>
            <Label>Desconto (%)</Label>
            <Input type="number" min={1} max={100} step={0.5} value={form.discount_pct} onChange={(e) => setForm({ ...form, discount_pct: +e.target.value })}/>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Switch checked={form.is_active} onCheckedChange={(v) => setForm({ ...form, is_active: v })}/>
          <Label>Ativo</Label>
        </div>
      </div>
      <DialogFooter>
        <Button onClick={() => onSave({ ...form, product_id: form.product_id || null })} disabled={loading}>
          {loading && <Loader2 className="h-4 w-4 animate-spin mr-2"/>}Gravar
        </Button>
      </DialogFooter>
    </DialogContent>
  );
}

// ===== Bundles =====
function BundlesTab() {
  const { list, upsert, remove } = useBundles();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<any>(null);

  return (
    <Card>
      <CardHeader className="flex flex-row items-start justify-between">
        <div>
          <CardTitle>Bundles / Kits</CardTitle>
          <CardDescription>Combine produtos com desconto especial quando comprados juntos.</CardDescription>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button onClick={() => setEditing(null)}><Plus className="h-4 w-4 mr-2"/>Novo bundle</Button>
          </DialogTrigger>
          <BundleDialog initial={editing} onSave={(f: any) => upsert.mutate(f, { onSuccess: () => { setOpen(false); setEditing(null); } })} loading={upsert.isPending}/>
        </Dialog>
      </CardHeader>
      <CardContent>
        {list.isLoading ? (
          <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin"/></div>
        ) : !list.data?.length ? (
          <p className="text-sm text-muted-foreground py-8 text-center">Sem bundles definidos.</p>
        ) : (
          <div className="divide-y">
            {list.data.map((b: any) => (
              <div key={b.id} className="flex items-center justify-between py-3">
                <div>
                  <p className="font-medium">{b.name}</p>
                  <p className="text-sm text-muted-foreground">
                    {b.partner_bundle_items?.length || 0} produtos · {b.discount_type === "percentage" ? `${b.discount_value}%` : `${b.discount_value}€`} desc.
                  </p>
                </div>
                <div className="flex gap-2">
                  <Badge variant={b.is_active ? "default" : "secondary"}>{b.is_active ? "Ativo" : "Inativo"}</Badge>
                  <Button variant="ghost" size="icon" onClick={() => { setEditing(b); setOpen(true); }}>
                    <Pencil className="h-4 w-4"/>
                  </Button>
                  <Button variant="ghost" size="icon" onClick={() => remove.mutate(b.id)}>
                    <Trash2 className="h-4 w-4"/>
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function BundleDialog({ initial, onSave, loading }: any) {
  const [form, setForm] = useState({
    id: initial?.id,
    name: initial?.name || "",
    description: initial?.description || "",
    discount_type: initial?.discount_type || "percentage",
    discount_value: initial?.discount_value || 10,
    is_active: initial?.is_active ?? true,
    items: initial?.partner_bundle_items?.map((i: any) => ({ product_id: i.product_id, required_qty: i.required_qty })) || [],
  });

  const addItem = () => setForm({ ...form, items: [...form.items, { product_id: "", required_qty: 1 }] });
  const updateItem = (idx: number, key: string, val: any) => {
    const items = [...form.items];
    items[idx] = { ...items[idx], [key]: val };
    setForm({ ...form, items });
  };
  const removeItem = (idx: number) => setForm({ ...form, items: form.items.filter((_: any, i: number) => i !== idx) });

  return (
    <DialogContent className="max-w-lg">
      <DialogHeader><DialogTitle>{initial ? "Editar" : "Novo"} bundle</DialogTitle></DialogHeader>
      <div className="space-y-4">
        <div>
          <Label>Nome</Label>
          <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })}/>
        </div>
        <div>
          <Label>Descrição</Label>
          <Textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} rows={2}/>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label>Tipo</Label>
            <Select value={form.discount_type} onValueChange={(v) => setForm({ ...form, discount_type: v })}>
              <SelectTrigger><SelectValue/></SelectTrigger>
              <SelectContent>
                <SelectItem value="percentage">Percentagem</SelectItem>
                <SelectItem value="fixed">Valor fixo (€)</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Valor</Label>
            <Input type="number" min={0} step={0.5} value={form.discount_value} onChange={(e) => setForm({ ...form, discount_value: +e.target.value })}/>
          </div>
        </div>
        <div className="space-y-2">
          <div className="flex justify-between items-center">
            <Label>Produtos do bundle</Label>
            <Button size="sm" variant="ghost" onClick={addItem}><Plus className="h-3 w-3 mr-1"/>Adicionar</Button>
          </div>
          {form.items.map((it: any, idx: number) => (
            <div key={idx} className="flex gap-2">
              <Input placeholder="Product ID" value={it.product_id} onChange={(e) => updateItem(idx, "product_id", e.target.value)}/>
              <Input className="w-20" type="number" min={1} value={it.required_qty} onChange={(e) => updateItem(idx, "required_qty", +e.target.value)}/>
              <Button size="icon" variant="ghost" onClick={() => removeItem(idx)}><Trash2 className="h-4 w-4"/></Button>
            </div>
          ))}
        </div>
        <div className="flex items-center gap-2">
          <Switch checked={form.is_active} onCheckedChange={(v) => setForm({ ...form, is_active: v })}/>
          <Label>Ativo</Label>
        </div>
      </div>
      <DialogFooter>
        <Button onClick={() => onSave(form)} disabled={loading || !form.name || form.items.length === 0}>
          {loading && <Loader2 className="h-4 w-4 animate-spin mr-2"/>}Gravar
        </Button>
      </DialogFooter>
    </DialogContent>
  );
}

// ===== Coupons =====
function CouponsTab() {
  const { list, upsert, remove } = useCoupons();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<any>(null);

  return (
    <Card>
      <CardHeader className="flex flex-row items-start justify-between">
        <div>
          <CardTitle>Cupões promocionais</CardTitle>
          <CardDescription>Códigos com percentagem, valor fixo ou portes grátis.</CardDescription>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button onClick={() => setEditing(null)}><Plus className="h-4 w-4 mr-2"/>Novo cupão</Button>
          </DialogTrigger>
          <CouponDialog initial={editing} onSave={(f: any) => upsert.mutate(f, { onSuccess: () => { setOpen(false); setEditing(null); } })} loading={upsert.isPending}/>
        </Dialog>
      </CardHeader>
      <CardContent>
        {list.isLoading ? (
          <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin"/></div>
        ) : !list.data?.length ? (
          <p className="text-sm text-muted-foreground py-8 text-center">Sem cupões.</p>
        ) : (
          <div className="divide-y">
            {list.data.map((c: any) => (
              <div key={c.id} className="flex items-center justify-between py-3">
                <div>
                  <p className="font-medium font-mono">{c.code}</p>
                  <p className="text-sm text-muted-foreground">
                    {c.discount_type === "percentage" && `${c.discount_value}% desconto`}
                    {c.discount_type === "fixed" && `${c.discount_value}€ desconto`}
                    {c.discount_type === "free_shipping" && "Portes grátis"}
                    {" · "}{c.uses_count}/{c.max_uses ?? "∞"} usos
                    {c.min_subtotal > 0 && ` · mín. ${c.min_subtotal}€`}
                  </p>
                </div>
                <div className="flex gap-2">
                  <Badge variant={c.is_active ? "default" : "secondary"}>{c.is_active ? "Ativo" : "Inativo"}</Badge>
                  <Button variant="ghost" size="icon" onClick={() => { setEditing(c); setOpen(true); }}>
                    <Pencil className="h-4 w-4"/>
                  </Button>
                  <Button variant="ghost" size="icon" onClick={() => remove.mutate(c.id)}>
                    <Trash2 className="h-4 w-4"/>
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function CouponDialog({ initial, onSave, loading }: any) {
  const [form, setForm] = useState({
    id: initial?.id,
    code: initial?.code || "",
    description: initial?.description || "",
    discount_type: initial?.discount_type || "percentage",
    discount_value: initial?.discount_value || 10,
    min_subtotal: initial?.min_subtotal || 0,
    max_uses: initial?.max_uses || null,
    per_partner_limit: initial?.per_partner_limit || null,
    first_order_only: initial?.first_order_only ?? false,
    valid_until: initial?.valid_until || "",
    is_active: initial?.is_active ?? true,
  });
  return (
    <DialogContent>
      <DialogHeader><DialogTitle>{initial ? "Editar" : "Novo"} cupão</DialogTitle></DialogHeader>
      <div className="space-y-4">
        <div>
          <Label>Código</Label>
          <Input value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value.toUpperCase() })} placeholder="WELCOME10"/>
        </div>
        <div>
          <Label>Descrição</Label>
          <Input value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })}/>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label>Tipo</Label>
            <Select value={form.discount_type} onValueChange={(v) => setForm({ ...form, discount_type: v })}>
              <SelectTrigger><SelectValue/></SelectTrigger>
              <SelectContent>
                <SelectItem value="percentage">Percentagem (%)</SelectItem>
                <SelectItem value="fixed">Valor fixo (€)</SelectItem>
                <SelectItem value="free_shipping">Portes grátis</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Valor</Label>
            <Input type="number" min={0} step={0.5} value={form.discount_value} onChange={(e) => setForm({ ...form, discount_value: +e.target.value })} disabled={form.discount_type === "free_shipping"}/>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label>Mín. subtotal (€)</Label>
            <Input type="number" min={0} value={form.min_subtotal} onChange={(e) => setForm({ ...form, min_subtotal: +e.target.value })}/>
          </div>
          <div>
            <Label>Usos máximos (total)</Label>
            <Input type="number" min={0} value={form.max_uses ?? ""} onChange={(e) => setForm({ ...form, max_uses: e.target.value ? +e.target.value : null })}/>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label>Usos por parceiro</Label>
            <Input type="number" min={0} value={form.per_partner_limit ?? ""} onChange={(e) => setForm({ ...form, per_partner_limit: e.target.value ? +e.target.value : null })}/>
          </div>
          <div>
            <Label>Válido até</Label>
            <Input type="datetime-local" value={form.valid_until ? form.valid_until.slice(0, 16) : ""} onChange={(e) => setForm({ ...form, valid_until: e.target.value ? new Date(e.target.value).toISOString() : "" })}/>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <Switch checked={form.first_order_only} onCheckedChange={(v) => setForm({ ...form, first_order_only: v })}/>
            <Label>Só 1.ª encomenda</Label>
          </div>
          <div className="flex items-center gap-2">
            <Switch checked={form.is_active} onCheckedChange={(v) => setForm({ ...form, is_active: v })}/>
            <Label>Ativo</Label>
          </div>
        </div>
      </div>
      <DialogFooter>
        <Button onClick={() => onSave(form)} disabled={loading || !form.code}>
          {loading && <Loader2 className="h-4 w-4 animate-spin mr-2"/>}Gravar
        </Button>
      </DialogFooter>
    </DialogContent>
  );
}

// ===== Shipping =====
function ShippingTab() {
  const { item, save } = useShippingRules();
  const [form, setForm] = useState<any>(null);
  const data = form ?? item.data ?? { free_shipping_threshold: 100, flat_rate: 5, currency: "EUR", is_active: true };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Regras de portes</CardTitle>
        <CardDescription>
          Define o limiar para portes grátis (incentivo a aumentar o cesto) e a taxa plana abaixo desse valor.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {item.isLoading ? <Loader2 className="h-6 w-6 animate-spin"/> : (
          <>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Portes grátis a partir de (€)</Label>
                <Input type="number" min={0} value={data.free_shipping_threshold ?? ""} onChange={(e) => setForm({ ...data, free_shipping_threshold: e.target.value ? +e.target.value : null })}/>
              </div>
              <div>
                <Label>Taxa plana (€)</Label>
                <Input type="number" min={0} step={0.5} value={data.flat_rate} onChange={(e) => setForm({ ...data, flat_rate: +e.target.value })}/>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Switch checked={data.is_active} onCheckedChange={(v) => setForm({ ...data, is_active: v })}/>
              <Label>Ativo</Label>
            </div>
            <Button onClick={() => save.mutate(data)} disabled={save.isPending}>
              {save.isPending && <Loader2 className="h-4 w-4 animate-spin mr-2"/>}Gravar
            </Button>
          </>
        )}
      </CardContent>
    </Card>
  );
}

// ===== Recovery =====
function RecoveryTab() {
  const { item, save } = useRecoveryConfig();
  const [form, setForm] = useState<any>(null);
  const data = form ?? item.data ?? {
    enabled: true,
    first_delay_minutes: 240,
    second_delay_minutes: 1440,
    third_delay_minutes: 4320,
    expire_after_days: 14,
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Recuperação de carrinhos abandonados</CardTitle>
        <CardDescription>
          Sequência automática de 3 emails. Default: 4h → 24h → 72h. Sem cupão automático.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {item.isLoading ? <Loader2 className="h-6 w-6 animate-spin"/> : (
          <>
            <div className="flex items-center gap-2">
              <Switch checked={data.enabled} onCheckedChange={(v) => setForm({ ...data, enabled: v })}/>
              <Label>Recuperação ativada</Label>
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div>
                <Label>1.º email (min)</Label>
                <Input type="number" min={1} value={data.first_delay_minutes} onChange={(e) => setForm({ ...data, first_delay_minutes: +e.target.value })}/>
                <p className="text-xs text-muted-foreground">{(data.first_delay_minutes / 60).toFixed(1)}h</p>
              </div>
              <div>
                <Label>2.º email (min)</Label>
                <Input type="number" min={1} value={data.second_delay_minutes} onChange={(e) => setForm({ ...data, second_delay_minutes: +e.target.value })}/>
                <p className="text-xs text-muted-foreground">{(data.second_delay_minutes / 60).toFixed(1)}h</p>
              </div>
              <div>
                <Label>3.º email (min)</Label>
                <Input type="number" min={1} value={data.third_delay_minutes} onChange={(e) => setForm({ ...data, third_delay_minutes: +e.target.value })}/>
                <p className="text-xs text-muted-foreground">{(data.third_delay_minutes / 60).toFixed(1)}h</p>
              </div>
            </div>
            <div>
              <Label>Expirar após (dias)</Label>
              <Input type="number" min={1} className="max-w-xs" value={data.expire_after_days} onChange={(e) => setForm({ ...data, expire_after_days: +e.target.value })}/>
            </div>
            <Button onClick={() => save.mutate(data)} disabled={save.isPending}>
              {save.isPending && <Loader2 className="h-4 w-4 animate-spin mr-2"/>}Gravar
            </Button>
          </>
        )}
      </CardContent>
    </Card>
  );
}
