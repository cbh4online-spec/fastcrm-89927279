import { useState } from "react";
import {
  Plus, Trash2, Edit2, MoreHorizontal, DollarSign, Shield,
  Percent, Tag, Loader2, ChevronRight, Star, Users,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Sheet, SheetContent, SheetHeader, SheetTitle,
} from "@/components/ui/sheet";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  usePriceLists, useCreatePriceList, useUpdatePriceList, useDeletePriceList,
  usePriceListItems, useUpsertPriceListItem, useDeletePriceListItem,
  usePriceRules, useCreatePriceRule, useUpdatePriceRule, useDeletePriceRule,
  type PriceList, type PriceListItem, type PriceRule,
} from "@/hooks/usePriceLists";
import { useProducts } from "@/hooks/useProducts";
import { toast } from "sonner";

// ═══════════════════════════════════════════
// Price Lists Manager
// ═══════════════════════════════════════════

export function PriceListsManager() {
  const { data: priceLists, isLoading } = usePriceLists();
  const createPriceList = useCreatePriceList();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingList, setEditingList] = useState<PriceList | null>(null);
  const [detailList, setDetailList] = useState<PriceList | null>(null);
  const [rulesOpen, setRulesOpen] = useState(false);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-base font-semibold">Listas de Preços</h3>
          <p className="text-sm text-muted-foreground">
            Preços diferenciados por segmento de cliente
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => setRulesOpen(true)}>
            <Shield className="h-4 w-4 mr-1" />
            Regras de Preço
          </Button>
          <Button size="sm" onClick={() => { setEditingList(null); setDialogOpen(true); }}>
            <Plus className="h-4 w-4 mr-1" />
            Nova Lista
          </Button>
        </div>
      </div>

      {/* Lists table */}
      {isLoading ? (
        <div className="flex justify-center p-8">
          <Loader2 className="h-6 w-6 animate-spin" />
        </div>
      ) : priceLists && priceLists.length > 0 ? (
        <div className="border rounded-lg bg-card">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nome</TableHead>
                <TableHead>Moeda</TableHead>
                <TableHead className="text-center">Prioridade</TableHead>
                <TableHead className="text-center">Estado</TableHead>
                <TableHead className="w-[50px]" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {priceLists.map((list) => (
                <TableRow
                  key={list.id}
                  className="cursor-pointer hover:bg-muted/50"
                  onClick={() => setDetailList(list)}
                >
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <DollarSign className="h-4 w-4 text-muted-foreground" />
                      <span className="font-medium">{list.name}</span>
                      {list.is_default && (
                        <Badge variant="outline" className="text-[10px]">
                          <Star className="h-3 w-3 mr-0.5" />
                          Padrão
                        </Badge>
                      )}
                    </div>
                    {list.description && (
                      <p className="text-xs text-muted-foreground mt-0.5 ml-6">{list.description}</p>
                    )}
                  </TableCell>
                  <TableCell>
                    <Badge variant="secondary">{list.currency}</Badge>
                  </TableCell>
                  <TableCell className="text-center">
                    <Badge variant="outline">{list.priority}</Badge>
                  </TableCell>
                  <TableCell className="text-center">
                    <Badge variant={list.is_active ? "default" : "secondary"}>
                      {list.is_active ? "Ativa" : "Inativa"}
                    </Badge>
                  </TableCell>
                  <TableCell onClick={(e) => e.stopPropagation()}>
                    <PriceListActions
                      list={list}
                      onEdit={() => { setEditingList(list); setDialogOpen(true); }}
                      onView={() => setDetailList(list)}
                    />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      ) : (
        <Card className="p-8 text-center">
          <DollarSign className="h-10 w-10 mx-auto mb-3 text-muted-foreground/40" />
          <p className="text-sm text-muted-foreground mb-1">Sem listas de preços</p>
          <p className="text-xs text-muted-foreground mb-4">
            Crie listas para oferecer preços diferenciados (Revenda, Instalador, Premium, etc.)
          </p>
          <Button size="sm" onClick={() => setDialogOpen(true)}>
            <Plus className="h-4 w-4 mr-1" />
            Criar Primeira Lista
          </Button>
        </Card>
      )}

      {/* Create/Edit Dialog */}
      <PriceListFormDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        list={editingList}
      />

      {/* Detail Sheet */}
      {detailList && (
        <PriceListDetailSheet
          open={!!detailList}
          onOpenChange={(open) => !open && setDetailList(null)}
          priceList={detailList}
        />
      )}

      {/* Price Rules Sheet */}
      <PriceRulesSheet open={rulesOpen} onOpenChange={setRulesOpen} />
    </div>
  );
}

// ═══════════════════════════════════════════
// Actions dropdown
// ═══════════════════════════════════════════

function PriceListActions({
  list,
  onEdit,
  onView,
}: {
  list: PriceList;
  onEdit: () => void;
  onView: () => void;
}) {
  const deleteMut = useDeletePriceList();
  const [deleteOpen, setDeleteOpen] = useState(false);

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon" className="h-8 w-8">
            <MoreHorizontal className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem onClick={onView}>Ver Preços</DropdownMenuItem>
          <DropdownMenuItem onClick={onEdit}>Editar</DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            onClick={() => setDeleteOpen(true)}
            className="text-destructive"
          >
            Eliminar
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Eliminar "{list.name}"?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação é irreversível. Todos os preços associados serão eliminados.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteMut.mutate(list.id)}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Eliminar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

// ═══════════════════════════════════════════
// Create/Edit Form
// ═══════════════════════════════════════════

function PriceListFormDialog({
  open,
  onOpenChange,
  list,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  list: PriceList | null;
}) {
  const createMut = useCreatePriceList();
  const updateMut = useUpdatePriceList();

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [currency, setCurrency] = useState("EUR");
  const [isDefault, setIsDefault] = useState(false);
  const [priority, setPriority] = useState(0);

  const isEdit = !!list;

  const resetForm = () => {
    if (list) {
      setName(list.name);
      setDescription(list.description || "");
      setCurrency(list.currency);
      setIsDefault(list.is_default);
      setPriority(list.priority);
    } else {
      setName("");
      setDescription("");
      setCurrency("EUR");
      setIsDefault(false);
      setPriority(0);
    }
  };

  // Reset on open/list change
  useState(() => resetForm());

  const handleSave = async () => {
    if (!name.trim()) {
      toast.error("Nome é obrigatório");
      return;
    }
    const data = { name, description, currency, is_default: isDefault, priority };
    if (isEdit) {
      await updateMut.mutateAsync({ id: list!.id, ...data });
    } else {
      await createMut.mutateAsync(data);
    }
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { if (v) resetForm(); onOpenChange(v); }}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{isEdit ? "Editar Lista" : "Nova Lista de Preços"}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <Label>Nome</Label>
            <Input
              placeholder="Ex: Revenda, Instalador, Premium..."
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>
          <div>
            <Label>Descrição</Label>
            <Textarea
              placeholder="Descrição opcional..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={2}
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Moeda</Label>
              <Select value={currency} onValueChange={setCurrency}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="EUR">EUR</SelectItem>
                  <SelectItem value="USD">USD</SelectItem>
                  <SelectItem value="GBP">GBP</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Prioridade</Label>
              <Input
                type="number"
                value={priority}
                onChange={(e) => setPriority(Number(e.target.value))}
              />
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Switch checked={isDefault} onCheckedChange={setIsDefault} />
            <Label>Lista padrão do workspace</Label>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button
            onClick={handleSave}
            disabled={createMut.isPending || updateMut.isPending}
          >
            {(createMut.isPending || updateMut.isPending) && (
              <Loader2 className="h-4 w-4 mr-1 animate-spin" />
            )}
            {isEdit ? "Guardar" : "Criar"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ═══════════════════════════════════════════
// Detail Sheet (items)
// ═══════════════════════════════════════════

function PriceListDetailSheet({
  open,
  onOpenChange,
  priceList,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  priceList: PriceList;
}) {
  const { data: items, isLoading } = usePriceListItems(priceList.id);
  const { data: products } = useProducts();
  const upsertItem = useUpsertPriceListItem();
  const deleteItem = useDeletePriceListItem();

  const [addOpen, setAddOpen] = useState(false);
  const [editItem, setEditItem] = useState<PriceListItem | null>(null);
  const [productId, setProductId] = useState("");
  const [price, setPrice] = useState("");
  const [minQty, setMinQty] = useState("1");

  const availableProducts = products?.filter(
    (p) => !items?.some((i) => i.product_id === p.id && i.min_quantity === 1)
  );

  const handleSaveItem = async () => {
    if (!price) return;
    await upsertItem.mutateAsync({
      id: editItem?.id,
      price_list_id: priceList.id,
      product_id: editItem?.product_id || productId,
      price: Number(price),
      min_quantity: Number(minQty) || 1,
    });
    setAddOpen(false);
    setEditItem(null);
    setProductId("");
    setPrice("");
    setMinQty("1");
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-[600px] sm:max-w-[600px]">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            <DollarSign className="h-5 w-5" />
            {priceList.name}
          </SheetTitle>
        </SheetHeader>

        <div className="mt-4 space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">
              {items?.length || 0} produtos com preço definido
            </p>
            <Button size="sm" onClick={() => { setEditItem(null); setAddOpen(true); }}>
              <Plus className="h-4 w-4 mr-1" />
              Adicionar Produto
            </Button>
          </div>

          {isLoading ? (
            <div className="flex justify-center p-4">
              <Loader2 className="h-5 w-5 animate-spin" />
            </div>
          ) : items && items.length > 0 ? (
            <div className="border rounded-lg max-h-[60vh] overflow-y-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Produto</TableHead>
                    <TableHead className="text-right">Base</TableHead>
                    <TableHead className="text-right">Lista</TableHead>
                    <TableHead className="text-center">Qtd Min</TableHead>
                    <TableHead className="text-right">Margem</TableHead>
                    <TableHead className="w-[40px]" />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {items.map((item) => {
                    const basePrice = (item.product as any)?.base_price || 0;
                    const diff = basePrice > 0
                      ? ((item.price - basePrice) / basePrice * 100).toFixed(1)
                      : "0";
                    return (
                      <TableRow key={item.id}>
                        <TableCell>
                          <div>
                            <p className="text-sm font-medium">{(item.product as any)?.name}</p>
                            {(item.product as any)?.sku && (
                              <p className="text-xs text-muted-foreground font-mono">
                                {(item.product as any).sku}
                              </p>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="text-right text-sm text-muted-foreground">
                          €{basePrice.toFixed(2)}
                        </TableCell>
                        <TableCell className="text-right text-sm font-medium">
                          €{item.price.toFixed(2)}
                        </TableCell>
                        <TableCell className="text-center text-sm">
                          {item.min_quantity > 1 ? item.min_quantity : "—"}
                        </TableCell>
                        <TableCell className="text-right">
                          <Badge
                            variant={Number(diff) < 0 ? "destructive" : "outline"}
                            className="text-[10px]"
                          >
                            {Number(diff) > 0 ? "+" : ""}{diff}%
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 text-destructive"
                            onClick={() => deleteItem.mutate(item.id)}
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          ) : (
            <Card className="p-6 text-center">
              <p className="text-sm text-muted-foreground">Sem produtos nesta lista</p>
            </Card>
          )}
        </div>

        {/* Add/Edit item dialog */}
        <Dialog open={addOpen} onOpenChange={setAddOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Adicionar Produto à Lista</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label>Produto</Label>
                <Select value={productId} onValueChange={setProductId}>
                  <SelectTrigger><SelectValue placeholder="Selecionar produto..." /></SelectTrigger>
                  <SelectContent>
                    {availableProducts?.map((p) => (
                      <SelectItem key={p.id} value={p.id}>
                        {p.name} {p.sku ? `(${p.sku})` : ""} — €{p.base_price.toFixed(2)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Preço (€)</Label>
                  <Input
                    type="number"
                    step="0.01"
                    value={price}
                    onChange={(e) => setPrice(e.target.value)}
                    placeholder="0.00"
                  />
                </div>
                <div>
                  <Label>Quantidade Mínima</Label>
                  <Input
                    type="number"
                    value={minQty}
                    onChange={(e) => setMinQty(e.target.value)}
                  />
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setAddOpen(false)}>Cancelar</Button>
              <Button
                onClick={handleSaveItem}
                disabled={!productId || !price || upsertItem.isPending}
              >
                Adicionar
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </SheetContent>
    </Sheet>
  );
}

// ═══════════════════════════════════════════
// Price Rules Sheet
// ═══════════════════════════════════════════

const ruleTypeLabels: Record<string, string> = {
  volume_discount: "Desconto Volume",
  client_discount: "Desconto Cliente",
  category_discount: "Desconto Categoria",
  special_price: "Preço Especial",
};

const ruleTypeIcons: Record<string, React.ReactNode> = {
  volume_discount: <Percent className="h-4 w-4" />,
  client_discount: <Users className="h-4 w-4" />,
  category_discount: <Tag className="h-4 w-4" />,
  special_price: <DollarSign className="h-4 w-4" />,
};

function PriceRulesSheet({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
}) {
  const { data: rules, isLoading } = usePriceRules();
  const createRule = useCreatePriceRule();
  const deleteRule = useDeletePriceRule();
  const [formOpen, setFormOpen] = useState(false);

  // Simple form state
  const [name, setName] = useState("");
  const [ruleType, setRuleType] = useState<string>("volume_discount");
  const [discountType, setDiscountType] = useState<string>("percentage");
  const [discountValue, setDiscountValue] = useState("");
  const [minQty, setMinQty] = useState("1");
  const [maxQty, setMaxQty] = useState("");
  const [category, setCategory] = useState("");
  const [priority, setPriority] = useState("0");

  const resetRuleForm = () => {
    setName("");
    setRuleType("volume_discount");
    setDiscountType("percentage");
    setDiscountValue("");
    setMinQty("1");
    setMaxQty("");
    setCategory("");
    setPriority("0");
  };

  const handleCreateRule = async () => {
    if (!name.trim() || !discountValue) {
      toast.error("Nome e valor são obrigatórios");
      return;
    }
    await createRule.mutateAsync({
      name,
      rule_type: ruleType as any,
      discount_type: discountType as any,
      discount_value: Number(discountValue),
      min_quantity: Number(minQty) || 1,
      max_quantity: maxQty ? Number(maxQty) : null,
      category: category || null,
      priority: Number(priority) || 0,
    });
    setFormOpen(false);
    resetRuleForm();
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-[550px] sm:max-w-[550px]">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            Regras de Preço
          </SheetTitle>
        </SheetHeader>

        <div className="mt-4 space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">
              Descontos automáticos por volume, cliente ou categoria
            </p>
            <Button size="sm" onClick={() => { resetRuleForm(); setFormOpen(true); }}>
              <Plus className="h-4 w-4 mr-1" />
              Nova Regra
            </Button>
          </div>

          {isLoading ? (
            <div className="flex justify-center p-4">
              <Loader2 className="h-5 w-5 animate-spin" />
            </div>
          ) : rules && rules.length > 0 ? (
            <div className="space-y-2">
              {rules.map((rule) => (
                <Card key={rule.id} className="p-3">
                  <div className="flex items-start justify-between">
                    <div className="flex items-start gap-3">
                      <div className="p-1.5 rounded bg-muted">
                        {ruleTypeIcons[rule.rule_type]}
                      </div>
                      <div>
                        <p className="text-sm font-medium">{rule.name}</p>
                        <div className="flex items-center gap-2 mt-1 flex-wrap">
                          <Badge variant="outline" className="text-[10px]">
                            {ruleTypeLabels[rule.rule_type]}
                          </Badge>
                          <Badge variant="secondary" className="text-[10px]">
                            {rule.discount_type === "percentage"
                              ? `-${rule.discount_value}%`
                              : rule.discount_type === "fixed"
                              ? `-€${rule.discount_value}`
                              : `€${rule.discount_value}`}
                          </Badge>
                          {rule.min_quantity > 1 && (
                            <Badge variant="outline" className="text-[10px]">
                              ≥{rule.min_quantity} un.
                            </Badge>
                          )}
                          {rule.category && (
                            <Badge variant="outline" className="text-[10px]">
                              {rule.category}
                            </Badge>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-1">
                      <Badge variant={rule.is_active ? "default" : "secondary"} className="text-[10px]">
                        {rule.is_active ? "Ativa" : "Inativa"}
                      </Badge>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 text-destructive"
                        onClick={() => deleteRule.mutate(rule.id)}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          ) : (
            <Card className="p-6 text-center">
              <p className="text-sm text-muted-foreground">Sem regras de preço</p>
            </Card>
          )}
        </div>

        {/* Create Rule Dialog */}
        <Dialog open={formOpen} onOpenChange={setFormOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Nova Regra de Preço</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label>Nome</Label>
                <Input
                  placeholder="Ex: Desconto volume 10+"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Tipo de Regra</Label>
                  <Select value={ruleType} onValueChange={setRuleType}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="volume_discount">Desconto Volume</SelectItem>
                      <SelectItem value="client_discount">Desconto Cliente</SelectItem>
                      <SelectItem value="category_discount">Desconto Categoria</SelectItem>
                      <SelectItem value="special_price">Preço Especial</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Tipo de Desconto</Label>
                  <Select value={discountType} onValueChange={setDiscountType}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="percentage">Percentagem (%)</SelectItem>
                      <SelectItem value="fixed">Valor Fixo (€)</SelectItem>
                      <SelectItem value="fixed_price">Preço Final (€)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <Label>Valor</Label>
                  <Input
                    type="number"
                    step="0.01"
                    value={discountValue}
                    onChange={(e) => setDiscountValue(e.target.value)}
                    placeholder={discountType === "percentage" ? "5" : "10.00"}
                  />
                </div>
                <div>
                  <Label>Qtd Mín</Label>
                  <Input
                    type="number"
                    value={minQty}
                    onChange={(e) => setMinQty(e.target.value)}
                  />
                </div>
                <div>
                  <Label>Qtd Máx</Label>
                  <Input
                    type="number"
                    value={maxQty}
                    onChange={(e) => setMaxQty(e.target.value)}
                    placeholder="Sem limite"
                  />
                </div>
              </div>
              {(ruleType === "category_discount") && (
                <div>
                  <Label>Categoria</Label>
                  <Input
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    placeholder="Nome da categoria"
                  />
                </div>
              )}
              <div>
                <Label>Prioridade (maior = aplica primeiro)</Label>
                <Input
                  type="number"
                  value={priority}
                  onChange={(e) => setPriority(e.target.value)}
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setFormOpen(false)}>Cancelar</Button>
              <Button
                onClick={handleCreateRule}
                disabled={createRule.isPending}
              >
                {createRule.isPending && <Loader2 className="h-4 w-4 mr-1 animate-spin" />}
                Criar Regra
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </SheetContent>
    </Sheet>
  );
}
