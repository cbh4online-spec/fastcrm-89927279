import { useState } from "react";
import { Package, Plus, Trash2, Percent, DollarSign, ToggleLeft, ToggleRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useBundles, useBundleItems, useCreateBundle, useUpdateBundle, useDeleteBundle, useAddBundleItem, useRemoveBundleItem } from "@/hooks/useBundles";
import { ProductSelector } from "@/components/products/ProductSelector";
import { Skeleton } from "@/components/ui/skeleton";

export function BundlesManager() {
  const { data: bundles, isLoading } = useBundles();
  const createBundle = useCreateBundle();
  const updateBundle = useUpdateBundle();
  const deleteBundle = useDeleteBundle();
  const [showCreate, setShowCreate] = useState(false);
  const [selectedBundle, setSelectedBundle] = useState<string | null>(null);
  const [form, setForm] = useState({ name: "", description: "", discount_type: "percentage", discount_value: 0 });

  const handleCreate = () => {
    createBundle.mutate(form, { onSuccess: () => { setShowCreate(false); setForm({ name: "", description: "", discount_type: "percentage", discount_value: 0 }); } });
  };

  if (isLoading) return <div className="space-y-3">{[1, 2, 3].map(i => <Skeleton key={i} className="h-20 w-full" />)}</div>;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">Bundles & Kits</h3>
          <p className="text-sm text-muted-foreground">Agrupe produtos em pacotes com desconto</p>
        </div>
        <Button onClick={() => setShowCreate(true)} size="sm"><Plus className="h-4 w-4 mr-1" />Novo Bundle</Button>
      </div>

      {(!bundles || bundles.length === 0) ? (
        <Card><CardContent className="py-8 text-center text-muted-foreground"><Package className="h-10 w-10 mx-auto mb-2 opacity-40" />Nenhum bundle criado</CardContent></Card>
      ) : (
        <div className="grid gap-3">
          {bundles.map(b => (
            <Card key={b.id} className="cursor-pointer hover:border-primary/40 transition-colors" onClick={() => setSelectedBundle(b.id)}>
              <CardContent className="py-3 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Package className="h-5 w-5 text-primary" />
                  <div>
                    <p className="font-medium">{b.name}</p>
                    {b.description && <p className="text-xs text-muted-foreground">{b.description}</p>}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant={b.is_active ? "default" : "secondary"}>
                    {b.discount_type === "percentage" ? `${b.discount_value}%` : `€${b.discount_value}`} desc.
                  </Badge>
                  <Button variant="ghost" size="icon" onClick={(e) => { e.stopPropagation(); updateBundle.mutate({ id: b.id, is_active: !b.is_active }); }}>
                    {b.is_active ? <ToggleRight className="h-4 w-4 text-green-500" /> : <ToggleLeft className="h-4 w-4 text-muted-foreground" />}
                  </Button>
                  <Button variant="ghost" size="icon" onClick={(e) => { e.stopPropagation(); deleteBundle.mutate(b.id); }}>
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Create Dialog */}
      <Dialog open={showCreate} onOpenChange={setShowCreate}>
        <DialogContent>
          <DialogHeader><DialogTitle>Novo Bundle</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div><Label>Nome</Label><Input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="Ex: Kit Startup" /></div>
            <div><Label>Descrição</Label><Textarea value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} /></div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Tipo de Desconto</Label>
                <Select value={form.discount_type} onValueChange={v => setForm(f => ({ ...f, discount_type: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="percentage"><Percent className="h-3 w-3 inline mr-1" />Percentagem</SelectItem>
                    <SelectItem value="fixed"><DollarSign className="h-3 w-3 inline mr-1" />Valor Fixo</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div><Label>Valor</Label><Input type="number" value={form.discount_value} onChange={e => setForm(f => ({ ...f, discount_value: parseFloat(e.target.value) || 0 }))} /></div>
            </div>
          </div>
          <DialogFooter><Button onClick={handleCreate} disabled={!form.name || createBundle.isPending}>Criar</Button></DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Bundle Items Dialog */}
      {selectedBundle && <BundleItemsDialog bundleId={selectedBundle} onClose={() => setSelectedBundle(null)} />}
    </div>
  );
}

function BundleItemsDialog({ bundleId, onClose }: { bundleId: string; onClose: () => void }) {
  const { data: items, isLoading } = useBundleItems(bundleId);
  const addItem = useAddBundleItem();
  const removeItem = useRemoveBundleItem();
  const [showSelector, setShowSelector] = useState(false);

  const totalPrice = items?.reduce((sum, i) => sum + (i.product?.price || 0) * i.quantity, 0) || 0;

  return (
    <Dialog open onOpenChange={() => onClose()}>
      <DialogContent className="max-w-lg">
        <DialogHeader><DialogTitle>Produtos do Bundle</DialogTitle></DialogHeader>
        <div className="space-y-3">
          {isLoading ? <Skeleton className="h-20" /> : items?.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">Nenhum produto adicionado</p>
          ) : (
            items?.map(item => (
              <div key={item.id} className="flex items-center justify-between border rounded-md p-2">
                <div>
                  <p className="text-sm font-medium">{item.product?.name || "Produto"}</p>
                  <p className="text-xs text-muted-foreground">Qty: {item.quantity} × €{item.product?.price?.toFixed(2) || "0.00"}</p>
                </div>
                <Button variant="ghost" size="icon" onClick={() => removeItem.mutate({ id: item.id, bundleId })}>
                  <Trash2 className="h-4 w-4 text-destructive" />
                </Button>
              </div>
            ))
          )}
          <div className="flex justify-between items-center pt-2 border-t">
            <span className="text-sm font-medium">Total: €{totalPrice.toFixed(2)}</span>
            <Button size="sm" variant="outline" onClick={() => setShowSelector(true)}><Plus className="h-4 w-4 mr-1" />Adicionar Produto</Button>
          </div>
        </div>
      </DialogContent>

      {showSelector && (
        <Dialog open onOpenChange={() => setShowSelector(false)}>
          <DialogContent>
            <DialogHeader><DialogTitle>Selecionar Produto</DialogTitle></DialogHeader>
            <ProductSelector
              onSelect={(product: any) => {
                addItem.mutate({ bundle_id: bundleId, product_id: product.id, quantity: 1 });
                setShowSelector(false);
              }}
            />
          </DialogContent>
        </Dialog>
      )}
    </Dialog>
  );
}
