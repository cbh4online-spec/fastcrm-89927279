import { useState } from "react";
import { Plus, Trash2, Edit2, Package } from "lucide-react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  usePriceTable,
  usePriceTableItems,
  useCreatePriceTableItem,
  useUpdatePriceTableItem,
  useDeletePriceTableItem,
  tableTypeLabels,
} from "@/hooks/usePriceTables";
import { useProducts } from "@/hooks/useProducts";
import { format } from "date-fns";
import { pt } from "date-fns/locale";

interface PriceTableDetailSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  tableId: string;
}

export function PriceTableDetailSheet({ open, onOpenChange, tableId }: PriceTableDetailSheetProps) {
  const { data: table, isLoading: tableLoading } = usePriceTable(tableId);
  const { data: items, isLoading: itemsLoading } = usePriceTableItems(tableId);
  const { data: products } = useProducts();
  const createItem = useCreatePriceTableItem();
  const updateItem = useUpdatePriceTableItem();
  const deleteItem = useDeletePriceTableItem();

  const [addingProduct, setAddingProduct] = useState(false);
  const [selectedProductId, setSelectedProductId] = useState("");
  const [newPrice, setNewPrice] = useState("");
  const [newDiscount, setNewDiscount] = useState("");
  const [editingItemId, setEditingItemId] = useState<string | null>(null);
  const [editPrice, setEditPrice] = useState("");
  const [editDiscount, setEditDiscount] = useState("");

  // Products not yet in the table
  const availableProducts = products?.filter(
    (p) => !items?.some((i) => i.product_id === p.id)
  ) || [];

  const handleAddProduct = async () => {
    if (!selectedProductId || !newPrice) return;

    await createItem.mutateAsync({
      price_table_id: tableId,
      product_id: selectedProductId,
      unit_price: parseFloat(newPrice),
      discount_percent: newDiscount ? parseFloat(newDiscount) : 0,
    });

    setSelectedProductId("");
    setNewPrice("");
    setNewDiscount("");
    setAddingProduct(false);
  };

  const handleStartEdit = (item: typeof items extends (infer T)[] ? T : never) => {
    setEditingItemId(item.id);
    setEditPrice(item.unit_price.toString());
    setEditDiscount(item.discount_percent.toString());
  };

  const handleSaveEdit = async (itemId: string) => {
    await updateItem.mutateAsync({
      id: itemId,
      unit_price: parseFloat(editPrice),
      discount_percent: parseFloat(editDiscount) || 0,
    });
    setEditingItemId(null);
  };

  const handleDeleteItem = async (itemId: string) => {
    await deleteItem.mutateAsync({ id: itemId, priceTableId: tableId });
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("pt-PT", {
      style: "currency",
      currency: "EUR",
    }).format(value);
  };

  if (tableLoading) {
    return (
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent className="sm:max-w-[600px]">
          <SheetHeader>
            <Skeleton className="h-6 w-48" />
          </SheetHeader>
          <div className="space-y-4 mt-6">
            <Skeleton className="h-20 w-full" />
            <Skeleton className="h-40 w-full" />
          </div>
        </SheetContent>
      </Sheet>
    );
  }

  if (!table) return null;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="sm:max-w-[700px] overflow-y-auto">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            {table.name}
            <Badge variant="outline">{tableTypeLabels[table.table_type]}</Badge>
          </SheetTitle>
        </SheetHeader>

        <div className="space-y-6 mt-6">
          {/* Table Info */}
          <div className="grid grid-cols-2 gap-4 p-4 bg-muted/50 rounded-lg">
            {table.customer_segment && (
              <div>
                <p className="text-xs text-muted-foreground">Segmento</p>
                <p className="text-sm font-medium">{table.customer_segment}</p>
              </div>
            )}
            {table.valid_from && (
              <div>
                <p className="text-xs text-muted-foreground">Válido de</p>
                <p className="text-sm font-medium">
                  {format(new Date(table.valid_from), "dd MMM yyyy", { locale: pt })}
                </p>
              </div>
            )}
            {table.valid_until && (
              <div>
                <p className="text-xs text-muted-foreground">Válido até</p>
                <p className="text-sm font-medium">
                  {format(new Date(table.valid_until), "dd MMM yyyy", { locale: pt })}
                </p>
              </div>
            )}
            <div>
              <p className="text-xs text-muted-foreground">Prioridade</p>
              <p className="text-sm font-medium">{table.priority}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Estado</p>
              <Badge variant={table.is_active ? "default" : "secondary"}>
                {table.is_active ? "Ativa" : "Inativa"}
              </Badge>
            </div>
          </div>

          {table.description && (
            <p className="text-sm text-muted-foreground">{table.description}</p>
          )}

          {/* Products in Table */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-medium">Produtos na Tabela</h3>
              {!addingProduct && availableProducts.length > 0 && (
                <Button size="sm" onClick={() => setAddingProduct(true)} className="gap-2">
                  <Plus className="h-4 w-4" />
                  Adicionar Produto
                </Button>
              )}
            </div>

            {/* Add Product Form */}
            {addingProduct && (
              <div className="p-4 border rounded-lg bg-muted/30 space-y-3">
                <Select value={selectedProductId} onValueChange={setSelectedProductId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecionar produto..." />
                  </SelectTrigger>
                  <SelectContent>
                    {availableProducts.map((p) => (
                      <SelectItem key={p.id} value={p.id}>
                        {p.name} {p.sku && `(${p.sku})`}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs text-muted-foreground">Preço (€)</label>
                    <Input
                      type="number"
                      step="0.01"
                      placeholder="0.00"
                      value={newPrice}
                      onChange={(e) => setNewPrice(e.target.value)}
                    />
                  </div>
                  <div>
                    <label className="text-xs text-muted-foreground">Desconto (%)</label>
                    <Input
                      type="number"
                      step="0.1"
                      placeholder="0"
                      value={newDiscount}
                      onChange={(e) => setNewDiscount(e.target.value)}
                    />
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button size="sm" onClick={handleAddProduct} disabled={!selectedProductId || !newPrice || createItem.isPending}>
                    {createItem.isPending ? "A adicionar..." : "Adicionar"}
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => setAddingProduct(false)}>
                    Cancelar
                  </Button>
                </div>
              </div>
            )}

            {itemsLoading ? (
              <div className="space-y-2">
                {Array.from({ length: 3 }).map((_, i) => (
                  <Skeleton key={i} className="h-12 w-full" />
                ))}
              </div>
            ) : items && items.length > 0 ? (
              <div className="border rounded-lg">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Produto</TableHead>
                      <TableHead className="text-right">Preço Base</TableHead>
                      <TableHead className="text-right">Preço Tabela</TableHead>
                      <TableHead className="text-right">Desconto</TableHead>
                      <TableHead className="w-[80px]"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {items.map((item) => (
                      <TableRow key={item.id}>
                        <TableCell>
                          <div>
                            <p className="font-medium">{item.product?.name}</p>
                            {item.product?.sku && (
                              <p className="text-xs text-muted-foreground">{item.product.sku}</p>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="text-right text-muted-foreground">
                          {formatCurrency(item.product?.base_price || 0)}
                        </TableCell>
                        <TableCell className="text-right">
                          {editingItemId === item.id ? (
                            <Input
                              type="number"
                              step="0.01"
                              value={editPrice}
                              onChange={(e) => setEditPrice(e.target.value)}
                              className="w-24 text-right"
                            />
                          ) : (
                            <span className="font-medium">{formatCurrency(item.unit_price)}</span>
                          )}
                        </TableCell>
                        <TableCell className="text-right">
                          {editingItemId === item.id ? (
                            <Input
                              type="number"
                              step="0.1"
                              value={editDiscount}
                              onChange={(e) => setEditDiscount(e.target.value)}
                              className="w-20 text-right"
                            />
                          ) : item.discount_percent > 0 ? (
                            <Badge variant="secondary">{item.discount_percent}%</Badge>
                          ) : (
                            "—"
                          )}
                        </TableCell>
                        <TableCell>
                          <div className="flex gap-1">
                            {editingItemId === item.id ? (
                              <>
                                <Button
                                  size="icon"
                                  variant="ghost"
                                  className="h-8 w-8"
                                  onClick={() => handleSaveEdit(item.id)}
                                  disabled={updateItem.isPending}
                                >
                                  ✓
                                </Button>
                                <Button
                                  size="icon"
                                  variant="ghost"
                                  className="h-8 w-8"
                                  onClick={() => setEditingItemId(null)}
                                >
                                  ✕
                                </Button>
                              </>
                            ) : (
                              <>
                                <Button
                                  size="icon"
                                  variant="ghost"
                                  className="h-8 w-8"
                                  onClick={() => handleStartEdit(item)}
                                >
                                  <Edit2 className="h-4 w-4" />
                                </Button>
                                <Button
                                  size="icon"
                                  variant="ghost"
                                  className="h-8 w-8 text-destructive"
                                  onClick={() => handleDeleteItem(item.id)}
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            ) : (
              <div className="p-8 text-center border rounded-lg border-dashed">
                <Package className="h-8 w-8 mx-auto mb-2 text-muted-foreground opacity-50" />
                <p className="text-sm text-muted-foreground">
                  Nenhum produto adicionado a esta tabela
                </p>
              </div>
            )}
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
