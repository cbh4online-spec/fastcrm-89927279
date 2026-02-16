import { useState } from "react";
import { Package, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue
} from "@/components/ui/select";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow
} from "@/components/ui/table";
import { useFunnelProducts, useAddFunnelProduct, useRemoveFunnelProduct } from "@/hooks/useFunnelProducts";

const POSITION_LABELS: Record<string, string> = {
  main: "Principal",
  upsell: "Upsell",
  bump: "Order Bump",
};

interface FunnelProductsTabProps {
  funnelId: string;
}

export function FunnelProductsTab({ funnelId }: FunnelProductsTabProps) {
  const { data: products = [], isLoading } = useFunnelProducts(funnelId);
  const addProduct = useAddFunnelProduct();
  const removeProduct = useRemoveFunnelProduct();

  const [addOpen, setAddOpen] = useState(false);
  const [productId, setProductId] = useState("");
  const [position, setPosition] = useState("main");

  const handleAdd = async () => {
    if (!productId) return;
    await addProduct.mutateAsync({ funnel_id: funnelId, product_id: productId, position });
    setAddOpen(false);
    setProductId("");
    setPosition("main");
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold">Produtos do Funil</h3>
        <Button size="sm" onClick={() => setAddOpen(true)}>
          <Plus className="h-4 w-4 mr-1" />
          Adicionar Produto
        </Button>
      </div>

      {isLoading ? (
        <Card className="p-8 text-center text-muted-foreground">A carregar...</Card>
      ) : !products.length ? (
        <Card className="flex flex-col items-center justify-center py-12">
          <Package className="h-10 w-10 text-muted-foreground mb-3" />
          <h4 className="font-medium mb-1">Sem produtos associados</h4>
          <p className="text-sm text-muted-foreground mb-4">
            Associa produtos a este funil para checkout e upsells
          </p>
          <Button size="sm" onClick={() => setAddOpen(true)}>
            <Plus className="h-4 w-4 mr-1" />
            Adicionar Produto
          </Button>
        </Card>
      ) : (
        <Card>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Produto</TableHead>
                <TableHead>Preço</TableHead>
                <TableHead>Posição</TableHead>
                <TableHead className="w-10" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {products.map((fp: any) => (
                <TableRow key={fp.id}>
                  <TableCell className="font-medium">{fp.products?.name ?? fp.product_id}</TableCell>
                  <TableCell>
                    {fp.products?.price ? `${fp.products.price} ${fp.products.currency || "EUR"}` : "—"}
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline">{POSITION_LABELS[fp.position] || fp.position}</Badge>
                  </TableCell>
                  <TableCell>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => removeProduct.mutate({ id: fp.id, funnelId })}
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Card>
      )}

      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Adicionar Produto ao Funil</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>ID do Produto</Label>
              <Input
                value={productId}
                onChange={(e) => setProductId(e.target.value)}
                placeholder="Cole o ID do produto"
              />
            </div>
            <div>
              <Label>Posição</Label>
              <Select value={position} onValueChange={setPosition}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="main">Principal</SelectItem>
                  <SelectItem value="upsell">Upsell</SelectItem>
                  <SelectItem value="bump">Order Bump</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddOpen(false)}>Cancelar</Button>
            <Button onClick={handleAdd} disabled={!productId || addProduct.isPending}>Adicionar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
