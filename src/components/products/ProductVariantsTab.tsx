import { useState } from "react";
import {
  useProductVariants,
  useCreateVariant,
  useUpdateVariant,
  useDeleteVariant,
  type ProductVariant,
} from "@/hooks/useProductVariants";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Plus, Pencil, Trash2, Loader2, Package, AlertCircle } from "lucide-react";
import { z } from "zod";
import { toast } from "sonner";

interface ProductVariantsTabProps {
  productId: string;
  workspaceId: string;
  basePrice: number;
  currency?: string;
}

const variantSchema = z.object({
  name: z.string().trim().min(1, "Nome obrigatório").max(120, "Máx. 120 caracteres"),
  sku: z
    .string()
    .trim()
    .max(80, "Máx. 80 caracteres")
    .optional()
    .transform((v) => (v && v.length > 0 ? v : null)),
  price_override: z
    .union([z.number().min(0, "≥ 0"), z.nan()])
    .optional()
    .transform((v) => (v === undefined || Number.isNaN(v) ? null : v)),
  stock_quantity: z.number().int().min(0, "≥ 0"),
  track_stock: z.boolean(),
  is_active: z.boolean(),
  sort_order: z.number().int().min(0),
});

type VariantFormState = {
  name: string;
  sku: string;
  price_override: string;
  stock_quantity: string;
  track_stock: boolean;
  is_active: boolean;
  sort_order: string;
};

const emptyForm: VariantFormState = {
  name: "",
  sku: "",
  price_override: "",
  stock_quantity: "0",
  track_stock: true,
  is_active: true,
  sort_order: "0",
};

