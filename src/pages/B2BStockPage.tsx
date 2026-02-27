import { useState } from "react";
import { useProductInventory } from "@/hooks/useProductInventory";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Package, AlertTriangle, Plus, Minus, Loader2, Search, ArrowLeft } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";

export default function B2BStockPage() {
  const { currentWorkspace } = useWorkspace();
  const navigate = useNavigate();
  const { inventory, isLoading, adjustStock, lowStockItems } = useProductInventory(currentWorkspace?.id);
  const [search, setSearch] = useState("");
  const [adjustDialogOpen, setAdjustDialogOpen] = useState(false);
  const [selectedProductId, setSelectedProductId] = useState("");
  const [adjustType, setAdjustType] = useState("in");
  const [adjustQty, setAdjustQty] = useState(1);
  const [adjustNotes, setAdjustNotes] = useState("");

  const filtered = inventory.filter((i) =>
    !search || i.product?.name?.toLowerCase().includes(search.toLowerCase()) || i.product?.sku?.toLowerCase().includes(search.toLowerCase())
  );

  const handleAdjust = async () => {
    if (!selectedProductId) return;
    try {
      await adjustStock({ productId: selectedProductId, type: adjustType, qty: adjustQty, notes: adjustNotes });
      setAdjustDialogOpen(false);
      setAdjustNotes("");
      setAdjustQty(1);
    } catch {}
  };

  if (isLoading) {
    return (
      <div className="p-6 flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <Package className="h-6 w-6" /> Gestão de Stock B2B
            </h1>
            <p className="text-muted-foreground">Inventário, alertas de ruptura e movimentações</p>
          </div>
        </div>
      </div>

      {/* Low Stock Alert */}
      {lowStockItems.length > 0 && (
        <Card className="border-orange-200 bg-orange-50 dark:bg-orange-950/20">
          <CardContent className="flex items-center gap-3 py-3">
            <AlertTriangle className="h-5 w-5 text-orange-600" />
            <span className="font-medium text-orange-800 dark:text-orange-200">
              {lowStockItems.length} produto(s) abaixo do ponto de reposição
            </span>
          </CardContent>
        </Card>
      )}

      {/* Search */}
      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input placeholder="Pesquisar produto..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
      </div>

      {/* Inventory Table */}
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Produto</TableHead>
                <TableHead className="text-right">Em Mão</TableHead>
                <TableHead className="text-right">Reservado</TableHead>
                <TableHead className="text-right">Disponível</TableHead>
                <TableHead className="text-right">Ponto Reposição</TableHead>
                <TableHead className="text-right">Lead Time</TableHead>
                <TableHead></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((item) => {
                const available = item.stock_on_hand - item.stock_reserved;
                const isLow = available <= item.reorder_point;
                return (
                  <TableRow key={item.id}>
                    <TableCell>
                      <div>
                        <p className="font-medium">{item.product?.name}</p>
                        <p className="text-xs text-muted-foreground">{item.product?.sku}</p>
                      </div>
                    </TableCell>
                    <TableCell className="text-right">{item.stock_on_hand}</TableCell>
                    <TableCell className="text-right">{item.stock_reserved}</TableCell>
                    <TableCell className="text-right">
                      <span className={isLow ? "text-destructive font-medium" : ""}>{available}</span>
                      {isLow && <AlertTriangle className="inline h-3 w-3 ml-1 text-destructive" />}
                    </TableCell>
                    <TableCell className="text-right">{item.reorder_point}</TableCell>
                    <TableCell className="text-right">{item.supplier_lead_time_days}d</TableCell>
                    <TableCell>
                      <Dialog open={adjustDialogOpen && selectedProductId === item.product_id} onOpenChange={(v) => { setAdjustDialogOpen(v); if (v) setSelectedProductId(item.product_id); }}>
                        <DialogTrigger asChild>
                          <Button variant="outline" size="sm">Ajustar</Button>
                        </DialogTrigger>
                        <DialogContent>
                          <DialogHeader>
                            <DialogTitle>Ajustar Stock — {item.product?.name}</DialogTitle>
                          </DialogHeader>
                          <div className="space-y-4">
                            <div>
                              <Label>Tipo</Label>
                              <Select value={adjustType} onValueChange={setAdjustType}>
                                <SelectTrigger><SelectValue /></SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="in">Entrada</SelectItem>
                                  <SelectItem value="out">Saída</SelectItem>
                                  <SelectItem value="reserve">Reserva</SelectItem>
                                  <SelectItem value="release">Libertação</SelectItem>
                                </SelectContent>
                              </Select>
                            </div>
                            <div>
                              <Label>Quantidade</Label>
                              <Input type="number" value={adjustQty} onChange={(e) => setAdjustQty(parseInt(e.target.value) || 1)} min={1} />
                            </div>
                            <div>
                              <Label>Notas (opcional)</Label>
                              <Input value={adjustNotes} onChange={(e) => setAdjustNotes(e.target.value)} />
                            </div>
                            <Button className="w-full" onClick={handleAdjust}>Confirmar</Button>
                          </div>
                        </DialogContent>
                      </Dialog>
                    </TableCell>
                  </TableRow>
                );
              })}
              {filtered.length === 0 && (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                    Sem dados de inventário
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
