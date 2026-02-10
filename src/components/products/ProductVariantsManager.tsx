import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Plus, Pencil, Trash2, Layers, Loader2 } from "lucide-react";
import { useProductVariants, useCreateVariant, useUpdateVariant, useDeleteVariant, ProductVariant } from "@/hooks/useProductVariants";
import { useWorkspace } from "@/contexts/WorkspaceContext";

interface Props {
  productId: string;
}

const COMMON_ATTRIBUTES = ["Tamanho", "Cor", "Material", "Modelo"];

export function ProductVariantsManager({ productId }: Props) {
  const { currentWorkspace } = useWorkspace();
  const { data: variants, isLoading } = useProductVariants(productId);
  const createVariant = useCreateVariant();
  const updateVariant = useUpdateVariant();
  const deleteVariant = useDeleteVariant();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<ProductVariant | null>(null);

  // Form state
  const [name, setName] = useState("");
  const [sku, setSku] = useState("");
  const [priceOverride, setPriceOverride] = useState("");
  const [stockQty, setStockQty] = useState("0");
  const [trackStock, setTrackStock] = useState(true);
  const [isActive, setIsActive] = useState(true);
  const [attributes, setAttributes] = useState<Record<string, string>>({});
  const [newAttrKey, setNewAttrKey] = useState("");

  const openCreate = () => {
    setEditing(null);
    setName("");
    setSku("");
    setPriceOverride("");
    setStockQty("0");
    setTrackStock(true);
    setIsActive(true);
    setAttributes({});
    setDialogOpen(true);
  };

  const openEdit = (v: ProductVariant) => {
    setEditing(v);
    setName(v.name);
    setSku(v.sku || "");
    setPriceOverride(v.price_override?.toString() || "");
    setStockQty(v.stock_quantity.toString());
    setTrackStock(v.track_stock);
    setIsActive(v.is_active);
    setAttributes(v.attributes || {});
    setDialogOpen(true);
  };

  const handleSave = async () => {
    const payload = {
      product_id: productId,
      workspace_id: currentWorkspace!.id,
      name,
      sku: sku || null,
      price_override: priceOverride ? parseFloat(priceOverride) : null,
      stock_quantity: parseInt(stockQty) || 0,
      track_stock: trackStock,
      is_active: isActive,
      attributes,
      sort_order: editing?.sort_order ?? (variants?.length || 0),
    };

    if (editing) {
      await updateVariant.mutateAsync({ id: editing.id, ...payload });
    } else {
      await createVariant.mutateAsync(payload);
    }
    setDialogOpen(false);
  };

  const handleDelete = async (v: ProductVariant) => {
    if (!confirm(`Remover variante "${v.name}"?`)) return;
    await deleteVariant.mutateAsync({ id: v.id, product_id: productId });
  };

  const addAttribute = (key: string) => {
    if (!key.trim()) return;
    setAttributes((prev) => ({ ...prev, [key.trim()]: "" }));
    setNewAttrKey("");
  };

  const removeAttribute = (key: string) => {
    setAttributes((prev) => {
      const copy = { ...prev };
      delete copy[key];
      return copy;
    });
  };

  const isSaving = createVariant.isPending || updateVariant.isPending;

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2">
            <Layers className="h-4 w-4" />
            Variantes ({variants?.length || 0})
          </CardTitle>
          <Button size="sm" variant="outline" className="gap-1" onClick={openCreate}>
            <Plus className="h-3.5 w-3.5" /> Adicionar
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="flex justify-center py-6">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          </div>
        ) : !variants?.length ? (
          <p className="text-sm text-muted-foreground text-center py-4">
            Sem variantes. Adicione tamanhos, cores ou outras opções.
          </p>
        ) : (
          <div className="space-y-2">
            {variants.map((v) => (
              <div
                key={v.id}
                className="flex items-center gap-3 p-3 rounded-lg border bg-muted/30 hover:bg-muted/50 transition-colors"
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium">{v.name}</span>
                    {!v.is_active && <Badge variant="secondary" className="text-[10px]">Inativo</Badge>}
                  </div>
                  <div className="flex flex-wrap gap-1 mt-1">
                    {Object.entries(v.attributes || {}).map(([k, val]) => (
                      <Badge key={k} variant="outline" className="text-[10px] h-5">
                        {k}: {val}
                      </Badge>
                    ))}
                  </div>
                  <div className="flex gap-3 mt-1 text-xs text-muted-foreground">
                    {v.sku && <span>SKU: {v.sku}</span>}
                    {v.price_override != null && <span>€{v.price_override.toFixed(2)}</span>}
                    {v.track_stock && <span>Stock: {v.stock_quantity}</span>}
                  </div>
                </div>
                <div className="flex gap-1">
                  <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => openEdit(v)}>
                    <Pencil className="h-3.5 w-3.5" />
                  </Button>
                  <Button size="icon" variant="ghost" className="h-8 w-8 text-destructive" onClick={() => handleDelete(v)}>
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{editing ? "Editar Variante" : "Nova Variante"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Nome *</Label>
              <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Ex: Tamanho M - Azul" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>SKU</Label>
                <Input value={sku} onChange={(e) => setSku(e.target.value)} placeholder="SKU-001-M" />
              </div>
              <div className="space-y-2">
                <Label>Preço (override)</Label>
                <Input type="number" step="0.01" value={priceOverride} onChange={(e) => setPriceOverride(e.target.value)} placeholder="Preço base" />
              </div>
            </div>
            <div className="flex items-center justify-between">
              <Label>Controlar stock</Label>
              <Switch checked={trackStock} onCheckedChange={setTrackStock} />
            </div>
            {trackStock && (
              <div className="space-y-2">
                <Label>Quantidade em stock</Label>
                <Input type="number" value={stockQty} onChange={(e) => setStockQty(e.target.value)} />
              </div>
            )}
            <div className="flex items-center justify-between">
              <Label>Ativo</Label>
              <Switch checked={isActive} onCheckedChange={setIsActive} />
            </div>

            {/* Attributes */}
            <div className="space-y-2">
              <Label>Atributos</Label>
              {Object.entries(attributes).map(([key, val]) => (
                <div key={key} className="flex gap-2 items-center">
                  <span className="text-xs font-medium text-muted-foreground w-20 truncate">{key}</span>
                  <Input
                    value={val}
                    onChange={(e) => setAttributes((prev) => ({ ...prev, [key]: e.target.value }))}
                    placeholder={`Valor de ${key}`}
                    className="flex-1 h-8 text-sm"
                  />
                  <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => removeAttribute(key)}>
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </div>
              ))}
              <div className="flex gap-2">
                <Input
                  value={newAttrKey}
                  onChange={(e) => setNewAttrKey(e.target.value)}
                  placeholder="Nome do atributo"
                  className="flex-1 h-8 text-sm"
                  onKeyDown={(e) => e.key === "Enter" && addAttribute(newAttrKey)}
                />
                <Button size="sm" variant="outline" className="h-8" onClick={() => addAttribute(newAttrKey)}>
                  <Plus className="h-3 w-3" />
                </Button>
              </div>
              <div className="flex gap-1 flex-wrap">
                {COMMON_ATTRIBUTES.filter((a) => !(a in attributes)).map((a) => (
                  <Button key={a} size="sm" variant="ghost" className="h-6 text-[10px] px-2" onClick={() => addAttribute(a)}>
                    + {a}
                  </Button>
                ))}
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancelar</Button>
            <Button onClick={handleSave} disabled={!name.trim() || isSaving}>
              {isSaving && <Loader2 className="h-4 w-4 animate-spin mr-1" />}
              {editing ? "Guardar" : "Criar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