export function ProductVariantsTab({
  productId,
  workspaceId,
  basePrice,
  currency = "EUR",
}: ProductVariantsTabProps) {
  const { data: variants, isLoading } = useProductVariants(productId);
  const createVariant = useCreateVariant();
  const updateVariant = useUpdateVariant();
  const deleteVariant = useDeleteVariant();

  const [editorOpen, setEditorOpen] = useState(false);
  const [editing, setEditing] = useState<ProductVariant | null>(null);
  const [form, setForm] = useState<VariantFormState>(emptyForm);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [confirmDelete, setConfirmDelete] = useState<ProductVariant | null>(null);

  const openCreate = () => {
    setEditing(null);
    setForm({
      ...emptyForm,
      sort_order: String(variants?.length ?? 0),
    });
    setErrors({});
    setEditorOpen(true);
  };

  const openEdit = (v: ProductVariant) => {
    setEditing(v);
    setForm({
      name: v.name,
      sku: v.sku ?? "",
      price_override: v.price_override != null ? String(v.price_override) : "",
      stock_quantity: String(v.stock_quantity),
      track_stock: v.track_stock,
      is_active: v.is_active,
      sort_order: String(v.sort_order),
    });
    setErrors({});
    setEditorOpen(true);
  };

  const handleSubmit = async () => {
    const parsed = variantSchema.safeParse({
      name: form.name,
      sku: form.sku,
      price_override: form.price_override === "" ? undefined : Number(form.price_override),
      stock_quantity: Number(form.stock_quantity || 0),
      track_stock: form.track_stock,
      is_active: form.is_active,
      sort_order: Number(form.sort_order || 0),
    });
    if (!parsed.success) {
      const fieldErrors: Record<string, string> = {};
      for (const issue of parsed.error.issues) {
        fieldErrors[issue.path.join(".")] = issue.message;
      }
      setErrors(fieldErrors);
      return;
    }
    setErrors({});
    try {
      if (editing) {
        await updateVariant.mutateAsync({
          id: editing.id,
          product_id: productId,
          name: parsed.data.name,
          sku: parsed.data.sku,
          price_override: parsed.data.price_override,
          stock_quantity: parsed.data.stock_quantity,
          track_stock: parsed.data.track_stock,
          is_active: parsed.data.is_active,
          sort_order: parsed.data.sort_order,
        });
      } else {
        await createVariant.mutateAsync({
          product_id: productId,
          workspace_id: workspaceId,
          name: parsed.data.name,
          sku: parsed.data.sku,
          price_override: parsed.data.price_override,
          stock_quantity: parsed.data.stock_quantity,
          track_stock: parsed.data.track_stock,
          attributes: {},
          is_active: parsed.data.is_active,
          sort_order: parsed.data.sort_order,
        });
      }
      setEditorOpen(false);
    } catch {
      // o hook já mostra toast de erro
    }
  };

  const handleDelete = async () => {
    if (!confirmDelete) return;
    try {
      await deleteVariant.mutateAsync({ id: confirmDelete.id, product_id: productId });
      setConfirmDelete(null);
    } catch {
      toast.error("Não foi possível eliminar a variante");
    }
  };

  const fmt = (v: number) =>
    new Intl.NumberFormat("pt-PT", { style: "currency", currency }).format(v);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12 text-muted-foreground">
        <Loader2 className="h-5 w-5 animate-spin mr-2" />
        A carregar variantes…
      </div>
    );
  }

  const list = variants ?? [];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <h3 className="text-sm font-semibold flex items-center gap-2">
            <Package className="h-4 w-4" /> Variantes
            <Badge variant="secondary" className="ml-1">{list.length}</Badge>
          </h3>
          <p className="text-xs text-muted-foreground mt-0.5">
            Cada variante tem o seu próprio SKU, stock e (opcional) preço.
          </p>
        </div>
        <Button size="sm" onClick={openCreate}>
          <Plus className="h-4 w-4 mr-1.5" /> Nova variante
        </Button>
      </div>

      {list.length === 0 ? (
        <Card className="p-8 text-center border-dashed">
          <Package className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
          <p className="text-sm font-medium">Sem variantes definidas</p>
          <p className="text-xs text-muted-foreground mt-1">
            Cria variantes (ex: cor, tamanho, dose) para gerir SKUs e stock individualmente.
          </p>
          <Button size="sm" variant="outline" className="mt-4" onClick={openCreate}>
            <Plus className="h-4 w-4 mr-1.5" /> Criar primeira variante
          </Button>
        </Card>
      ) : (
        <div className="border rounded-md divide-y">
          {list.map((v) => {
            const effectivePrice = v.price_override ?? basePrice;
            const lowStock = v.track_stock && v.stock_quantity <= 0;
            return (
              <div
                key={v.id}
                className="flex items-center gap-3 p-3 hover:bg-muted/40 transition-colors"
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-medium text-sm truncate">{v.name}</span>
                    {!v.is_active && (
                      <Badge variant="outline" className="text-[10px]">Inativa</Badge>
                    )}
                    {lowStock && (
                      <Badge variant="destructive" className="text-[10px] gap-1">
                        <AlertCircle className="h-3 w-3" /> Esgotada
                      </Badge>
                    )}
                  </div>
                  <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground flex-wrap">
                    {v.sku ? (
                      <span className="font-mono">{v.sku}</span>
                    ) : (
                      <span className="italic">sem SKU</span>
                    )}
                    <span>·</span>
                    <span>{fmt(effectivePrice)}</span>
                    {v.price_override != null && (
                      <Badge variant="secondary" className="text-[10px]">override</Badge>
                    )}
                    <span>·</span>
                    <span>
                      {v.track_stock
                        ? `${v.stock_quantity - (v.stock_reserved ?? 0)} disponíveis (${v.stock_quantity} total)`
                        : "stock não controlado"}
                    </span>
                    {v.track_stock && (v.stock_reserved ?? 0) > 0 && (
                      <Badge variant="outline" className="text-[10px] border-amber-400 text-amber-700">
                        {v.stock_reserved} reservados
                      </Badge>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  <Button size="icon" variant="ghost" onClick={() => openEdit(v)} aria-label="Editar">
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <Button
                    size="icon"
                    variant="ghost"
                    onClick={() => setConfirmDelete(v)}
                    aria-label="Eliminar"
                  >
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Dialog de criar/editar */}
      <Dialog open={editorOpen} onOpenChange={setEditorOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>
              {editing ? "Editar variante" : "Nova variante"}
            </DialogTitle>
            <DialogDescription>
              Define identificação, preço e stock desta variante.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3">
            <div>
              <Label htmlFor="v-name">Nome *</Label>
              <Input
                id="v-name"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="ex: 50ml, Vermelho, M"
                maxLength={120}
              />
              {errors.name && <p className="text-xs text-destructive mt-1">{errors.name}</p>}
            </div>

            <div>
              <Label htmlFor="v-sku">SKU</Label>
              <Input
                id="v-sku"
                value={form.sku}
                onChange={(e) => setForm({ ...form, sku: e.target.value })}
                placeholder="único por workspace (opcional)"
                maxLength={80}
              />
              {errors.sku && <p className="text-xs text-destructive mt-1">{errors.sku}</p>}
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label htmlFor="v-price">Preço ({currency})</Label>
                <Input
                  id="v-price"
                  type="number"
                  step="0.01"
                  min="0"
                  value={form.price_override}
                  onChange={(e) => setForm({ ...form, price_override: e.target.value })}
                  placeholder={`base ${basePrice.toFixed(2)}`}
                />
                <p className="text-[10px] text-muted-foreground mt-1">
                  Vazio = usa preço base do produto.
                </p>
                {errors.price_override && (
                  <p className="text-xs text-destructive mt-1">{errors.price_override}</p>
                )}
              </div>
              <div>
                <Label htmlFor="v-stock">Stock</Label>
                <Input
                  id="v-stock"
                  type="number"
                  min="0"
                  step="1"
                  value={form.stock_quantity}
                  onChange={(e) => setForm({ ...form, stock_quantity: e.target.value })}
                  disabled={!form.track_stock}
                />
                {errors.stock_quantity && (
                  <p className="text-xs text-destructive mt-1">{errors.stock_quantity}</p>
                )}
              </div>
            </div>

            <div className="flex items-center justify-between rounded-md border p-3">
              <div>
                <Label htmlFor="v-track" className="text-sm">Controlar stock</Label>
                <p className="text-[11px] text-muted-foreground">
                  Decrementa automaticamente em vendas.
                </p>
              </div>
              <Switch
                id="v-track"
                checked={form.track_stock}
                onCheckedChange={(checked) => setForm({ ...form, track_stock: checked })}
              />
            </div>

            <div className="flex items-center justify-between rounded-md border p-3">
              <div>
                <Label htmlFor="v-active" className="text-sm">Ativa</Label>
                <p className="text-[11px] text-muted-foreground">
                  Variantes inativas ficam ocultas em catálogo/storefront.
                </p>
              </div>
              <Switch
                id="v-active"
                checked={form.is_active}
                onCheckedChange={(checked) => setForm({ ...form, is_active: checked })}
              />
            </div>

            <div>
              <Label htmlFor="v-sort">Ordem</Label>
              <Input
                id="v-sort"
                type="number"
                min="0"
                step="1"
                value={form.sort_order}
                onChange={(e) => setForm({ ...form, sort_order: e.target.value })}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setEditorOpen(false)}>
              Cancelar
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={createVariant.isPending || updateVariant.isPending}
            >
              {(createVariant.isPending || updateVariant.isPending) && (
                <Loader2 className="h-4 w-4 mr-1.5 animate-spin" />
              )}
              {editing ? "Guardar" : "Criar variante"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Confirmar eliminação */}
      <AlertDialog open={!!confirmDelete} onOpenChange={(o) => !o && setConfirmDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Eliminar variante?</AlertDialogTitle>
            <AlertDialogDescription>
              Tem a certeza que pretende eliminar a variante
              {" "}<strong>{confirmDelete?.name}</strong>? Esta ação é irreversível.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Eliminar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
