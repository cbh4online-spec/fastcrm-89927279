import { useState } from "react";
import { AlertTriangle, Bell, Plus, Trash2, Check, Package } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { useStockAlerts, useLowStockProducts, useCreateStockAlert, useUpdateStockAlert, useDeleteStockAlert } from "@/hooks/useStockAlerts";
import { ProductSelector } from "@/components/products/ProductSelector";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export function StockAlertsManager() {
  const { data: allAlerts, isLoading } = useStockAlerts();
  const { data: lowStock } = useLowStockProducts();
  const createAlert = useCreateStockAlert();
  const updateAlert = useUpdateStockAlert();
  const deleteAlert = useDeleteStockAlert();
  const [showCreate, setShowCreate] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<any>(null);
  const [threshold, setThreshold] = useState(10);

  const handleCreate = () => {
    if (!selectedProduct) return;
    createAlert.mutate({ product_id: selectedProduct.id, threshold }, {
      onSuccess: () => { setShowCreate(false); setSelectedProduct(null); setThreshold(10); },
    });
  };

  const activeAlerts = allAlerts?.filter(a => a.status === "active") || [];
  const acknowledgedAlerts = allAlerts?.filter(a => a.status === "acknowledged") || [];

  if (isLoading) return <div className="space-y-3">{[1, 2, 3].map(i => <Skeleton key={i} className="h-16 w-full" />)}</div>;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold flex items-center gap-2">
            <Bell className="h-5 w-5" />
            Alertas de Stock
            {lowStock && lowStock.length > 0 && <Badge variant="destructive">{lowStock.length} em baixo</Badge>}
          </h3>
          <p className="text-sm text-muted-foreground">Monitorize níveis de stock e receba alertas</p>
        </div>
        <Button onClick={() => setShowCreate(true)} size="sm"><Plus className="h-4 w-4 mr-1" />Novo Alerta</Button>
      </div>

      {/* Low Stock Warning */}
      {lowStock && lowStock.length > 0 && (
        <Card className="border-destructive/50 bg-destructive/5">
          <CardContent className="py-3">
            <div className="flex items-center gap-2 mb-2">
              <AlertTriangle className="h-4 w-4 text-destructive" />
              <span className="font-medium text-sm text-destructive">Produtos com stock abaixo do threshold</span>
            </div>
            <div className="space-y-1">
              {lowStock.map(a => (
                <div key={a.id} className="flex items-center justify-between text-sm">
                  <span>{a.product?.name} {a.product?.sku && <span className="text-muted-foreground">({a.product.sku})</span>}</span>
                  <div className="flex items-center gap-2">
                    <Badge variant="destructive" className="text-xs">{a.product?.stock_quantity} / {a.threshold}</Badge>
                    <Button size="sm" variant="outline" className="h-6 text-xs" onClick={() => updateAlert.mutate({ id: a.id, status: "acknowledged" })}>
                      <Check className="h-3 w-3 mr-1" />Confirmar
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      <Tabs defaultValue="active">
        <TabsList><TabsTrigger value="active">Ativos ({activeAlerts.length})</TabsTrigger><TabsTrigger value="acknowledged">Confirmados ({acknowledgedAlerts.length})</TabsTrigger></TabsList>
        <TabsContent value="active"><AlertsList alerts={activeAlerts} onUpdate={updateAlert.mutate} onDelete={deleteAlert.mutate} /></TabsContent>
        <TabsContent value="acknowledged"><AlertsList alerts={acknowledgedAlerts} onUpdate={updateAlert.mutate} onDelete={deleteAlert.mutate} /></TabsContent>
      </Tabs>

      <Dialog open={showCreate} onOpenChange={setShowCreate}>
        <DialogContent>
          <DialogHeader><DialogTitle>Novo Alerta de Stock</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div><Label>Produto</Label>
              {selectedProduct ? (
                <div className="flex items-center justify-between border rounded-md p-2">
                  <span className="text-sm">{selectedProduct.name}</span>
                  <Button variant="ghost" size="sm" onClick={() => setSelectedProduct(null)}>Alterar</Button>
                </div>
              ) : (
                <ProductSelector onSelect={(p: any) => setSelectedProduct(p)} />
              )}
            </div>
            <div><Label>Threshold (alerta quando stock ≤)</Label><Input type="number" value={threshold} onChange={e => setThreshold(parseInt(e.target.value) || 0)} min={0} /></div>
          </div>
          <DialogFooter><Button onClick={handleCreate} disabled={!selectedProduct || createAlert.isPending}>Criar Alerta</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function AlertsList({ alerts, onUpdate, onDelete }: { alerts: any[]; onUpdate: (d: any) => void; onDelete: (id: string) => void }) {
  if (alerts.length === 0) return <p className="text-sm text-muted-foreground text-center py-4">Sem alertas</p>;
  return (
    <div className="space-y-2 mt-2">
      {alerts.map(a => (
        <Card key={a.id}>
          <CardContent className="py-2 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Package className="h-4 w-4 text-muted-foreground" />
              <div>
                <p className="text-sm font-medium">{a.product?.name || "Produto"}</p>
                <p className="text-xs text-muted-foreground">
                  Stock: {a.product?.stock_quantity ?? "?"} • Threshold: {a.threshold}
                  {a.product && a.product.stock_quantity <= a.threshold && <span className="text-destructive ml-1">⚠ Abaixo</span>}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-1">
              {a.status === "active" && (
                <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => onUpdate({ id: a.id, status: "acknowledged" })}>Confirmar</Button>
              )}
              {a.status === "acknowledged" && (
                <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => onUpdate({ id: a.id, status: "resolved" })}>Resolver</Button>
              )}
              <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => onDelete(a.id)}>
                <Trash2 className="h-3.5 w-3.5 text-destructive" />
              </Button>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
